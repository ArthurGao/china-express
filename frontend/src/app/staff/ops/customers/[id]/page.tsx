import { OpsCustomer } from "@/components/ops/ops-customer";
import { StaffPage } from "@/components/staff/staff-page";

export default async function Page({ params }: PageProps<"/staff/ops/customers/[id]">) {
  const { id } = await params;
  return <StaffPage><OpsCustomer id={id} /></StaffPage>;
}
