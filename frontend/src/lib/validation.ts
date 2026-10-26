// Shared client-side input rules (UX only; the backend validates again).

/** A whole count from 1 to 999 (cartons, expected parcels). */
export const QUANTITY = /^[1-9]\d{0,2}$/;

/** A positive decimal with up to 3 places, as the API's DecimalString (cm, kg). Checked as text; never parsed. */
export const POSITIVE_DECIMAL = /^(?!0+(\.0+)?$)\d+(\.\d{1,3})?$/;
