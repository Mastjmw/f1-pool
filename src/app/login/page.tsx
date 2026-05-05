"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverifiedEmail("");
    setResendStatus("idle");

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");

    const res = await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirect: false,
    });

    if (res?.error === "EmailNotVerified") {
      setUnverifiedEmail(email);
      setLoading(false);
      return;
    }

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    setResendStatus("sending");
    await fetch("/api/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail }),
    });
    setResendStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">🏎️ F1 Pool</h1>
        <p className="text-gray-400 mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {unverifiedEmail && (
            <div className="rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm">
              <p className="text-amber-300 font-medium">Verify your email first</p>
              <p className="text-amber-200/80 mt-1">
                We sent a verification link to <strong>{unverifiedEmail}</strong> when you registered.
                Check your inbox (and spam) before signing in.
              </p>
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendStatus !== "idle"}
                className="mt-2 text-amber-300 underline hover:text-amber-200 disabled:opacity-50"
              >
                {resendStatus === "idle" && "Resend verification email"}
                {resendStatus === "sending" && "Sending..."}
                {resendStatus === "sent" && "✓ Sent — check your inbox"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link href="/forgot-password" className="text-gray-500 hover:text-gray-300 text-sm">
            Forgot your password?
          </Link>
        </p>

        <p className="mt-3 text-center text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-red-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
