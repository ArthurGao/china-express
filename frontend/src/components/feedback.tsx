"use client";

import { useState } from "react";

/** An error line announced to screen readers; renders nothing without a message. */
export function ErrorText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return <p role="alert" className={`text-destructive ${className}`}>{children}</p>;
}

export type FlashMessage = { ok: boolean; text: string } | null;

/** Outcome of the last command on a page: success as a status, failure as an alert. */
export function useFlash() {
  const [flash, setFlash] = useState<FlashMessage>(null);
  return { flash, ok: (text: string) => setFlash({ ok: true, text }), fail: (text: string) => setFlash({ ok: false, text }), clear: () => setFlash(null) };
}

export function Flash({ value }: { value: FlashMessage }) {
  if (!value) return null;
  return value.ok ? <p role="status" className="text-success">{value.text}</p> : <ErrorText>{value.text}</ErrorText>;
}
