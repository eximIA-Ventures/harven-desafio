import { cookies } from "next/headers";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "hd-session";
const SESSION_SECRET: string = process.env.SESSION_SECRET ?? (() => {
  throw new Error("SESSION_SECRET environment variable is required");
})();
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  name: string;
  type: "participant" | "admin";
};

// --- Session tokens ---

function createSessionToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

function verifySessionToken(
  token: string
): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [userId, timestampStr, hmac] = parts;
    const payload = `${userId}:${timestampStr}`;
    const expectedHmac = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (hmac !== expectedHmac) return null;

    const timestamp = parseInt(timestampStr, 10);
    const age = (Date.now() - timestamp) / 1000;
    if (age > SESSION_MAX_AGE) return null;

    return { userId };
  } catch {
    return null;
  }
}

// --- Session management ---

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const verified = verifySessionToken(token);
  if (!verified) return null;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, verified.userId),
  });

  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    type: user.type as "participant" | "admin",
  };
}

export async function setSession(userId: string): Promise<void> {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// --- CPF helpers ---

export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "").padStart(11, "0");
}

export function formatCpf(cpf: string): string {
  const digits = normalizeCpf(cpf);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCpf(cpf: string): boolean {
  const digits = normalizeCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // all same digit

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(digits[10])) return false;

  return true;
}

// --- Participant login (CPF) ---

export async function loginByCpf(
  cpf: string
): Promise<{ user: SessionUser; isNew: false } | { isNew: true } | null> {
  const normalized = normalizeCpf(cpf);

  const user = await db.query.users.findFirst({
    where: eq(schema.users.cpf, normalized),
  });

  if (user) {
    if (!user.active) return null;
    await setSession(user.id);
    return {
      user: { id: user.id, name: user.name, type: user.type as "participant" | "admin" },
      isNew: false,
    };
  }

  return { isNew: true };
}

// --- Participant registration ---

export async function registerParticipant(data: {
  cpf: string;
  name: string;
  email?: string;
  curso?: string;
  anoIngresso?: number;
  semestre?: number;
  sala?: string;
}): Promise<SessionUser> {
  const [newUser] = await db
    .insert(schema.users)
    .values({
      cpf: normalizeCpf(data.cpf),
      name: data.name.trim(),
      email: data.email?.toLowerCase().trim() || null,
      curso: data.curso?.trim() || null,
      anoIngresso: data.anoIngresso || null,
      semestre: data.semestre || null,
      sala: data.sala?.trim() || null,
      type: "participant",
    })
    .returning();

  await setSession(newUser.id);

  return {
    id: newUser.id,
    name: newUser.name,
    type: "participant",
  };
}

// --- Admin login (email + password) ---

export async function loginAdmin(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase().trim()),
  });

  if (!user || !user.active || user.type !== "admin" || !user.passwordHash) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  await setSession(user.id);

  return {
    id: user.id,
    name: user.name,
    type: "admin",
  };
}

export function getRedirectForRole(user: SessionUser): string {
  return user.type === "admin" ? "/admin" : "/dashboard/minha-carteira";
}
