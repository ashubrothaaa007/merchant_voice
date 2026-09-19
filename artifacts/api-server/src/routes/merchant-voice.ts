import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  actionsTable,
  db,
  feedbackTable,
  fixSubmissionsTable,
  issueEventsTable,
  issuesTable,
  notificationsTable,
} from "@workspace/db";
import {
  CreateActionBody,
  CreateActionResponse,
  CreateFeedbackBody,
  CreateFeedbackResponse,
  AdvanceIssueBody,
  AdvanceIssueParams,
  AdvanceIssueResponse,
  GetDashboardResponse,
  GetIssueParams,
  GetIssueResponse,
  ImportFeedbackBody,
  ImportFeedbackResponse,
  ListActionsResponse,
  ListFeedbackQueryParams,
  ListFeedbackResponse,
  ListIssuesResponse,
  ListNotificationsResponse,
  MarkNotificationReadParams,
  QueryAssistantBody,
  QueryAssistantResponse,
  UpdateActionBody,
  UpdateActionParams,
  UpdateActionResponse,
  ReviewIssueFixBody,
  ReviewIssueFixParams,
  ReviewIssueFixResponse,
  SubmitIssueFixBody,
  SubmitIssueFixParams,
  SubmitIssueFixResponse,
} from "@workspace/api-zod";
import { classifyFeedback } from "../lib/merchant-analysis";
import { requireEmployee } from "../lib/employee-auth";

const router: IRouter = Router();

router.use(requireEmployee);

const feedbackShape = {
  id: feedbackTable.id,
  message: feedbackTable.message,
  source: feedbackTable.source,
  category: feedbackTable.category,
  sentiment: feedbackTable.sentiment,
  severity: feedbackTable.severity,
  status: feedbackTable.status,
  createdAt: feedbackTable.createdAt,
  summary: feedbackTable.summary,
  keywords: feedbackTable.keywords,
  issueId: feedbackTable.issueId,
  issueTitle: issuesTable.title,
  synthetic: feedbackTable.synthetic,
};

async function issueDtos(workspaceId: string) {
  const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(feedbackTable).where(eq(feedbackTable.workspaceId, workspaceId));
  const total = totalResult[0]?.count ?? 0;
  const rows = await db
    .select({
      id: issuesTable.id,
      title: issuesTable.title,
      summary: issuesTable.summary,
      trendPercent: issuesTable.trendPercent,
      priority: issuesTable.priority,
      status: issuesTable.status,
      assignedTeam: issuesTable.assignedTeam,
      reportCount: sql<number>`count(${feedbackTable.id})::int`,
      recentCount: sql<number>`count(${feedbackTable.id}) filter (where ${feedbackTable.createdAt} > now() - interval '3 days')::int`,
    })
    .from(issuesTable)
    .leftJoin(feedbackTable, and(eq(feedbackTable.issueId, issuesTable.id), eq(feedbackTable.workspaceId, workspaceId)))
    .where(eq(issuesTable.workspaceId, workspaceId))
    .groupBy(issuesTable.id)
    .orderBy(desc(sql`count(${feedbackTable.id})`));
  return rows.map((row) => ({
    ...row,
    trendPercent: Number(row.trendPercent),
    sharePercent: total ? Number(((row.reportCount / total) * 100).toFixed(1)) : 0,
  }));
}

function isReviewer(role: string) {
  return ["administrator", "admin", "product operations", "reviewer", "product owner"]
    .includes(role.toLowerCase());
}

