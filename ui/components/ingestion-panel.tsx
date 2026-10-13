"use client";
import { useState } from "react";
import { Product } from "@/lib/types/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Copy, Check, Terminal } from "lucide-react";

export default function IngestionPanel({ service }: { service: Product }) {
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = `import { OpsBuddySDK } from 'opsbuddy-sdk';\n\nconst sdk = new OpsBuddySDK({\n  serviceId: ${JSON.stringify(String(service.id))},\n  authToken: process.env.OPSBUDDY_AUTH_TOKEN,\n  grpcEndpoint: 'localhost:50051'\n});\n\nsdk.startIntercepting();\n\n// Call during your application's graceful shutdown.\n// await sdk.close();`;
  const copy = async (text: string, snippet = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (snippet) setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard unavailable. Select and copy the text.");
    }
  };
  return (
    <section className="panel p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <Terminal className="size-5 text-primary" />
        <h2 className="font-medium">Connect your Node.js service</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Collect console logs in three steps.
      </p>
      <ol className="mt-8 space-y-8">
        <li>
          <h3 className="text-sm font-medium">1. Install the SDK</h3>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
            <code>npm install opsbuddy-sdk</code>
          </pre>
        </li>
        <li>
          <h3 className="text-sm font-medium">2. Set your service token</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Save this token as OPSBUDDY_AUTH_TOKEN in your server environment.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <code className="min-w-0 flex-1 break-all text-xs">
              {showToken ? service.auth_token : "••••••••••••••••••••••••"}
            </code>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={showToken}
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? "Hide" : "Reveal"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(service.auth_token)}
            >
              Copy token
            </Button>
          </div>
        </li>
        <li>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">3. Start collecting logs</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(code, true)}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-5 text-xs leading-6">
            <code>{code}</code>
          </pre>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Use your ingestion server’s address outside local development. This
            example uses the Node.js SDK; Go support is not available yet.
          </p>
        </li>
      </ol>
    </section>
  );
}
