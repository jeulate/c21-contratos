import bcrypt from "bcryptjs";
import { redis } from "./redis";
import type { Role } from "./session";

export type User = {
  username: string;
  name: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  createdAt: string;
  advisorProfile?: AdvisorProfile;
};

export type AdvisorProfile = {
  fullName: string;
  identityNumber: string;
  identityIssuedIn: string;
  address: string;
  mobile: string;
  whatsapp: string;
  email: string;
  updatedAt: string;
};

const key = (u: string) => `user:${u.toLowerCase()}`;

export const getUser = (username: string) => redis.get<User>(key(username));

export async function listUsers(): Promise<User[]> {
  const names = await redis.smembers("users:all");
  if (!names.length) return [];
  const users = await redis.mget<(User | null)[]>(...names.map(key));
  return users.filter((u): u is User => !!u).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createUser(input: { username: string; name: string; role: Role; password: string }) {
  const username = input.username.toLowerCase();
  if (await getUser(username)) throw new Error("Ese usuario ya existe");
  const user: User = {
    username,
    name: input.name,
    role: input.role,
    active: true,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: new Date().toISOString(),
  };
  await redis.set(key(username), user);
  await redis.sadd("users:all", username);
}

export async function patchUser(
  username: string,
  patch: Partial<Pick<User, "active" | "role" | "advisorProfile">> & { password?: string },
) {
  const u = await getUser(username);
  if (!u) throw new Error("Usuario no encontrado");
  const { password, ...rest } = patch;
  await redis.set(key(username), {
    ...u,
    ...rest,
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
  });
}

export const checkPassword = (u: User, password: string) => bcrypt.compare(password, u.passwordHash);