async function issueDetailDto(workspaceId: string, issueId: number) {
  const issues = await issueDtos(workspaceId);
  const summary = issues.find((issue) => issue.id === issueId);
  const [issue] = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.id, issueId), eq(issuesTable.workspaceId, workspaceId)))
    .limit(1);
  if (!issue || !summary) return null;
  const evidence = await db.select(feedbackShape).from(feedbackTable)
    .leftJoin(issuesTable, eq(feedbackTable.issueId, issuesTable.id))
    .where(and(eq(feedbackTable.workspaceId, workspaceId), eq(feedbackTable.issueId, issue.id)))
    .orderBy(desc(feedbackTable.createdAt)).limit(50);
  const trend = await db.select({
    date: sql<string>`to_char(date_trunc('day', ${feedbackTable.createdAt}), 'Mon DD')`,
    count: sql<number>`count(*)::int`,
  }).from(feedbackTable)
    .where(and(eq(feedbackTable.workspaceId, workspaceId), eq(feedbackTable.issueId, issue.id), sql`${feedbackTable.createdAt} > now() - interval '7 days'`))
    .groupBy(sql`date_trunc('day', ${feedbackTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${feedbackTable.createdAt})`);
  const [latestFix] = await db.select().from(fixSubmissionsTable)
    .where(and(eq(fixSubmissionsTable.workspaceId, workspaceId), eq(fixSubmissionsTable.issueId, issue.id)))
    .orderBy(desc(fixSubmissionsTable.submittedAt)).limit(1);
  const events = await db.select({
    id: issueEventsTable.id,
    eventType: issueEventsTable.eventType,
    actorName: issueEventsTable.actorName,
    details: issueEventsTable.details,
    createdAt: issueEventsTable.createdAt,
  }).from(issueEventsTable)
    .where(and(eq(issueEventsTable.workspaceId, workspaceId), eq(issueEventsTable.issueId, issue.id)))
    .orderBy(issueEventsTable.createdAt);
  return {
    ...summary,
    evidence,
    trend,
    interpretation: { title: "AI interpretation", body: issue.interpretation, evidenceCount: evidence.length, generatedAt: new Date().toISOString() },
    recommendation: { title: issue.recommendationTitle, description: issue.recommendationDescription, suggestedOwner: issue.suggestedOwner, priority: issue.recommendedPriority },
    latestFix: latestFix ? {
      id: latestFix.id,
      issueId: latestFix.issueId,
      submittedByName: latestFix.submittedByName,
      submittedByTeam: latestFix.submittedByTeam,
      summary: latestFix.summary,
      resolutionDetails: latestFix.resolutionDetails,
      evidence: latestFix.evidence,
      status: latestFix.status,
      submittedAt: latestFix.submittedAt,
      reviewedAt: latestFix.reviewedAt,
      reviewedByName: latestFix.reviewedByName,
      reviewReason: latestFix.reviewReason,
      verificationChecklist: latestFix.verificationChecklist ?? undefined,
    } : null,
    events,
    completedAt: issue.completedAt,
    completedByName: issue.completedByName,
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const issues = await issueDtos(workspaceId);
  const recentFeedback = await db.select(feedbackShape).from(feedbackTable).leftJoin(issuesTable, eq(feedbackTable.issueId, issuesTable.id)).where(eq(feedbackTable.workspaceId, workspaceId)).orderBy(desc(feedbackTable.createdAt)).limit(5);
  const counts = await db.select({
    feedback: sql<number>`count(*)::int`,
    synthetic: sql<number>`count(*) filter (where ${feedbackTable.synthetic})::int`,
  }).from(feedbackTable).where(eq(feedbackTable.workspaceId, workspaceId));
  const actionAttention = await db.select({ count: sql<number>`count(*)::int` }).from(actionsTable).where(and(eq(actionsTable.workspaceId, workspaceId), or(eq(actionsTable.status, "Open"), eq(actionsTable.status, "In Progress"))));
  const trendRows = await db.select({
    date: sql<string>`to_char(date_trunc('day', ${feedbackTable.createdAt}), 'Mon DD')`,
    count: sql<number>`count(*)::int`,
  }).from(feedbackTable).where(and(eq(feedbackTable.workspaceId, workspaceId), sql`${feedbackTable.createdAt} > now() - interval '7 days'`)).groupBy(sql`date_trunc('day', ${feedbackTable.createdAt})`).orderBy(sql`date_trunc('day', ${feedbackTable.createdAt})`);
  const trendByDate = new Map(trendRows.map((point) => [point.date, point.count]));
  const sevenDayTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    });
    return { date: label, count: trendByDate.get(label) ?? 0 };
  });
  const top = issues[0];
  const data = {
    metrics: [
      { label: "Feedback analyzed", value: counts[0]?.feedback ?? 0, context: "Across all connected sources" },
      { label: "High-priority issues", value: issues.filter((issue) => issue.priority === "High").length, context: "Require product or ops review" },
      { label: "Emerging issues", value: issues.filter((issue) => issue.trendPercent > 0).length, context: "Trending up this period" },
      { label: "Actions requiring attention", value: actionAttention[0]?.count ?? 0, context: "Open or in progress" },
    ],
    attentionIssues: issues,
    detectedInsight: {
      title: top ? `${top.title} is the strongest signal` : "No significant issue detected",
      body: top ? `${top.reportCount} feedback records are associated with this issue, trending ${top.trendPercent}% this week.` : "Add feedback to begin detecting patterns.",
      evidenceCount: top?.reportCount ?? 0,
      generatedAt: new Date().toISOString(),
    },
    recentFeedback,
    trend: sevenDayTrend,
    synthetic: (counts[0]?.synthetic ?? 0) > 0,
  };
  res.json(GetDashboardResponse.parse(data));
});

