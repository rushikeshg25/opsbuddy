export function StatusBadge({status}: {status:'up'|'down'|'degraded'|'unknown'}) {
  const styles = {up:'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',down:'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',degraded:'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',unknown:'bg-muted text-muted-foreground'};
  const labels = {up:'Operational',down:'Incident',degraded:'Degraded',unknown:'Unknown'};
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${styles[status]}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true"/>{labels[status]}</span>;
}
