import { PreNoticeDone } from "@/components/pre-notice/pre-notice-done";

export default async function Page({ params }: PageProps<"/pre-notice/[id]">) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <PreNoticeDone id={id} />
    </div>
  );
}
