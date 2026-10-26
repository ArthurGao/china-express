import { StaffPage } from "@/components/staff/staff-page";
import { DispatchQueue } from "@/components/warehouse/dispatch-queue";

export default function Page() {
  return <StaffPage ns="warehouse.dispatch"><DispatchQueue /></StaffPage>;
}
