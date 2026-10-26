import { ReceivableList } from "@/components/finance/receivable-list";
import { StaffPage } from "@/components/staff/staff-page";

export default function Page() {
  return <StaffPage ns="finance.receivables"><ReceivableList /></StaffPage>;
}
