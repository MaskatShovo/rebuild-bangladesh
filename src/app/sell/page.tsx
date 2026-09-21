import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListingForm } from "@/components/listing-form";
import { T, Notice } from "@/components/ui";
export const metadata = {
  title: "Sell your materials",
  robots: { index: false, follow: false },
};
export default async function Sell({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await currentUser(await headers());
  if (!user) redirect("/auth");
  if (user.suspended)
    return (
      <div className="container page">
        <Notice error>Your account is suspended.</Notice>
      </div>
    );
  const edit = (await searchParams).edit;
  const initial = edit
    ? await db.listing.findFirst({
        where: { id: edit, sellerId: user.id },
        include: { lot: true, images: { select: { id: true, alt: true } } },
      })
    : null;
  return (
    <div className="container page">
      <div className="page-title medium">
        <div className="eyebrow">
          <T
            en="GIVE GOOD MATERIALS A NEW BEGINNING"
            bn="ভালো উপকরণকে নতুন শুরু দিন"
          />
        </div>
        <h1>
          <T
            en={edit ? "Edit your listing" : "What’s left from your project?"}
            bn={
              edit ? "বিজ্ঞাপন সম্পাদনা করুন" : "আপনার কাজের কোন উপকরণ অবশিষ্ট?"
            }
          />
        </h1>
      </div>
      {!user.sellerName || !user.emailVerified ? (
        <div className="panel medium">
          <h2>Set up your seller profile</h2>
          <p className="spaced">
            Verify your email and add your seller name in your profile before
            listing.
          </p>
          <Link className="button" href="/dashboard/profile">
            Complete your profile
          </Link>
        </div>
      ) : edit && !initial ? (
        <Notice error>Listing not found.</Notice>
      ) : (
        <ListingForm userId={user.id} initial={initial || undefined} />
      )}
    </div>
  );
}
