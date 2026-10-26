# Open items — unsigned decisions implemented with defaults

Update this file whenever code depends on an unsigned decision. Remove a row once the owner signs and the code
uses the signed value. Reference IDs from `pricing-decisions-and-entities.md` or add `X-` IDs for new questions.

| ID | Question (short) | Default used in code | Where in code | Status |
| --- | --- | --- | --- | --- |
| A1 | Sea parcel 100 kg / 1 CBM limit basis | whole shipment, chargeable weight | — | unsigned |
| A3 | Quote-on-request zones and oversize | route to manual review (`REQUIRES_REVIEW`) | — | unsigned |
| A4 | Must a visitor log in before quoting | login required (handover §3); `POST /quotes/estimate` is customer-only until signed | `frontend/src/lib/auth/routes.ts` (`/quote` protected) | unsigned |
| A2 | Scope of 25 kg / 1.5 m limits | consolidation eligibility of SEA_PARCEL + AIR only | — | unsigned |
| B1 | Air volumetric divisor | **blocking — no default**, quote returns `REQUIRES_REVIEW` for AIR until signed | — | unsigned |
| B2 | Air rate unit | **blocking — no default** (see B1) | — | unsigned |
| B3 | Volumetric weight per package or aggregate | aggregate | — | unsigned |
| B4 | 0.5 kg round-up step | whole shipment | — | unsigned |
| B5 | LCL delivery units rounding | round to 3 dp (matches handover example) | — | unsigned |
| B6 | Money rounding | per line, then sum | — | unsigned |
| C1 | Weight tiers | tier by whole weight + floor at previous tier max | rate payload `tierMode`; admin editor `frontend/src/components/rates/sea-parcel-editor.tsx` | unsigned |
| C2 | Customs clearance fee basis | per shipment | — | unsigned |
| C3 | LCL minimum delivery basis | per shipment | — | unsigned |
| C4 | Handling / carton / unpack fees | prototype demo values 12 / 8 / 5, config only | — | unsigned |
| D1 | Pricing after split into packages | aggregate chargeable weight | — | unsigned |
| D2 | Cross-pre-notice consolidation | allowed (same customer, same product) | — | unsigned |
| D3 | Partial dispatch | not allowed | — | unsigned |
| D4 | Mixed transport in one batch | not allowed | — | unsigned |
| D6 | One tracking number, many cartons | allowed, distinguished by piece number | — | unsigned |
| E1 | Estimate validity | rate version at pre-notice, 14 days | — | unsigned |
| E2 | Final price rate version | version effective at receipt | — | unsigned |
| E3 | What makes a price final, and what may still be charged after | inspection, quarantine, residential delivery, storage, dangerous goods, oversize are outside the quote | `frontend/src/components/quote/quote-notes.tsx` | unsigned |
| E4 | Does a post-final surcharge need customer consent | yes — a new supplementary receivable the customer accepts | — | unsigned |
| F1 | Tax code per fee type | local fees GST15, international freight ZERO — **flag in UI as provisional** | — | unsigned |
| F2 | How import GST / duty is shown | fixed notice text, never computed (Customs link to add) | `frontend/src/components/quote/quote-notes.tsx` | unsigned |
| F3 | FCL USD + NZD invoicing | two invoices, no currency conversion | — | unsigned |
| G3 | FCL rate expiry | stop quoting after `valid_to`, route to manual | — | unsigned |
| X-1 | Napier TAC for 1 Nov – 31 Dec (handover gives only "until end of Oct" and "from 1 Jan") | Napier quotes dated 1 Nov – 31 Dec return `REQUIRES_REVIEW` (no invented rate) | — | unsigned |
| X-2 | Source rate files from handover appendix A (NAL door-to-door table, Fliway postcode table, FCL port rates, prototype v5 zip) | **blocking for T1.2 seed** — only the PDF is in the repo | — | requested |
| X-3 | Prohibited / restricted goods list shown before a pre-notice | placeholder list (dangerous goods, weapons, drugs, counterfeit, biosecurity items, valuables) | `frontend/src/components/pre-notice/prohibited-goods.tsx` | unsigned |
| X-4 | Real Guangzhou warehouse address and contact | API returns a placeholder flagged `isPlaceholder`; the page says the address is being finalised | contract example `getWarehouseAddress`; `frontend/src/components/pre-notice/warehouse-address.tsx` | requested |
