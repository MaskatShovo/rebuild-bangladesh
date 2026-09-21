export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
    message = code,
  ) {
    super(message);
  }
}
const messages: Record<string, [string, string]> = {
  AUTH_REQUIRED: ["Please sign in to continue.", "চালিয়ে যেতে সাইন ইন করুন।"],
  VERIFIED_REQUIRED: [
    "Verify your email to continue.",
    "চালিয়ে যেতে আপনার ইমেইল যাচাই করুন।",
  ],
  FORBIDDEN: [
    "You do not have permission for this action.",
    "এই কাজের অনুমতি আপনার নেই।",
  ],
  SUSPENDED: [
    "This account is suspended. Contact support.",
    "এই অ্যাকাউন্ট স্থগিত করা হয়েছে। সহায়তার জন্য যোগাযোগ করুন।",
  ],
  NOT_FOUND: ["This item could not be found.", "এই আইটেমটি পাওয়া যায়নি।"],
  INVALID_INPUT: [
    "Check the highlighted fields and try again.",
    "চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।",
  ],
  STOCK: [
    "That quantity is no longer available.",
    "এই পরিমাণ এখন পাওয়া যাচ্ছে না।",
  ],
  QUANTITY: [
    "Choose a valid quantity and sale increment.",
    "সঠিক পরিমাণ ও বিক্রয়ের ধাপ নির্বাচন করুন।",
  ],
  STATE: [
    "This action is unavailable in the current state. Refresh and try again.",
    "বর্তমান অবস্থায় এই কাজ করা যাবে না। রিফ্রেশ করে চেষ্টা করুন।",
  ],
  SELF_PURCHASE: [
    "You cannot buy your own listing.",
    "নিজের বিজ্ঞাপন থেকে কেনা যাবে না।",
  ],
  PRICE_CHANGED: [
    "The price changed. Ask the buyer to submit a new request.",
    "দাম পরিবর্তিত হয়েছে। ক্রেতাকে নতুন অনুরোধ করতে বলুন।",
  ],
  CSRF: [
    "This request origin is not allowed.",
    "এই অনুরোধের উৎস অনুমোদিত নয়।",
  ],
  RATE_LIMIT: [
    "Too many requests. Please try again shortly.",
    "অনেক অনুরোধ হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।",
  ],
  UPLOAD: [
    "Upload a decodable JPEG, PNG or WebP image under 8 MB.",
    "৮ মেগাবাইটের কম JPEG, PNG বা WebP ছবি দিন।",
  ],
  IMAGES_REQUIRED: [
    "Add at least one image before publishing.",
    "প্রকাশের আগে অন্তত একটি ছবি যোগ করুন।",
  ],
  BLOCKED: [
    "Messaging is unavailable between these accounts.",
    "এই অ্যাকাউন্টগুলোর মধ্যে বার্তা পাঠানো যাবে না।",
  ],
  IDEMPOTENCY: [
    "Use a new request key for different request details.",
    "ভিন্ন অনুরোধের জন্য নতুন কী ব্যবহার করুন।",
  ],
  PROVIDER_UNAVAILABLE: [
    "Online promotion payments are not configured.",
    "অনলাইন প্রচারের পেমেন্ট চালু করা হয়নি।",
  ],
  INTERNAL: [
    "Something went wrong. Please try again.",
    "সমস্যা হয়েছে। আবার চেষ্টা করুন।",
  ],
};
export function messageFor(code: string, locale = "en") {
  return (messages[code] ?? messages.INTERNAL)[locale === "bn" ? 1 : 0];
}
export function assert(
  condition: unknown,
  code: string,
  status = 400,
): asserts condition {
  if (!condition) throw new AppError(code, status);
}
