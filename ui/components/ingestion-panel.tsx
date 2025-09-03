'use client';

import { Product } from '@/lib/types/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

function IngestionPanel({ service }: { service: Product }) {
  const nodeCode = `import { OpsBuddySDK } from 'opsbuddy-sdk';

const sdk = new OpsBuddySDK({
  serviceId: "${service.id}",
  authToken: "${service.auth_token}",
  grpcEndpoint: "localhost:50051"
});

sdk.startIntercepting(); // Auto-capture console logs`;

  const copyHandler = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logs Ingestion Integration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col w-full p-4 pt-0 ">
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="font-medium">Node.js</div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>{nodeCode}</code>
            </pre>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => copyHandler(nodeCode)}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium">Go</div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>Coming Soon!</code>
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IngestionPanel;
