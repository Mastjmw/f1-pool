"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Pool {
  id: string;
  name: string;
  season: number;
  inviteCode: string;
  members: { id: string; userId: string; role: string; user: { name: string | null; email: string } }[];
}

interface Race {
  id: string;
  round: number;
  name: string;
  raceDate: string;
  results: any[];
}

interface Driver {
  id: string;
  code: string;
  name: string;
  team: string;
}

interface Props {
  pool: Pool;
  races: Race[];
  drivers: Driver[];
}

export default function AdminPanel({ pool, races, drivers }: Props) {
  const router = useRouter();
  const [importRound, setImportRound] = useState<number>(1);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  async function importResults() {
    setImporting(true);
    setMessage("");

    const res = await fetch("/api/results/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season: pool.season, round: importRound }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`✅ ${data.message}`);
      router.refresh();
    } else {
      setMessage(`❌ ${data.error}`);
    }
    setImporting(false);
  }

  const racesWithResults = races.filter((r) => r.results.length > 0);
  const racesWithoutResults = races.filter(
    (r) => r.results.length === 0 && new Date(r.raceDate) < new Date()
  );

  return (
    <div className="space-y-8">
      {/* Invite Code */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">🔗 Invite Code</h2>
        <div className="flex items-center gap-3">
          <code className="bg-gray-800 px-4 py-2 rounded-lg text-red-400 font-mono text-lg">
            {pool.inviteCode}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(pool.inviteCode)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
          >
            📋 Copy
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          Share this code with friends to join the pool.
        </p>
      </div>

      {/* Members */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">👥 Members ({pool.members.length})</h2>
        <div className="space-y-2">
          {pool.members.map((m) => (
            <div
              key={m.id}
              className="flex justify-between items-center bg-gray-800 rounded-lg px-4 py-2"
            >
              <span className="text-white">{m.user.name || m.user.email}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  m.role === "admin"
                    ? "bg-red-900 text-red-300"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Import Results */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">📥 Import Race Results</h2>
        <p className="text-gray-400 text-sm mb-4">
          Pull official results from the F1 API after a race weekend.
        </p>

        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Round</label>
            <select
              value={importRound}
              onChange={(e) => setImportRound(parseInt(e.target.value))}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
            >
              {races.map((r) => (
                <option key={r.round} value={r.round}>
                  R{r.round} — {r.name} {r.results.length > 0 ? "✅" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={importResults}
            disabled={importing}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}

        {racesWithResults.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-400 text-sm">
              Results imported: {racesWithResults.map((r) => `R${r.round}`).join(", ")}
            </p>
          </div>
        )}

        {racesWithoutResults.length > 0 && (
          <div className="mt-2">
            <p className="text-yellow-400 text-sm">
              ⚠️ Missing results: {racesWithoutResults.map((r) => `R${r.round}`).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Race Status Overview */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-3">📅 Season Status</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {races.map((r) => {
            const isPast = new Date(r.raceDate) < new Date();
            const hasResults = r.results.length > 0;

            return (
              <div
                key={r.round}
                className={`text-center p-2 rounded-lg text-sm ${
                  hasResults
                    ? "bg-green-900/50 text-green-300"
                    : isPast
                    ? "bg-yellow-900/50 text-yellow-300"
                    : "bg-gray-800 text-gray-400"
                }`}
                title={r.name}
              >
                R{r.round}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>🟢 Results imported</span>
          <span>🟡 Past, needs results</span>
          <span>⚫ Upcoming</span>
        </div>
      </div>
    </div>
  );
}
