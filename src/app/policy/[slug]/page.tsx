import { notFound } from "next/navigation";
import { Notice, T } from "@/components/ui";
const policies: Record<
  string,
  { title: string; bn: string; sections: [string, string, string][] }
> = {
  terms: {
    title: "Terms of use",
    bn: "ব্যবহারের শর্ত",
    sections: [
      [
        "Marketplace role",
        "ReBuild connects buyers and sellers of usable renovation leftovers. The seller is responsible for truthful descriptions and the right to sell. Buyers inspect suitability. Material payment is agreed and paid directly between the parties at pickup. ReBuild does not provide escrow, seller payouts or guaranteed delivery.",
        "রিবিল্ড ক্রেতা ও বিক্রেতাকে সংযুক্ত করে। সঠিক বিবরণ ও বিক্রয়ের অধিকার বিক্রেতার দায়িত্ব। ক্রেতা উপযোগিতা পরীক্ষা করবেন। পিকআপে সরাসরি মূল্য প্রদান হবে।",
      ],
      [
        "Accounts and orders",
        "Use accurate contact information and protect your password. A request is not a reservation. Seller acceptance reserves stock until the displayed deadline. Both parties confirm physical handover. Payment confirmation is separate. Misuse, misleading listings and harassment may result in removal or suspension.",
        "সঠিক যোগাযোগের তথ্য দিন ও পাসওয়ার্ড সুরক্ষিত রাখুন। অনুরোধ সংরক্ষণ নয়। গ্রহণের পর নির্ধারিত সময় পর্যন্ত মজুত সংরক্ষিত থাকে। উভয় পক্ষ হস্তান্তর নিশ্চিত করবেন।",
      ],
      [
        "Promotions",
        "Featured placements are labelled and last seven days from a verified promotion payment event. Moderation rules still apply. Development simulation does not charge real money. Provider-supported refund handling must be confirmed before selling live promotions.",
        "প্রচারিত বিজ্ঞাপন চিহ্নিত থাকবে এবং যাচাইকৃত পেমেন্টের পর সাত দিন চলবে। পর্যালোচনার নিয়ম প্রযোজ্য। ডেভেলপমেন্ট সিমুলেশনে আসল টাকা কাটা হয় না।",
      ],
    ],
  },
  privacy: {
    title: "Privacy notice",
    bn: "গোপনীয়তার নোটিশ",
    sections: [
      [
        "What is stored",
        "We store account email, password hashes, sessions, optional phone, listings, images, messages, orders, reviews and reports. Public listings show approximate areas and seller display names. Exact pickup addresses are released to order participants after acceptance. Phone numbers are private and not labelled verified.",
        "ইমেইল, পাসওয়ার্ড হ্যাশ, সেশন, ঐচ্ছিক ফোন, বিজ্ঞাপন, ছবি, বার্তা ও অর্ডার সংরক্ষণ করা হয়। প্রকাশ্যে সাধারণ এলাকা ও বিক্রেতার নাম দেখা যায়। গ্রহণের পর অর্ডারের পক্ষরা সঠিক ঠিকানা পান।",
      ],
      [
        "Preferences and cookies",
        "Session cookies keep you signed in; a language cookie saves your choice. Device storage keeps unfinished listing drafts and comparison selections. Saved-search email alerts are opt-in and can be disabled in your profile. No advertising trackers are included.",
        "সেশন কুকি সাইন ইন রাখে, ভাষার কুকি পছন্দ সংরক্ষণ করে। ডিভাইসে খসড়া ও তুলনা থাকে। অনুসন্ধানের ইমেইল বিজ্ঞপ্তি ঐচ্ছিক। বিজ্ঞাপনের ট্র্যাকার নেই।",
      ],
      [
        "Deletion and retention",
        "Request account anonymisation through an account report. An administrator must confirm ownership and resolve outstanding orders before removing identifying profile and authentication data. Transaction and dispute evidence may need retention. A legally reviewed retention schedule and owner contact details must be added before launch.",
        "অ্যাকাউন্ট রিপোর্টের মাধ্যমে তথ্য মুছে ফেলার অনুরোধ করুন। মালিকানা ও চলমান অর্ডার যাচাই করে তথ্য অপসারণ করতে হবে। লেনদেনের প্রমাণ রাখা লাগতে পারে। চালুর আগে তথ্য সংরক্ষণের নীতি ও যোগাযোগ যোগ করতে হবে।",
      ],
    ],
  },
  materials: {
    title: "Allowed & prohibited materials",
    bn: "অনুমোদিত ও নিষিদ্ধ উপকরণ",
    sections: [
      [
        "Allowed",
        "Usable surplus tiles, flooring, doors, windows, sanitary fittings, lights and renovation fixtures. Disclose damage, missing parts, previous use and unknown specifications. Sell separate batches as separate lots.",
        "ব্যবহারযোগ্য অবশিষ্ট টাইলস, মেঝের উপকরণ, দরজা, জানালা, স্যানিটারি ফিটিংস, বাতি ও ফিক্সচার। ক্ষতি, অনুপস্থিত অংশ ও অজানা তথ্য জানান।",
      ],
      [
        "Not allowed",
        "Hazardous waste, asbestos-containing materials, recalled products, stolen goods, unsafe electrical items, contaminated materials, pressurised cylinders, explosives and unusable demolition debris are prohibited. Do not claim certification or structural suitability without authentic evidence.",
        "বিপজ্জনক বর্জ্য, অ্যাসবেস্টস, প্রত্যাহারকৃত পণ্য, চুরি করা পণ্য, অনিরাপদ বৈদ্যুতিক উপকরণ, দূষিত উপকরণ ও ব্যবহার অযোগ্য ধ্বংসাবশেষ নিষিদ্ধ। প্রমাণ ছাড়া নিরাপত্তার সনদ দাবি করবেন না।",
      ],
      [
        "Report concerns",
        "Use Report a problem on the listing. Moderators can remove public visibility, record a reason and suspend abusive accounts. Buyers should inspect materials and seek competent advice for safety-critical uses.",
        "বিজ্ঞাপনে সমস্যা জানান। পর্যালোচক বিজ্ঞাপন সরাতে ও কারণ লিখতে পারেন। নিরাপত্তার কাজে উপযুক্ত বিশেষজ্ঞের পরামর্শ নিন।",
      ],
    ],
  },
  reporting: {
    title: "Reporting & disputes",
    bn: "রিপোর্ট ও বিরোধ",
    sections: [
      [
        "Report a listing or member",
        "Sign in and use Report a problem on a listing, conversation or order. Include specific facts and dates. You can block messaging from another member in a conversation. Reports enter a private moderator queue.",
        "সাইন ইন করে বিজ্ঞাপন, কথোপকথন বা অর্ডারে সমস্যা জানান। নির্দিষ্ট তথ্য ও তারিখ দিন। কথোপকথনে অন্য সদস্যকে ব্লক করতে পারেন।",
      ],
      [
        "Order problems",
        "Before handover confirmation, cancel an eligible order to release the held stock. After handover, report the order so a moderator can review the issue with the participants. Do not create a false review or share someone’s private address publicly.",
        "হস্তান্তরের আগে যোগ্য অর্ডার বাতিল করলে মজুত ছাড়া হয়। পরে অর্ডার রিপোর্ট করুন। মিথ্যা মতামত বা কারও ব্যক্তিগত ঠিকানা প্রকাশ করবেন না।",
      ],
      [
        "Resolution limits",
        "A moderator decision records an explanation. It does not automatically restore sold inventory, recover a payment or complete a refund. The platform does not hold material payments. Response-time commitments and an owner support address must be established before launch.",
        "পর্যালোচকের সিদ্ধান্তে ব্যাখ্যা থাকে। এতে বিক্রীত মজুত বা টাকা স্বয়ংক্রিয়ভাবে ফেরত আসে না। চালুর আগে সহায়তার যোগাযোগ ও সময়সীমা নির্ধারণ করতে হবে।",
      ],
    ],
  },
};
export default async function Policy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = policies[(await params).slug];
  if (!p) notFound();
  return (
    <div className="container page policy">
      <h1 style={{ fontSize: 40, fontWeight: 500 }}>
        <T en={p.title} bn={p.bn} />
      </h1>
      <Notice>
        <T
          en="Policy draft for this local demonstration. Owner review and support contact details are required before public launch."
          bn="এই স্থানীয় ডেমোর খসড়া নীতি। প্রকাশ্যে চালুর আগে মালিকের পর্যালোচনা ও সহায়তার যোগাযোগ প্রয়োজন।"
        />
      </Notice>
      {p.sections.map(([heading, en, bn]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>
            <T en={en} bn={bn} />
          </p>
        </section>
      ))}
    </div>
  );
}
