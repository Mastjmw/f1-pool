"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`/api/verify-email?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
          setMessage("Your email has been verified!");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-bold text-white mb-4">🏎️ F1 Pool</h1>

        {status === "loading" && (
          <p className="text-gray-400">Verifying your email...</p>
        )}

        {status === "success" && (
          <>
            <p className="text-green-400 text-lg mb-4">✅ {message}</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
            >
              Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-red-400 text-lg mb-4">❌ {message}</p>
            <Link href="/login" className="text-gray-400 hover:text-white">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
