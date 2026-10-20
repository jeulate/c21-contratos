import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { Contract } from "./contracts";
import type { AdvisorProfile } from "./users";
import type { ContractTemplateVersion } from "./contract-templates";
import { CURRENCY_NAMES, CURRENCY_SYMBOLS, type Currency } from "./contract-types";

const value = (record: Record<string, string>, key: string) => record[key] ?? "";

/** Docxtemplater's default parser treats dotted tags as literal property names. */
const nestedTagParser = (tag: string) => ({
  get(scope: Record<string, unknown> | string | number | boolean | null | undefined) {
    return tag.split(".").reduce<unknown>((current, key) => {
      if (current && typeof current === "object") return (current as Record<string, unknown>)[key];
      return undefined;
    }, scope);
  },
});

export function buildContractTemplateData(contract: Contract) {
  const extras = contract.extras ?? {};
  const profile: Partial<AdvisorProfile> = contract.asesorProfileSnapshot ?? {};
  const currency = contract.moneda as Currency;
  const currencyName = CURRENCY_NAMES[currency] ?? contract.moneda;
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? contract.moneda;
  const amount = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(contract.monto);
  const parsedDate = new Date(`${contract.fecha}T12:00:00`);
  const dateLong = Number.isNaN(parsedDate.getTime()) ? contract.fecha : parsedDate.toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });
  const owner1 = {
    fullName: contract.cliente,
    identityNumber: contract.clienteDoc,
    identityIssuedIn: value(extras, "owner1IssuedIn"),
    address: value(extras, "owner1Address"),
    email: value(extras, "owner1Email"),
    whatsapp: value(extras, "owner1Whatsapp"),
  };
  const owner2 = {
    fullName: value(extras, "owner2Name"),
    identityNumber: value(extras, "owner2IdentityNumber"),
    identityIssuedIn: value(extras, "owner2IssuedIn"),
    address: value(extras, "owner2Address"),
    email: value(extras, "owner2Email"),
    whatsapp: value(extras, "owner2Whatsapp"),
  };
  const property = {
    reference: contract.propiedad,
    name: value(extras, "ruralPropertyName"),
    class: value(extras, "ruralPropertyClass"),
    activity: value(extras, "ruralActivity"),
    department: value(extras, "department"),
    province: value(extras, "province"),
    municipality: value(extras, "municipality"),
    hectares: value(extras, "hectares"),
    executorialTitle: value(extras, "executorialTitle"),
    cadastralPlan: value(extras, "cadastralPlan"),
    registry: value(extras, "propertyRegistry"),
    cadastralCertificate: value(extras, "cadastralCertificate"),
    zone: value(extras, "propertyZone"),
    uv: value(extras, "propertyUv"),
    block: value(extras, "propertyBlock"),
    lot: value(extras, "propertyLot"),
    type: value(extras, "propertyType"),
    address: value(extras, "propertyAddress"),
    landArea: value(extras, "landArea"),
    builtArea: value(extras, "builtArea"),
    bedroomCount: value(extras, "bedroomCount"),
    suiteCount: value(extras, "suiteCount"),
    otherDetails: value(extras, "propertyOtherDetails"),
    liens: value(extras, "propertyLiens"),
  };
  const advisor = {
    fullName: profile.fullName ?? contract.asesorNombre,
    identityNumber: profile.identityNumber ?? "",
    identityIssuedIn: profile.identityIssuedIn ?? "",
    address: profile.address ?? "",
    mobile: profile.mobile ?? "",
    whatsapp: profile.whatsapp ?? "",
    email: profile.email ?? "",
  };
  const contractData = {
    id: contract.id,
    type: contract.tipo,
    amount: amount,
    amountNumeric: contract.monto,
    amountInWords: value(extras, "amountInWords"),
    amountPerHectare: value(extras, "pricePerHectare"),
    currency: contract.moneda,
    currencyName,
    currencySymbol,
    date: dateLong,
    dateRaw: contract.fecha,
    commission: contract.comision,
    status: contract.estado,
  };

  return {
    owner1,
    owner2,
    property,
    advisor,
    contract: contractData,
    client: { name: contract.cliente, document: contract.clienteDoc },
    propertyName: contract.propiedad,
    amount,
    currency: contract.moneda,
    currencyName,
    currencySymbol,
    date: dateLong,
    extras,
  };
}

export function renderContractDocx(contract: Contract, template: ContractTemplateVersion) {
  const binary = Buffer.from(template.contentBase64, "base64");
  const zip = new PizZip(binary);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
    delimiters: { start: "{{", end: "}}" },
    parser: nestedTagParser,
  });
  doc.render(buildContractTemplateData(contract));
  return doc.toBuffer();
}
