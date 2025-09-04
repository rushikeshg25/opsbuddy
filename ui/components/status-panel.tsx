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
      <CardHeader className="pb-0">
        <CardTitle className="text-lg">Service Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
