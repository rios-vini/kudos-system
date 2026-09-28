"use client";

import { useCallback, useEffect, useState } from "react";
import KudosCard from "./KudosCard";
import type { SessionUser } from "@/lib/auth";

export type FeedItem = {
  id: string;
  message: string;
  createdAt: string;
  isVisible: boolean;
  sender: { id: string; displayName: string };
  recipient: { id: string; displayName: string };
  moderatedAt?: string | null;
  reasonForModeration?: string | null;
};

export default function KudosFeed({
  currentUser,
  initialItems,
  initialCursor,
}: {
  currentUser: SessionUser;
  initialItems: FeedItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const refetch = useCallback(
    async (includeHidden: boolean) => {
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (includeHidden) params.set("includeHidden", "true");
        const res = await fetch(`/api/kudos?${params}`);
        if (!res.ok) throw new Error();
        const data: { items: FeedItem[]; nextCursor: string | null } =
          await res.json();
        setItems(data.items);
        setCursor(data.nextCursor);
      } catch {
        setError("Could not load the feed. Please retry.");
      }
    },
    []
  );

  // Feed refreshes when a new kudos is submitted (per AC-5.4)
  useEffect(() => {
    function onCreated() {
      refetch(showHidden);
    }
    window.addEventListener("kudos:created", onCreated);
    return () => window.removeEventListener("kudos:created", onCreated);
  }, [refetch, showHidden]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20", cursor });
      if (showHidden) params.set("includeHidden", "true");
      const res = await fetch(`/api/kudos?${params}`);
      if (!res.ok) throw new Error();
      const data: { items: FeedItem[]; nextCursor: string | null } =
        await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      setError("Could not load more kudos. Please retry.");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleShowHidden() {
    const next = !showHidden;
    setShowHidden(next);
    refetch(next);
  }

  // Called by KudosCard after a successful moderation action
  function handleModerated() {
    refetch(showHidden);
  }

  return (
    <div>
      {currentUser.role === "admin" && (
        <div className="mb-4 flex items-center justify-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={toggleShowHidden}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show hidden kudos
          </label>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => refetch(showHidden)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {items.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No kudos yet. Be the first to recognise a colleague! 🎉
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <KudosCard
                item={item}
                isAdmin={currentUser.role === "admin"}
                onModerated={handleModerated}
              />
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
