import { requireSession } from "@/lib/auth";
import { ContractCurrencySettings } from "@/components/contract-currency-settings";
import { CONTRACT_TYPES, CURRENCIES } from "@/lib/contract-types";
import { getContractCurrencies } from "@/lib/contract-currencies";

export default async function ContractSettingsPage() {
  await requireSession(["admin"]);
  const currencies = await getContractCurrencies();

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-ink dark:text-white">Divisas de contratos</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-mute dark:text-carbon-400">
          Define la divisa para cada tipo de contrato. Los nuevos registros usarán la configuración vigente al crearse; los contratos existentes conservarán la divisa con la que fueron guardados.
        </p>
      </header>
      <div className="rounded-xl border border-gold-200 bg-gold-50/70 p-4 text-sm text-ink-soft dark:border-carbon-700 dark:bg-carbon-900 dark:text-carbon-300">
        La divisa inicial es BOB (Bolivianos). El cambio aplica a contratos nuevos y no convierte montos ni modifica documentos ya creados.
      </div>
      <ContractCurrencySettings types={CONTRACT_TYPES} currencies={CURRENCIES} values={currencies} />
    </div>
  );
}
