import { Suspense } from "react";
import { AccountPage } from "@/components/account/account-page";

export default function Page() {
  return (
    <Suspense>
      <AccountPage />
    </Suspense>
  );
}
