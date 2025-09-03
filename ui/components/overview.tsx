'use client';

import { Downtime, LogsResponse, Product, UptimeStats } from '@/lib/types/api';
import { OverviewCard, SummaryCard } from './overview-cards';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const Overview = ({
  service,
  uptimeStats,
  recentDowntime,
  recentLogs,
  tabHandler,
}: {
  service: Product;
  uptimeStats?: {
    uptime24h?: UptimeStats;
    uptime7d?: UptimeStats;
    uptime30d?: UptimeStats;
  };
  recentDowntime?: Downtime[];
  recentLogs?: LogsResponse;
  tabHandler: (
    tab: 'overview' | 'status' | 'logs' | 'Ingestion Integration' | 'quickfixes'
  ) => void;
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Service Information
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Health Check URL:
                  </span>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1 break-all">
                    {service.health_api}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Created:
                  </span>
                  <p className="text-sm mt-1">
                    {formatTimestamp(service.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Last Updated:
                  </span>
                  <p className="text-sm mt-1">
                    {formatTimestamp(service.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <OverviewCard serviceId={service.id} />
            <SummaryCard serviceId={service.id} />
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Incidents</div>
              <div className="mt-1 text-xl font-semibold">
                {uptimeStats?.uptime24h?.incident_count ?? '—'}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Last 24 hours
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    (uptimeStats?.uptime24h?.incident_count ?? 0) === 0
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                  }`}
                ></div>
                <span className="text-xs text-muted-foreground">
                  {(uptimeStats?.uptime24h?.incident_count ?? 0) === 0
                    ? 'No incidents'
                    : 'Has incidents'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime Statistics */}
      {(uptimeStats?.uptime24h ||
        uptimeStats?.uptime7d ||
        uptimeStats?.uptime30d) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Uptime Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid gap-4 sm:grid-cols-3">
              {uptimeStats?.uptime24h && (
                <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      24 Hours
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      📊
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {uptimeStats.uptime24h.uptime_percentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {uptimeStats.uptime24h.incident_count} incidents
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {uptimeStats.uptime24h.total_downtime_minutes}min downtime
                  </div>
                </div>
              )}
              {uptimeStats?.uptime7d && (
                <div className="rounded-lg border p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">
                      7 Days
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      📈
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {uptimeStats.uptime7d.uptime_percentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {uptimeStats.uptime7d.incident_count} incidents
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {uptimeStats.uptime7d.total_downtime_minutes}min downtime
                  </div>
                </div>
              )}
              {uptimeStats?.uptime30d && (
                <div className="rounded-lg border p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      30 Days
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      📅
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {uptimeStats.uptime30d.uptime_percentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {uptimeStats.uptime30d.incident_count} incidents
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    {uptimeStats.uptime30d.total_downtime_minutes}min downtime
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Incidents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {recentDowntime && recentDowntime.length > 0 ? (
              <div className="space-y-3">
                {recentDowntime.slice(0, 5).map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            incident.status === 'down'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                        <span className="text-sm font-medium capitalize">
                          Downtime
                        </span>
                        {!incident.end_time && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full dark:bg-red-900 dark:text-red-300">
                            Ongoing
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(incident.start_time).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started: {formatTimestamp(incident.start_time)}
                      {incident.end_time && (
                        <> • Ended: {formatTimestamp(incident.end_time)}</>
                      )}
                    </div>
                    {incident.end_time && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Duration:{' '}
                        {Math.round(
                          (new Date(incident.end_time).getTime() -
                            new Date(incident.start_time).getTime()) /
                            (1000 * 60)
                        )}{' '}
                        minutes
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm text-muted-foreground">
                  No recent incidents
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your service is running smoothly!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Logs</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => tabHandler('logs')}
                className="text-xs"
              >
                View All →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {recentLogs && recentLogs.logs && recentLogs.logs.length > 0 ? (
              <div className="space-y-2">
                {recentLogs.logs.slice(0, 5).map((log) => {
                  let parsed;
                  try {
                    parsed = JSON.parse(log.log_data);
                  } catch {
                    parsed = { level: 'info', message: log.log_data };
                  }

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          parsed.level === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : parsed.level === 'warn'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}
                      >
                        {parsed.level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {parsed.message || log.log_data}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(log.Timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm text-muted-foreground">
                  No logs available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Logs will appear here once your service starts logging
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;

// Helper function to generate status distribution data for pie chart
const getStatusDistributionData = (
  uptimeStats?: {
    uptime24h?: UptimeStats;
    uptime7d?: UptimeStats;
    uptime30d?: UptimeStats;
  },
  recentDowntime?: Downtime[]
) => {
  const data = [
    { name: 'Operational', value: 0, color: '#10b981' },
    { name: 'Degraded', value: 0, color: '#f59e0b' },
    { name: 'Down', value: 0, color: '#ef4444' },
  ];

  // Count incidents by status from recent downtime
  if (recentDowntime && recentDowntime.length > 0) {
    recentDowntime.forEach((incident) => {
      if (incident.status === 'down') {
        data[2].value += 1;
      } else if (incident.status === 'degraded') {
        data[1].value += 1;
      }
    });
  }

  // If no incidents, show as operational
  if (data[0].value === 0 && data[1].value === 0 && data[2].value === 0) {
    data[0].value = 1;
  }

  return data;
};

const formatTimestamp = (timestamp: string | undefined | null) => {
  if (!timestamp) {
    return 'No timestamp';
  }
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp; // Return original if invalid
    }
    return date.toLocaleString();
  } catch {
    return timestamp; // Return original if parsing fails
  }
};
