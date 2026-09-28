"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RecipientPicker, { type Recipient } from "./RecipientPicker";
import MessageInput from "./MessageInput";
import StatusBanner from "./StatusBanner";
import { MESSAGE_MAX } from "@/lib/validation";

export default function ComposeKudos() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);

  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    setRecipientsError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecipients(data.users);
    } catch {
      setRecipientsError("Could not load colleagues. Please try again.");
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientId) {
      setBanner({ type: "error", text: "Please select a colleague." });
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setBanner({ type: "error", text: "Please write a message." });
      return;
    }
    if (trimmed.length > MESSAGE_MAX) {
      setBanner({
        type: "error",
        text: `Message must be ${MESSAGE_MAX} characters or fewer.`,
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, message: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 201) {
        setBanner({
          type: "success",
          text: "Kudos sent! It's now on the dashboard feed.",
        });
        setMessage("");
        setRecipientId(null);
        // Notify the feed to refetch (per AC-5.4)
        window.dispatchEvent(new CustomEvent("kudos:created"));
      } else {
        setBanner({
          type: "error",
          text: data?.error?.message ?? "Could not send kudos. Please try again.",
        });
      }
    } catch {
      setBanner({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Give kudos"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Give kudos 🎉
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <RecipientPicker
          recipients={recipients}
          selectedId={recipientId}
          onSelect={setRecipientId}
          loading={recipientsLoading}
          error={recipientsError}
          onRetry={loadRecipients}
        />
        <MessageInput value={message} onChange={setMessage} disabled={submitting} />
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send kudos"}
          </button>
        </div>
      </form>
      {banner && <StatusBanner type={banner.type} text={banner.text} />}
    </section>
  );
}
