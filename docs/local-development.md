# Run OpsBuddy locally

Use this guide when an agent needs to start the **real local stack**. Run commands
from the repository root: the directory containing `compose.local.yml`, `http/`,
and `ui/`. In the original T3 workspace, this is the `source/` directory.

No external credentials are required for the default setup. The helper generates
local session secrets. Sign-in uses the seeded test account. Email appears in the
notification worker's output. AI analysis uses the existing mock fallback unless
you provide `GEMINI_API_KEY`.

This is separate from `scripts/preview-api.py`, which only serves synthetic UI
responses. Do not run that fixture API while running this stack: both use port 8080.

## 1. Check prerequisites

Install these tools before starting:

- Docker with Compose v2.20 or later, and a running Docker daemon.
- Go 1.24.6 or later. Some modules require 1.24.6 even though the HTTP module uses 1.23.5.
- Node.js 20.9 or later, Bun 1.1.24 or later, and Python 3.10 or later.
- `curl`. A host PostgreSQL installation is not required; use `psql` inside the database container.

```bash
docker info
docker compose version
go version
node --version
bun --version
python3 --version
```

If `docker info` cannot connect, start Docker Desktop or your configured Docker
engine first. Do not replace TimescaleDB with ordinary PostgreSQL: the consumer
requires the TimescaleDB extension and a logs hypertable.

Check that these ports are free. Do not stop unrelated processes to free a port.
Some services hard-code their endpoints, so changing only Compose ports will not work.

| Port | Component | Local URL or purpose |
| --- | --- | --- |
| 3000 | Next.js UI | `http://localhost:3000` |
| 8080 | Go HTTP API | `http://localhost:8080/health` |
| 50051 | Log ingestion | gRPC endpoint `localhost:50051` |
| 3500 | Local demo | `http://127.0.0.1:3500/health` |
| 5433 | TimescaleDB | Database `opsbuddy_local` |
| 6379 | Redis | Local token cache and rate limiting |
| 9094 | Kafka | Host clients use `localhost:9094` |
| 8088 | Kafka UI | `http://localhost:8088` |
| 8090 | One-use login helper | Exits after login or five minutes |

On macOS, use `lsof -nP -iTCP -sTCP:LISTEN` to inspect listeners. On Linux, use
`ss -ltnp`. The Compose ports, demo, and login helper bind to loopback. The existing
Go API and gRPC server bind to all interfaces; use this setup on a trusted local workstation.

## 2. Generate local configuration

```bash
python3 scripts/local-env.py
source .local/env.sh
source .local/ai.env
```

The generator does not overwrite existing files. `.local/` is ignored by Git.
Files containing credentials have mode `0600`. Keep them local and do not print
their contents into agent transcripts.

`env.sh` includes both database variable conventions used in this repository:

| Consumers | Required database names |
| --- | --- |
| HTTP API and ping worker | `DB_DATABASE`, `DB_USERNAME`, `DB_HOST`, `DB_PORT`, `DB_PASSWORD`, `DB_SCHEMA` |
| Ingestion, consumer, and notification workers | `DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PORT`, `DB_PASSWORD`, `DB_SSLMODE` |

Both point to `opsbuddy_local` on `127.0.0.1:5433`. The local database password in
Compose is deliberately a development default. `JWT_SECRET` and `SESSION_SECRET`
are generated randomly and reused on subsequent starts.

`KAFKA_TOPIC=notifications` is for the ping and notification workers. The ingestion
and log consumer currently use the `logs` topic and `localhost:9094` in code.
Do not change the shared variable to `logs`.

### Optional: real AI analysis

Edit the ignored `.local/ai.env` file locally and set:

```bash
export GEMINI_API_KEY='your-own-key'
```

Do not ask an agent to invent a key or put a real key into this document. An agent
should use the key already configured locally, or request it through a private
secret input when real AI analysis is requested. No key is needed to run the rest
of the system.

The default model is `gemini-2.5-flash`. Change `GEMINI_MODEL` in `.local/env.sh` if
your account requires another supported model. Restart the notification worker
after changing the key or model. The worker reads these values only at startup.
AI failures can also fall back to mock suggestions; inspect notification output
to distinguish real analysis from fallback output.

SMTP credentials stay empty. `MOCK EMAIL` output is expected; this setup does not
send real email. Google OAuth credentials also stay empty. Use the local sign-in
step below instead of the Google button.

## 3. Install dependencies and build the Go services

```bash
mkdir -p .local/bin .local/run
(cd ui && bun install --frozen-lockfile)
(cd sdk/node && bun install --frozen-lockfile && bun run build)

opsbuddy_root="$(pwd)"
(cd http && go build -o "$opsbuddy_root/.local/bin/http" ./cmd/api)
(cd http && go build -o "$opsbuddy_root/.local/bin/seed" ./cmd/seed)
for module in log-ingestion-service log-consumer-service notification-service ping-service; do
  (cd "$module" && go build -o "$opsbuddy_root/.local/bin/$module" .)
done
```

