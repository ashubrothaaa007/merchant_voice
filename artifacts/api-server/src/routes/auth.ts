import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  ChangeEmployeePasswordBody,
  GetEmployeeSessionResponse,
  LoginEmployeeBody,
  LoginEmployeeResponse,
} from "@workspace/api-zod";
import {
  clearSessionCookie,
  createEmployeeSession,
  destroyEmployeeSession,
  getSessionEmployee,
  hashPassword,
  requireEmployee,
  revokeEmployeeSessions,
  setSessionCookie,
  verifyPassword,
} from "../lib/employee-auth";

const router: IRouter = Router();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function loginAttemptKey(req: Request, employeeId: string) {
  return `${req.ip ?? req.socket.remoteAddress ?? "unknown"}:${employeeId.trim().toUpperCase()}`;
}

function isLoginRateLimited(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  loginAttempts.set(key, current && current.resetAt > now
    ? { ...current, count: current.count + 1 }
    : { count: 1, resetAt: now + LOGIN_WINDOW_MS });
}

function publicEmployee(employee: { id: number; employeeId: string; name: string; role: string }) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
  };
}

router.get("/auth/session", async (req, res): Promise<void> => {
  const employee = await getSessionEmployee(req);
  res.json(GetEmployeeSessionResponse.parse({
    authenticated: Boolean(employee),
    employee: employee ? publicEmployee(employee) : null,
  }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid employee ID and password." });
    return;
  }
  const attemptKey = loginAttemptKey(req, parsed.data.employeeId);
  if (isLoginRateLimited(attemptKey)) {
    res.setHeader("Retry-After", Math.ceil(LOGIN_WINDOW_MS / 1000));
    res.status(429).json({ error: "Too many sign-in attempts. Try again later." });
    return;
  }
  const [employee] = await db.select().from(employeesTable)
    .where(eq(employeesTable.employeeId, parsed.data.employeeId.trim().toUpperCase()))
    .limit(1);
  if (!employee || !employee.active || !(await verifyPassword(parsed.data.password, employee.passwordHash))) {
    recordFailedLogin(attemptKey);
    req.log.warn({ employeeId: parsed.data.employeeId }, "Invalid employee login attempt");
    res.status(401).json({ error: "Employee ID or password is incorrect." });
    return;
  }
  loginAttempts.delete(attemptKey);
  const session = await createEmployeeSession(employee.id);
  setSessionCookie(res, session.token, session.expiresAt);
  res.json(LoginEmployeeResponse.parse({
    authenticated: true,
    employee: publicEmployee(employee),
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await destroyEmployeeSession(req);
  clearSessionCookie(res);
  res.sendStatus(204);
});

router.post("/auth/change-password", requireEmployee, async (req, res): Promise<void> => {
  const parsed = ChangeEmployeePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Passwords must be between 8 and 200 characters." });
    return;
  }

  const currentEmployee = res.locals.employee;
  const [employee] = await db.select().from(employeesTable)
    .where(eq(employeesTable.id, currentEmployee.id))
    .limit(1);
  if (!employee || !(await verifyPassword(parsed.data.currentPassword, employee.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    res.status(400).json({ error: "Choose a new password that is different from the current password." });
    return;
  }

  await db.update(employeesTable)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(employeesTable.id, employee.id));
  await revokeEmployeeSessions(employee.id, currentEmployee.sessionId);
  res.sendStatus(204);
});

export default router;