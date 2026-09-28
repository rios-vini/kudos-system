"use client";

import { useState } from "react";
import ModerationControls from "./ModerationControls";
import type { FeedItem } from "./KudosFeed";

/** Relative time formatting (e.g., "5 minutes ago") per AC-5.2. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function KudosCard({
  item,
  isAdmin,
  onModerated,
}: {
  item: FeedItem;
  isAdmin: boolean;
  onModerated: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
        item.isVisible
          ? "border-slate-200"
          : "border-amber-300 bg-amber-50/50"
      }`}
      aria-label={`Kudos from ${item.sender.displayName} to ${item.recipient.displayName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-semibold text-slate-900">
              {item.sender.displayName}
            </span>
            <span className="text-slate-500"> → </span>
            <span className="font-semibold text-slate-900">
              {item.recipient.displayName}
            </span>
          </p>
          <p className="mt-2 break-words text-slate-700">{item.message}</p>
          <p className="mt-2 text-xs text-slate-400">
            {relativeTime(item.createdAt)}
          </p>
        </div>
        {isAdmin && (
          <ModerationControls
            kudosId={item.id}
            isVisible={item.isVisible}
            onDone={onModerated}
          />
        )}
      </div>

      {!item.isVisible && isAdmin && item.reasonForModeration && (
        <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
          Hidden by an administrator: {item.reasonForModeration}
        </p>
      )}
    </article>
  );
}
