"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreatePoolPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const midReset = formData.get("midReset") === "on";

    const res = await fetch("/api/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        season: 2026,
        midReset,
        resetAfter: midReset ? parseInt(formData.get("resetAfter") as string) || 12 : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create pool");
      setLoading(false);
    } else {
      const pool = await res.json();
      router.push(`/pool/${pool.id}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-xl">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white mt-4 mb-2">Create a Pool</h1>
        <p className="text-gray-400 mb-6">Set up your F1 elimination pool</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Pool Name</label>
            <input
              name="name"
              type="text"
              placeholder="e.g. The Grid Gang"
              required
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              name="midReset"
              type="checkbox"
              id="midReset"
              className="w-4 h-4 accent-red-500"
            />
            <label htmlFor="midReset" className="text-gray-300 text-sm">
              Allow mid-season reset (drivers can be picked again)
            </label>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Reset after round # (if enabled)
            </label>
            <input
              name="resetAfter"
              type="number"
              defaultValue={12}
              min={1}
              max={24}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Pool"}
          </button>
        </form>
      </div>
    </div>
  );
}
