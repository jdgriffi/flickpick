"use client";

import { useRouter } from "next/navigation";

export function BackToResults() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="detail__back"
      onClick={() => {
        router.push("/");
      }}
    >
      ← Back to results
    </button>
  );
}
