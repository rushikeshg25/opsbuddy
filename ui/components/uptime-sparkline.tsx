"use client"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function UptimeSparkline({ serviceId }: { serviceId: string }) {
  const { data } = useSWR<{ items: { at: string; responseTimeMs: number }[] }>(
    `/api/services/${serviceId}/checks?limit=60`,
    fetcher,
  )

  const points =
    data?.items.map((c) => ({
      x: new Date(c.at).getTime(),
      y: c.responseTimeMs || 0,
    })) ?? []

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="y"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
