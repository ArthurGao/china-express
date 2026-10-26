import { StaffPage } from "@/components/staff/staff-page";
import { AssignUnclaimed } from "@/components/ops/assign-unclaimed";

export default function Page() {
  return <StaffPage ns="ops.assign"><AssignUnclaimed /></StaffPage>;
}
