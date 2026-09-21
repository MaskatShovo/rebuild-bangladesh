import Link from "next/link";
import { T } from "@/components/ui";
export const metadata = { title: "How buying and selling works" };
export default function Help() {
  return (
    <div className="container page policy">
      <div className="eyebrow">A LITTLE LEFT OVER. A LOT OF POSSIBILITY.</div>
      <h1 style={{ fontSize: 42, fontWeight: 500 }}>
        <T
          en="Good materials, passed on simply."
          bn="ভালো উপকরণ সহজেই হাতবদল।"
        />
      </h1>
      <h2>
        <T en="Buying materials" bn="উপকরণ কেনা" />
      </h2>
      <ol>
        <li>
          <T
            en="Search by material code, size, finish, condition and pickup area. Compare compatible listings and check batch or shade codes."
            bn="কোড, মাপ, ফিনিশ, অবস্থা ও এলাকা অনুযায়ী খুঁজুন। ব্যাচ বা শেড কোড মিলিয়ে নিন।"
          />
        </li>
        <li>
          <T
            en="Verify your email, ask the seller questions and request a valid quantity. A request does not reserve stock."
            bn="ইমেইল যাচাই করুন, প্রশ্ন করুন ও পরিমাণের অনুরোধ করুন। অনুরোধে মজুত সংরক্ষিত হয় না।"
          />
        </li>
        <li>
          <T
            en="When accepted, the seller reserves the materials for 24 hours. Arrange pickup and suitable transport before the deadline."
            bn="গ্রহণের পর বিক্রেতা ২৪ ঘণ্টা মজুত সংরক্ষণ করেন। সময়ের আগে পিকআপ ও পরিবহন ঠিক করুন।"
          />
        </li>
        <li>
          <T
            en="Inspect the materials in person. Pay the seller directly and both confirm the physical handover in the order. Leave a review after completion."
            bn="উপকরণ সরাসরি পরীক্ষা করুন। বিক্রেতাকে মূল্য দিন ও উভয় পক্ষ হস্তান্তর নিশ্চিত করুন। শেষে মতামত দিন।"
          />
        </li>
      </ol>
      <h2>
        <T en="Selling your surplus" bn="অবশিষ্ট উপকরণ বিক্রি" />
      </h2>
      <p>
        <T
          en="Create one account, verify your email and add a seller display name to your profile. Listing is free. Photograph your actual materials and labels, describe defects, and keep different batches in separate listings. Published listings and significant edits are reviewed before public display."
          bn="অ্যাকাউন্ট খুলে ইমেইল যাচাই করুন ও বিক্রেতার নাম দিন। বিজ্ঞাপন বিনামূল্যে। প্রকৃত উপকরণ ও লেবেলের ছবি দিন, ত্রুটি জানান ও ভিন্ন ব্যাচ আলাদা রাখুন। বিজ্ঞাপন পর্যালোচনার পর প্রকাশিত হয়।"
        />
      </p>
      <h2>
        <T en="Pickup, cancellation and safety" bn="পিকআপ, বাতিল ও নিরাপত্তা" />
      </h2>
      <p>
        <T
          en="The seller shares the exact pickup address after acceptance. ReBuild does not provide delivery or collect the material payment. Either party may cancel before either confirms handover. An expired reservation returns unsold stock to availability. For a problem after handover, report the order; a dispute does not automatically refund money or restore inventory."
          bn="গ্রহণের পর সঠিক ঠিকানা পাবেন। রিবিল্ড ডেলিভারি বা উপকরণের মূল্য সংগ্রহ করে না। হস্তান্তর নিশ্চিত করার আগে যে কোনো পক্ষ বাতিল করতে পারে। মেয়াদ শেষ হলে অবিক্রীত মজুত ফেরত আসে। পরে সমস্যা হলে অর্ডার রিপোর্ট করুন।"
        />
      </p>
      <p>
        <T
          en="Inspect used electrical fittings with a qualified professional. Email verification does not certify identity, product condition or electrical safety. Do not list prohibited or hazardous materials."
          bn="ব্যবহৃত বৈদ্যুতিক ফিটিংস যোগ্য ব্যক্তিকে দিয়ে পরীক্ষা করান। ইমেইল যাচাই পরিচয়, অবস্থা বা নিরাপত্তার সনদ নয়। নিষিদ্ধ বা বিপজ্জনক উপকরণ দেবেন না।"
        />
      </p>
      <div className="inline-actions">
        <Link href="/browse" className="button">
          <T en="Find materials" bn="উপকরণ খুঁজুন" />
        </Link>
        <Link href="/sell" className="button secondary">
          <T en="Sell materials" bn="বিক্রি করুন" />
        </Link>
      </div>
    </div>
  );
}
