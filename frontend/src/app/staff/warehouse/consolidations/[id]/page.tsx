import { StaffPage } from "@/components/staff/staff-page";
import { ConsolidationJob } from "@/components/warehouse/consolidation-job";

export default async function Page({ params }: PageProps<"/staff/warehouse/consolidations/[id]">) {
  const { id } = await params;
  return <StaffPage><ConsolidationJob id={id} /></StaffPage>;
}