router.get("/feedback", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const parsed = ListFeedbackQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const filters = [eq(feedbackTable.workspaceId, workspaceId)];
  if (parsed.data.search) filters.push(or(ilike(feedbackTable.message, `%${parsed.data.search}%`), ilike(feedbackTable.summary, `%${parsed.data.search}%`))!);
  if (parsed.data.category) filters.push(eq(feedbackTable.category, parsed.data.category));
  if (parsed.data.status) filters.push(eq(feedbackTable.status, parsed.data.status));
  const rows = await db.select(feedbackShape).from(feedbackTable).leftJoin(issuesTable, eq(feedbackTable.issueId, issuesTable.id)).where(and(...filters)).orderBy(desc(feedbackTable.createdAt)).limit(250);
  res.json(ListFeedbackResponse.parse(rows));
});

router.post("/feedback", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const parsed = CreateFeedbackBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const analysis = classifyFeedback(parsed.data.message);
  const [issue] = await db.select().from(issuesTable).where(and(eq(issuesTable.workspaceId, workspaceId), eq(issuesTable.title, analysis.category))).limit(1);
  const [created] = await db.insert(feedbackTable).values({
    workspaceId,
    ...parsed.data,
    createdAt: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    ...analysis,
    status: "Analyzed",
    issueId: issue?.id,
  }).returning();
  res.status(201).json(CreateFeedbackResponse.parse({ ...created, issueTitle: issue?.title ?? null }));
});

router.post("/feedback/import", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const parsed = ImportFeedbackBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const issues = await db.select().from(issuesTable).where(eq(issuesTable.workspaceId, workspaceId));
  const issueByTitle = new Map(issues.map((issue) => [issue.title, issue.id]));
  const values = parsed.data.rows.map((row) => {
    const analysis = classifyFeedback(row.message);
    return {
      workspaceId,
      message: row.message,
      source: row.source,
      createdAt: row.date ? new Date(row.date) : new Date(),
      ...analysis,
      status: "Analyzed",
      issueId: issueByTitle.get(analysis.category),
      synthetic: false,
    };
  });
  await db.insert(feedbackTable).values(values);
  res.status(201).json(ImportFeedbackResponse.parse({ imported: values.length, analyzed: values.length, issuesUpdated: new Set(values.map((v) => v.issueId).filter(Boolean)).size, message: `${values.length} feedback records analyzed successfully.` }));
});

router.get("/issues", async (_req, res): Promise<void> => {
  res.json(ListIssuesResponse.parse(await issueDtos(res.locals.employee.workspaceId)));
});

router.get("/issues/:id", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const params = GetIssueParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const detail = await issueDetailDto(workspaceId, params.data.id);
  if (!detail) { res.status(404).json({ error: "Issue not found" }); return; }
  res.json(GetIssueResponse.parse(detail));
});

