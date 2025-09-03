"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function OverviewCard({ serviceId }: { serviceId: number }) {
  // Use uptime stats to determine current status since health-checks endpoint doesn't exist
  const { data: uptimeData } = useQuery({
    queryKey: ["uptime-24h", serviceId],
    queryFn: () =>
      apiClient.getUptimeStats({ product_id: serviceId, period: "24h" }),
    enabled: !!serviceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  // Determine status based on uptime percentage
  const uptimePercentage = uptimeData?.uptime_percentage || 0;
  const up = uptimePercentage >= 99.5; // Consider "up" if uptime is 99.5% or higher
  const status = up ? "up" : uptimePercentage >= 95 ? "degraded" : "down";

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">Current status</div>
      <div className="mt-1 text-xl font-semibold capitalize">{status}</div>
      <div className="mt-3 text-xs text-muted-foreground">
        24h uptime: {uptimePercentage.toFixed(1)}%
      </div>
      <div
        className={
          "mt-3 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs " +
          (up
            ? "border-green-600/40 text-green-700 dark:text-green-400"
            : "border-red-600/40 text-red-700 dark:text-red-400")
        }
      >
        <span
          className={
            "h-1.5 w-1.5 rounded-full " + (up ? "bg-green-500" : "bg-red-500")
          }
          aria-hidden
        />
        {up ? "Operational" : "Degraded"}
      </div>
    </div>
  );
}

export function SummaryCard({ serviceId }: { serviceId: number }) {
  // Use 7-day uptime stats for summary
  const { data } = useQuery({
    queryKey: ["uptime-7d", serviceId],
    queryFn: () =>
      apiClient.getUptimeStats({ product_id: serviceId, period: "7d" }),
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const uptimePct = data?.uptime_percentage || 0;

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">7-day uptime</div>
      <div className="mt-1 text-xl font-semibold">{uptimePct.toFixed(1)}%</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {data?.incident_count || 0} incidents
      </div>
    </div>
  );
}
