import { redis } from "./redis";
import { CONTRACT_TYPES, type Currency } from "./contract-types";

export type CurrencyDefinition = {
  code: Currency;
  name: string;
  singularName: string;
  symbol: string;
  /** Number of BOB equivalent to one unit of this currency. Null means not configured. */
  bobPerUnit: number | null;
  enabled: boolean;
};

const catalogKey = "currencies:catalog";
const legacyUsdRateKey = "dashboard:exchange-rate-bob-usd";
const contractCurrencyKey = (type: string) => `contract-currency:${type}`;

const DEFAULT_CURRENCY_CATALOG: CurrencyDefinition[] = [
  { code: "BOB", name: "Bolivianos", singularName: "Boliviano", symbol: "Bs.", bobPerUnit: 1, enabled: true },
  { code: "USD", name: "Dólares Americanos", singularName: "Dólar Americano", symbol: "$us", bobPerUnit: 6.96, enabled: true },
  // Available to configure for Paraguay. It becomes selectable after an administrator sets its BOB exchange rate.
  { code: "PYG", name: "Guaraníes Paraguayos", singularName: "Guaraní Paraguayo", symbol: "₲", bobPerUnit: null, enabled: false },
];

function isDefinition(value: unknown): value is CurrencyDefinition {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CurrencyDefinition>;
  return typeof item.code === "string" && /^[A-Z]{3}$/.test(item.code)
    && typeof item.name === "string" && typeof item.singularName === "string"
    && typeof item.symbol === "string" && typeof item.enabled === "boolean"
    && (item.bobPerUnit === null || (typeof item.bobPerUnit === "number" && Number.isFinite(item.bobPerUnit) && item.bobPerUnit > 0));
}

export async function getCurrencyCatalog(): Promise<CurrencyDefinition[]> {
  const stored = await redis.get<unknown>(catalogKey);
  if (!Array.isArray(stored) || !stored.every(isDefinition)) {
    const legacyUsdRate = await redis.get<number>(legacyUsdRateKey);
    return DEFAULT_CURRENCY_CATALOG.map((item) => item.code === "USD" && typeof legacyUsdRate === "number" && legacyUsdRate > 0
      ? { ...item, bobPerUnit: legacyUsdRate }
      : { ...item });
  }

  // Merge in defaults so a newly supported built-in currency appears without overwriting admin data.
  const byCode = new Map(stored.map((item) => [item.code, item]));
  for (const item of DEFAULT_CURRENCY_CATALOG) if (!byCode.has(item.code)) byCode.set(item.code, { ...item });
  return [...byCode.values()];
}

export async function getEnabledCurrencies(): Promise<CurrencyDefinition[]> {
  return (await getCurrencyCatalog()).filter((item) => item.enabled && item.bobPerUnit !== null);
}

export async function getCurrencyDefinition(code: Currency): Promise<CurrencyDefinition | undefined> {
  return (await getCurrencyCatalog()).find((item) => item.code === code);
}

export async function setCurrencyDefinition(definition: CurrencyDefinition): Promise<void> {
  if (!isDefinition(definition)) throw new Error("Revisa los datos de la divisa.");
  if (definition.code === "BOB" && (!definition.enabled || definition.bobPerUnit !== 1)) {
    throw new Error("BOB es la divisa base y debe permanecer activa con equivalencia 1.");
  }
  if (definition.enabled && definition.bobPerUnit === null) {
    throw new Error("Configura cuántos bolivianos equivale una unidad antes de activar la divisa.");
  }

  const catalog = await getCurrencyCatalog();
  const exists = catalog.some((item) => item.code === definition.code);
  const next = exists
    ? catalog.map((item) => item.code === definition.code ? definition : item)
    : [...catalog, definition];
  await redis.set(catalogKey, next);
  if (definition.code === "USD" && definition.bobPerUnit !== null) {
    // Keep the previous dashboard setting in sync for older deployments and callers.
    await redis.set(legacyUsdRateKey, definition.bobPerUnit);
  }
}

export async function getContractCurrency(type: string): Promise<Currency> {
  if (!CONTRACT_TYPES.some((item) => item.id === type)) return "BOB";
  const stored = await redis.get<string>(contractCurrencyKey(type));
  if (!stored) return "BOB";
  const enabled = await getEnabledCurrencies();
  return enabled.some((item) => item.code === stored) ? stored : "BOB";
}

export async function getContractCurrencies(): Promise<Record<string, Currency>> {
  const entries = await Promise.all(CONTRACT_TYPES.map(async ({ id }) => [id, await getContractCurrency(id)] as const));
  return Object.fromEntries(entries);
}

export async function setContractCurrency(type: string, currency: Currency): Promise<void> {
  if (!CONTRACT_TYPES.some((item) => item.id === type)) throw new Error("Tipo de contrato inválido.");
  const enabled = await getEnabledCurrencies();
  if (!enabled.some((item) => item.code === currency)) throw new Error("La divisa no está activa o aún no tiene tipo de cambio configurado.");
  await redis.set(contractCurrencyKey(type), currency);
}
