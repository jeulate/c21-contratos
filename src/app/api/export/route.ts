import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { listContracts } from "@/lib/contracts";
import { stateLabel, typeLabel } from "@/lib/contract-types";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const s = await getSession();
  if (!s || !isStaff(s)) return new NextResponse("No autorizado", { status: 403 });

  const rows = await listContracts();
  const head = ["Código", "Tipo", "Estado", "Asesor", "Cliente", "CI/NIT", "Propiedad", "Monto", "Moneda", "Fecha", "Comisión %", "Datos específicos", "Notas", "Creado", "Actualizado"];
  const lines = rows.map((c) =>
    [c.id, typeLabel(c.tipo), stateLabel(c.estado), c.asesorNombre, c.cliente, c.clienteDoc, c.propiedad, c.monto, c.moneda, c.fecha, c.comision,
      Object.entries(c.extras).map(([k, v]) => `${k}: ${v}`).join(" | "), c.notas, c.createdAt, c.updatedAt].map(esc).join(","),
  );
  const csv = "\uFEFF" + [head.map(esc).join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contratos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