router.post("/issues/:id/advance", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const params = AdvanceIssueParams.safeParse(req.params);
  const body = AdvanceIssueBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid lifecycle update" }); return; }
  const [issue] = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.id, params.data.id), eq(issuesTable.workspaceId, workspaceId))).limit(1);
  if (!issue) { res.status(404).json({ error: "Issue not found" }); return; }
  const transitions = {
    assign: { from: ["Detected"], to: "Assigned", event: "ISSUE_ASSIGNED" },
    acknowledge: { from: ["Assigned"], to: "Acknowledged", event: "ISSUE_ACKNOWLEDGED" },
    investigate: { from: ["Acknowledged", "Changes Requested"], to: "Investigating", event: "INVESTIGATION_STARTED" },
  } as const;
  const transition = transitions[body.data.action];
  if (!transition.from.includes(issue.status as never)) {
    res.status(409).json({ error: `Issue cannot ${body.data.action} from ${issue.status}` }); return;
  }
  if (body.data.action === "assign" && !body.data.assignedTeam?.trim()) {
    res.status(400).json({ error: "Assigned team is required" }); return;
  }
  const assignedTeam = body.data.action === "assign" ? body.data.assignedTeam!.trim() : issue.assignedTeam;
  await db.transaction(async (tx) => {
    await tx.update(issuesTable).set({ status: transition.to, assignedTeam, updatedAt: new Date() })
      .where(eq(issuesTable.id, issue.id));
    if (body.data.action === "investigate") {
      await tx.update(actionsTable).set({ status: "In Progress", updatedAt: new Date() })
        .where(and(eq(actionsTable.issueId, issue.id), eq(actionsTable.workspaceId, workspaceId)));
    }
    await tx.insert(issueEventsTable).values({
      workspaceId, issueId: issue.id, eventType: transition.event,
      actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name,
      details: assignedTeam ? { assignedTeam } : {},
    });
  });
  const detail = await issueDetailDto(workspaceId, issue.id);
  res.json(AdvanceIssueResponse.parse(detail));
});

router.post("/issues/:id/fixes", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const params = SubmitIssueFixParams.safeParse(req.params);
  const body = SubmitIssueFixBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid fix submission" }); return; }
  const [issue] = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.id, params.data.id), eq(issuesTable.workspaceId, workspaceId))).limit(1);
  if (!issue) { res.status(404).json({ error: "Issue not found" }); return; }
  if (issue.status !== "Investigating") {
    res.status(409).json({ error: "Only an issue under investigation can be submitted for review" }); return;
  }
  const submittedAt = new Date();
  let created: typeof fixSubmissionsTable.$inferSelect;
  await db.transaction(async (tx) => {
    [created] = await tx.insert(fixSubmissionsTable).values({
      workspaceId, issueId: issue.id,
      submittedByEmployeeId: res.locals.employee.id,
      submittedByName: res.locals.employee.name,
      submittedByTeam: issue.assignedTeam ?? res.locals.employee.role,
      summary: body.data.summary,
      resolutionDetails: body.data.resolutionDetails || null,
      evidence: body.data.evidence || null,
      submittedAt,
    }).returning();
    await tx.update(issuesTable).set({ status: "Ready for Review", updatedAt: submittedAt }).where(eq(issuesTable.id, issue.id));
    await tx.insert(issueEventsTable).values([
      { workspaceId, issueId: issue.id, eventType: "FIX_SUBMITTED", actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name, details: { summary: body.data.summary } },
      { workspaceId, issueId: issue.id, eventType: "REVIEW_REQUESTED", actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name, details: {} },
    ]);
    await tx.insert(notificationsTable).values({
      workspaceId, issueId: issue.id, audience: "Reviewer",
      title: `${issue.title} is ready for review`,
      message: `${issue.assignedTeam ?? res.locals.employee.role} submitted a fix. ${body.data.summary}`,
    });
  });
  res.status(201).json(SubmitIssueFixResponse.parse({
    ...created!,
    verificationChecklist: created!.verificationChecklist ?? undefined,
  }));
});

