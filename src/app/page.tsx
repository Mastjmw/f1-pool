import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold">🏎️</h1>
        <h2 className="text-4xl font-bold">F1 Elimination Pool</h2>
        <p className="text-gray-400 text-lg max-w-md">
          Pick a driver each race. Earn their championship points. 
          But choose wisely — once you pick a driver, you can&apos;t pick them again.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
