"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createAuthClient } from "better-auth/react";
import { T, Notice, useLocale } from "./ui";
export const authClient = createAuthClient();
export function AuthForm() {
  const query = useSearchParams(),
    router = useRouter(),
    locale = useLocale();
  const token = query.get("token");
  const [mode, setMode] = useState(token ? "reset" : "signin"),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    setMessage("");
    const email = String(form.get("email") || ""),
      password = String(form.get("password") || "");
    try {
      if (mode === "signin") {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message);
        router.push("/dashboard");
        router.refresh();
      }
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: String(form.get("name")),
          email,
          password,
          callbackURL: "/auth",
          ...{ locale },
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          locale === "bn"
            ? "যাচাইকরণ লিংকের জন্য আপনার ইমেইল দেখুন।"
            : "Check your email for a verification link, then sign in.",
        );
      }
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/auth",
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          locale === "bn"
            ? "অ্যাকাউন্ট থাকলে ইমেইল পাঠানো হবে।"
            : "If an account exists, a reset email will arrive shortly.",
        );
      }
      if (mode === "reset") {
        const result = await authClient.resetPassword({
          newPassword: password,
          token: token || "",
        });
        if (result.error) throw new Error(result.error.message);
        setMode("signin");
        setMessage(
          locale === "bn"
            ? "পাসওয়ার্ড পরিবর্তিত হয়েছে। সাইন ইন করুন।"
            : "Password reset. Sign in with your new password.",
        );
      }
      if (mode === "verify") {
        const result = await authClient.sendVerificationEmail({
          email,
          callbackURL: "/auth",
        });
        if (result.error) throw new Error(result.error.message);
        setMessage(
          locale === "bn"
            ? "ইমেইল দেখুন।"
            : "If verification is needed, check your email.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel narrow">
      <div className="eyebrow">
        <T en="WELCOME TO REBUILD" bn="রিবিল্ডে স্বাগতম" />
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 500 }}>
        <T
          en={
            mode === "signup"
              ? "A new beginning starts here."
              : mode === "forgot"
                ? "Reset your password."
                : mode === "reset"
                  ? "Choose a new password."
                  : mode === "verify"
                    ? "Verify your email."
                    : "Good to see you again."
          }
          bn={
            mode === "signup"
              ? "নতুন শুরু এখানেই।"
              : mode === "forgot"
                ? "পাসওয়ার্ড পুনরুদ্ধার করুন।"
                : mode === "reset"
                  ? "নতুন পাসওয়ার্ড দিন।"
                  : mode === "verify"
                    ? "ইমেইল যাচাই করুন।"
                    : "আবার স্বাগতম।"
          }
        />
      </h1>
      <p>
        <T
          en="One account to buy and sell useful materials."
          bn="এক অ্যাকাউন্টেই উপকরণ কিনুন ও বিক্রি করুন।"
        />
      </p>
      <div className="auth-tabs">
        <button
          className={mode === "signin" ? "active" : ""}
          onClick={() => setMode("signin")}
        >
          <T en="Sign in" bn="সাইন ইন" />
        </button>
        <button
          className={mode === "signup" ? "active" : ""}
          onClick={() => setMode("signup")}
        >
          <T en="Create account" bn="অ্যাকাউন্ট খুলুন" />
        </button>
      </div>
      <form action={submit}>
        {mode === "signup" && (
          <label className="field">
            <span>
              <T en="Your name" bn="আপনার নাম" />
            </span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            <span>
              <T en="Email address" bn="ইমেইল" />
            </span>
            <input type="email" name="email" required autoComplete="email" />
          </label>
        )}
        {!["forgot", "verify"].includes(mode) && (
          <label className="field">
            <span>
              <T en="Password" bn="পাসওয়ার্ড" />
            </span>
            <input
              aria-label={locale === "bn" ? "পাসওয়ার্ড" : "Password"}
              type="password"
              name="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
            <small>
              <T
                en="Use at least 10 characters."
                bn="কমপক্ষে ১০টি অক্ষর ব্যবহার করুন।"
              />
            </small>
          </label>
        )}
        <button disabled={busy} className="button full">
          <T
            en={
              busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "reset"
                      ? "Save new password"
                      : "Send email"
            }
            bn={
              busy
                ? "অপেক্ষা করুন…"
                : mode === "signin"
                  ? "সাইন ইন"
                  : mode === "signup"
                    ? "অ্যাকাউন্ট খুলুন"
                    : mode === "reset"
                      ? "পাসওয়ার্ড সংরক্ষণ"
                      : "ইমেইল পাঠান"
            }
          />
        </button>
      </form>
      <div className="inline-actions">
        <button className="text-button" onClick={() => setMode("forgot")}>
          <T en="Forgot password?" bn="পাসওয়ার্ড ভুলে গেছেন?" />
        </button>
        <button className="text-button" onClick={() => setMode("verify")}>
          <T en="Resend verification" bn="যাচাইকরণ আবার পাঠান" />
        </button>
      </div>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
