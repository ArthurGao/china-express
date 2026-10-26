import { StaffPage } from "@/components/staff/staff-page";
import { ConsolidationList } from "@/components/warehouse/consolidation-list";

export default function Page() {
  return <StaffPage ns="warehouse.consolidations"><ConsolidationList /></StaffPage>;
}
