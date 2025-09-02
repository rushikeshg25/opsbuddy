package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"google.golang.org/genai"
)

type LLMClient struct {
	client *genai.Client
	model  string
}

type QuickFix struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"` // "high", "medium", "low"
}

type AnalysisResult struct {
	Summary    string     `json:"summary"`
	QuickFixes []QuickFix `json:"quick_fixes"`
}

func NewLLMClient() *LLMClient {
	ctx := context.Background()

	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		log.Printf("Warning: Failed to create Gemini client: %v", err)
		return &LLMClient{client: nil, model: "gemini-2.5-flash"}
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-2.5-flash" // Default model
	}

	return &LLMClient{
		client: client,
		model:  model,
	}
}

func (llm *LLMClient) AnalyzeLogs(ctx context.Context, logs []Log, serviceName, serviceDescription string) (*AnalysisResult, error) {
	if llm.client == nil {
		log.Printf("Gemini client not available, using mock analysis")
		return llm.getMockAnalysis(serviceName), nil
	}

	logMessages := make([]string, len(logs))
	for i, log := range logs {
		logMessages[i] = fmt.Sprintf("[%s] %s", log.Timestamp.Format("2006-01-02 15:04:05"), log.LogData)
	}

	serviceContext := fmt.Sprintf("Service Name: %s", serviceName)
	if serviceDescription != "" {
		serviceContext += fmt.Sprintf("\nService Description: %s", serviceDescription)
	}

	prompt := fmt.Sprintf(`You are an expert DevOps engineer analyzing logs from a failed service. Analyze the logs and provide actionable quick fixes.

%s

Here are the last %d log entries before the service went down:

%s

Based on these logs, provide:
1. A concise summary of the likely root cause (1-2 sentences)
2. 2-3 specific, actionable quick fixes ordered by priority

Look for common failure patterns:
- Memory/CPU exhaustion
- Database connection issues
- Network timeouts
- Authentication failures
- Configuration errors
- Dependency failures

Respond ONLY in valid JSON format:
{
  "summary": "Brief explanation of the likely cause",
  "quick_fixes": [
    {
      "title": "Specific actionable fix title",
      "description": "Detailed step-by-step description of how to implement this fix",
      "priority": "high"
    },
    {
      "title": "Second fix title", 
      "description": "Detailed description",
      "priority": "medium"
    }
  ]
}

Make fixes specific to the error patterns you see in the logs. If no clear pattern emerges, provide general troubleshooting steps.`,
		serviceContext, len(logs), strings.Join(logMessages, "\n"))

	result, err := llm.client.Models.GenerateContent(
		ctx,
		llm.model,
		genai.Text(prompt),
		nil,
	)
	if err != nil {
		log.Printf("Gemini API error: %v", err)
		return llm.getMockAnalysis(serviceName), nil
	}

	responseContent := result.Text()

	responseContent = strings.TrimSpace(responseContent)
	if strings.HasPrefix(responseContent, "```json") {
		responseContent = strings.TrimPrefix(responseContent, "```json")
		responseContent = strings.TrimSuffix(responseContent, "```")
		responseContent = strings.TrimSpace(responseContent)
	}

	var analysisResult AnalysisResult
	if err := json.Unmarshal([]byte(responseContent), &analysisResult); err != nil {
		log.Printf("Failed to parse Gemini response: %v\nResponse content: %s\n", err, responseContent)
		return llm.getMockAnalysis(serviceName), nil
	}

	if analysisResult.Summary == "" || len(analysisResult.QuickFixes) == 0 {
		log.Printf("Gemini returned empty results, using fallback\n")
		return llm.getMockAnalysis(serviceName), nil
	}

	log.Printf("Gemini analysis successful: %d quick fixes generated", len(analysisResult.QuickFixes))
	return &analysisResult, nil
}

func (llm *LLMClient) getMockAnalysis(serviceName string) *AnalysisResult {
	return &AnalysisResult{
		Summary: fmt.Sprintf("Service %s appears to have failed. Common causes include resource exhaustion, configuration issues, or dependency failures.", serviceName),
		QuickFixes: []QuickFix{
			{
				Title:       "Check Resource Usage",
				Description: "Monitor CPU, memory, and disk usage. Scale up resources if needed.",
				Priority:    "high",
			},
			{
				Title:       "Restart Service",
				Description: "Try restarting the service to clear any temporary issues.",
				Priority:    "medium",
			},
			{
				Title:       "Review Recent Changes",
				Description: "Check recent deployments or configuration changes that might have caused the issue.",
				Priority:    "medium",
			},
		},
	}
}
