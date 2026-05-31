package internal

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ToolRegistry holds the read-only tools the agent can call. Every tool is
// scoped to a single userID so the agent can only ever read the caller's data.
type ToolRegistry struct {
	db     *Database
	userID uint
}

func NewToolRegistry(db *Database, userID uint) *ToolRegistry {
	return &ToolRegistry{db: db, userID: userID}
}

// Specs returns the tool schemas advertised to the model.
func (t *ToolRegistry) Specs() []ToolSpec {
	return []ToolSpec{
		{
			Name:        "list_services",
			Description: "List all monitored services belonging to the user, with their id, name and description.",
		},
		{
			Name:        "get_logs",
			Description: "Get recent logs for a service, newest first. Optionally filter by log level substring and a time range (RFC3339).",
			Parameters: map[string]ParamSpec{
				"service_id": {Type: "integer", Description: "ID of the service (from list_services)."},
				"limit":      {Type: "integer", Description: "Max number of logs to return (default 30, max 100)."},
				"level":      {Type: "string", Description: "Optional level filter, e.g. error, warn, info."},
				"start_time": {Type: "string", Description: "Optional RFC3339 start of time range."},
				"end_time":   {Type: "string", Description: "Optional RFC3339 end of time range."},
			},
			Required: []string{"service_id"},
		},
		{
			Name:        "search_logs",
			Description: "Search a service's logs for a substring, newest first.",
			Parameters: map[string]ParamSpec{
				"service_id": {Type: "integer", Description: "ID of the service."},
				"query":      {Type: "string", Description: "Substring to search for in log text."},
				"limit":      {Type: "integer", Description: "Max number of logs to return (default 30, max 100)."},
			},
			Required: []string{"service_id", "query"},
		},
		{
			Name:        "get_downtime_history",
			Description: "Get downtime incidents for a service, newest first, including start/end time and status.",
			Parameters: map[string]ParamSpec{
				"service_id": {Type: "integer", Description: "ID of the service."},
				"limit":      {Type: "integer", Description: "Max number of incidents to return (default 20, max 100)."},
			},
			Required: []string{"service_id"},
		},
		{
			Name:        "get_quickfixes",
			Description: "Get AI-generated quick fixes previously produced for a service's incidents, newest first.",
			Parameters: map[string]ParamSpec{
				"service_id": {Type: "integer", Description: "ID of the service."},
				"limit":      {Type: "integer", Description: "Max number of quick fixes to return (default 20, max 100)."},
			},
			Required: []string{"service_id"},
		},
		{
			Name:        "get_analytics",
			Description: "Get uptime percentage, total downtime minutes and incident count for a service over a period (24h, 7d, 30d, 90d).",
			Parameters: map[string]ParamSpec{
				"service_id": {Type: "integer", Description: "ID of the service."},
				"period":     {Type: "string", Description: "Time window.", Enum: []string{"24h", "7d", "30d", "90d"}},
			},
			Required: []string{"service_id"},
		},
	}
}

// Call dispatches a tool by name and returns a JSON string result. Errors are
// returned as a value (not Go errors) so the model can read and react to them.
func (t *ToolRegistry) Call(name string, args map[string]any) string {
	switch name {
	case "list_services":
		return t.listServices()
	case "get_logs":
		return t.getLogs(args)
	case "search_logs":
		return t.searchLogs(args)
	case "get_downtime_history":
		return t.getDowntimeHistory(args)
	case "get_quickfixes":
		return t.getQuickFixes(args)
	case "get_analytics":
		return t.getAnalytics(args)
	default:
		return toolError("unknown tool: " + name)
	}
}

func (t *ToolRegistry) listServices() string {
	var products []Product
	if err := t.db.DB.Where("user_id = ?", t.userID).Find(&products).Error; err != nil {
		return toolError(err.Error())
	}
	out := make([]map[string]any, len(products))
	for i, p := range products {
		out[i] = map[string]any{
			"id": p.ID, "name": p.Name, "description": p.Description, "health_api": p.HealthAPI,
		}
	}
	return toJSON(map[string]any{"services": out})
}

