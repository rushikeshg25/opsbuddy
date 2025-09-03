'use client';

import { Product } from '@/lib/types/api';
import { OverviewCard, SummaryCard } from './overview-cards';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Status from './status';

interface StatusPanelProps {
  service: Product;
  recentDowntime?: import('@/lib/types/api').Downtime[];
  uptimePercentage?: number;
}

const StatusPanel = ({
  service,
  recentDowntime,
  uptimePercentage,
}: StatusPanelProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Service Status</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium mb-3">Current Status</h3>
            <OverviewCard serviceId={service.id} />
          </div>
        </div>

        <Status
          service={service}
          uptimePercentage={uptimePercentage}
          incidents={recentDowntime || []}
        />
      </CardContent>
    </Card>
  );
};

export default StatusPanel;
