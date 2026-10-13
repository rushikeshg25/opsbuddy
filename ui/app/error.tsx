"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <section className="panel empty-state" role="alert">
        <h1 className="page-title text-foreground">
          This view could not load.
        </h1>
        <p className="mt-4 text-sm">Try again, or return to your services.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/services">Services</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