router.post("/issues/:id/review", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const params = ReviewIssueFixParams.safeParse(req.params);
  const body = ReviewIssueFixBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid review" }); return; }
  if (!isReviewer(res.locals.employee.role)) { res.status(403).json({ error: "Reviewer permission required" }); return; }
  const [issue] = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.id, params.data.id), eq(issuesTable.workspaceId, workspaceId))).limit(1);
  if (!issue) { res.status(404).json({ error: "Issue not found" }); return; }
  const [fix] = await db.select().from(fixSubmissionsTable)
    .where(and(eq(fixSubmissionsTable.issueId, issue.id), eq(fixSubmissionsTable.workspaceId, workspaceId)))
    .orderBy(desc(fixSubmissionsTable.submittedAt)).limit(1);
  if (issue.status !== "Ready for Review" || !fix || fix.status !== "Pending Review") {
    res.status(409).json({ error: "Issue is not ready for review" }); return;
  }
  if (fix.submittedByEmployeeId === res.locals.employee.id) {
    res.status(403).json({ error: "A fix must be reviewed by a different employee" }); return;
  }
  const checklist = { fixDeployed: body.data.fixDeployed, behaviorVerified: body.data.behaviorVerified, metricsChecked: body.data.metricsChecked };
  if (body.data.outcome === "accept" && !Object.values(checklist).every(Boolean)) {
    res.status(400).json({ error: "Complete every verification check before accepting" }); return;
  }
  if (body.data.outcome === "request_changes" && !body.data.reason?.trim()) {
    res.status(400).json({ error: "A reason is required when requesting changes" }); return;
  }
  const accepted = body.data.outcome === "accept";
  const reviewedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(fixSubmissionsTable).set({
      status: accepted ? "Accepted" : "Changes Requested",
      reviewedAt, reviewedByEmployeeId: res.locals.employee.id,
      reviewedByName: res.locals.employee.name,
      reviewReason: body.data.reason || null,
      verificationChecklist: checklist,
    }).where(eq(fixSubmissionsTable.id, fix.id));
    await tx.update(issuesTable).set({
      status: accepted ? "Completed" : "Changes Requested",
      updatedAt: reviewedAt,
      completedAt: accepted ? reviewedAt : null,
      completedByName: accepted ? res.locals.employee.name : null,
    }).where(eq(issuesTable.id, issue.id));
    await tx.update(actionsTable).set({
      status: accepted ? "Resolved" : "In Progress",
      updatedAt: reviewedAt,
    }).where(and(eq(actionsTable.issueId, issue.id), eq(actionsTable.workspaceId, workspaceId)));
    await tx.insert(issueEventsTable).values(accepted ? [
      { workspaceId, issueId: issue.id, eventType: "FIX_ACCEPTED", actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name, details: { checklist } },
      { workspaceId, issueId: issue.id, eventType: "ISSUE_COMPLETED", actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name, details: {} },
    ] : [
      { workspaceId, issueId: issue.id, eventType: "CHANGES_REQUESTED", actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name, details: { reason: body.data.reason } },
    ]);
    await tx.insert(notificationsTable).values({
      workspaceId, issueId: issue.id, audience: "Team", targetTeam: issue.assignedTeam,
      title: accepted ? `Fix verified for ${issue.title}` : `Changes requested for ${issue.title}`,
      message: accepted
        ? "Your fix was verified and the issue is now completed."
        : `Further investigation is required. ${body.data.reason}`,
    });
  });
  const detail = await issueDetailDto(workspaceId, issue.id);
  res.json(ReviewIssueFixResponse.parse(detail));
});

router.get("/notifications", async (_req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const audience = isReviewer(res.locals.employee.role) ? "Reviewer" : "Team";
  const rows = await db.select({
    id: notificationsTable.id, issueId: notificationsTable.issueId,
    title: notificationsTable.title, message: notificationsTable.message,
    read: notificationsTable.read, createdAt: notificationsTable.createdAt,
  }).from(notificationsTable)
    .where(and(eq(notificationsTable.workspaceId, workspaceId), eq(notificationsTable.audience, audience)))
    .orderBy(desc(notificationsTable.createdAt)).limit(30);
  res.json(ListNotificationsResponse.parse(rows));
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid notification" }); return; }
  await db.update(notificationsTable).set({ read: true })
    .where(and(eq(notificationsTable.id, params.data.id), eq(notificationsTable.workspaceId, res.locals.employee.workspaceId)));
  res.sendStatus(204);
});

