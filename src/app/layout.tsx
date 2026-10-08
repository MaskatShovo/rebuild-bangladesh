import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/noto-sans-bengali/400.css";
import "./globals.css";
import { Header, Footer, LocaleProvider } from "@/components/ui";
import { currentUser } from "@/lib/auth";
export const metadata: Metadata = {
  ...(process.env.DEMO_MODE === "true"
    ? { robots: { index: false, follow: false } }
    : {}),
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  title: {
    default: "ReBuild Bangladesh — A new beginning for leftover materials",
    template: "%s | ReBuild Bangladesh",
  },
  description:
    "Find usable leftover renovation materials in Dhaka. Match specifications, buy the quantity you need, and arrange pickup with the seller.",
  openGraph: {
    title: "ReBuild Bangladesh",
    description: "Good materials. New possibilities.",
    type: "website",
    images: ["/materials/hero.jpg"],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await cookies()).get("locale")?.value === "bn" ? "bn" : "en";
  const user = await currentUser(await headers());
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <LocaleProvider locale={locale}>
          <a className="skip-link" href="#main">
            {locale === "bn" ? "মূল বিষয়বস্তুতে যান" : "Skip to content"}
          </a>
          <Header
            user={
              user && !user.suspended
                ? { name: user.name, role: user.role }
                : null
            }
          />
          {process.env.DEMO_MODE === "true" && (
            <div className="demo-banner">
              {locale === "bn"
                ? "ডেমো বাজার · কাল্পনিক বিজ্ঞাপন ও বিক্রেতা"
                : process.env.ACCOUNTS_ENABLED === "false"
                  ? "Browsing demo · Fictional listings · Accounts and trading are not enabled"
                  : "Demo marketplace · Fictional listings and sellers"}
            </div>
          )}
          <main id="main">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
