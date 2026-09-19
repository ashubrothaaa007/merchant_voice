import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  employeeId: text("employee_id").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeSessionsTable = pgTable(
  "employee_sessions",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("employee_sessions_token_hash_idx").on(table.tokenHash)],
);

export const issuesTable = pgTable("issues", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull().default("Open"),
  assignedTeam: text("assigned_team"),
  trendPercent: numeric("trend_percent", { precision: 8, scale: 2 }).notNull(),
  recommendationTitle: text("recommendation_title").notNull(),
  recommendationDescription: text("recommendation_description").notNull(),
  suggestedOwner: text("suggested_owner").notNull(),
  recommendedPriority: text("recommended_priority").notNull(),
  interpretation: text("interpretation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedByName: text("completed_by_name"),
});

export const fixSubmissionsTable = pgTable("fix_submissions", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  issueId: integer("issue_id").notNull().references(() => issuesTable.id, { onDelete: "cascade" }),
  submittedByEmployeeId: integer("submitted_by_employee_id").notNull().references(() => employeesTable.id),
  submittedByName: text("submitted_by_name").notNull(),
  submittedByTeam: text("submitted_by_team").notNull(),
  summary: text("summary").notNull(),
  resolutionDetails: text("resolution_details"),
  evidence: text("evidence"),
  status: text("status").notNull().default("Pending Review"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedByEmployeeId: integer("reviewed_by_employee_id").references(() => employeesTable.id),
  reviewedByName: text("reviewed_by_name"),
  reviewReason: text("review_reason"),
  verificationChecklist: jsonb("verification_checklist").$type<Record<string, boolean>>(),
});

export const issueEventsTable = pgTable("issue_events", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  issueId: integer("issue_id").notNull().references(() => issuesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  actorEmployeeId: integer("actor_employee_id").references(() => employeesTable.id),
  actorName: text("actor_name").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  issueId: integer("issue_id").notNull().references(() => issuesTable.id, { onDelete: "cascade" }),
  audience: text("audience").notNull(),
  targetTeam: text("target_team"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(),
  category: text("category").notNull(),
  sentiment: text("sentiment").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("Analyzed"),
  summary: text("summary").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  issueId: integer("issue_id").references(() => issuesTable.id),
  synthetic: boolean("synthetic").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const actionsTable = pgTable("actions", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  issueId: integer("issue_id").notNull().references(() => issuesTable.id),
  priority: text("priority").notNull(),
  owner: text("owner").notNull(),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});