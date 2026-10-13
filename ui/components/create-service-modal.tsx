"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";
const CreateServiceDialog = dynamic(() => import("./create-service-dialog"), {
  loading: () => (
    <span role="status" className="text-xs text-muted-foreground">
      Opening form…
    </span>
  ),
});
export function CreateServiceModal() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        ref={trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Plus className="size-4" />
        Add Service
      </Button>
      {open && (
        <CreateServiceDialog
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      )}
    </>
  );
}
