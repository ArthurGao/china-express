import { StaffPage } from "@/components/staff/staff-page";
import { LeadFunnel } from "@/components/ops/lead-funnel";

export default function Page() {
  return <StaffPage ns="ops.leads"><LeadFunnel /></StaffPage>;
}
