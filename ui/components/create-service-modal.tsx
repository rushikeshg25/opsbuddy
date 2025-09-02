"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useCreateProduct } from "@/lib/hooks/use-products";

interface CreateServiceModalProps {}

export function CreateServiceModal({}: CreateServiceModalProps = {}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [healthApi, setHealthApi] = useState("");
  
  const createProduct = useCreateProduct();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createProduct.mutateAsync({
        name,
        description,
        health_api: healthApi,
      });

      // Reset form and close modal
      setName("");
      setDescription("");
      setHealthApi("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating service:", error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    createProduct.reset(); // Clear any previous errors
    setName("");
    setDescription("");
    setHealthApi("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {createProduct.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your service"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthApi">Health Check URL</Label>
            <Input
              id="healthApi"
              type="url"
              value={healthApi}
              onChange={(e) => setHealthApi(e.target.value)}
              placeholder="https://api.example.com/health"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProduct.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending || !name.trim()}>
              {createProduct.isPending ? "Creating..." : "Create Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
