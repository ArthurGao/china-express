"use client";

import { useTranslations } from "next-intl";
import type { components } from "@/lib/api/generated/schema";

type JourneyException = components["schemas"]["JourneyException"];

const STEPS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * The customer's 7-step progress (design 03). `step` and `exception` come from the API; exceptions do not take a step,
 * they are shown on the current one.
 */
export function JourneyProgress({ step, exception, compact = false }: { step: number; exception: JourneyException | null; compact?: boolean }) {
  const t = useTranslations("journey");
  return (
    <div className="grid gap-2">
      <ol className="grid grid-cols-7 gap-1" aria-label={t("label", { step, total: 7 })}>
        {STEPS.map((n) => (
          <li key={n} aria-current={n === step ? "step" : undefined}
            className={`h-1.5 ${n < step ? "bg-foreground" : n === step ? (exception ? "bg-warning" : "bg-foreground") : "bg-rule"}`}>
            <span className="sr-only">{t(`steps.${n}`)}</span>
          </li>
        ))}
      </ol>
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-stencil text-lg leading-none">{String(step).padStart(2, "0")}</span>
        <span className="font-medium">{t(`steps.${step}`)}</span>
        {exception && <span className="font-medium text-warning" role="status">{t(`exceptions.${exception}`)}</span>}
      </p>
      {!compact && exception && <p className="text-sm text-muted-foreground">{t(`exceptionHelp.${exception}`)}</p>}
    </div>
  );
}
