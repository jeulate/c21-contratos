// Crea (o actualiza) el primer administrador. Uso: npm run seed
import Redis from "ioredis";
import bcrypt from "bcryptjs";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 250, 2_000),
});
const username = (process.env.ADMIN_USER ?? "admin").toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres en .env.local");
}

await redis.set(`user:${username}`, JSON.stringify({
  username,
  name: process.env.ADMIN_NAME ?? "Administrador",
  role: "admin",
  active: true,
  passwordHash: await bcrypt.hash(password, 10),
  createdAt: new Date().toISOString(),
}));
await redis.sadd("users:all", username);
await redis.quit();
console.log(`Administrador "${username}" listo.`);
