'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { UptimeSparkline } from './uptime-sparkline';

type Service = {
  id: number;
  name: string;
  description: string;
  user_id: number;
  created_at: string;
  auth_token: string;
  health_api: string;
};

interface ServicesBrowserProps {
  products?: Service[];
}

export function ServicesBrowser({ products = [] }: ServicesBrowserProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  // Paginate filtered products
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedProducts.map((product) => (
          <Card key={product.id} className="group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/services/${product.id}`}
                    className="text-base font-medium hover:text-primary"
                  >
                    {product.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {product.description}
                  </div>
                  {product.health_api && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Health API: {product.health_api}
                    </div>
                  )}
                </div>
                <StatusBadge status="up" />
              </div>
              <div className="mt-3">
                <UptimeSparkline serviceId={product.id.toString()} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Created: {new Date(product.created_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({filteredProducts.length} total)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


