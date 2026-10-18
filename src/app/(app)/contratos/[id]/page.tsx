import { notFound } from "next/navigation";
import { requireSession, isStaff } from "@/lib/auth";
import { getContract } from "@/lib/contracts";
import { ContractForm } from "@/components/contract-form";
import { StateBadge } from "@/components/badge";

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const c = await getContract(id);
  if (!c || (!isStaff(s) && c.asesor !== s.username)) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Contrato {c.id}</h1>
        <StateBadge id={c.estado} />
        <span className="ml-auto text-sm text-ink-mute">Asesor: {c.asesorNombre}</span>
      </div>
      <ContractForm contract={c} />
      <section className="panel p-5">
        <h2 className="mb-3 text-sm font-medium">Historial</h2>
        <ul className="space-y-1.5 text-sm text-ink-soft">
          {[...c.history].reverse().map((h, i) => (
            <li key={i}>
              <span className="tabular-nums text-ink-mute">{new Date(h.at).toLocaleString("es-BO")}</span> · {h.by}: {h.changes.join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
