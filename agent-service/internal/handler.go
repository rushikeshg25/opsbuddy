package internal

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	llm LLMProvider
	db  *Database
}

func NewHandler(llm LLMProvider, db *Database) *Handler {
	return &Handler{llm: llm, db: db}
}

type chatRequest struct {
	Message string        `json:"message"`
	History []chatHistory `json:"history"`
}

type chatHistory struct {
	Role    string `json:"role"` // "user" | "assistant"
	Content string `json:"content"`
}

// authMiddleware validates the JWT (cookie or Bearer header) and stores the
// numeric user id in the context. Mirrors http/internal/middleware/jwt.go.
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("auth_token")
		if err != nil {
			authHeader := c.GetHeader("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization token required"})
				return
			}
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		claims, err := ValidateJWT(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		userID, err := strconv.ParseUint(claims.UserID, 10, 32)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user id in token"})
			return
		}

		c.Set("userID", uint(userID))
		c.Next()
	}
}

// chat streams the agent's response as Server-Sent Events.
//
//	event: status  -> tool progress text
//	event: answer  -> a chunk of the final answer
//	event: error   -> an error message
//	event: done    -> terminal marker
func (h *Handler) chat(c *gin.Context) {
	userID := c.GetUint("userID")

	var req chatRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming unsupported"})
		return
	}

	send := func(event, data string) {
		writeSSE(c, event, data)
		flusher.Flush()
	}

	msgs := buildHistory(req)
	agent := NewAgent(h.llm, h.db, userID)

	answer, err := agent.Run(c.Request.Context(), msgs, func(e Event) {
		send(e.Type, e.Data)
	})
	if err != nil {
		send("error", err.Error())
		send("done", "")
		return
	}

	for _, chunk := range chunkText(answer) {
		send("answer", chunk)
	}
	send("done", "")
}

func buildHistory(req chatRequest) []Message {
	msgs := make([]Message, 0, len(req.History)+1)
	for _, h := range req.History {
		if h.Role == "user" || h.Role == "assistant" {
			msgs = append(msgs, Message{Role: h.Role, Content: h.Content})
		}
	}
	msgs = append(msgs, Message{Role: "user", Content: req.Message})
	return msgs
}

// writeSSE emits one SSE frame, splitting multi-line data into separate
// data: lines as the spec requires.
func writeSSE(c *gin.Context, event, data string) {
	c.Writer.WriteString("event: " + event + "\n")
	for _, line := range strings.Split(data, "\n") {
		c.Writer.WriteString("data: " + line + "\n")
	}
	c.Writer.WriteString("\n")
}

// chunkText splits the answer into word-ish chunks so the UI renders it
// progressively. Provider-side token streaming is intentionally avoided to keep
// the LLMProvider interface simple and swappable.
func chunkText(s string) []string {
	if s == "" {
		return nil
	}
	words := strings.SplitAfter(s, " ")
	const batch = 4
	var chunks []string
	for i := 0; i < len(words); i += batch {
		end := i + batch
		if end > len(words) {
			end = len(words)
		}
		chunks = append(chunks, strings.Join(words[i:end], ""))
	}
	return chunks
}
