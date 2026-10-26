import { Payments } from "@/components/finance/payments";
import { StaffPage } from "@/components/staff/staff-page";

export default function Page() {
  return <StaffPage ns="finance.payments"><Payments /></StaffPage>;
}
