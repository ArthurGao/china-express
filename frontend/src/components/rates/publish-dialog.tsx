"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Publishing is irreversible and audited, so it goes through the app's dialog with a mandatory reason.
export function PublishDialog({ version, effectiveFrom, pending, onConfirm }: {
  version: number; effectiveFrom: string; pending: boolean; onConfirm: (reason: string) => void;
}) {
  const t = useTranslations("rates.publish");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);

  function confirm() {
    if (reason.trim().length < 3) return setInvalid(true);
    onConfirm(reason.trim());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setInvalid(false); }}>
      <DialogTrigger asChild>
        <Button size="sm">{t("open")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { version })}</DialogTitle>
          <DialogDescription>{t("body", { date: effectiveFrom })}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="publish-reason">{t("reason")}</Label>
          <Textarea id="publish-reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={invalid} />
          {invalid && <p className="text-sm text-destructive">{t("reasonInvalid")}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button onClick={confirm} disabled={pending}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
