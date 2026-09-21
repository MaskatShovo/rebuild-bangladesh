import { WantedForm } from "@/components/community";
import { T } from "@/components/ui";
export const metadata = {
  title: "Post a wanted request",
  robots: { index: false, follow: false },
};
export default function NewWanted() {
  return (
    <div className="container page">
      <div className="page-title medium">
        <h1>
          <T en="Find the missing piece." bn="প্রয়োজনের উপকরণ খুঁজুন।" />
        </h1>
        <p>
          <T
            en="Share the specifications. Sellers can respond with their actual listings."
            bn="বিস্তারিত জানান। বিক্রেতারা তাঁদের বিজ্ঞাপন দিয়ে উত্তর দিতে পারবেন।"
          />
        </p>
      </div>
      <WantedForm />
    </div>
  );
}
