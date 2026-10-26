"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { components } from "@/lib/api/generated/schema";

export type PostalAddress = components["schemas"]["PostalAddress"];

export const EMPTY_ADDRESS: PostalAddress = { line1: "", line2: null, city: "", postcode: "" };

export function validAddress(a: PostalAddress): boolean {
  return a.line1.trim() !== "" && a.city.trim() !== "" && /^\d{4}$/.test(a.postcode);
}

export function addressLine(a: PostalAddress): string {
  return [a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ");
}

export function AddressFields({ idPrefix, value, onChange }: { idPrefix: string; value: PostalAddress; onChange: (a: PostalAddress) => void }) {
  const t = useTranslations("account.address");
  const field = (key: "line1" | "line2" | "city" | "postcode", extra: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-1">
      <Label htmlFor={`${idPrefix}-${key}`}>{t(key)}</Label>
      <Input id={`${idPrefix}-${key}`} className="h-11" value={value[key] ?? ""} {...extra}
        onChange={(e) => onChange({ ...value, [key]: key === "line2" ? e.target.value || null : e.target.value })} />
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field("line1", { autoComplete: "address-line1" })}
      {field("line2", { autoComplete: "address-line2" })}
      {field("city", { autoComplete: "address-level2" })}
      {field("postcode", { inputMode: "numeric", maxLength: 4, autoComplete: "postal-code" })}
    </div>
  );
}
