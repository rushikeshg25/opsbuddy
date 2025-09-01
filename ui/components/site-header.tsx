'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';

export function SiteHeader() {
  const pathname = usePathname();
  const { isAuthenticated, logout, user } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-semibold tracking-tight text-balance text-2xl"
        >
          <span className="text-primary">Ops</span>buddy
        </Link>
        <nav className="flex items-center gap-2">
          {/* Only show Services link if user is authenticated and not on services pages */}
          {isAuthenticated && !pathname?.startsWith('/services') && (
            <Link
              href="/services"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted text-foreground"
            >
              Services
            </Link>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-muted-foreground">
                  {user.name}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
