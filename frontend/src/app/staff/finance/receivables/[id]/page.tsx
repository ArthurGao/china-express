import { ReceivableDetail } from "@/components/finance/receivable-detail";
import { StaffPage } from "@/components/staff/staff-page";

export default async function Page({ params }: PageProps<"/staff/finance/receivables/[id]">) {
  const { id } = await params;
  return <StaffPage><ReceivableDetail id={id} /></StaffPage>;
}
