"use client";

import { useState } from "react";
import { MESSAGE_MAX } from "@/lib/validation";

export default function MessageInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const remaining = MESSAGE_MAX - value.length;

  return (
    <div>
      <label
        htmlFor="kudos-message"
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        Your message of appreciation
      </label>
      <textarea
        id="kudos-message"
        rows={4}
        maxLength={MESSAGE_MAX}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Say what you appreciate about them… (max 500 characters)"
        className="w-full resize-y rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
      />
      <div className="mt-1 flex justify-end" aria-live="polite">
        <span
          className={`text-xs ${
            remaining < 0
              ? "font-semibold text-red-600"
              : remaining <= 50
                ? "text-amber-600"
                : "text-slate-500"
          }`}
        >
          {value.length}/{MESSAGE_MAX}
        </span>
      </div>
    </div>
  );
}
