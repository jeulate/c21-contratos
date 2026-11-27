import type { Contract } from "@/lib/contracts";
import { CONTRACT_TYPES, CURRENCY_NAMES, CURRENCY_SYMBOLS, type Currency, typeLabel } from "@/lib/contract-types";
import { contractExpirationDate, validityUnitLabel } from "@/lib/contract-validity";

function Detail({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 px-3 py-2.5 dark:bg-carbon-950/60">
      <dt className="text-xs text-ink-mute dark:text-carbon-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-ink dark:text-carbon-100">{value}</dd>
    </div>
  );
}

export function ContractDetailsSummary({ contract, title = "Información enviada para revisión", subtitle, emphasizeInternalData = false }: { contract: Contract; title?: string; subtitle?: string; emphasizeInternalData?: boolean }) {
  const type = CONTRACT_TYPES.find((item) => item.id === contract.tipo);
  const currency = contract.moneda as Currency;
  const extras = contract.extras ?? {};
  const groups = [...new Set((type?.extras ?? []).map((field) => field.section ?? "Datos adicionales"))];
  const expirationDate = contractExpirationDate(contract.fecha, contract.vigenciaCantidad, contract.vigenciaUnidad);
  const expirationLabel = expirationDate
    ? new Date(`${expirationDate}T12:00:00Z`).toLocaleDateString("es-BO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    : "Sin vigencia registrada";

  return (
    <section className="panel space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">{subtitle ?? `Datos registrados por el asesor · ${typeLabel(contract.tipo)}`}</p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute dark:text-carbon-400">Datos generales</h3>
        <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="Propietario / cliente" value={contract.cliente} />
          <Detail label="Cédula de identidad" value={contract.clienteDoc || ""} />
          <Detail label="Inmueble / referencia" value={contract.propiedad} />
          <Detail label="Monto" value={`${currency} · ${contract.monedaSimbolo ?? CURRENCY_SYMBOLS[currency] ?? currency} ${contract.monto.toLocaleString("es-BO")}`} />
          <Detail label="Divisa" value={contract.monedaNombre ?? CURRENCY_NAMES[currency] ?? currency} />
          <Detail label="Fecha del contrato" value={contract.fecha} />
          <Detail label="Asesor" value={contract.asesorNombre} />
        </dl>
      </div>

      <div className={`rounded-xl border p-4 ${emphasizeInternalData ? "border-amber-300 bg-amber-50 shadow-sm dark:border-amber-500/50 dark:bg-amber-500/10" : "border-stone-200 bg-stone-50 dark:border-carbon-700 dark:bg-carbon-950/60"}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${emphasizeInternalData ? "text-amber-900 dark:text-amber-200" : "text-ink-mute dark:text-carbon-400"}`}>Vigencia del contrato</h3>
        <p className={`mt-2 text-base font-bold ${emphasizeInternalData ? "text-amber-950 dark:text-amber-100" : "text-ink dark:text-white"}`}>
          {contract.vigenciaCantidad && contract.vigenciaUnidad ? `${contract.vigenciaCantidad} ${validityUnitLabel(contract.vigenciaCantidad, contract.vigenciaUnidad)} · ${contract.vigenciaEnPalabras || ""}` : "Sin vigencia registrada"}
        </p>
        <p className={`mt-1 text-sm ${emphasizeInternalData ? "text-amber-900 dark:text-amber-200" : "text-ink-soft dark:text-carbon-300"}`}>Vencimiento calculado: {expirationLabel}</p>
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

      {contract.additionalOwners?.length ? <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute dark:text-carbon-400">Propietarios adicionales</h3>
        <div className="space-y-3">
          {contract.additionalOwners.map((owner, index) => <div key={`${owner.identityNumber}-${index}`} className="rounded-xl border border-stone-200 p-3 dark:border-carbon-800">
            <p className="mb-2 text-xs font-semibold text-ink dark:text-carbon-200">Propietario {index + 3}</p>
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Detail label="Nombre completo" value={owner.fullName} />
              <Detail label="Cédula de identidad" value={owner.identityNumber} />
              <Detail label="Lugar de expedición" value={owner.identityIssuedIn} />
              <Detail label="Domicilio" value={owner.address} />
            </dl>
          </div>)}
        </div>
      </div> : null}

      {contract.notas.trim() && <div>
        <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${emphasizeInternalData ? "text-amber-900 dark:text-amber-200" : "text-ink-mute dark:text-carbon-400"}`}>Notas internas</h3>
        <p className={`whitespace-pre-wrap rounded-lg border px-3 py-2.5 text-sm ${emphasizeInternalData ? "border-amber-300 bg-amber-50 font-medium text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100" : "border-transparent bg-stone-50 text-ink-soft dark:bg-carbon-950/60 dark:text-carbon-200"}`}>{contract.notas}</p>
      </div>}
    </section>
  );
}
