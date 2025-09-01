"use client";

import { SiteHeader } from "@/components/site-header";
import { ServicesBrowser } from "@/components/services-browser";
import { CreateServiceModal } from "@/components/create-service-modal";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  const { user, isLoading } = useRequireAuth();
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      fetchProducts();
    }
  }, [isLoading, user]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setError(null);
      
      const response = await fetch("http://localhost:8080/api/products", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const result = await response.json();
      setProducts(result.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch products");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  if (isLoading) {
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

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your services</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, paginate, and add more endpoints to monitor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreateServiceModal onServiceCreated={fetchProducts} />
            <Button
              variant="outline"
              onClick={fetchProducts}
              disabled={isLoadingProducts}
            >
              {isLoadingProducts ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-6">
          {isLoadingProducts ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Loading products...
              </p>
            </div>
          ) : products.length > 0 ? (
            <ServicesBrowser products={products} />
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No services yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by creating your first service to monitor.
                </p>
                <CreateServiceModal onServiceCreated={fetchProducts} />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
