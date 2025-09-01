"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "./status-badge"
import { OverviewCard, SummaryCard } from "@/components/overview-cards"
import { ChecksChart } from "@/components/checks-chart"
import useSWR from "swr"

type Service = {
  id: string
  name: string
  url: string
  status: "up" | "down"
  responseTimeMs: number
  updatedAt: string
}

export function ServiceDetail({ service }: { service: Service }) {
  const [tab, setTab] = useState<
    "overview" | "status" | "logs" | "quickfixes" | "notifications" | "ingestion" | "ping"
  >("overview")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">{service.name}</h2>
        <StatusBadge status={service.status} />
      </div>
      <div className="text-sm text-muted-foreground">{service.url}</div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "overview" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "status" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => setTab("status")}
        >
          Status
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "logs" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          onClick={() => setTab("logs")}
        >
          Logs
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "quickfixes" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => setTab("quickfixes")}
        >
          Quick fixes
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "notifications" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => setTab("notifications")}
        >
          Notifications
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "ingestion" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => setTab("ingestion")}
        >
          Ingestion
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${tab === "ping" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          onClick={() => setTab("ping")}
        >
          Ping
        </button>
      </div>

      {tab === "overview" ? (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <OverviewCard serviceId={service.id} />
              <SummaryCard serviceId={service.id} />
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Last checked</div>
                <div className="mt-1 text-sm">{new Date(service.updatedAt).toLocaleString()}</div>
                <div className="mt-2 text-xs text-muted-foreground">Response</div>
                <div className="mt-1 text-sm">{service.responseTimeMs ? `${service.responseTimeMs} ms` : "—"}</div>
              </div>
            </div>
            <div className="mt-6">
              <ChecksChart serviceId={service.id} />
            </div>
          </CardContent>
        </Card>
      ) : tab === "status" ? (
        <Card>
          <CardContent className="p-4">
            <ChecksTable serviceId={service.id} />
          </CardContent>
        </Card>
      ) : tab === "logs" ? (
        <LogsPanel />
      ) : tab === "quickfixes" ? (
        <QuickFixesPanel />
      ) : tab === "notifications" ? (
        <NotificationsPanel />
      ) : tab === "ingestion" ? (
        <IngestionPanel service={service} />
      ) : (
        <PingPanel service={service} />
      )}
    </div>
  )
}

