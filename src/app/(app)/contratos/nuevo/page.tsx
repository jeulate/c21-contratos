import { requireSession } from "@/lib/auth";
import { ContractForm } from "@/components/contract-form";

export default async function NuevoContrato() {
  await requireSession(["admin", "administrativo", "asesor"]);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <ContractForm />
    </div>
  );
}
