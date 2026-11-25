import { redis } from "./redis";

export type ContractPrintSettings = {
  watermarkMode: "text" | "image" | "none";
  watermarkImage?: string;
};

const settingsKey = "contract-print-settings";
const defaults: ContractPrintSettings = { watermarkMode: "text" };

export async function getContractPrintSettings(): Promise<ContractPrintSettings> {
  const stored = await redis.get<Partial<ContractPrintSettings>>(settingsKey);
  if (!stored || !["text", "image", "none"].includes(stored.watermarkMode ?? "")) return defaults;
  return {
    watermarkMode: stored.watermarkMode as ContractPrintSettings["watermarkMode"],
    ...(stored.watermarkMode === "image" && stored.watermarkImage ? { watermarkImage: stored.watermarkImage } : {}),
  };
}

export async function setContractPrintSettings(settings: ContractPrintSettings) {
  await redis.set(settingsKey, settings);
}