Use the SDK built in `sdk/node`. The helper demo imports that build directly.
The older `demo/working-app/package.json` names a different package from its source
import, so it is not the default path for this runbook.

## 4. Start infrastructure and initialize the database

```bash
docker compose -f compose.local.yml up -d --wait --wait-timeout 180
docker compose -f compose.local.yml ps

docker compose -f compose.local.yml exec -T timescaledb \
  psql -U postgres -d opsbuddy_local -v ON_ERROR_STOP=1 \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' \
  -c 'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'

source .local/env.sh
source .local/ai.env
.local/bin/seed

docker compose -f compose.local.yml exec -T timescaledb \
  psql -U postgres -d opsbuddy_local -v ON_ERROR_STOP=1 \
  < scripts/local-bootstrap.sql

docker compose -f compose.local.yml exec -T timescaledb \
  psql -U postgres -d opsbuddy_local -v ON_ERROR_STOP=1 \
  < migrations/001_read_path_indexes.sql

for topic in logs notifications; do
  docker compose -f compose.local.yml exec -T kafka \
    /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server kafka:9092 --create --if-not-exists \
    --topic "$topic" --partitions 2 --replication-factor 1
done
```

**Keep this order.** UUID support must exist before GORM creates the tables. The
seed command creates all five application tables, test user ID 1, two services,
and synthetic history. The local bootstrap points those test services at the demo
and converts existing logs into a TimescaleDB hypertable using `migrate_data`.
It also keeps the user ID sequence ahead of the seeded account.

The consumer attempts hypertable setup before its own migration. Starting it
against an empty database fails. Its default conversion does not migrate seeded
rows, so complete `local-bootstrap.sql` before starting the consumer.

These commands can be rerun against this isolated local database. Do not use
`pg_init.sql` for this workflow: its older log column names do not match the
current Go models. The bootstrap refuses databases other than `opsbuddy_local`.

Extract the demo's service ID and token without displaying the token:

```bash
umask 077
docker compose -f compose.local.yml exec -T timescaledb \
  psql -U postgres -d opsbuddy_local -At -v ON_ERROR_STOP=1 \
  -c "SELECT 'export OPSBUDDY_SERVICE_ID=' || id || E'\\nexport OPSBUDDY_AUTH_TOKEN=' || auth_token FROM products WHERE user_id = 1 AND name = 'API Gateway Service' ORDER BY id LIMIT 1" \
  > .local/demo.env
test -s .local/demo.env
```

If `test` fails, inspect seed output before proceeding. Do not use the placeholder
token from the older demo or SDK examples.

## 5. Start the applications

Run each command in a **separate terminal or managed agent process session**,
from the repository root. Each command sources the same local environment.
Record the returned process/session handle and component name. Keep output in the
session, or redirect it to a named file under `.local/run/`.

Start the API, ingestion, consumer, notification worker, and demo before starting
the ping worker. This prevents setup from looking like a demo outage.

**HTTP API**

```bash
(source .local/env.sh; source .local/ai.env; exec .local/bin/http)
```

**gRPC log ingestion**

```bash
(source .local/env.sh; source .local/ai.env; exec .local/bin/log-ingestion-service)
```

**Kafka log consumer**

```bash
(source .local/env.sh; source .local/ai.env; exec .local/bin/log-consumer-service)
```

**Notification worker**

```bash
(source .local/env.sh; source .local/ai.env; exec .local/bin/notification-service)
```

**Monitored demo service**

```bash
(source .local/env.sh; source .local/demo.env; exec node scripts/local-demo.mjs)
```

**Ping worker**

```bash
(source .local/env.sh; source .local/ai.env; exec .local/bin/ping-service)
```

**Next.js UI**

```bash
(source .local/env.sh; cd ui; exec bun run dev --hostname 127.0.0.1 --port 3000)
```

Use port **3000**, not the UI-only preview port 3100. The real API's CORS origins
and OAuth redirect currently include `http://localhost:3000`.

## 6. Sign in without Google credentials

After the API and UI are ready, run this from a separate terminal:

```bash
(source .local/env.sh; exec python3 scripts/local-login.py)
```

Open the one-use `http://localhost:8090/login/...` URL printed by the helper.
An agent can navigate its browser to that URL. The helper sets the normal HTTP-only
`auth_token` cookie for test user ID 1, then redirects to
`http://localhost:3000/services`. It exits after a successful login, or after five
minutes without a login.

Use **localhost** in the browser, not `127.0.0.1`: cookies are hostname-specific.
The session lasts one day. Run the helper again if you sign out or the session
expires. Do not click “Continue with Google” in this local workflow.

