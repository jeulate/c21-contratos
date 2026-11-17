import { requireSession } from "@/lib/auth";
import { getUser } from "@/lib/users";
import { getContractCurrencies } from "@/lib/contract-currencies";
import { getContractFormOptions } from "@/lib/contract-form-options";
import { ContractForm } from "@/components/contract-form";

export default async function NuevoContrato() {
  const session = await requireSession(["admin", "administrativo", "asesor"]);
  const user = await getUser(session.username);
  const [currencyByType, formOptions] = await Promise.all([getContractCurrencies(), getContractFormOptions()]);
  return (
    <div className="mx-auto w-full max-w-none space-y-5">
      <ContractForm advisorProfile={user?.advisorProfile} currencyByType={currencyByType} formOptions={formOptions} canManageState={false} evidenceSessionId={crypto.randomUUID()} />
    </div>
  );
}
