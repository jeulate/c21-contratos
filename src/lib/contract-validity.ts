import { integerCountInWords } from "./amount-in-words";

export const UPCOMING_EXPIRY_WINDOW_DAYS = 30;
export const CONTRACT_VALIDITY_UNITS = ["dias", "meses", "años"] as const;
export type ContractValidityUnit = (typeof CONTRACT_VALIDITY_UNITS)[number];

export function isContractValidityUnit(value: unknown): value is ContractValidityUnit {
  return typeof value === "string" && CONTRACT_VALIDITY_UNITS.some((unit) => unit === value);
}

export function validityUnitLabel(quantity: number, unit: ContractValidityUnit): string {
  if (unit === "dias") return quantity === 1 ? "día calendario" : "días calendario";
  if (unit === "meses") return quantity === 1 ? "mes" : "meses";
  return quantity === 1 ? "año" : "años";
}

export function validityInWords(quantity: number, unit: ContractValidityUnit): string {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 36_500) return "";
  const legalNumber = integerCountInWords(quantity);
  return `${legalNumber} ${validityUnitLabel(quantity, unit)}`.toLocaleUpperCase("es-BO");
}

/** Returns yyyy-mm-dd using UTC calendar arithmetic, independent of browser/server timezone. */
export function contractExpirationDate(startDate: string, quantity?: number, unit?: ContractValidityUnit): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isSafeInteger(quantity) || !quantity || quantity < 1 || quantity > 36_500 || !unit) return undefined;
  const date = new Date(`${startDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) return undefined;
  const dayOfMonth = date.getUTCDate();
  if (unit === "dias") {
    date.setUTCDate(dayOfMonth + quantity);
  } else if (unit === "meses") {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + quantity);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(dayOfMonth, lastDay));
  } else {
    const month = date.getUTCMonth();
    date.setUTCDate(1);
    date.setUTCFullYear(date.getUTCFullYear() + quantity);
    date.setUTCMonth(month);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(dayOfMonth, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
