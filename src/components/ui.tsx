"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Menu,
  X,
  Plus,
  Heart,
  MessageCircle,
  MapPin,
  ChevronDown,
  Search,
  Grid2X2,
  Bath,
  DoorOpen,
  Lamp,
  Layers,
  Wrench,
  Check,
  Leaf,
  ArrowRight,
  SlidersHorizontal,
  Bookmark,
  Bell,
  CircleUserRound,
  LogOut,
  ShieldCheck,
} from "lucide-react";
export const icons = {
  ArrowUpRight,
  Menu,
  X,
  Plus,
  Heart,
  MessageCircle,
  MapPin,
  ChevronDown,
  Search,
  Grid2X2,
  Bath,
  DoorOpen,
  Lamp,
  Layers,
  Wrench,
  Check,
  Leaf,
  ArrowRight,
  SlidersHorizontal,
  Bookmark,
  Bell,
  CircleUserRound,
  LogOut,
  ShieldCheck,
};
const Locale = createContext("en");
export const useLocale = () => useContext(Locale);
export function LocaleProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  return <Locale.Provider value={locale}>{children}</Locale.Provider>;
}
export function T({ en, bn }: { en: string; bn: string }) {
  return useLocale() === "bn" ? bn : en;
}
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: keyof typeof icons;
  size?: number;
  className?: string;
}) {
  const C = icons[name];
  return <C size={size} strokeWidth={1.65} aria-hidden="true" {...props} />;
}
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    method,
    headers: {
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body !== undefined
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Request failed");
  return payload.data;
}
export function Header({
  user,
}: {
  user: { name: string; role: string } | null;
}) {
  const locale = useLocale(),
    router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="announcement">
        <span>
          <Icon name="Leaf" size={14} />
          <T
            en="Good materials deserve another beginning."
            bn="ভালো উপকরণ আবার কাজে লাগুক।"
          />
        </span>
        <span>
          <T
            en="Made for Dhaka. Built around reuse."
            bn="ঢাকার জন্য। পুনর্ব্যবহারের জন্য।"
          />
        </span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="ReBuild Bangladesh home">
            <span className="brand-mark">
              r<span>↗</span>
            </span>
            <span>
              re<span className="brand-bold">build</span>
              <small>BANGLADESH</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/browse">
              <T en="Find materials" bn="উপকরণ খুঁজুন" />
            </Link>
            <Link href="/wanted">
              <T en="Wanted board" bn="চাহিদার বোর্ড" />
            </Link>
            <Link href="/help">
              <T en="How it works" bn="যেভাবে কাজ করে" />
            </Link>
          </nav>
          <div className="header-actions">
            <button
              className="language"
              onClick={() => {
                document.cookie = `locale=${locale === "bn" ? "en" : "bn"}; path=/; max-age=31536000; SameSite=Lax`;
                router.refresh();
              }}
            >
              {locale === "bn" ? "EN" : "বাংলা"}
            </button>
            <Link className="account-link" href={user ? "/dashboard" : "/auth"}>
              <Icon name="CircleUserRound" />
              <span>
                {user
                  ? user.name.split(" ")[0]
                  : locale === "bn"
                    ? "সাইন ইন"
                    : "Sign in"}
              </span>
            </Link>
            <Link className="button" href="/sell">
              <Icon name="Plus" size={18} />
              <T en="Sell materials" bn="বিক্রি করুন" />
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Icon name={open ? "X" : "Menu"} />
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {[
              ["/browse", "Find materials", "উপকরণ খুঁজুন"],
              ["/wanted", "Wanted board", "চাহিদার বোর্ড"],
              ["/dashboard", "My account", "আমার অ্যাকাউন্ট"],
              ["/compare", "Compare materials", "তুলনা করুন"],
              ["/help", "How it works", "যেভাবে কাজ করে"],
            ].map(([href, en, bn]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <T en={en} bn={bn} />
                <Icon name="ArrowUpRight" />
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div>
          <Link href="/" className="footer-brand">
            rebuild<span>↗</span>
          </Link>
          <p>
            <T
              en="A little left over. A lot of possibility."
              bn="অল্প অবশিষ্ট। অনেক সম্ভাবনা।"
            />
          </p>
        </div>
        <div className="footer-links">
          <Link href="/help">
            <T en="Help & pickup" bn="সাহায্য ও পিকআপ" />
          </Link>
          <Link href="/policy/materials">
            <T en="Allowed materials" bn="অনুমোদিত উপকরণ" />
          </Link>
          <Link href="/policy/reporting">
            <T en="Reporting & disputes" bn="রিপোর্ট ও বিরোধ" />
          </Link>
          <Link href="/policy/privacy">
            <T en="Privacy" bn="গোপনীয়তা" />
          </Link>
          <Link href="/policy/terms">
            <T en="Terms" bn="শর্তাবলি" />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ReBuild Bangladesh</span>
        <span>Dhaka, Bangladesh · BDT ৳</span>
      </div>
    </footer>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={error ? "notice error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name="Layers" size={36} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Action({
  path,
  body = {},
  children,
  onDone,
  method = "POST",
  className = "button secondary",
}: {
  path: string;
  body?: unknown;
  children: ReactNode;
  onDone?: () => void;
  method?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api(path, method, body);
            onDone?.();
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "…" : children}
      </button>
      {error && <Notice error>{error}</Notice>}
    </>
  );
}