router.get("/actions", async (_req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const rows = await db.select({
    id: actionsTable.id, title: actionsTable.title, description: actionsTable.description,
    issueId: actionsTable.issueId, issueTitle: issuesTable.title, priority: actionsTable.priority,
    owner: actionsTable.owner, status: actionsTable.status, createdAt: actionsTable.createdAt,
  }).from(actionsTable).innerJoin(issuesTable, eq(actionsTable.issueId, issuesTable.id)).where(eq(actionsTable.workspaceId, workspaceId)).orderBy(desc(actionsTable.createdAt));
  res.json(ListActionsResponse.parse(rows));
});

router.post("/actions", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const parsed = CreateActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [issue] = await db.select().from(issuesTable).where(and(eq(issuesTable.id, parsed.data.issueId), eq(issuesTable.workspaceId, workspaceId))).limit(1);
  if (!issue) { res.status(400).json({ error: "Related issue not found" }); return; }
  const [created] = await db.insert(actionsTable).values({ workspaceId, ...parsed.data }).returning();
  if (issue.status === "Detected") {
    await db.transaction(async (tx) => {
      await tx.update(issuesTable).set({ status: "Assigned", assignedTeam: parsed.data.owner, updatedAt: new Date() }).where(eq(issuesTable.id, issue.id));
      await tx.insert(issueEventsTable).values({
        workspaceId, issueId: issue.id, eventType: "ISSUE_ASSIGNED",
        actorEmployeeId: res.locals.employee.id, actorName: res.locals.employee.name,
        details: { assignedTeam: parsed.data.owner },
      });
    });
  }
  res.status(201).json(CreateActionResponse.parse({ ...created, issueTitle: issue.title }));
});

router.patch("/actions/:id", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const params = UpdateActionParams.safeParse(req.params);
  const body = UpdateActionBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid action update" }); return; }
  const [updated] = await db.update(actionsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(actionsTable.id, params.data.id), eq(actionsTable.workspaceId, workspaceId))).returning();
  if (!updated) { res.status(404).json({ error: "Action not found" }); return; }
  const [issue] = await db.select().from(issuesTable).where(and(eq(issuesTable.id, updated.issueId), eq(issuesTable.workspaceId, workspaceId))).limit(1);
  res.json(UpdateActionResponse.parse({ ...updated, issueTitle: issue?.title ?? "Unknown issue" }));
});

router.post("/assistant/query", async (req, res): Promise<void> => {
  const workspaceId = res.locals.employee.workspaceId;
  const parsed = QueryAssistantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const words = parsed.data.question.toLowerCase();
  const allIssues = await issueDtos(workspaceId);
  const matched = allIssues.find((issue) => words.includes(issue.title.toLowerCase().split(" ")[0]!)) ?? allIssues[0];
  if (!matched) { res.json(QueryAssistantResponse.parse({ answer: "I don't have enough feedback data to determine that.", evidence: [], insufficientData: true })); return; }
  const evidence = await db.select(feedbackShape).from(feedbackTable).leftJoin(issuesTable, eq(feedbackTable.issueId, issuesTable.id)).where(and(eq(feedbackTable.workspaceId, workspaceId), eq(feedbackTable.issueId, matched.id))).orderBy(desc(feedbackTable.createdAt)).limit(3);
  const answer = `${matched.title} is the strongest relevant pattern, with ${matched.reportCount} merchant reports (${matched.sharePercent}% of analyzed feedback) and a ${matched.trendPercent}% weekly trend. The evidence points to: ${matched.summary}`;
  res.json(QueryAssistantResponse.parse({ answer, evidence, insufficientData: false }));
});

export default router;