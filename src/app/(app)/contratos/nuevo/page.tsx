import { requireSession } from "@/lib/auth";
import { ContractForm } from "@/components/contract-form";

export default async function NuevoContrato() {
  await requireSession();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-semibold">Nuevo contrato</h1>
      <ContractForm />
    </div>
  );
}
