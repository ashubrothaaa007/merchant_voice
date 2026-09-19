import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { db, employeeSessionsTable, employeesTable } from "@workspace/db";
import { and, eq, gt, ne } from "drizzle-orm";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "mv_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return secret;
}

function hashToken(token: string) {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function applyConfiguredAdministratorPassword() {
  const password = process.env.MERCHANT_VOICE_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("MERCHANT_VOICE_ADMIN_PASSWORD must be configured with at least 8 characters");
  }

  const [administrator] = await db.select().from(employeesTable)
    .where(eq(employeesTable.employeeId, "EMP-1001"))
    .limit(1);
  if (!administrator || await verifyPassword(password, administrator.passwordHash)) return;

  await db.update(employeesTable)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(employeesTable.id, administrator.id));
  await revokeEmployeeSessions(administrator.id);
}

export async function createEmployeeSession(employeeId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(employeeSessionsTable).values({
    employeeId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function getSessionEmployee(req: Request) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return null;
  const [row] = await db
    .select({
      sessionId: employeeSessionsTable.id,
      id: employeesTable.id,
      employeeId: employeesTable.employeeId,
      name: employeesTable.name,
      role: employeesTable.role,
      workspaceId: employeesTable.workspaceId,
    })
    .from(employeeSessionsTable)
    .innerJoin(employeesTable, eq(employeeSessionsTable.employeeId, employeesTable.id))
    .where(and(
      eq(employeeSessionsTable.tokenHash, hashToken(token)),
      gt(employeeSessionsTable.expiresAt, new Date()),
      eq(employeesTable.active, true),
    ))
    .limit(1);
  return row ?? null;
}

export async function destroyEmployeeSession(req: Request) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (token) {
    await db.delete(employeeSessionsTable).where(eq(employeeSessionsTable.tokenHash, hashToken(token)));
  }
}

export async function revokeEmployeeSessions(employeeId: number, exceptSessionId?: number) {
  const condition = exceptSessionId
    ? and(eq(employeeSessionsTable.employeeId, employeeId), ne(employeeSessionsTable.id, exceptSessionId))
    : eq(employeeSessionsTable.employeeId, employeeId);
  await db.delete(employeeSessionsTable).where(condition);
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function requireEmployee(req: Request, res: Response, next: NextFunction) {
  const employee = await getSessionEmployee(req);
  if (!employee) {
    res.status(401).json({ error: "Employee sign-in required" });
    return;
  }
  res.locals.employee = employee;
  next();
}

export async function requireAdministrator(req: Request, res: Response, next: NextFunction) {
  await requireEmployee(req, res, () => {
    const role = String(res.locals.employee.role).toLowerCase();
    if (!["administrator", "admin", "product operations"].includes(role)) {
      res.status(403).json({ error: "Administrator access required" });
      return;
    }
    next();
  });
}
