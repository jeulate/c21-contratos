import Redis from "ioredis";

const client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 250, 2_000),
});

client.on("error", (error) => console.error("Redis local:", error.message));

async function ensureConnected() {
  if (client.status === "wait") await client.connect();
}

function parse<T>(value: string | null): T | null {
  return value === null ? null : (JSON.parse(value) as T);
}

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    await ensureConnected();
    return parse<T>(await client.get(key));
  },
  async set(key: string, value: unknown): Promise<void> {
    await ensureConnected();
    await client.set(key, JSON.stringify(value));
  },
  async del(key: string): Promise<void> {
    await ensureConnected();
    await client.del(key);
  },
  async mget<T>(...keys: string[]): Promise<T> {
    if (!keys.length) return [] as T;
    await ensureConnected();
    return (await client.mget(...keys)).map((value) => parse(value)) as T;
  },
  async smembers(key: string): Promise<string[]> {
    await ensureConnected();
    return client.smembers(key);
  },
  async sadd(key: string, member: string): Promise<void> {
    await ensureConnected();
    await client.sadd(key, member);
  },
  async zadd(key: string, entry: { score: number; member: string }): Promise<void> {
    await ensureConnected();
    await client.zadd(key, entry.score, entry.member);
  },
  async zrange<T extends string[]>(key: string, start: number, stop: number, options?: { rev?: boolean }): Promise<T> {
    await ensureConnected();
    const values = options?.rev
      ? await client.zrevrange(key, start, stop)
      : await client.zrange(key, start, stop);
    return values as T;
  },
};
