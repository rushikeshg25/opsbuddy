'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Activity, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';

export function SiteHeader() {
  const pathname = usePathname();
  const { isAuthenticated, logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">Skip to content</a>
    <header className="border-b bg-card">
      <div className="mx-auto flex min-h-18 max-w-[1208px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-10">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight" aria-label="OpsBuddy home">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Activity size={19} aria-hidden="true" /></span>OpsBuddy
          </Link>
          <nav aria-label="Main navigation" className="text-sm">
            <Link href="/services" aria-current={pathname.startsWith('/services') ? 'page' : undefined} className="text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-primary">Services</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}><Sun className="hidden size-4 dark:block"/><Moon className="size-4 dark:hidden"/></Button>
          {isAuthenticated ? <><span className="hidden max-w-32 truncate text-sm text-muted-foreground sm:block">{user?.name}</span><Button variant="outline" size="sm" onClick={() => logout()}>Sign out</Button></> : <Button asChild size="sm"><Link href="/sign-in">Sign in</Link></Button>}
        </div>
      </div>
    </header>
  </>;
}
