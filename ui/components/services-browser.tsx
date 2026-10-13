'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, Server } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { StatusBadge } from './status-badge';
import { useRecentDowntime } from '@/lib/hooks/use-downtime';
import { useUptimeStats24h } from '@/lib/hooks/use-analytics';
import { Product } from '@/lib/types/api';

export function ServicesBrowser({ products = [] }: { products?: Product[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(p => `${p.name} ${p.description} ${p.health_api}`.toLowerCase().includes(term));
  }, [products, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  return <div className="panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
      <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true"/><Input aria-label="Search services" placeholder="Search by name or endpoint…" value={search} onChange={e => {setPage(1);setSearch(e.target.value);}} className="pl-9 bg-background"/></div>
      <span className="text-xs text-muted-foreground" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'service' : 'services'}</span>
    </div>
    <div className="hidden grid-cols-[minmax(0,1fr)_130px_120px_24px] gap-5 border-b bg-muted/40 px-6 py-3 text-xs text-muted-foreground md:grid"><span>Service / endpoint</span><span>Status</span><span>24h uptime</span><span/></div>
    <div className="divide-y">{visible.map(product => <ServiceRow key={product.id} product={product}/>)}</div>
    {!visible.length && <div className="empty-state"><Search className="mx-auto mb-3 size-6"/><h2 className="font-medium text-foreground">No matching services</h2><p className="mt-2 text-sm">Try another name or endpoint.</p><Button variant="outline" className="mt-5" onClick={() => setSearch('')}>Clear search</Button></div>}
    {totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></div>}
  </div>;
}
function ServiceRow({product}: {product:Product}) {
  const downtime = useRecentDowntime(product.id,30);
  const uptime = useUptimeStats24h(product.id);
  const status = !downtime.data ? 'unknown' : downtime.data.some(i => !i.end_time && i.status === 'down') ? 'down' : downtime.data.some(i => !i.end_time && i.status === 'degraded') ? 'degraded' : 'up';
  return <Link href={`/services/${product.id}`} className="grid gap-4 px-5 py-6 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_130px_120px_24px] md:items-center md:gap-5 md:px-6">
    <div className="flex min-w-0 items-start gap-3"><span className="rounded-lg border bg-background p-2.5 text-muted-foreground"><Server size={18}/></span><div className="min-w-0"><h2 className="font-medium">{product.name}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{product.description || 'No description'}</p><p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{product.health_api || 'No health endpoint'}</p></div></div>
    <div><StatusBadge status={downtime.isError ? 'unknown' : status}/></div><div className="text-sm tabular-nums"><span className="mr-2 text-xs text-muted-foreground md:hidden">24h uptime</span>{uptime.data ? `${uptime.data.uptime_percentage.toFixed(2)}%` : '—'}</div><ArrowUpRight className="hidden size-4 text-muted-foreground md:block"/>
  </Link>;
}
