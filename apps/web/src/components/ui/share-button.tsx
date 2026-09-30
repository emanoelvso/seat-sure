"use client";

import { ShareIcon } from "@solar-icons/react/outline";
import { useEffect, useState } from "react";
import { shareLink } from "@/utils/share";

const FEEDBACK = {
  copied: "Link copied",
  failed: "Couldn't copy link",
} as const;

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!feedback) return;

    const timeout = setTimeout(() => setFeedback(""), 2000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  async function handleShare() {
    const result = await shareLink({ title, url: window.location.href });

    if (result === "copied" || result === "failed") {
      setFeedback(FEEDBACK[result]);
    }
  }

  return (
    <div className="relative flex">
      <button
        type="button"
        aria-label="Share"
        onClick={handleShare}
        className="cursor-pointer text-white transition-colors hover:text-tint-400"
      >
        <ShareIcon size={24} />
      </button>
      <span
        role="status"
        className={`absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-neutral-600 text-xs ${feedback ? "px-3 py-1.5" : ""}`}
      >
        {feedback}
      </span>
    </div>
  );
}
