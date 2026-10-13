'use client';
import {
  Downtime,
  LogsResponse,
  Product,
  QuickFixesResponse,
  UptimeStats,
  AppError,
} from '@/lib/types/api';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
const IngestionPanel = dynamic(() => import('./ingestion-panel'));
const LogsPanel = dynamic(() => import('./logs-panel'));
import Overview from './overview';
import { StatusBadge } from './status-badge';
const StatusPanel = dynamic(() => import('./status-panel'));
const Quickfixes = dynamic(() => import('./quickfixes'));
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';

type TabType =
  | 'overview'
  | 'status'
  | 'logs'
  | 'Ingestion Integration'
  | 'quickfixes';

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
  logsError?: Error;
  quickfixes?: QuickFixesResponse;
  isLoadingQuickfixes?: boolean;
  quickfixesError?: Error;
  onFixPageChange?: (page: number) => void;
  onLogPageChange?: (page: number) => void;
  onRefresh?: () => Promise<void>;
  onTabChange?: (tab: TabType) => void;
  isRefreshing?: boolean;
}

export function ServiceDetail({
  service,
  recentLogs,
  recentDowntime,
  uptimeStats,
  isLoadingLogs,
  logsError,
  quickfixes,
  isLoadingQuickfixes,
  quickfixesError,
  onRefresh,
  onLogPageChange,
  onFixPageChange,
  onTabChange,
  isRefreshing = false,
}: ServiceDetailProps) {
  const [tab, setTab] = useState<TabType>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const tabHandler = (tab: TabType) => {
    setTab(tab);
    onTabChange?.(tab);
  };

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      setLastUpdated(new Date());
    }
  }, [onRefresh]);

  const currentStatus = !recentDowntime ? 'unknown' : recentDowntime.some(i => !i.end_time && i.status === 'down') ? 'down' : recentDowntime.some(i => !i.end_time && i.status === 'degraded') ? 'degraded' : 'up';
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0"><div className="mb-3 flex items-center gap-3"><p className="eyebrow">Service overview</p><StatusBadge status={currentStatus}/></div><h1 className="page-title break-words">{service.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{service.description || 'No service description added.'}</p></div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} aria-label="Refresh service data"><RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}/>{isRefreshing ? 'Refreshing…' : 'Refresh'}</Button>
      </div>
      {lastUpdated && <p className="text-xs text-muted-foreground" role="status">Refresh completed at {lastUpdated.toLocaleTimeString()}</p>}
      <div role="tablist" aria-label="Service sections" className="flex gap-6 overflow-x-auto border-b">
        {(['overview','status','logs','Ingestion Integration','quickfixes'] as const).map((value,index,values) => <button key={value} id={`tab-${index}`} role="tab" aria-selected={tab === value} aria-controls="service-panel" tabIndex={tab === value ? 0 : -1} className={`shrink-0 border-b-2 px-1 pb-4 text-sm ${tab === value ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => tabHandler(value)} onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % values.length;
          else if (event.key === 'ArrowLeft') next = (index + values.length - 1) % values.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = values.length - 1;
          else return;
          event.preventDefault(); tabHandler(values[next]); document.getElementById(`tab-${next}`)?.focus();
        }}>{{overview:'Overview',status:'Incidents',logs:'Logs','Ingestion Integration':'SDK setup',quickfixes:'Quick fixes'}[value]}</button>)}
      </div>
      <div id="service-panel" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${['overview','status','logs','Ingestion Integration','quickfixes'].indexOf(tab)}`}>
      {tab === 'overview' ? (
        <Overview
          service={service}
          uptimeStats={uptimeStats}
          recentDowntime={recentDowntime}
          recentLogs={recentLogs}
          tabHandler={tabHandler}
        />
      ) : tab === 'status' ? (
        <StatusPanel
          service={service}
          recentDowntime={recentDowntime}
          uptimePercentage={uptimeStats?.uptime30d?.uptime_percentage}
        />
      ) : tab === 'logs' ? (
        <LogsPanel
          logs={recentLogs}
          onPageChange={onLogPageChange}
          isLoading={isLoadingLogs}
          error={logsError}
          formatTimestamp={formatTimestamp}
        />
      ) : tab === 'Ingestion Integration' ? (
        <IngestionPanel service={service} />
      ) : tab === 'quickfixes' ? (
        <Quickfixes
          quickfixes={quickfixes}
          onPageChange={onFixPageChange}
          isLoading={isLoadingQuickfixes}
          error={quickfixesError}
        />
      ) : null}
      </div>
    </div>
  );
}

const formatTimestamp = (timestamp: string | undefined | null) => {
  if (!timestamp) {
    return 'No timestamp';
  }
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
};
