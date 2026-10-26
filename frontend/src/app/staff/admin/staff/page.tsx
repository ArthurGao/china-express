import { StaffAdmin } from "@/components/admin/staff-admin";
import { StaffPage } from "@/components/staff/staff-page";

export default function Page() {
  return <StaffPage ns="admin.staff"><StaffAdmin /></StaffPage>;
}
