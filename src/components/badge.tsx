import clsx from "clsx";
import { stateLabel } from "@/lib/contract-types";

const tone: Record<string, string> = {
  borrador: "bg-stone-100 text-ink-soft",
  revision: "bg-amber-100 text-amber-800",
  firmado: "bg-emerald-100 text-emerald-800",
  anulado: "bg-red-100 text-red-800",
};

export function StateBadge({ id }: { id: string }) {
  return <span className={clsx("rounded px-2 py-0.5 text-xs font-medium", tone[id])}>{stateLabel(id)}</span>;
}
