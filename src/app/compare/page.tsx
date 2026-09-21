import { Compare } from "@/components/community";
import { T } from "@/components/ui";
export const metadata = {
  title: "Compare materials",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="container page">
      <div className="page-title">
        <h1>
          <T en="The details, side by side." bn="পাশাপাশি বিস্তারিত তুলনা।" />
        </h1>
        <p>
          <T
            en="Compare up to three materials from the same category."
            bn="একই বিভাগের সর্বোচ্চ তিনটি উপকরণ তুলনা করুন।"
          />
        </p>
      </div>
      <Compare />
    </div>
  );
}
