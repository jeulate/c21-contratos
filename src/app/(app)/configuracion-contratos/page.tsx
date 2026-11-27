import { requireSession } from "@/lib/auth";
import { ContractCurrencySettings } from "@/components/contract-currency-settings";
import { CONTRACT_TYPES } from "@/lib/contract-types";
import { getAdvisorCurrencyChangeAllowed, getContractCurrencies, getCurrencyCatalog } from "@/lib/contract-currencies";
import { getContractFormOptions } from "@/lib/contract-form-options";
import { ContractFormOptionSettings } from "@/components/contract-form-option-settings";
import { ContractPrintSettingsForm } from "@/components/contract-print-settings-form";
import { getContractPrintSettings } from "@/lib/contract-print-settings";

export default async function ContractSettingsPage() {
  await requireSession(["admin"]);
  const [currencyAssignments, currencyCatalog, advisorsCanChangeCurrency, formOptions, printSettings] = await Promise.all([getContractCurrencies(), getCurrencyCatalog(), getAdvisorCurrencyChangeAllowed(), getContractFormOptions(), getContractPrintSettings()]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-ink dark:text-white">Configuración de contratos</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-mute dark:text-carbon-400">
          Administra las divisas para los países donde opera el proyecto y asígnalas a cada tipo de contrato. Los cambios aplican a contratos nuevos; los contratos existentes conservan su divisa.
        </p>
      </header>
      <div className="rounded-xl border border-gold-200 bg-gold-50/70 p-4 text-sm text-ink-soft dark:border-carbon-700 dark:bg-carbon-900 dark:text-carbon-300">
        El dashboard consolida los montos en bolivianos usando las equivalencias que configures manualmente. No se consultan ni actualizan tipos de cambio automáticamente.
      </div>
      <ContractCurrencySettings types={CONTRACT_TYPES} currencies={currencyCatalog} values={currencyAssignments} advisorsCanChangeCurrency={advisorsCanChangeCurrency} />
      <ContractFormOptionSettings options={formOptions} />
      <ContractPrintSettingsForm settings={printSettings} />
    </div>
  );
}
