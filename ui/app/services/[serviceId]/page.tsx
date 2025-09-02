"use client";

import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { ServiceDetail } from "@/components/service-detail";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { useProduct } from "@/lib/hooks/use-products";
import { useLogsRealtime } from "@/lib/hooks/use-logs";
import { useRecentDowntime } from "@/lib/hooks/use-downtime";
import { useUptimeStats24h, useUptimeStats7d, useUptimeStats30d } from "@/lib/hooks/use-analytics";
import { useParams, useRouter } from "next/navigation";

export default function ServicePage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const serviceId = parseInt(params.serviceId as string);
  
  // Fetch service data
  const { 
    data: service, 
    isLoading: isLoadingService, 
    error 
  } = useProduct(serviceId);

  // Fetch real-time logs (last 50 entries, refresh every 30 seconds)
  const { data: recentLogs, isLoading: isLoadingLogs } = useLogsRealtime({
    product_id: serviceId,
    limit: 50,
  }, 30000);

  // Fetch recent downtime incidents (last 30 days)
  const { data: recentDowntime } = useRecentDowntime(serviceId, 30);

  // Fetch uptime statistics for different periods
  const { data: uptime24h } = useUptimeStats24h(serviceId);
  const { data: uptime7d } = useUptimeStats7d(serviceId);
  const { data: uptime30d } = useUptimeStats30d(serviceId);

  // Redirect if service not found
  if (error && 'status' in error && error.status === 404) {
    router.push("/services");
    return null;
  }

  if (authLoading || isLoadingService) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Service not found</p>
        </div>
      </div>
    );
  }

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 text-sm text-muted-foreground">
          <Link href="/services" className="hover:text-foreground">
            Services
          </Link>{" "}
          / <span className="text-foreground">{service.name}</span>
        </div>
        <ServiceDetail 
          service={service} 
          recentLogs={recentLogs}
          recentDowntime={recentDowntime}
          uptimeStats={{
            uptime24h,
            uptime7d,
            uptime30d,
          }}
          isLoadingLogs={isLoadingLogs}
        />
      </section>
    </main>
  );
}
