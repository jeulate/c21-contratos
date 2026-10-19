import { requireSession } from "@/lib/auth";
import { getUser } from "@/lib/users";
import { ContractForm } from "@/components/contract-form";

export default async function NuevoContrato() {
  const session = await requireSession(["admin", "administrativo", "asesor"]);
  const user = await getUser(session.username);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <ContractForm advisorProfile={user?.advisorProfile} canManageState={false} />
    </div>
  );
}
