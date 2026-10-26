import { StaffPage } from "@/components/staff/staff-page";
import { PriceAdjustments } from "@/components/ops/price-adjustments";

export default function Page() {
  return <StaffPage ns="ops.adjustments"><PriceAdjustments /></StaffPage>;
}