function ChecksTable({ serviceId }: { serviceId: string }) {
  const fetcher = (u: string) => fetch(u).then((r) => r.json())
  const { data } = useSWR<{ items: { at: string; status: "up" | "down"; responseTimeMs: number }[] }>(
    `/api/services/${serviceId}/checks?limit=100`,
    fetcher,
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="[&>th]:py-2 [&>th]:pr-4">
            <th>Time</th>
            <th>Status</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {data?.items
            ?.slice()
            .reverse()
            .map((c) => (
              <tr key={c.at} className="[&>td]:py-2 [&>td]:pr-4">
                <td>{new Date(c.at).toLocaleString()}</td>
                <td>{c.status === "up" ? "Up" : "Down"}</td>
                <td>{c.responseTimeMs ? `${c.responseTimeMs} ms` : "—"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

function LogsPanel() {
  const sample = [
    { ts: "2025-09-01T10:10:05Z", level: "info", message: "Started request GET /api/users", fields: "{trace=2f1a…}" },
    { ts: "2025-09-01T10:10:06Z", level: "warn", message: "Cache miss for users:list", fields: "{key=users:list}" },
    { ts: "2025-09-01T10:10:07Z", level: "error", message: "DB timeout after 5s", fields: "{sql=SELECT …}" },
  ]
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Logs</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:max-w-md">
            <Input placeholder="Search logs (message, fields)" aria-label="Search logs" />
            <select className="rounded-md border bg-background px-2 py-1.5 text-sm" aria-label="Level">
              <option value="">All</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button">
              Clear
            </Button>
            <Button size="sm" type="button">
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr className="[&>th]:py-2 [&>th]:pr-4">
                <th className="w-44">Time</th>
                <th className="w-20">Level</th>
                <th>Message</th>
                <th className="w-56">Fields</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((r) => (
                <tr key={r.ts} className="border-t [&>td]:py-2 [&>td]:pr-4">
                  <td>{new Date(r.ts).toLocaleString()}</td>
                  <td className="capitalize">{r.level}</td>
                  <td className="text-pretty">{r.message}</td>
                  <td className="truncate text-xs text-muted-foreground">{r.fields}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>Showing 3 of 3</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button">
              Previous
            </Button>
            <Button variant="outline" size="sm" type="button">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickFixesPanel() {
  const fixes = [
    {
      title: "Reduce DB connection timeout",
      steps: ["Set PGCONNECT_TIMEOUT=3s", "Verify p95 latency < 500ms", "Restart deployment"],
    },
    {
      title: "Warm the cache on deploy",
      steps: ["Run POST /admin/cache/warmup", "Check hit rate > 90%", "Enable background warming"],
    },
    {
      title: "Increase health check timeout",
      steps: ["Set HEALTH_TIMEOUT=3000", "Ensure /health avoids remote calls", "Return 200 quickly"],
    },
  ]
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Quick fixes</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
        {fixes.map((f) => (
          <div key={f.title} className="rounded-lg border p-4">
            <div className="font-medium">{f.title}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {f.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button size="sm" type="button">
                Copy steps
              </Button>
              <Button variant="outline" size="sm" type="button">
                Mark resolved
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function NotificationsPanel() {
  const recent = [
    { id: "1", when: "Just now", subject: "Incident opened: DB timeout", channel: "email" },
    { id: "2", when: "1h ago", subject: "Service recovered: 200 OK", channel: "email" },
  ]
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 p-4 pt-0 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-lg border p-4">
            <div className="font-medium">Channels</div>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked aria-label="Email notifications" /> Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" aria-label="Slack notifications" /> Slack
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" aria-label="Webhook notifications" /> Webhook
              </label>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium">Incident thresholds</div>
            <div className="mt-3 grid gap-2">
              <Label htmlFor="threshold">Consecutive failures</Label>
              <Input id="threshold" placeholder="e.g., 3" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-medium">Recent notifications</div>
          <div className="mt-3 space-y-3">
            {recent.map((n) => (
              <div key={n.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{n.when}</span>
                  <span className="uppercase">{n.channel}</span>
                </div>
                <div className="mt-1 text-sm">{n.subject}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 p-4">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="button">Save preferences</Button>
      </CardFooter>
    </Card>
  )
}

function IngestionPanel({ service }: { service: Service }) {
  const exampleBody = `{
  "logs": [
    { "ts": "2025-09-01T10:10:05Z", "level": "info", "message": "hello world", "fields": { "env": "prod" } },
    { "ts": "2025-09-01T10:10:06Z", "level": "error", "message": "db timeout", "fields": { "sql": "SELECT ..." } }
  ]
}`
  const curl = `curl -X POST https://your.opsbuddy.domain/api/ingest/logs \\
  -H "content-type: application/json" \\
  -H "X-Opsbuddy-Service-Id: ${service.id}" \\
  -H "X-Opsbuddy-Signature: <hmac-sha256-of-body>" \\
  -d '${exampleBody.replace(/\n/g, "\\n")}'`
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Logs ingestion</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">HTTP endpoint</div>
            <div className="mt-1 font-mono text-sm">POST /api/ingest/logs</div>
            <div className="mt-3 text-sm">
              Send batched JSON logs with HMAC signature headers. Use gzip when possible and retry with backoff on 5xx.
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Headers</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <span className="font-mono">content-type: application/json</span>
              </li>
              <li>
                <span className="font-mono">X-Opsbuddy-Service-Id: {service.id}</span>
              </li>
              <li>
                <span className="font-mono">X-Opsbuddy-Signature: &lt;hmac-sha256-of-body&gt;</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border p-4">
            <div className="font-medium">Example body</div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>{exampleBody}</code>
            </pre>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium">Example curl</div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>{curl}</code>
            </pre>
            <div className="mt-3 flex gap-2">
              <Button size="sm" type="button">
                Copy
              </Button>
              <Button variant="outline" size="sm" type="button">
                Download snippet
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PingPanel({ service }: { service: Service }) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Ping</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="ping-url">URL</Label>
            <Input id="ping-url" defaultValue={service.url} placeholder="https://api.example.com/health" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ping-method">Method</Label>
              <select id="ping-method" className="rounded-md border bg-background px-2 py-2 text-sm">
                <option>GET</option>
                <option>HEAD</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ping-timeout">Timeout (ms)</Label>
              <Input id="ping-timeout" placeholder="3000" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ping-headers">Headers (JSON)</Label>
            <Textarea id="ping-headers" placeholder='{"accept":"application/json"}' rows={5} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="ping-body">Body (optional)</Label>
            <Textarea id="ping-body" placeholder='{"probe":true}' rows={10} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button">
              Reset
            </Button>
            <Button type="button">Send ping</Button>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Result</div>
            <div className="mt-2 text-xs">
              No request performed. Configure and click “Send ping” to preview a sample response here.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
