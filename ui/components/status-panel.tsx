'use client';
import { Product, Downtime } from '@/lib/types/api';
import { StatusBadge } from './status-badge';
import { Activity } from 'lucide-react';

export default function StatusPanel({service,recentDowntime,uptimePercentage}:{service:Product;recentDowntime?:Downtime[];uptimePercentage?:number}) {
  const now = Date.now();
  const incidents = recentDowntime ?? [];
  const status = !recentDowntime ? 'unknown' : incidents.some(i=>!i.end_time && i.status==='down') ? 'down' : incidents.some(i=>!i.end_time && i.status==='degraded') ? 'degraded' : 'up';
  const days = Array.from({length:30},(_,index)=> {
    const start = now - (30-index)*86400000;
    const end = start + 86400000;
    const affected = incidents.some(i=>Date.parse(i.start_time)<end && (i.end_time ? Date.parse(i.end_time) : now)>start);
    const known = recentDowntime !== undefined && Date.parse(service.created_at) <= start;
    return {date:new Date(start).toLocaleDateString(),label:!known?'No complete history':affected?'Incident recorded':'No incidents',className:!known?'bg-muted':affected?'bg-amber-500':'bg-primary/65'};
  });
  return <div className="space-y-6">
    <section className="panel p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">30-day incident history</p><p className="metric mt-3">{uptimePercentage===undefined?'—':`${uptimePercentage.toFixed(2)}%`}</p></div><StatusBadge status={status}/></div><div className="mt-7 grid grid-cols-30 gap-1" role="img" aria-label={`${incidents.length} incidents in the reporting window. Each bar represents one day; incident details follow below.`}>{days.map((day,index)=><div key={index} title={`${day.date}: ${day.label}`} className={`h-10 min-w-0 rounded-sm ${day.className}`}/>)}</div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>30 days ago</span><span>Today</span></div><p className="mt-5 text-xs text-muted-foreground">Teal: no recorded incidents · Amber: incident recorded · Gray: no complete history. This view uses incident records, not individual probe results.</p></section>
    <section className="panel overflow-hidden"><div className="border-b p-5"><h2 className="text-sm font-medium">Incident timeline</h2></div>{!recentDowntime ? <p className="empty-state">Incident data unavailable.</p> : !incidents.length ? <div className="empty-state"><Activity className="mx-auto mb-3 size-6"/><p>No recorded incidents in this period.</p></div> : <ol className="divide-y">{incidents.map(incident=><li key={incident.id} className="flex flex-wrap justify-between gap-4 p-5"><div><div className="flex items-center gap-3"><span className={`size-2 rounded-full ${incident.end_time?'bg-primary':'bg-amber-500'}`}/><h3 className="text-sm font-medium">{incident.end_time?'Resolved incident':'Ongoing incident'}</h3></div><p className="mt-2 text-xs text-muted-foreground">Started {new Date(incident.start_time).toLocaleString()}</p>{incident.end_time && <p className="mt-1 text-xs text-muted-foreground">Ended {new Date(incident.end_time).toLocaleString()}</p>}</div><span className="text-sm tabular-nums">{Math.max(1,Math.round(((incident.end_time?Date.parse(incident.end_time):now)-Date.parse(incident.start_time))/60000))} min{!incident.end_time?' so far':''}</span></li>)}</ol>}</section>
  </div>;
}
