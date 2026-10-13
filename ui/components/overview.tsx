"use client";
import { Downtime, LogsResponse, Product, UptimeStats } from "@/lib/types/api";
import { ArrowUpRight, Activity } from "lucide-react";
import { Button } from "./ui/button";

export default function Overview({
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
    tab:
      | "overview"
      | "status"
      | "logs"
      | "Ingestion Integration"
      | "quickfixes",
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["24 hours", uptimeStats?.uptime24h],
          ["7 days", uptimeStats?.uptime7d],
          ["30 days", uptimeStats?.uptime30d],
        ].map(([label, value]) => {
          const stats = value as UptimeStats | undefined;
          return (
            <section className="panel p-6" key={label as string}>
              <p className="eyebrow">Uptime · {label as string}</p>
              <p className="metric mt-5">
                {stats ? `${stats.uptime_percentage.toFixed(2)}%` : "—"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {stats
                  ? `${stats.incident_count} incidents · ${stats.total_downtime_minutes} min downtime`
                  : "Uptime data unavailable"}
              </p>
            </section>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel">
          <div className="flex items-center justify-between border-b p-5">
            <h3 className="text-sm font-medium">Recent incidents</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tabHandler("status")}
            >
              View history <ArrowUpRight size={14} />
            </Button>
          </div>
          {recentDowntime?.length ? (
            <div className="divide-y">
              {recentDowntime.slice(0, 4).map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap justify-between gap-3 p-5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {i.end_time ? "Resolved incident" : "Ongoing incident"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(i.start_time).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {i.end_time
                      ? `${Math.max(1, Math.round((Date.parse(i.end_time) - Date.parse(i.start_time)) / 60000))} min`
                      : "Investigating"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Activity className="mx-auto mb-3 size-6" />
              <p className="text-sm">
                {recentDowntime
                  ? "No incidents in this reporting period."
                  : "Incident data unavailable."}
              </p>
            </div>
          )}
        </section>
        <section className="panel p-6">
          <p className="eyebrow">Service details</p>
          <h3 className="mt-5 text-sm font-medium">Health endpoint</h3>
          <p className="mt-2 break-all rounded-lg bg-muted p-3 font-mono text-xs leading-6">
            {service.health_api || "Not configured"}
          </p>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(service.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Logs loaded</dt>
              <dd>{recentLogs ? recentLogs.logs.length : "—"}</dd>
            </div>
          </dl>
          <Button
            className="mt-6 w-full"
            variant="outline"
            onClick={() => tabHandler("Ingestion Integration")}
          >
            Connect the SDK <ArrowUpRight size={14} />
          </Button>
        </section>
      </div>
    </div>
  );
}
