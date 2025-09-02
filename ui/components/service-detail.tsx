"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { OverviewCard, SummaryCard } from "@/components/overview-cards";
import { ChecksChart } from "@/components/checks-chart";
import useSWR from "swr";
import { Product, LogsResponse, Downtime, UptimeStats } from "@/lib/types/api";

interface ServiceDetailProps {
  service: Product;
  recentLogs?: LogsResponse;
  recentDowntime?: Downtime[];
  uptimeStats?: {
    uptime24h?: UptimeStats;
    uptime7d?: UptimeStats;
    uptime30d?: UptimeStats;
  };
  isLoadingLogs?: boolean;
}

export function ServiceDetail({
  service,
  recentLogs,
  recentDowntime,
  uptimeStats,
  isLoadingLogs,
}: ServiceDetailProps) {
  const [tab, setTab] = useState<"overview" | "status" | "logs" | "ingestion">(
    "overview"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">{service.name}</h2>
        <StatusBadge status="up" />
      </div>
      <div className="text-sm text-muted-foreground">{service.health_api}</div>
      <div className="text-sm text-muted-foreground">{service.description}</div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "overview"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
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
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "logs" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          onClick={() => setTab("logs")}
        >
          Logs
        </button>

        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "ingestion"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
          onClick={() => setTab("ingestion")}
        >
          Ingestion
        </button>
      </div>

      {tab === "overview" ? (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <OverviewCard serviceId={service.id} />
              <SummaryCard serviceId={service.id} />
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">
                  Last checked
                </div>
                <div className="mt-1 text-sm">
                  {new Date(service.updated_at).toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  30-day uptime
                </div>
                <div className="mt-1 text-sm">
                  {uptimeStats?.uptime30d?.uptime_percentage
                    ? `${uptimeStats.uptime30d.uptime_percentage.toFixed(2)}%`
                    : "—"}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <ChecksChart serviceId={service.id.toString()} />
            </div>

            {/* Uptime Stats */}
            {(uptimeStats?.uptime24h ||
              uptimeStats?.uptime7d ||
              uptimeStats?.uptime30d) && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {uptimeStats?.uptime24h && (
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">
                      24h uptime
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {uptimeStats.uptime24h.uptime_percentage.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {uptimeStats.uptime24h.incident_count} incidents
                    </div>
                  </div>
                )}
                {uptimeStats?.uptime7d && (
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">
                      7d uptime
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {uptimeStats.uptime7d.uptime_percentage.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {uptimeStats.uptime7d.incident_count} incidents
                    </div>
                  </div>
                )}
                {uptimeStats?.uptime30d && (
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">
                      30d uptime
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {uptimeStats.uptime30d.uptime_percentage.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {uptimeStats.uptime30d.incident_count} incidents
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Downtime */}
            {recentDowntime && recentDowntime.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">Recent Incidents</h3>
                <div className="space-y-2">
                  {recentDowntime.slice(0, 5).map((incident) => (
                    <div key={incident.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              incident.status === "down"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <span className="text-sm font-medium capitalize">
                            {incident.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(incident.start_time).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Started:{" "}
                        {new Date(incident.start_time).toLocaleString()}
                        {incident.end_time && (
                          <>
                            {" "}
                            • Ended:{" "}
                            {new Date(incident.end_time).toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : tab === "status" ? (
        <Card>
          <CardContent className="p-4">
            <ChecksTable serviceId={service.id} />
          </CardContent>
        </Card>
      ) : tab === "logs" ? (
        <LogsPanel logs={recentLogs} isLoading={isLoadingLogs} />
      ) 
       : tab === "ingestion" ? (
        <IngestionPanel service={service} />
      ) : null}
    </div>
  );
}

function ChecksTable({ serviceId }: { serviceId: number }) {
  const fetcher = (u: string) => fetch(u).then((r) => r.json());
  const { data } = useSWR<{
    items: { at: string; status: "up" | "down"; responseTimeMs: number }[];
  }>(`/api/services/${serviceId}/checks?limit=100`, fetcher);

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
  );
}

function LogsPanel({
  logs,
  isLoading,
}: {
  logs?: LogsResponse;
  isLoading?: boolean;
}) {
  // Parse log data from the API response
  const parsedLogs =
    logs?.logs?.map((log) => {
      try {
        const parsed = JSON.parse(log.log_data);
        return {
          ts: log.timestamp,
          level: parsed.level || "info",
          message: parsed.message || "No message",
          fields: JSON.stringify(parsed).substring(0, 100) + "...",
        };
      } catch {
        return {
          ts: log.timestamp,
          level: "info",
          message: log.log_data,
          fields: "{}",
        };
      }
    }) || [];

  const sample =
    parsedLogs.length > 0
      ? parsedLogs
      : [
          {
            ts: "2025-09-01T10:10:05Z",
            level: "info",
            message: "Started request GET /api/users",
            fields: "{trace=2f1a…}",
          },
          {
            ts: "2025-09-01T10:10:06Z",
            level: "warn",
            message: "Cache miss for users:list",
            fields: "{key=users:list}",
          },
          {
            ts: "2025-09-01T10:10:07Z",
            level: "error",
            message: "DB timeout after 5s",
            fields: "{sql=SELECT …}",
          },
        ];
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Logs</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:max-w-md">
            <Input
              placeholder="Search logs (message, fields)"
              aria-label="Search logs"
            />
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              aria-label="Level"
            >
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
            <Button size="sm" type="button" disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
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
                  <td className="truncate text-xs text-muted-foreground">
                    {r.fields}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing {sample.length} of {logs?.total || sample.length}
          </div>
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
  );
}





function IngestionPanel({ service }: { service: Product }) {
  const exampleBody = `{
  "logs": [
    { "ts": "2025-09-01T10:10:05Z", "level": "info", "message": "hello world", "fields": { "env": "prod" } },
    { "ts": "2025-09-01T10:10:06Z", "level": "error", "message": "db timeout", "fields": { "sql": "SELECT ..." } }
  ]
}`;
  const curl = `curl -X POST https://your.opsbuddy.domain/api/ingest/logs \\
  -H "content-type: application/json" \\
  -H "X-Opsbuddy-Service-Id: ${service.id}" \\
  -H "X-Opsbuddy-Signature: <hmac-sha256-of-body>" \\
  -d '${exampleBody.replace(/\n/g, "\\n")}'`;
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
              Send batched JSON logs with HMAC signature headers. Use gzip when
              possible and retry with backoff on 5xx.
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Headers</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <span className="font-mono">
                  content-type: application/json
                </span>
              </li>
              <li>
                <span className="font-mono">
                  X-Opsbuddy-Service-Id: {service.id}
                </span>
              </li>
              <li>
                <span className="font-mono">
                  X-Opsbuddy-Signature: &lt;hmac-sha256-of-body&gt;
                </span>
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
  );
}