// ownsService verifies the service exists and belongs to the current user.
func (t *ToolRegistry) ownsService(serviceID uint) (*Product, string) {
	var p Product
	err := t.db.DB.Where("id = ? AND user_id = ?", serviceID, t.userID).First(&p).Error
	if err != nil {
		return nil, toolError(fmt.Sprintf("service %d not found or not owned by you", serviceID))
	}
	return &p, ""
}

func (t *ToolRegistry) getLogs(args map[string]any) string {
	id, ok := argUint(args, "service_id")
	if !ok {
		return toolError("service_id is required")
	}
	if _, errStr := t.ownsService(id); errStr != "" {
		return errStr
	}

	limit := clampLimit(argInt(args, "limit", 30), 100)
	q := t.db.DB.Model(&Log{}).Where("product_id = ?", id)

	if level := argStr(args, "level"); level != "" {
		q = q.Where("log_data ILIKE ?", "%"+level+"%")
	}
	if ts, ok := argTime(args, "start_time"); ok {
		q = q.Where("timestamp >= ?", ts)
	}
	if ts, ok := argTime(args, "end_time"); ok {
		q = q.Where("timestamp <= ?", ts)
	}

	var logs []Log
	if err := q.Order("timestamp DESC").Limit(limit).Find(&logs).Error; err != nil {
		return toolError(err.Error())
	}
	return toJSON(map[string]any{"count": len(logs), "logs": logsToOut(logs)})
}

func (t *ToolRegistry) searchLogs(args map[string]any) string {
	id, ok := argUint(args, "service_id")
	if !ok {
		return toolError("service_id is required")
	}
	if _, errStr := t.ownsService(id); errStr != "" {
		return errStr
	}
	query := argStr(args, "query")
	if query == "" {
		return toolError("query is required")
	}
	limit := clampLimit(argInt(args, "limit", 30), 100)

	var logs []Log
	if err := t.db.DB.Where("product_id = ? AND log_data ILIKE ?", id, "%"+query+"%").
		Order("timestamp DESC").Limit(limit).Find(&logs).Error; err != nil {
		return toolError(err.Error())
	}
	return toJSON(map[string]any{"count": len(logs), "logs": logsToOut(logs)})
}

func (t *ToolRegistry) getDowntimeHistory(args map[string]any) string {
	id, ok := argUint(args, "service_id")
	if !ok {
		return toolError("service_id is required")
	}
	if _, errStr := t.ownsService(id); errStr != "" {
		return errStr
	}
	limit := clampLimit(argInt(args, "limit", 20), 100)

	var downtimes []Downtime
	if err := t.db.DB.Where("product_id = ?", id).
		Order("start_time DESC").Limit(limit).Find(&downtimes).Error; err != nil {
		return toolError(err.Error())
	}

	out := make([]map[string]any, len(downtimes))
	for i, d := range downtimes {
		entry := map[string]any{
			"id":         d.ID,
			"start_time": d.StartTime.Format(time.RFC3339),
			"status":     d.Status,
		}
		if d.EndTime != nil {
			entry["end_time"] = d.EndTime.Format(time.RFC3339)
			entry["duration_minutes"] = int(d.EndTime.Sub(d.StartTime).Minutes())
		} else {
			entry["end_time"] = nil
			entry["ongoing"] = true
		}
		out[i] = entry
	}
	return toJSON(map[string]any{"count": len(out), "incidents": out})
}

