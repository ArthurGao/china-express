import { Suspense } from "react";
import { PaymentResult } from "@/components/payments/payment-result";

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense>
        <PaymentResult />
      </Suspense>
    </div>
  );
}