The helper is a development tool, not an API authentication bypass. It requires
`APP_ENV=local`, `DB_DATABASE=opsbuddy_local`, and `DB_HOST=127.0.0.1`; it binds only
to loopback and accepts its random one-use URL. It does not change production auth.

## 7. Verify the full path

Check basic availability:

```bash
curl --fail http://localhost:8080/health
curl --fail http://127.0.0.1:3500/health
docker compose -f compose.local.yml exec -T redis redis-cli ping
docker compose -f compose.local.yml exec -T kafka \
  /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
```

Expect `HEALTHY`, `{"status":"healthy"}`, `PONG`, and both Kafka topics.

The demo sends one real SDK log every five seconds. After about 15 seconds, check
that new demo messages reached TimescaleDB. Seeded history alone does not prove ingestion.

```bash
docker compose -f compose.local.yml exec -T timescaledb \
  psql -U postgres -d opsbuddy_local -v ON_ERROR_STOP=1 \
  -c "SELECT timestamp, log_data FROM logs WHERE log_data LIKE '%Local demo%' ORDER BY timestamp DESC LIMIT 5;"
```

In the browser, open **API Gateway Service → Logs**. Confirm that current demo
messages appear. Also check **Incidents**, **SDK setup**, and **Quick fixes**.
The second seeded service uses the same demo health endpoint but does not receive
the demo's live SDK logs.

Exercise an outage without stopping the demo process:

```bash
curl --fail -X POST http://127.0.0.1:3500/fail
```

Wait roughly 30–60 seconds for the ping retries, Kafka notification, and analysis.
Both seeded services share the endpoint, so both can record an incident. Check
worker output for the notification and `MOCK EMAIL`, or real Gemini analysis if
you configured a key. Refresh the detail page to see downtime and suggestions.
Then recover the endpoint:

```bash
curl --fail -X POST http://127.0.0.1:3500/recover
```

Wait for the next successful ping and refresh again. Suggestions can be absent if
the notification arrived before the downtime transaction was visible; the current
notification path does not guarantee atomic database/Kafka publication. Inspect
notification output rather than reporting a successful AI check from uptime alone.

For code checks, run `scripts/check.sh`. `OPSBUDDY_TEST_DSN` enables optional
PostgreSQL integration tests; point it to a disposable test database, not a shared
or production database.

## 8. Stop everything without deleting data

1. Stop the ping worker first to avoid recording shutdown as an incident.
2. Stop the demo, then ingestion. Let the consumer finish pending messages.
3. Stop the consumer, notification worker, HTTP API, and UI with Ctrl+C or SIGTERM
   through their recorded process/session handles. Stop the login helper too if it is waiting.
4. Stop the local infrastructure:

   ```bash
   docker compose -f compose.local.yml down
   ```

5. Check the listeners listed in step 1. Report any process that did not stop.

Do not use broad `pkill node`, `killall`, or `docker compose down -v` as routine
shutdown. The named database and Kafka volumes preserve local state. Redis is a
transient cache. Delete volumes only when the user explicitly requests a reset.
If Go source changes, stop and rebuild the affected binary before restarting it.

## Troubleshooting

| Symptom | Check or action |
| --- | --- |
| Docker cannot connect | Start the configured Docker engine. The CLI alone is not enough. |
| A port is already in use | Identify its owner. The old UI fixture API also uses 8080. Stop only task-owned processes. |
| `uuid_generate_v4` does not exist | Run the extension commands before seeding. |
| `relation logs does not exist` or hypertable conversion fails | Seed first, then run `local-bootstrap.sql`, then start the consumer. Do not use the legacy schema script. |
| Wrong database or missing DB credentials | Source `.local/env.sh` in every service process. Both DB variable naming conventions must be present. |
| UI CORS failures or sign-in loop | Use `localhost:3000` for the UI and `localhost:8080` for the API. Use the local login URL again. |
| Invalid ingestion token | Regenerate `.local/demo.env` from the database. Do not reuse a token from another database or an old example. |
| No current logs | Check the demo, ingestion, Redis, the `logs` topic, and the consumer in that order. |
| No real email or AI output | Empty SMTP credentials mean mock email. Missing/invalid Gemini credentials can produce fallback suggestions. |
| Notification worker starts but no events arrive | Both ping and notification workers need `KAFKA_TOPIC=notifications`. |
| A new service is not checked immediately | The ping worker discovers new products about once a minute. |

## Validation status

This runbook was checked against the current source, and the helper scripts and
Compose configuration were checked locally. The Docker daemon was unavailable
when this guide was added, so the full Docker startup and TimescaleDB conversion
were not executed in that session. An agent should perform step 7 and report the
results before claiming the whole stack works. Keep every service stopped when
finishing a documentation-only task unless the user asks to leave it running.
