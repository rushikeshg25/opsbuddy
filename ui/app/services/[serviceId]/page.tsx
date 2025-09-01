"use client";

import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { ServiceDetail } from "@/components/service-detail";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Service = {
  id: number;
  name: string;
  description: string;
  user_id: number;
  created_at: string;
  auth_token: string;
  health_api: string;
};

export default function ServicePage() {
  const { user, isLoading } = useRequireAuth();
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string;

  useEffect(() => {
    if (!isLoading && user) {
      fetchService();
    }
  }, [isLoading, user, serviceId]);

  const fetchService = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/products/${serviceId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.error("Product not found");
        }
        router.push("/services");
        return;
      }

      const result = await response.json();
      // The API returns data in result.data format
      setService(result.data);
    } catch (error) {
      console.error("Failed to fetch service:", error);
      router.push("/services");
    } finally {
      setIsLoadingService(false);
    }
  };

  if (isLoading || isLoadingService) {
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
        <ServiceDetail service={service} />
      </section>
    </main>
  );
}
