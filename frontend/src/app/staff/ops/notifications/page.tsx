import { StaffPage } from "@/components/staff/staff-page";
import { DeliveryLog } from "@/components/ops/delivery-log";

export default function Page() {
  return <StaffPage ns="ops.deliveries"><DeliveryLog /></StaffPage>;
}
