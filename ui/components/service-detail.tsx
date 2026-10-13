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
  onRefresh?: () => void;
  onTabChange?: (tab: TabType) => void;
  isRefreshing?: boolean;
}

// Helper function to determine current service status
const getCurrentServiceStatus = (
  recentDowntime?: Downtime[],
  uptimeStats?: {
    uptime24h?: UptimeStats;
    uptime7d?: UptimeStats;
    uptime30d?: UptimeStats;
  }
): 'up' | 'down' | 'degraded' => {
  // Check for ongoing incidents (no end_time)
  const ongoingIncidents =
    recentDowntime?.filter((incident) => !incident.end_time) || [];

  if (ongoingIncidents.length > 0) {
    // If there's an ongoing down incident, service is down
    if (ongoingIncidents.some((incident) => incident.status === 'down')) {
      return 'down';
    }
    // If there's an ongoing degraded incident, service is degraded
    if (ongoingIncidents.some((incident) => incident.status === 'degraded')) {
      return 'degraded';
    }
  }

  // Check recent uptime stats for degradation
  const recentUptime = uptimeStats?.uptime24h?.uptime_percentage;
  if (recentUptime !== undefined) {
    if (recentUptime < 95) {
      return 'down';
    } else if (recentUptime < 99) {
      return 'degraded';
    }
  }

  // Default to operational
  return 'up';
};

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
  onTabChange,
  isRefreshing = false,
}: ServiceDetailProps) {
  const [tab, setTab] = useState<TabType>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const tabHandler = (tab: TabType) => {
    setTab(tab);
    onTabChange?.(tab);
  };

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
      setLastUpdated(new Date());
    }
  }, [onRefresh]);

  const currentStatus = getCurrentServiceStatus(recentDowntime, uptimeStats);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <h2 className="text-xl font-semibold">{service.name}</h2>
          <div className="flex items-center gap-2">
            <StatusBadge status={currentStatus} />
            <span className="text-xs text-muted-foreground">
              (updated {lastUpdated.toLocaleTimeString()})
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">{service.description}</div>
      <div className="text-xs text-muted-foreground">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === 'overview'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
          onClick={() => tabHandler('overview')}
        >
          Overview
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === 'status' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
          onClick={() => tabHandler('status')}
        >
          Status
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === 'logs' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
          onClick={() => tabHandler('logs')}
        >
          Logs
        </button>

        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === 'Ingestion Integration'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
          onClick={() => tabHandler('Ingestion Integration')}
        >
          Ingestion SDK
        </button>

        <button
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === 'quickfixes'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
          onClick={() => tabHandler('quickfixes')}
        >
          Quickfixes
        </button>
      </div>

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
          isLoading={isLoadingLogs}
          error={logsError}
          formatTimestamp={formatTimestamp}
        />
      ) : tab === 'Ingestion Integration' ? (
        <IngestionPanel service={service} />
      ) : tab === 'quickfixes' ? (
        <Quickfixes
          quickfixes={quickfixes}
          isLoading={isLoadingQuickfixes}
          error={quickfixesError}
        />
      ) : null}
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
