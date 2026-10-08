import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { T, Notice } from "@/components/ui";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default function Auth() {
  if (process.env.ACCOUNTS_ENABLED === "false")
    return (
      <div className="container page">
        <h1>
          <T en="Explore the ReBuild demo" bn="রিবিল্ড ডেমো দেখুন" />
        </h1>
        <Notice>
          <T
            en="This shared demo currently supports browsing, search, comparison and the coverage calculator. Accounts and trading will open after email delivery is configured. All sample listings are fictional."
            bn="এই ডেমোতে উপকরণ খোঁজা, তুলনা ও কভারেজ হিসাব করতে পারবেন। ইমেইল চালু হলে অ্যাকাউন্ট ও লেনদেন চালু হবে। নমুনা বিজ্ঞাপনগুলো কাল্পনিক।"
          />
        </Notice>
      </div>
    );
  return (
    <div className="container page">
      <Suspense fallback={<p>Loading…</p>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
