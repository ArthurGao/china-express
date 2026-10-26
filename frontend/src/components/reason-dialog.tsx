"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Rollbacks, holds, reversals, voids and merges are audited with a mandatory reason (AGENTS.md rule 6), so they go
 * through this dialog; nothing is sent until a reason of at least 3 characters is given.
 */
export function ReasonDialog({ trigger, title, description, confirmLabel, pending = false, destructive = false, onConfirm, triggerVariant = "outline", triggerClassName }: {
  trigger: string; title: string; description?: string; confirmLabel: string; pending?: boolean; destructive?: boolean;
  onConfirm: (reason: string) => void; triggerVariant?: "outline" | "default" | "ghost" | "destructive"; triggerClassName?: string;
}) {
  const t = useTranslations("reasonDialog");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);

  function confirm() {
    if (reason.trim().length < 3) return setInvalid(true);
    onConfirm(reason.trim());
    setOpen(false);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setInvalid(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} className={triggerClassName}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="reason-dialog-reason">{t("reason")}</Label>
          <Textarea id="reason-dialog-reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={invalid} />
          {invalid && <p className="text-sm text-destructive">{t("invalid")}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={confirm} disabled={pending}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
