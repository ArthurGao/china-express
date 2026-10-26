"use client";

/** A row of mutually exclusive filters (status filters on staff lists). */
export function FilterChips<T extends string>({ options, value, onChange, label, renderLabel, large = false }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; label: string; renderLabel: (v: T) => string; large?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}
          className={`${large ? "min-h-11 px-4" : "h-9 px-3"} border border-rule aria-pressed:border-foreground aria-pressed:font-semibold`}>
          {renderLabel(o)}
        </button>
      ))}
    </div>
  );
}

/** Query params for an optional status filter ("all" sends none). */
export function statusQuery<T extends string>(filter: T | "all"): { status?: T } {
  return filter === "all" ? {} : { status: filter };
}
