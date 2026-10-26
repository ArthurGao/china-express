"use client";

import { useTranslations } from "next-intl";
import { cn } from "cn";

// Colour means state only (dense-data rule): green done, amber needs attention, red failed; everything else neutral.
const TONES = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-foreground",
} as const;

type Tone = keyof typeof TONES;

const TONE_OF: Record<string, Tone> = {
  delivered: "success", paid: "success", completed: "success", approved: "success", SUCCEEDED: "success", sent: "success",
  dispatched: "success", active: "success", published: "success", expired: "warning",
  customs_held: "warning", delivery_failed: "warning", unclaimed: "warning", held: "warning", partially_paid: "warning",
  overpaid: "warning", pending: "warning", PROCESSING: "warning", awaiting_choice: "warning", queued: "warning",
  FAILED: "danger", failed: "danger", rejected: "danger", reversed: "danger", void: "danger",
};

export type StatusGroup = "shipment" | "parcel" | "receivable" | "consolidation" | "payment" | "approval" | "delivery" | "onlinePayment" | "staff" | "rateSheet";

/** A status from the API, labelled through `status.<group>.<value>`. */
export function StatusBadge({ group, value, className }: { group: StatusGroup; value: string; className?: string }) {
  const t = useTranslations("status");
  return (
    <span data-status={value} className={cn("inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium whitespace-nowrap", TONES[TONE_OF[value] ?? "neutral"], className)}>
      {t(`${group}.${value}`)}
    </span>
  );
}
