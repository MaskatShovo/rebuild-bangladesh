import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default function Auth() {
  return (
    <div className="container page">
      <Suspense fallback={<p>Loading…</p>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
