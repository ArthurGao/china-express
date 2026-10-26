import { StaffPage } from "@/components/staff/staff-page";
import { ParcelDetail } from "@/components/warehouse/parcel-detail";

export default async function Page({ params }: PageProps<"/staff/warehouse/parcels/[id]">) {
  const { id } = await params;
  return <StaffPage><ParcelDetail id={id} /></StaffPage>;
}
