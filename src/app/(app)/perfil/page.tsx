import { requireSession } from "@/lib/auth";
import { getUser } from "@/lib/users";
import { AdvisorProfileForm } from "@/components/advisor-profile-form";

export default async function PerfilPage() {
  const session = await requireSession(["asesor"]);
  const user = await getUser(session.username);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-ink dark:text-white">Perfil del asesor</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">
          Completa tus datos una sola vez para incorporarlos automáticamente en los contratos.
        </p>
      </header>
      <AdvisorProfileForm profile={user?.advisorProfile} />
    </div>
  );
}
