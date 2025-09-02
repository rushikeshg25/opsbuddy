"use client"

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

export function ChecksChart({ serviceId }: { serviceId: string }) {
  const { data } = useQuery({
    queryKey: ['health-checks-chart', serviceId],
    queryFn: () => apiClient.getHealthCheckHistory(parseInt(serviceId), 100),
    enabled: !!serviceId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 1000, // Refetch every minute (instead of 10 seconds)
  });

  const points =
    data?.items
      ?.slice()
      .reverse()
      .map((c) => ({ 
        t: new Date(c.checked_at).toLocaleTimeString(), 
        latency: c.response_time_ms || 0, 
        status: c.status 
      })) ?? []

  return (
    <div className="h-56 w-full rounded-lg border p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <XAxis dataKey="t" hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }}
            labelStyle={{ color: "var(--color-foreground)" }}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
