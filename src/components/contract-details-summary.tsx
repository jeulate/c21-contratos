import type { Contract } from "@/lib/contracts";
import { CONTRACT_TYPES, CURRENCY_NAMES, CURRENCY_SYMBOLS, type Currency, typeLabel } from "@/lib/contract-types";

function Detail({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 px-3 py-2.5 dark:bg-carbon-950/60">
      <dt className="text-xs text-ink-mute dark:text-carbon-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-ink dark:text-carbon-100">{value}</dd>
    </div>
  );
}

export function ContractDetailsSummary({ contract }: { contract: Contract }) {
  const type = CONTRACT_TYPES.find((item) => item.id === contract.tipo);
  const currency = contract.moneda as Currency;
  const extras = contract.extras ?? {};
  const groups = [...new Set((type?.extras ?? []).map((field) => field.section ?? "Datos adicionales"))];

  return (
    <section className="panel space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-white">Información enviada para revisión</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Datos registrados por el asesor · {typeLabel(contract.tipo)}</p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute dark:text-carbon-400">Datos generales</h3>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="Propietario / cliente" value={contract.cliente} />
          <Detail label="Cédula de identidad" value={contract.clienteDoc || ""} />
          <Detail label="Inmueble / referencia" value={contract.propiedad} />
          <Detail label="Monto" value={`${currency} · ${CURRENCY_SYMBOLS[currency] ?? currency} ${contract.monto.toLocaleString("es-BO")}`} />
          <Detail label="Divisa" value={CURRENCY_NAMES[currency] ?? currency} />
          <Detail label="Fecha del contrato" value={contract.fecha} />
          <Detail label="Asesor" value={contract.asesorNombre} />
        </dl>
      </div>

      {groups.map((group) => {
        const fields = (type?.extras ?? []).filter((field) => (field.section ?? "Datos adicionales") === group);
        const populated = fields.filter((field) => extras[field.key]?.trim());
        if (!populated.length) return null;
        return (
          <div key={group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute dark:text-carbon-400">{group}</h3>
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {populated.map((field) => {
                const unit = field.unit === "currency" ? currency : field.unit;
                return <Detail key={field.key} label={unit ? `${field.label} (${unit})` : field.label} value={extras[field.key]} />;
              })}
            </dl>
          </div>
        );
      })}

      {contract.notas.trim() && <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute dark:text-carbon-400">Notas internas</h3>
        <p className="whitespace-pre-wrap rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-ink-soft dark:bg-carbon-950/60 dark:text-carbon-200">{contract.notas}</p>
      </div>}
    </section>
  );
}
