/**
 * Catálogo de tipos de contrato. Para agregar un tipo nuevo o un campo extra
 * basta con editar este archivo: el formulario, la validación y la exportación
 * se generan a partir de esta definición.
 */
export type ExtraField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea";
  required?: boolean;
};

export type ContractType = { id: string; label: string; extras: ExtraField[] };

export const CONTRACT_TYPES: ContractType[] = [
  {
    id: "exclusiva-venta",
    label: "Exclusiva de venta",
    extras: [
      { key: "vigenciaMeses", label: "Vigencia (meses)", type: "number", required: true },
      { key: "precioLista", label: "Precio de lista", type: "number" },
      { key: "propietario", label: "Propietario", required: true },
    ],
  },
  {
    id: "exclusiva-alquiler",
    label: "Exclusiva de alquiler",
    extras: [
      { key: "vigenciaMeses", label: "Vigencia (meses)", type: "number", required: true },
      { key: "canonMensual", label: "Canon mensual", type: "number" },
      { key: "propietario", label: "Propietario", required: true },
    ],
  },
  {
    id: "reserva",
    label: "Reserva",
    extras: [
      { key: "montoReserva", label: "Monto de reserva", type: "number", required: true },
      { key: "fechaLimite", label: "Fecha límite de firma", type: "date" },
      { key: "comprador", label: "Comprador", required: true },
    ],
  },
  {
    id: "compraventa",
    label: "Compraventa",
    extras: [
      { key: "comprador", label: "Comprador", required: true },
      { key: "vendedor", label: "Vendedor", required: true },
      { key: "formaPago", label: "Forma de pago" },
      { key: "notaria", label: "Notaría" },
    ],
  },
  {
    id: "alquiler",
    label: "Alquiler",
    extras: [
      { key: "inquilino", label: "Inquilino", required: true },
      { key: "propietario", label: "Propietario", required: true },
      { key: "canonMensual", label: "Canon mensual", type: "number", required: true },
      { key: "garantia", label: "Garantía", type: "number" },
      { key: "duracionMeses", label: "Duración (meses)", type: "number" },
    ],
  },
  {
    id: "anticretico",
    label: "Anticrético",
    extras: [
      { key: "anticresista", label: "Anticresista", required: true },
      { key: "propietario", label: "Propietario", required: true },
      { key: "duracionMeses", label: "Duración (meses)", type: "number" },
    ],
  },
];

export const STATES = [
  { id: "borrador", label: "Borrador" },
  { id: "revision", label: "En revisión" },
  { id: "firmado", label: "Firmado" },
  { id: "anulado", label: "Anulado" },
] as const;

export const CURRENCIES = ["USD", "BOB"] as const;

export const typeLabel = (id: string) => CONTRACT_TYPES.find((t) => t.id === id)?.label ?? id;
export const stateLabel = (id: string) => STATES.find((s) => s.id === id)?.label ?? id;
