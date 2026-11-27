import { getCurrencyDefinition, setCurrencyDefinition } from "./contract-currencies";

export const DEFAULT_DASHBOARD_EXCHANGE_RATE = 6.96;

export async function getDashboardExchangeRate(): Promise<number> {
  const usd = await getCurrencyDefinition("USD");
  return usd?.bobPerUnit && Number.isFinite(usd.bobPerUnit) ? usd.bobPerUnit : DEFAULT_DASHBOARD_EXCHANGE_RATE;
}

export async function setDashboardExchangeRate(value: number): Promise<void> {
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new Error("El tipo de cambio debe ser un número mayor que cero.");
  }
  const usd = await getCurrencyDefinition("USD");
  if (!usd) throw new Error("No se encontró la configuración de USD.");
  await setCurrencyDefinition({ ...usd, bobPerUnit: value, enabled: true });
}
