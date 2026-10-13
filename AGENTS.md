# Local development

For local setup, startup, sign-in, smoke checks, logs, and shutdown, follow
[docs/local-development.md](docs/local-development.md).

Use the isolated `compose.local.yml` stack and generated `.local/` configuration.
The real stack works without external credentials: local sign-in uses the seeded
account, email is logged, and missing Gemini credentials select mock analysis.
Only request `GEMINI_API_KEY` when real AI analysis is needed. Never print or commit it.

Do not substitute `scripts/preview-api.py` for a full-stack verification; it serves
synthetic UI fixtures. Preserve local database volumes when stopping the stack.
Report which processes you started, which checks passed, and any unavailable dependencies.
