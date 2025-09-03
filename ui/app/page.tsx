import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';
import { Activity, Gauge, FileDown, Wand2, Bell, Radio } from 'lucide-react';

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12">
        <div className="mx-auto max-w-3xl text-center animate-in fade-in-0 duration-300">
          <h1 className="text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
            Uptime monitoring made simple
          </h1>
          <p className="mt-4 text-balance text-muted-foreground">
            Opsbuddy watches your services and surfaces incidents fast. Minimal
            noise, clear status pages, and a focused dashboard.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/services">Get started</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Real-time monitoring',
              desc: 'Live uptime tracking with instant incident detection.',
              Icon: Radio,
            },
            {
              title: 'Smart checks',
              desc: 'Pings with response time snapshots.',
              Icon: Gauge,
            },
            {
              title: 'Downtime analytics',
              desc: 'Historical incident tracking and uptime statistics.',
              Icon: Activity,
            },
            {
              title: 'Structured logs',
              desc: 'JSON log ingestion with filtering and real-time streaming.',
              Icon: FileDown,
            },
            {
              title: 'AI quick fixes',
              desc: 'Get actionable fixes from recent logs.',
              Icon: Wand2,
            },
            {
              title: 'Notifications',
              desc: 'Email alerts when incidents happen.',
              Icon: Bell,
            },
          ].map(({ title, desc, Icon }) => (
            <Card key={title} className="transition-colors">
              <CardContent className="p-5">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <div className="mt-2 font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
