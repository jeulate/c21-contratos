import { requireSession } from "@/lib/auth";
import { getUser } from "@/lib/users";
import { getAdvisorCurrencyChangeAllowed, getContractCurrencies, getCurrencyCatalog } from "@/lib/contract-currencies";
import { getContractFormOptions } from "@/lib/contract-form-options";
import { ContractForm } from "@/components/contract-form";
import { AdvisorProfileRequiredDialog } from "@/components/advisor-profile-required-dialog";
import { isAdvisorProfileComplete } from "@/lib/advisor-profile";

export default async function NuevoContrato() {
  const session = await requireSession(["admin", "administrativo", "asesor"]);
  const user = await getUser(session.username);
  if (session.role === "asesor" && !isAdvisorProfileComplete(user?.advisorProfile)) return <AdvisorProfileRequiredDialog />;
  const [currencyByType, currencyCatalog, advisorsCanChangeCurrency, formOptions] = await Promise.all([getContractCurrencies(), getCurrencyCatalog(), getAdvisorCurrencyChangeAllowed(), getContractFormOptions()]);
  return (
    <div className="mx-auto w-full max-w-none space-y-5">
      <ContractForm advisorProfile={user?.advisorProfile} currencyByType={currencyByType} currencyCatalog={currencyCatalog} canChangeCurrency={session.role === "asesor" && advisorsCanChangeCurrency} formOptions={formOptions} canManageState={false} evidenceSessionId={crypto.randomUUID()} />
    </div>
  );
}
