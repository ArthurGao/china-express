/** Cache updater: replace the item with the same id, or add it (start or end) when it is new. */
export function upsertById<T extends { id: string }>(item: T, at: "start" | "end" = "end") {
  return (old: T[] | undefined): T[] => {
    const list = old ?? [];
    if (list.some((x) => x.id === item.id)) return list.map((x) => (x.id === item.id ? item : x));
    return at === "start" ? [item, ...list] : [...list, item];
  };
}
