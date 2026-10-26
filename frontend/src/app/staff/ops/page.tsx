import { StaffPage } from "@/components/staff/staff-page";
import { OpsDashboard } from "@/components/ops/ops-dashboard";

export default function Page() {
  return <StaffPage ns="ops.dashboard"><OpsDashboard /></StaffPage>;
}
