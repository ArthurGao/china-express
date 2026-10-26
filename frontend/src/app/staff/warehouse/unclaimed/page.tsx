import { StaffPage } from "@/components/staff/staff-page";
import { UnclaimedList } from "@/components/warehouse/unclaimed-list";

export default function Page() {
  return <StaffPage ns="warehouse.unclaimed"><UnclaimedList /></StaffPage>;
}
