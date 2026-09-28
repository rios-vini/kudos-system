"use client";

/** Accessible success/error live region (per spec 2.4 accessibility). */
export default function StatusBanner({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  const styles =
    type === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}
    >
      {text}
    </div>
  );
}
