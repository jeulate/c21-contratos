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
  section?: string;
};

export type ContractType = { id: string; label: string; extras: ExtraField[]; templateBased?: boolean };

const urbanModelFields: ExtraField[] = [
  { key: "owner1IssuedIn", label: "Lugar de expedición", required: true, section: "Propietario principal" },
  { key: "owner1Address", label: "Domicilio", required: true, section: "Propietario principal" },
  { key: "owner1Email", label: "Correo de contacto", type: "text", section: "Comunicaciones" },
  { key: "owner1Whatsapp", label: "WhatsApp de contacto", section: "Comunicaciones" },
  { key: "owner2Name", label: "Nombre completo", section: "Segundo propietario (opcional)" },
  { key: "owner2IdentityNumber", label: "Cédula de identidad", section: "Segundo propietario (opcional)" },
  { key: "owner2IssuedIn", label: "Lugar de expedición", section: "Segundo propietario (opcional)" },
  { key: "owner2Address", label: "Domicilio", section: "Segundo propietario (opcional)" },
  { key: "owner2Email", label: "Correo de contacto", type: "text", section: "Comunicaciones" },
  { key: "owner2Whatsapp", label: "WhatsApp de contacto", section: "Comunicaciones" },
  { key: "propertyZone", label: "Zona", required: true, section: "Ubicación y registro del inmueble" },
  { key: "propertyUv", label: "UV", section: "Ubicación y registro del inmueble" },
  { key: "propertyBlock", label: "Manzana", section: "Ubicación y registro del inmueble" },
  { key: "propertyLot", label: "Lote", section: "Ubicación y registro del inmueble" },
  { key: "propertyRegistry", label: "Matrícula de Derechos Reales", required: true, section: "Ubicación y registro del inmueble" },
  { key: "propertyType", label: "Tipo de inmueble", required: true, section: "Características del inmueble" },
  { key: "propertyAddress", label: "Dirección", required: true, section: "Características del inmueble" },
  { key: "landArea", label: "Superficie de terreno", section: "Características del inmueble" },
  { key: "builtArea", label: "Superficie construida", section: "Características del inmueble" },
  { key: "bedroomCount", label: "Número de habitaciones", type: "number", section: "Características del inmueble" },
  { key: "suiteCount", label: "Habitaciones en suite", type: "number", section: "Características del inmueble" },
  { key: "propertyOtherDetails", label: "Otros datos", type: "textarea", section: "Características del inmueble" },
  { key: "propertyLiens", label: "Gravámenes", type: "textarea", section: "Características del inmueble" },
  { key: "amountInWords", label: "Monto en palabras", required: true, section: "Monto" },
];

const ruralModelFields: ExtraField[] = [
  { key: "owner1IssuedIn", label: "Lugar de expedición", required: true, section: "Propietario" },
  { key: "owner1Address", label: "Domicilio", required: true, section: "Propietario" },
  { key: "coOwnerName", label: "Nombre del copropietario (si aplica)", section: "Copropietario" },
  { key: "ruralPropertyName", label: "Nombre de la propiedad", required: true, section: "Ubicación y descripción rural" },
  { key: "ruralPropertyClass", label: "Clase de propiedad", required: true, section: "Ubicación y descripción rural" },
  { key: "ruralActivity", label: "Actividad", required: true, section: "Ubicación y descripción rural" },
  { key: "department", label: "Departamento", required: true, section: "Ubicación y descripción rural" },
  { key: "province", label: "Provincia", required: true, section: "Ubicación y descripción rural" },
  { key: "municipality", label: "Municipio", required: true, section: "Ubicación y descripción rural" },
  { key: "hectares", label: "Superficie total (hectáreas)", type: "number", required: true, section: "Ubicación y descripción rural" },
  { key: "executorialTitle", label: "Título ejecutorial", required: true, section: "Documentación de la propiedad" },
  { key: "cadastralPlan", label: "Plano catastral", required: true, section: "Documentación de la propiedad" },
  { key: "propertyRegistry", label: "Matrícula", required: true, section: "Documentación de la propiedad" },
  { key: "cadastralCertificate", label: "Certificado catastral", required: true, section: "Documentación de la propiedad" },
  { key: "pricePerHectare", label: "Precio por hectárea (USD)", type: "number", required: true, section: "Precio referencial" },
];

export const CONTRACT_TYPES: ContractType[] = [
  {
    id: "exclusiva-venta",
    label: "Exclusiva de venta",
    templateBased: true,
    extras: urbanModelFields,
  },
  {
    id: "exclusiva-alquiler",
    label: "Exclusiva de alquiler",
    templateBased: true,
    extras: urbanModelFields,
  },
  {
    id: "exclusiva-anticretico",
    label: "Exclusiva de anticrético",
    templateBased: true,
    extras: urbanModelFields,
  },
  {
    id: "exclusiva-rural",
    label: "Exclusiva rural",
    templateBased: true,
    extras: ruralModelFields,
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

export const TEMPLATE_CONTRACT_TYPES = CONTRACT_TYPES.filter((t) => t.templateBased);
export const isTemplateBasedContract = (id: string) => TEMPLATE_CONTRACT_TYPES.some((t) => t.id === id);

export const typeLabel = (id: string) => CONTRACT_TYPES.find((t) => t.id === id)?.label ?? id;
export const stateLabel = (id: string) => STATES.find((s) => s.id === id)?.label ?? id;
