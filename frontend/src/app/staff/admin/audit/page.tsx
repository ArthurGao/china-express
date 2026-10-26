import { AuditLog } from "@/components/admin/audit-log";
import { StaffPage } from "@/components/staff/staff-page";

export default function Page() {
  return <StaffPage ns="admin.audit"><AuditLog /></StaffPage>;
}
