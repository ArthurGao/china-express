import { OpsShipment } from "@/components/ops/ops-shipment";
import { StaffPage } from "@/components/staff/staff-page";

export default async function Page({ params }: PageProps<"/staff/ops/shipments/[id]">) {
  const { id } = await params;
  return <StaffPage><OpsShipment id={id} /></StaffPage>;
}
