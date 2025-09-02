"use client"

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function OverviewCard({ serviceId }: { serviceId: number }) {
  const { data } = useQuery({
    queryKey: ['health-checks', serviceId],
    queryFn: () => apiClient.getHealthCheckHistory(serviceId, 100),
    enabled: !!serviceId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds (instead of 10)
  });

  const latest = data?.items?.[0]
  const up = latest?.status === "up"

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">Current status</div>
      <div className="mt-1 text-xl font-semibold capitalize">{latest ? latest.status : "unknown"}</div>
      <div className="mt-3 text-xs text-muted-foreground">
        Last check: {latest ? new Date(latest.checked_at).toLocaleTimeString() : "-"}
      </div>
      <div
        className={
          "mt-3 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs " +
          (up
            ? "border-green-600/40 text-green-700 dark:text-green-400"
            : "border-red-600/40 text-red-700 dark:text-red-400")
        }
      >
        <span className={"h-1.5 w-1.5 rounded-full " + (up ? "bg-green-500" : "bg-red-500")} aria-hidden />
        {up ? "Operational" : "Degraded"}
      </div>
    </div>
  )
}

export function SummaryCard({ serviceId }: { serviceId: number }) {
  const { data } = useQuery({
    queryKey: ['health-checks-summary', serviceId],
    queryFn: () => apiClient.getHealthCheckHistory(serviceId, 100),
    enabled: !!serviceId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const total = data?.items?.length ?? 0
  const ups = data?.items?.filter((c) => c.status === "up").length ?? 0
  const uptimePct = total ? Math.round((ups / total) * 1000) / 10 : 0

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">Uptime (sample)</div>
      <div className="mt-1 text-xl font-semibold">{uptimePct}%</div>
      <div className="mt-2 text-xs text-muted-foreground">Based on recent checks</div>
    </div>
  )
}
