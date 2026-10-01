"use client";

import { useRouter } from "next/navigation";
import type { SupplierSummary } from "@/lib/types";

export function SupplierPicker({ suppliers, currentId }: { suppliers: Pick<SupplierSummary, "id" | "name">[]; currentId?: number }) {
  const router = useRouter();
  return (
    <select
      aria-label="Select a supplier"
      value={currentId ?? ""}
      onChange={(e) => e.target.value && router.push(`/suppliers/${e.target.value}`)}
      className="w-full max-w-64 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
    >
      <option value="" disabled>
        Select a supplier…
      </option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
