package internal

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/genai"
)

// ParamSpec is a provider-agnostic description of a single tool parameter.
type ParamSpec struct {
	Type        string // "string", "integer", "number", "boolean"
	Description string
	Enum        []string
}

// ToolSpec describes a tool the model may call. It is intentionally free of any
// provider types so tools.go and agent.go stay decoupled from the LLM backend.
type ToolSpec struct {
	Name        string
	Description string
	Parameters  map[string]ParamSpec
	Required    []string
}

// ToolCall is a model request to invoke a tool.
type ToolCall struct {
	Name string
	Args map[string]any
}

// Message is one entry in the conversation.
//
//	role "user"      -> Content is the user's text
//	role "assistant" -> Content is text and/or ToolCalls were issued
//	role "tool"      -> Content is the result of ToolName
type Message struct {
	Role      string
	Content   string
	ToolCalls []ToolCall
	ToolName  string
}

// Turn is one model response: either final text or a set of tool calls.
type Turn struct {
	Text      string
	ToolCalls []ToolCall
}

// LLMProvider is the seam that makes the model backend swappable. To switch to
// Claude/OpenAI, add a new file implementing this interface and construct it in
// main.go; agent.go and tools.go do not change.
type LLMProvider interface {
	Generate(ctx context.Context, system string, msgs []Message, tools []ToolSpec) (*Turn, error)
}

// --- Gemini implementation ---

type GeminiProvider struct {
	client *genai.Client
	model  string
}

func NewGeminiProvider(ctx context.Context) (*GeminiProvider, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY environment variable not set")
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-2.0-flash"
	}

	return &GeminiProvider{client: client, model: model}, nil
}

func (g *GeminiProvider) Generate(ctx context.Context, system string, msgs []Message, tools []ToolSpec) (*Turn, error) {
	contents := toGenaiContents(msgs)

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{Parts: []*genai.Part{{Text: system}}},
		Tools:             []*genai.Tool{{FunctionDeclarations: toFunctionDeclarations(tools)}},
	}

	resp, err := g.client.Models.GenerateContent(ctx, g.model, contents, config)
	if err != nil {
		return nil, fmt.Errorf("gemini generate failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return &Turn{}, nil
	}

	turn := &Turn{}
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.FunctionCall != nil {
			turn.ToolCalls = append(turn.ToolCalls, ToolCall{
				Name: part.FunctionCall.Name,
				Args: part.FunctionCall.Args,
			})
		} else if part.Text != "" {
			turn.Text += part.Text
		}
	}

	return turn, nil
}

func toGenaiContents(msgs []Message) []*genai.Content {
	contents := make([]*genai.Content, 0, len(msgs))
	for _, m := range msgs {
		switch m.Role {
		case "user":
			contents = append(contents, &genai.Content{
				Role:  genai.RoleUser,
				Parts: []*genai.Part{{Text: m.Content}},
			})
		case "assistant":
			parts := []*genai.Part{}
			if m.Content != "" {
				parts = append(parts, &genai.Part{Text: m.Content})
			}
			for _, tc := range m.ToolCalls {
				parts = append(parts, &genai.Part{
					FunctionCall: &genai.FunctionCall{Name: tc.Name, Args: tc.Args},
				})
			}
			contents = append(contents, &genai.Content{Role: genai.RoleModel, Parts: parts})
		case "tool":
			contents = append(contents, &genai.Content{
				Role: genai.RoleUser,
				Parts: []*genai.Part{{
					FunctionResponse: &genai.FunctionResponse{
						Name:     m.ToolName,
						Response: map[string]any{"result": m.Content},
					},
				}},
			})
		}
	}
	return contents
}

func toFunctionDeclarations(tools []ToolSpec) []*genai.FunctionDeclaration {
	decls := make([]*genai.FunctionDeclaration, 0, len(tools))
	for _, t := range tools {
		props := map[string]*genai.Schema{}
		for name, p := range t.Parameters {
			s := &genai.Schema{Type: genaiType(p.Type), Description: p.Description}
			if len(p.Enum) > 0 {
				s.Enum = p.Enum
			}
			props[name] = s
		}
		decls = append(decls, &genai.FunctionDeclaration{
			Name:        t.Name,
			Description: t.Description,
			Parameters: &genai.Schema{
				Type:       genai.TypeObject,
				Properties: props,
				Required:   t.Required,
			},
		})
	}
	return decls
}

func genaiType(t string) genai.Type {
	switch t {
	case "integer":
		return genai.TypeInteger
	case "number":
		return genai.TypeNumber
	case "boolean":
		return genai.TypeBoolean
	default:
		return genai.TypeString
	}
}
