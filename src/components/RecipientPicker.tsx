"use client";

import { useState } from "react";
import { MESSAGE_MAX } from "@/lib/validation";

export type Recipient = { id: string; displayName: string; email: string };

export default function RecipientPicker({
  recipients,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: {
  recipients: Recipient[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = recipients.filter((r) =>
    r.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      <label
        htmlFor="recipient-search"
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        Colleague
      </label>
      <input
        id="recipient-search"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="recipient-list"
        aria-autocomplete="list"
        placeholder="Search colleagues…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
      />

      {selectedId && (
        <p className="mt-1.5 text-sm text-slate-600">
          Selected:{" "}
          <span className="font-medium text-slate-900">
            {recipients.find((r) => r.id === selectedId)?.displayName ?? "—"}
          </span>
        </p>
      )}

      {open && (
        <ul
          id="recipient-list"
          role="listbox"
          aria-label="Colleagues"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3.5 py-2 text-sm text-slate-500">Loading…</li>
          ) : error ? (
            <li className="px-3.5 py-2">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-sm font-medium text-blue-600 hover:underline"
              >
                Retry
              </button>
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-slate-500">
              No colleagues found.
            </li>
          ) : (
            filtered.map((r) => (
              <li key={r.id} role="option" aria-selected={r.id === selectedId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition hover:bg-blue-50 ${
                    r.id === selectedId ? "bg-blue-50 font-medium" : ""
                  }`}
                >
                  <span>{r.displayName}</span>
                  <span className="text-xs text-slate-400">{r.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
