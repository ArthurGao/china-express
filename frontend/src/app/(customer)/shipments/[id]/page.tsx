import { ShipmentView } from "@/components/shipments/shipment-view";

export default async function Page({ params }: PageProps<"/shipments/[id]">) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <ShipmentView id={id} />
    </div>
  );
}
