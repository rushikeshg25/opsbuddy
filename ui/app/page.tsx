import Link from 'next/link';
import { ArrowRight, Activity, Terminal, Bell, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';

export default function HomePage() {
  return <main>
    <SiteHeader />
    <section id="main-content" tabIndex={-1} className="page-shell">
      <div className="grid items-center gap-12 py-8 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <div>
          <p className="eyebrow mb-6 flex items-center gap-2"><span className="size-2 rounded-full bg-primary"/>Clarity for your on-call hours</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-6xl">Less guesswork.<br/><span className="text-primary">More uptime.</span></h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">See what’s running, understand what broke, and find your next step. Your services, logs, and incidents in one quiet workspace.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4"><Button asChild size="lg"><Link href="/services">Open your workspace <ArrowRight size={16}/></Link></Button><a href="#how-it-works" className="text-sm font-medium underline-offset-4 hover:underline">How it works</a></div>
          <p className="mt-5 text-xs text-muted-foreground">Health checks · Log collection · Incident insights</p>
        </div>
        <div className="panel overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4"><span className="text-sm font-medium">A clearer picture</span><span className="eyebrow">Illustrative preview</span></div>
          <div className="p-6 sm:p-8"><div className="flex items-center gap-2 text-sm text-primary"><Activity size={17}/> From signal to next step</div>
            <div className="my-8 flex items-end gap-1.5" aria-hidden="true">{Array.from({length: 32}, (_, i) => <div key={i} className={`flex-1 rounded-sm ${i === 21 || i === 22 ? 'bg-amber-400' : 'bg-primary/60'}`} style={{height: i === 21 ? 22 : i === 22 ? 32 : 48}} />)}</div>
            <div className="space-y-5">{[['01','Monitor','Check your endpoints continuously.'],['02','Investigate','Read the logs around an incident.'],['03','Resolve','Review suggested fixes with context.']].map(([n,title,description]) => <div key={n} className="flex gap-4"><span className="font-mono text-xs text-muted-foreground pt-1">{n}</span><div><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>)}</div>
          </div>
        </div>
      </div>
      <div id="how-it-works" className="mt-6 border-t pt-10"><p className="eyebrow mb-7">Everything you need to follow the signal</p><div className="grid gap-8 sm:grid-cols-3">{[{Icon:Activity,title:'Know your service health',text:'Track downtime and compare uptime across reporting periods.'},{Icon:Terminal,title:'Find the useful log',text:'Search messages and filter log levels without losing context.'},{Icon:Bell,title:'Make incidents actionable',text:'Receive email alerts and review AI suggestions based on recent logs.'}].map(({Icon,title,text}) => <div key={title}><Icon className="mb-4 size-5 text-primary"/><h2 className="font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div>
      <footer className="mt-16 flex flex-wrap justify-between gap-4 border-t pt-6 text-xs text-muted-foreground"><span>OpsBuddy · Built for service reliability</span><a href="https://github.com/rushikeshg25/opsbuddy" className="flex items-center gap-1 hover:text-foreground">View source <ArrowUpRight size={13}/></a></footer>
    </section>
  </main>;
}
