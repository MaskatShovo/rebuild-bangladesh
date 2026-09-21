import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { dashboard } from "@/lib/marketplace";
import { Dashboard } from "@/components/dashboard";
import { Notice } from "@/components/ui";
export const metadata = {
  title: "Your marketplace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const user = await currentUser(await headers());
  if (!user) redirect("/auth");
  if (user.suspended)
    return (
      <div className="container page">
        <Notice error>
          Your account is suspended. Contact support through the reporting
          policy.
        </Notice>
      </div>
    );
  return (
    <div className="container page">
      <Dashboard
        data={await dashboard(user)}
        section={(await params).section?.[0] || "overview"}
      />
    </div>
  );
}
