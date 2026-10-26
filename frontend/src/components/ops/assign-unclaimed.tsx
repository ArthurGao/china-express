"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UnclaimedList } from "@/components/warehouse/unclaimed-list";
import { $api, errorStatus, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type WhParcel = components["schemas"]["WhParcel"];
const MEMBER_NO = /^CE-\d{6}-\d$/;

/** Ops assigns an unclaimed parcel to a customer (T2.3); the customer is notified by the backend. */
export function AssignUnclaimed() {
  const t = useTranslations("ops.assign");
  const [assigned, setAssigned] = useState<{ parcelNo: string; memberNo: string }[]>([]);
  return (
    <div className="grid gap-4">
      {assigned.length > 0 && (
        <p role="status" className="text-success">{assigned.map((a) => t("done", a)).join(" ")}</p>
      )}
      <UnclaimedList action={(p) =>
        assigned.some((a) => a.parcelNo === p.parcelNo) ? <span className="text-success">{t("assigned")}</span>
          : <AssignDialog parcel={p} onAssigned={(memberNo) => setAssigned([...assigned, { parcelNo: p.parcelNo, memberNo }])} />} />
    </div>
  );
}

function AssignDialog({ parcel, onAssigned }: { parcel: WhParcel; onAssigned: (memberNo: string) => void }) {
  const t = useTranslations("ops.assign");
  const assign = $api.useMutation("post", "/ops/parcels/{parcelId}/assign");
  const [open, setOpen] = useState(false);
  const [memberNo, setMemberNo] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    const member = memberNo.trim().toUpperCase();
    if (!MEMBER_NO.test(member) || reason.trim().length < 3) return setError(t("invalid"));
    assign.mutate({
      params: { path: { parcelId: parcel.id }, header: idem() },
      body: { memberNo: member, preNoticeId: null, reason: reason.trim() },
    }, {
      onSuccess: () => { setOpen(false); onAssigned(member); },
      onError: (e) => setError(t(errorStatus(e) === 404 ? "noMember" : "failed")),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline">{t("open")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("title", { parcelNo: parcel.parcelNo })}</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="assign-member">{t("memberNo")}</Label>
          <Input id="assign-member" placeholder="CE-123456-7" className="font-mono" value={memberNo} onChange={(e) => setMemberNo(e.target.value)} />
          <Label htmlFor="assign-reason">{t("reason")}</Label>
          <Textarea id="assign-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button onClick={confirm} disabled={assign.isPending}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
