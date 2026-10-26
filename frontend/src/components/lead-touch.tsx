"use client";

import { useEffect } from "react";
import { touchLead, type LeadStage } from "@/lib/leads";

/** Records one funnel stage when the page mounts. */
export function LeadTouch({ stage }: { stage: LeadStage }) {
  useEffect(() => {
    void touchLead(stage);
  }, [stage]);
  return null;
}
