"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { $api } from "@/lib/api/client";

/** The member number doubles as the shipping mark, so it is set in the stencil face used on cartons. */
export function MemberNumber() {
  const t = useTranslations("common");
  // Rendered only for a signed-in customer (CustomerNav); first call also creates the customer record.
  const { data } = $api.useQuery("get", "/me", {}, { staleTime: Infinity });
  if (!data) return null;
  return (
    <Link href="/account" className="flex items-baseline gap-2 text-sm whitespace-nowrap hover:underline">
      <span className="hidden text-muted-foreground sm:inline">{t("memberLabel")}</span>
      <span className="font-stencil text-lg text-foreground" data-testid="member-no" aria-label={`${t("memberLabel")} ${data.memberNo}`}>
        {data.memberNo}
      </span>
    </Link>
  );
}
