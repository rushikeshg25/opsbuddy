package internal

import (
	"context"
	"fmt"
	"log"
)

const maxToolIterations = 6

const systemPrompt = `You are OpsBuddy, an assistant embedded in a microservices monitoring platform.
You help the user understand the health of THEIR services using the provided tools.

Rules:
- Only answer using data returned by the tools. Never invent service names, logs, incidents or metrics.
- If you don't have enough information, call a tool. Start with list_services if you don't know the service id.
- If a tool returns an error (e.g. a service is not owned by the user), tell the user plainly; do not retry with guessed ids.
- Be concise. When diagnosing an incident, reference concrete log lines, timestamps and downtime durations.
- If the data does not answer the question, say so.`

// Event is a streamed update from a running agent.
type Event struct {
	Type string // "status" | "answer" | "error"
	Data string
}

type Agent struct {
	llm   LLMProvider
	db    *Database
	tools *ToolRegistry
}

func NewAgent(llm LLMProvider, db *Database, userID uint) *Agent {
	return &Agent{llm: llm, db: db, tools: NewToolRegistry(db, userID)}
}

// Run executes the LLM<->tool loop. Status updates (tool calls) are pushed to
// emit as they happen; the final answer is returned.
func (a *Agent) Run(ctx context.Context, history []Message, emit func(Event)) (string, error) {
	msgs := append([]Message{}, history...)
	specs := a.tools.Specs()

	for i := 0; i < maxToolIterations; i++ {
		turn, err := a.llm.Generate(ctx, systemPrompt, msgs, specs)
		if err != nil {
			return "", err
		}

		if len(turn.ToolCalls) == 0 {
			return turn.Text, nil
		}

		// Record the assistant's tool-call turn, then execute each call.
		msgs = append(msgs, Message{Role: "assistant", Content: turn.Text, ToolCalls: turn.ToolCalls})
		for _, tc := range turn.ToolCalls {
			emit(Event{Type: "status", Data: statusFor(tc)})
			log.Printf("agent tool call: %s args=%v", tc.Name, tc.Args)
			result := a.tools.Call(tc.Name, tc.Args)
			msgs = append(msgs, Message{Role: "tool", ToolName: tc.Name, Content: result})
		}
	}

	// Tool budget exhausted: ask for a final answer with no further tools.
	turn, err := a.llm.Generate(ctx, systemPrompt+"\n\nDo not call any more tools. Answer with what you have.", msgs, nil)
	if err != nil {
		return "", err
	}
	if turn.Text == "" {
		return "I wasn't able to reach a conclusion within the tool limit. Please narrow your question.", nil
	}
	return turn.Text, nil
}

func statusFor(tc ToolCall) string {
	switch tc.Name {
	case "list_services":
		return "Looking up your services…"
	case "get_logs":
		return "Reading recent logs…"
	case "search_logs":
		return "Searching logs…"
	case "get_downtime_history":
		return "Checking downtime history…"
	case "get_quickfixes":
		return "Fetching quick fixes…"
	case "get_analytics":
		return "Computing uptime analytics…"
	default:
		return fmt.Sprintf("Running %s…", tc.Name)
	}
}
