"use client";

import { ReasonDialog } from "@/components/reason-dialog";
import { Button } from "@/components/ui/button";
import { useHasRole } from "@/lib/staff/use-staff-me";

/** Approve / reject for an admin on a pending request (price adjustments, release overrides). Hidden from everyone else. */
export function ApprovalActions({ status, labels, onApprove, onReject }: {
  status: string; labels: { approve: string; reject: string; rejectTitle: string };
  onApprove: () => void; onReject: (reason: string) => void;
}) {
  const isAdmin = useHasRole("admin");
  if (!isAdmin || status !== "pending") return null;
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" onClick={onApprove}>{labels.approve}</Button>
      <ReasonDialog trigger={labels.reject} title={labels.rejectTitle} confirmLabel={labels.reject} destructive onConfirm={onReject} />
    </div>
  );
}
