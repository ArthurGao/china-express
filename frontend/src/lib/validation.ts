// Shared client-side input rules (UX only; the backend validates again).

/** A whole count from 1 to 999 (cartons, expected parcels). */
export const QUANTITY = /^[1-9]\d{0,2}$/;
