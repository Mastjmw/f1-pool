"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPoolPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/pools/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: formData.get("inviteCode") }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to join pool");
      setLoading(false);
    } else {
      router.push(`/pool/${data.poolId}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-xl">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white mt-4 mb-2">Join a Pool</h1>
        <p className="text-gray-400 mb-6">Enter the invite code from your pool admin</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="inviteCode"
            type="text"
            placeholder="Paste invite code"
            required
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none font-mono"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Pool"}
          </button>
        </form>
      </div>
    </div>
  );
}
