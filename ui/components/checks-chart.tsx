"use client"

import useSWR from "swr"
import { Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ChecksChart({ serviceId }: { serviceId: string }) {
  const { data } = useSWR<{ items: { checked_at: string; latency_ms: number; status: string }[] }>(
    `/api/services/${serviceId}/checks`,
    fetcher,
    { refreshInterval: 10_000 },
  )

  const points =
    data?.items
      ?.slice()
      .reverse()
      .map((c) => ({ t: new Date(c.checked_at).toLocaleTimeString(), latency: c.latency_ms || 0, status: c.status })) ??
    []

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
