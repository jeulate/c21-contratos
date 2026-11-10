import { CURRENCY_NAMES, type Currency } from "./contract-types";

const SMALL_NUMBERS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
  "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];

const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS: Record<number, string> = {
  1: "ciento", 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos",
  6: "seiscientos", 7: "setecientos", 8: "ochocientos", 9: "novecientos",
};

function underHundred(value: number): string {
  if (value < SMALL_NUMBERS.length) return SMALL_NUMBERS[value];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return units ? `${TENS[tens]} y ${SMALL_NUMBERS[units]}` : TENS[tens];
}

function underThousand(value: number): string {
  if (value < 100) return underHundred(value);
  if (value === 100) return "cien";
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return `${HUNDREDS[hundreds]}${rest ? ` ${underHundred(rest)}` : ""}`;
}

function apocopate(value: string): string {
  if (value === "uno") return "un";
  if (value.endsWith("veintiuno")) return `${value.slice(0, -9)}veintiún`;
  if (value.endsWith(" y uno")) return `${value.slice(0, -6)} y un`;
  if (value.endsWith("uno")) return `${value.slice(0, -3)}un`;
  return value;
}

function integerToWords(value: number): string {
  if (value < 1_000) return underThousand(value);
  const groups: string[] = [];
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const remainder = value % 1_000;

  if (millions) groups.push(millions === 1 ? "un millón" : `${apocopate(integerToWords(millions))} millones`);
  if (thousands) groups.push(thousands === 1 ? "mil" : `${apocopate(underThousand(thousands))} mil`);
  if (remainder) groups.push(underThousand(remainder));
  return groups.join(" ");
}

/** Formats a monetary value as Spanish legal text, including cents and currency. */
export function amountInWords(value: string | number, currency: Currency): string {
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return "";
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999_999_999_999) return "";

  const [integerText, centsText] = amount.toFixed(2).split(".");
  const integer = Number(integerText);
  const cents = Number(centsText);
  const currencyName = CURRENCY_NAMES[currency].toUpperCase();
  const singularName = currency === "BOB" ? "BOLIVIANO" : "DÓLAR AMERICANO";
  const pluralName = currencyName;

  if (cents === 0 && integer === 1) return `UN ${singularName}`;
  const numberWords = integer === 1 ? "un" : apocopate(integerToWords(integer));
  const amountText = `${numberWords} ${String(cents).padStart(2, "0")}/100`;
  return `${amountText} ${pluralName}`.toLocaleUpperCase("es-BO");
}
