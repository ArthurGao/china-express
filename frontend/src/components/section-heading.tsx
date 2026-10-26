/** Numbered section heading (01, 02, …): the swiss-grid section marker, numeral in the carton stencil. */
export function SectionHeading({ n, title, id }: { n: string; title: string; id?: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-3 border-b border-rule pb-2 text-lg font-semibold">
      <span className="font-stencil text-2xl text-foreground">{n}</span>
      {title}
    </h2>
  );
}
