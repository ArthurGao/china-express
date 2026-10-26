/** Intl.NumberFormat separates the currency code with a no-break space; tests compare with plain spaces. */
export const normalizeSpaces = (s: string | null | undefined) => s?.replace(/ /g, " ");
