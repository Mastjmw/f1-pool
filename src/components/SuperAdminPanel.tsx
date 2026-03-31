"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  poolMembers: { pool: { id: string; name: string }; role: string }[];
}

interface Pool {
  id: string;
  name: string;
  season: number;
  inviteCode: string;
  createdAt: string;
  members: { userId: string; role: string; user: { id: string; name: string | null; email: string } }[];
  _count: { picks: number };
}

interface Props {
  users: User[];
  pools: Pool[];
  currentUserId: string;
}

export default function SuperAdminPanel({ users, pools, currentUserId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"users" | "pools">("users");

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "superadmin" ? "user" : "superadmin";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`✅ ${data.name || data.email} is now ${newRole}`);
      router.refresh();
    } else {
      setMessage(`❌ ${data.error}`);
    }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This removes all their picks and memberships.`)) return;
    const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(`✅ User deleted`);
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(`❌ ${data.error}`);
    }
  }

  async function deletePool(poolId: string, name: string) {
    if (!confirm(`Delete pool "${name}"? This removes ALL picks and members from this pool.`)) return;
    const res = await fetch(`/api/admin/pools?poolId=${poolId}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(`✅ Pool "${name}" deleted`);
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(`❌ ${data.error}`);
    }
  }

  async function transferAdmin(poolId: string, newAdminUserId: string) {
    const res = await fetch("/api/admin/pools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolId, newAdminUserId }),
    });
    if (res.ok) {
      setMessage(`✅ Pool admin transferred`);
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(`❌ ${data.error}`);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith("✅") ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 rounded-lg transition ${tab === "users" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
        >
          👥 Users ({users.length})
        </button>
        <button
          onClick={() => setTab("pools")}
          className={`px-4 py-2 rounded-lg transition ${tab === "pools" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
        >
          🏊 Pools ({pools.length})
        </button>
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-gray-900 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{user.name || "No name"}</span>
                    {user.role === "superadmin" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">SUPER ADMIN</span>
                    )}
                    {user.id === currentUserId && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900 text-blue-300">YOU</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Joined {new Date(user.createdAt).toLocaleDateString()} ·{" "}
                    {user.poolMembers.length} pool{user.poolMembers.length !== 1 ? "s" : ""}
                    {user.poolMembers.length > 0 && (
                      <span className="text-gray-600">
                        {" "}({user.poolMembers.map((pm) => pm.pool.name).join(", ")})
                      </span>
                    )}
                  </p>
                </div>
                {user.id !== currentUserId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                    >
                      {user.role === "superadmin" ? "Demote" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.name || user.email)}
                      className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pools Tab */}
      {tab === "pools" && (
        <div className="space-y-3">
          {pools.map((pool) => {
            const admins = pool.members.filter((m) => m.role === "admin");
            const nonAdmins = pool.members.filter((m) => m.role !== "admin");

            return (
              <div key={pool.id} className="bg-gray-900 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{pool.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {pool.season} · {pool.members.length} members · {pool._count.picks} picks
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Invite: <code className="text-gray-400">{pool.inviteCode}</code>
                    </p>
                    <p className="text-gray-500 text-xs">
                      Admin: {admins.map((a) => a.user.name || a.user.email).join(", ") || "None"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/pool/${pool.id}`}
                      className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                    >
                      View
                    </a>
                    <button
                      onClick={() => deletePool(pool.id, pool.name)}
                      className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Transfer admin */}
                {nonAdmins.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-gray-500 text-xs mb-2">Transfer pool admin to:</p>
                    <div className="flex flex-wrap gap-2">
                      {nonAdmins.map((m) => (
                        <button
                          key={m.userId}
                          onClick={() => transferAdmin(pool.id, m.userId)}
                          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition"
                        >
                          {m.user.name || m.user.email}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {pools.length === 0 && (
            <p className="text-gray-500 text-center py-8">No pools created yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
