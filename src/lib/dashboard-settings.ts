import { redis } from "./redis";

export const DEFAULT_DASHBOARD_EXCHANGE_RATE = 6.96;
const exchangeRateKey = "dashboard:exchange-rate-bob-usd";

export async function getDashboardExchangeRate(): Promise<number> {
  const value = await redis.get<number>(exchangeRateKey);
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_DASHBOARD_EXCHANGE_RATE;
}

export async function setDashboardExchangeRate(value: number): Promise<void> {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new Error("El tipo de cambio debe ser un número mayor que cero.");
  }
  await redis.set(exchangeRateKey, value);
}
