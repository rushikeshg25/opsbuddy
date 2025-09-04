'use client';

import { Product } from '@/lib/types/api';
import { useState } from 'react';

interface StatusProps {
  service: Product;
  uptimePercentage?: number;
  incidents?: {
    start_time: string;
    end_time?: string;
    status: 'down' | 'degraded';
  }[];
}

export default function Status({
  service,
  uptimePercentage,
  incidents = [],
}: StatusProps) {
  const segments = 80;
  const [now] = useState(() => new Date());
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const segmentDurationMs = (now.getTime() - start.getTime()) / segments;

  const bars = Array.from({ length: segments }).map((_, idx) => {
    const segStart = new Date(
      start.getTime() + idx * segmentDurationMs
    ).getTime();
    const segEnd = segStart + segmentDurationMs;

    let level: 'up' | 'degraded' | 'down' = 'up';
    for (const inc of incidents) {
      const incStart = new Date(inc.start_time).getTime();
      const incEnd = inc.end_time
        ? new Date(inc.end_time).getTime()
        : now.getTime();
      const overlaps = incStart < segEnd && incEnd > segStart;
      if (overlaps) {
        if (inc.status === 'down') {
          level = 'down';
          break;
        } else if (level === 'up') {
          level = 'degraded';
        }
      }
    }

    const color =
      level === 'down'
        ? 'bg-red-500'
        : level === 'degraded'
        ? 'bg-amber-500'
        : 'bg-emerald-500';
    return <div key={idx} className={`h-3 w-2 rounded-sm ${color}`} />;
  });

  return (
    <div className="">
      <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <span
            className="font-medium truncate max-w-[220px]"
            title={service.name}
          >
            {service.name}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {typeof uptimePercentage === 'number'
              ? uptimePercentage.toFixed(3)
              : '—'}
            %
          </span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs">Operational</span>
        </div>
      </div>
      <div className="flex items-end gap-[3px] flex-wrap">{bars}</div>
    </div>
  );
}
