"use client";

import { useState } from "react";
import { REASON_MIN, REASON_MAX } from "@/lib/validation";

/**
 * Admin-only moderation controls: hide / unhide / delete with a mandatory
 * reason (per US-6, AC-6.1–6.7). Never rendered for non-admin users.
 */
export default function ModerationControls({
  kudosId,
  isVisible,
  onDone,
}: {
  kudosId: string;
  isVisible: boolean;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "reason">("idle");
  const [action, setAction] = useState<"hide" | "unhide" | "delete">("hide");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function prompt(action: "hide" | "unhide" | "delete") {
    setAction(action);
    setReason("");
    setError(null);
    setMode("reason");
  }

  async function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN) {
      setError(`Reason must be at least ${REASON_MIN} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res =
        action === "delete"
          ? await fetch(`/api/kudos/${kudosId}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: trimmed }),
            })
          : await fetch(`/api/kudos/${kudosId}/moderate`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, reason: trimmed }),
            });

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Moderation failed.");
      }
      setMode("idle");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation failed.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex shrink-0 gap-2">
        {isVisible ? (
          <button
            onClick={() => prompt("hide")}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            aria-label="Hide this kudos"
          >
            Hide
          </button>
        ) : (
          <button
            onClick={() => prompt("unhide")}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            aria-label="Unhide this kudos"
          >
            Unhide
          </button>
        )}
        <button
          onClick={() => prompt("delete")}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          aria-label="Delete this kudos"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-700">
        {action === "delete"
          ? "Permanently delete this kudos?"
          : action === "hide"
            ? "Hide this kudos from the feed?"
            : "Restore this kudos to the feed?"}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={REASON_MAX}
        rows={2}
        placeholder={`Reason (min ${REASON_MIN} chars)…`}
        aria-label="Reason for moderation"
        className="w-full resize-none rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => setMode("idle")}
          disabled={busy}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60 ${
            action === "delete"
              ? "bg-red-600 hover:bg-red-700"
              : action === "hide"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {busy ? "Working…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
