import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  CreateEmployeeBody,
  CreateEmployeeResponse,
  ListEmployeesResponse,
  ResetEmployeePasswordBody,
  ResetEmployeePasswordParams,
  UpdateEmployeeAccessBody,
  UpdateEmployeeAccessParams,
  UpdateEmployeeAccessResponse,
} from "@workspace/api-zod";
import {
  hashPassword,
  requireAdministrator,
  revokeEmployeeSessions,
} from "../lib/employee-auth";

const router: IRouter = Router();

function managedEmployee(employee: typeof employeesTable.$inferSelect) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    active: employee.active,
    createdAt: employee.createdAt,
  };
}

router.get("/employees", requireAdministrator, async (_req, res): Promise<void> => {
  const administrator = res.locals.employee;
  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.workspaceId, administrator.workspaceId))
    .orderBy(asc(employeesTable.name));
  res.json(ListEmployeesResponse.parse(employees.map(managedEmployee)));
});

router.post("/employees", requireAdministrator, async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid employee ID, name, role, and temporary password." });
    return;
  }

  const administrator = res.locals.employee;
  const employeeId = parsed.data.employeeId.trim().toUpperCase();
  const [existing] = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(eq(employeesTable.employeeId, employeeId))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "That employee ID is already in use." });
    return;
  }

  const [employee] = await db.insert(employeesTable).values({
    workspaceId: administrator.workspaceId,
    employeeId,
    name: parsed.data.name.trim(),
    role: parsed.data.role,
    passwordHash: await hashPassword(parsed.data.temporaryPassword),
  }).returning();
  res.status(201).json(CreateEmployeeResponse.parse(managedEmployee(employee)));
});

router.patch("/employees/:id", requireAdministrator, async (req, res): Promise<void> => {
  const params = UpdateEmployeeAccessParams.safeParse(req.params);
  const parsed = UpdateEmployeeAccessBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Enter a valid employee and access update." });
    return;
  }

  const administrator = res.locals.employee;
  if (params.data.id === administrator.id && parsed.data.active === false) {
    res.status(400).json({ error: "You cannot disable your own account." });
    return;
  }

  const [employee] = await db.update(employeesTable)
    .set(parsed.data)
    .where(and(
      eq(employeesTable.id, params.data.id),
      eq(employeesTable.workspaceId, administrator.workspaceId),
    ))
    .returning();
  if (!employee) {
    res.status(404).json({ error: "Employee not found." });
    return;
  }
  if (parsed.data.active === false) {
    await revokeEmployeeSessions(employee.id);
  }
  res.json(UpdateEmployeeAccessResponse.parse(managedEmployee(employee)));
});

router.post("/employees/:id/reset-password", requireAdministrator, async (req, res): Promise<void> => {
  const params = ResetEmployeePasswordParams.safeParse(req.params);
  const parsed = ResetEmployeePasswordBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Enter a valid temporary password." });
    return;
  }

  const administrator = res.locals.employee;
  const [employee] = await db.update(employeesTable)
    .set({ passwordHash: await hashPassword(parsed.data.temporaryPassword) })
    .where(and(
      eq(employeesTable.id, params.data.id),
      eq(employeesTable.workspaceId, administrator.workspaceId),
    ))
    .returning({ id: employeesTable.id });
  if (!employee) {
    res.status(404).json({ error: "Employee not found." });
    return;
  }
  await revokeEmployeeSessions(employee.id);
  res.sendStatus(204);
});

export default router;