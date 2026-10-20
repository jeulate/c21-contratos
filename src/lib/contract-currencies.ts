import { redis } from "./redis";
import { CONTRACT_TYPES, CURRENCIES, type Currency } from "./contract-types";

const defaultCurrency: Currency = "BOB";
const currencyKey = (type: string) => `contract-currency:${type}`;

const isContractType = (type: string) => CONTRACT_TYPES.some((item) => item.id === type);
const isCurrency = (value: unknown): value is Currency => CURRENCIES.some((currency) => currency === value);

export async function getContractCurrency(type: string): Promise<Currency> {
  if (!isContractType(type)) return defaultCurrency;
  const stored = await redis.get<string>(currencyKey(type));
  return isCurrency(stored) ? stored : defaultCurrency;
}

export async function getContractCurrencies(): Promise<Record<string, Currency>> {
  const entries = await Promise.all(CONTRACT_TYPES.map(async ({ id }) => [id, await getContractCurrency(id)] as const));
  return Object.fromEntries(entries);
}

export async function setContractCurrency(type: string, currency: Currency) {
  if (!isContractType(type)) throw new Error("Tipo de contrato inválido.");
  if (!isCurrency(currency)) throw new Error("Divisa no permitida.");
  await redis.set(currencyKey(type), currency);
}