func (t *ToolRegistry) getQuickFixes(args map[string]any) string {
	id, ok := argUint(args, "service_id")
	if !ok {
		return toolError("service_id is required")
	}
	if _, errStr := t.ownsService(id); errStr != "" {
		return errStr
	}
	limit := clampLimit(argInt(args, "limit", 20), 100)

	var fixes []ProductQuickFix
	if err := t.db.DB.Where("product_id = ?", id).
		Order("created_at DESC").Limit(limit).Find(&fixes).Error; err != nil {
		return toolError(err.Error())
	}

	out := make([]map[string]any, len(fixes))
	for i, f := range fixes {
		out[i] = map[string]any{
			"title": f.Title, "description": f.Description,
			"created_at": f.CreatedAt.Format(time.RFC3339), "downtime_id": f.DowntimeID,
		}
	}
	return toJSON(map[string]any{"count": len(out), "quick_fixes": out})
}

func (t *ToolRegistry) getAnalytics(args map[string]any) string {
	id, ok := argUint(args, "service_id")
	if !ok {
		return toolError("service_id is required")
	}
	if _, errStr := t.ownsService(id); errStr != "" {
		return errStr
	}

	now := time.Now()
	var start time.Time
	period := argStr(args, "period")
	switch period {
	case "24h":
		start = now.Add(-24 * time.Hour)
	case "7d":
		start = now.Add(-7 * 24 * time.Hour)
	case "90d":
		start = now.Add(-90 * 24 * time.Hour)
	default:
		period = "30d"
		start = now.Add(-30 * 24 * time.Hour)
	}

	var downtimes []Downtime
	if err := t.db.DB.Where("product_id = ? AND start_time >= ? AND start_time <= ?", id, start, now).
		Find(&downtimes).Error; err != nil {
		return toolError(err.Error())
	}

	totalDowntime := 0
	for _, d := range downtimes {
		end := now
		if d.EndTime != nil {
			end = *d.EndTime
		}
		s := d.StartTime
		if s.Before(start) {
			s = start
		}
		if end.After(now) {
			end = now
		}
		if end.After(s) {
			totalDowntime += int(end.Sub(s).Minutes())
		}
	}

	totalMinutes := int(now.Sub(start).Minutes())
	uptime := 100.0
	if totalMinutes > 0 {
		uptime = float64(totalMinutes-totalDowntime) / float64(totalMinutes) * 100
	}
	if uptime < 0 {
		uptime = 0
	}

	return toJSON(map[string]any{
		"period":                 period,
		"uptime_percentage":      uptime,
		"total_downtime_minutes": totalDowntime,
		"incident_count":         len(downtimes),
	})
}

// --- helpers ---

func logsToOut(logs []Log) []map[string]any {
	out := make([]map[string]any, len(logs))
	for i, l := range logs {
		out[i] = map[string]any{"timestamp": l.Timestamp.Format(time.RFC3339), "message": l.LogData}
	}
	return out
}

func toJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return toolError("failed to serialize result")
	}
	return string(b)
}

func toolError(msg string) string {
	return fmt.Sprintf(`{"error":%q}`, msg)
}

func clampLimit(v, max int) int {
	if v <= 0 {
		return max
	}
	if v > max {
		return max
	}
	return v
}

// Gemini decodes JSON numbers as float64, so coerce defensively.
func argUint(args map[string]any, key string) (uint, bool) {
	v, ok := args[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return uint(n), true
	case int:
		return uint(n), true
	case string:
		var i uint
		if _, err := fmt.Sscanf(n, "%d", &i); err == nil {
			return i, true
		}
	}
	return 0, false
}

func argInt(args map[string]any, key string, def int) int {
	if v, ok := args[key]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		}
	}
	return def
}

func argStr(args map[string]any, key string) string {
	if v, ok := args[key]; ok {
		if s, ok := v.(string); ok {
			return strings.TrimSpace(s)
		}
	}
	return ""
}

func argTime(args map[string]any, key string) (time.Time, bool) {
	s := argStr(args, key)
	if s == "" {
		return time.Time{}, false
	}
	ts, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}, false
	}
	return ts, true
}
