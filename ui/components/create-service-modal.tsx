'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useCreateProduct } from '@/lib/hooks/use-products';
import { toast } from 'sonner';

export function CreateServiceModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [healthApi, setHealthApi] = useState('');

  const createProduct = useCreateProduct();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        health_api: healthApi.trim(),
      });

      setName('');
      setDescription('');
      setHealthApi('');
      setOpen(false);
      toast.success('Service created successfully');
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    createProduct.reset(); // Clear any previous errors
    setName('');
    setDescription('');
    setHealthApi('');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!createProduct.isPending) { if (next) setOpen(true); else handleClose(); } }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a service</DialogTitle>
          <DialogDescription>Connect a health endpoint to start tracking uptime.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {createProduct.error && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {createProduct.error instanceof Error
                  ? createProduct.error.message
                  : 'Failed to create service'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Service"
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this service do?"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthApi">Health Check URL *</Label>
            <Input
              id="healthApi"
              type="url"
              required
              pattern="https?://.*"
              aria-describedby="endpoint-help"
              value={healthApi}
              onChange={(e) => setHealthApi(e.target.value)}
              placeholder="https://api.example.com/health"
            />
          </div>

          <p id="endpoint-help" className="text-xs leading-5 text-muted-foreground">Use an HTTP or HTTPS endpoint that returns 200 when the service is healthy.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProduct.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createProduct.isPending || !name.trim() || !healthApi.trim()
              }
            >
              {createProduct.isPending ? 'Creating...' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
