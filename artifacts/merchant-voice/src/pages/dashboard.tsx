import {
  getListNotificationsQueryKey,
  useGetDashboard,
  useListNotifications,
  useMarkNotificationRead,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Bell, CheckCircle2, Lightbulb, Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: notifications = [] } = useListNotifications();
  const markNotificationRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="space-y-16 pb-20">
        <div className="h-24 bg-surface-1 rounded-[20px] animate-pulse max-w-sm"></div>
        <div className="h-[400px] bg-surface-1 rounded-[30px] animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-surface-1 rounded-[20px] animate-pulse"></div>
          <div className="h-40 bg-surface-1 rounded-[20px] animate-pulse"></div>
          <div className="h-40 bg-surface-1 rounded-[20px] animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const totalThisWeek = dashboard.trend.reduce((total, point) => total + point.count, 0);
  const busiestDay = dashboard.trend.reduce(
    (highest, point) => point.count > highest.count ? point : highest,
    dashboard.trend[0] ?? { date: '—', count: 0 },
  );
  const readyForReview = dashboard.attentionIssues.filter((issue) => issue.status === 'Ready for Review');
  const activeInvestigations = dashboard.attentionIssues.filter((issue) => ['Assigned', 'Acknowledged', 'Investigating', 'Changes Requested'].includes(issue.status));
  const completedIssues = dashboard.attentionIssues.filter((issue) => issue.status === 'Completed');
  const needsAttention = dashboard.attentionIssues.filter((issue) => issue.status === 'Detected');
  const reveal = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="space-y-12 md:space-y-16 pb-20">
      <motion.header {...reveal()} className="space-y-4">
        <h1 className="text-[62px] leading-[1] tracking-[-3.1px] font-medium">Overview</h1>
        <p className="text-[18px] text-ink-muted max-w-2xl tracking-[-0.18px]">
          Start here to see what merchants are reporting, which problems need attention, and what your team should do next.
        </p>
      </motion.header>

      {/* Insight Spotlight */}
      <motion.section {...reveal(0.08)} className="bg-gradient-to-br from-[#6a4cf5] to-[#4c2de5] rounded-[30px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-[13px] font-medium mb-6 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Lightbulb className="w-3.5 h-3.5 mr-2" />
              Most important signal
            </div>
            <h2 className="text-[32px] md:text-[40px] leading-[1.1] tracking-[-1.5px] font-medium mb-4 max-w-3xl">
              {dashboard.detectedInsight.title}
            </h2>
            <p className="text-[18px] text-white/80 max-w-2xl tracking-[-0.18px] mb-8 leading-relaxed">
              {dashboard.detectedInsight.body}
            </p>
            <div className="text-[14px] font-medium text-white/60">
              Why this matters: based on {dashboard.detectedInsight.evidenceCount} merchant reports, updated {new Date(dashboard.detectedInsight.generatedAt).toLocaleDateString()}.
            </div>
          </div>
        </div>
      </motion.section>

      {/* Metrics Grid */}
      <motion.section {...reveal(0.14)} aria-labelledby="summary-heading" className="space-y-5">
        <div>
          <h2 id="summary-heading" className="text-[24px] tracking-[-0.6px] font-medium">What you should know</h2>
          <p className="text-[14px] text-ink-muted mt-1">A quick summary of feedback volume, risk, and work still requiring attention.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboard.metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 + index * 0.06 }}
            className="bg-surface-1 rounded-[20px] p-6 relative group hover:bg-surface-2 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            <div className="text-[14px] text-ink-muted font-medium mb-2">{metric.label}</div>
            <div className="text-[40px] tracking-[-2px] font-medium mb-1">{metric.value}</div>
            <div className="text-[13px] text-ink-muted leading-relaxed">
              {metric.context}
            </div>
          </motion.div>
        ))}
        </div>
      </motion.section>

      {/* Feedback Trend */}
      <motion.section {...reveal(0.22)} aria-labelledby="trend-heading" className="bg-surface-1 border border-border rounded-[24px] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-accent-blue" />
              <h2 id="trend-heading" className="text-[24px] tracking-[-0.6px] font-medium">Feedback received</h2>
            </div>
            <p className="text-[14px] text-ink-muted">Daily merchant reports received during the last seven days.</p>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">7-day total</div>
              <div className="text-[26px] tracking-[-1px] font-medium mt-1">{totalThisWeek}</div>
            </div>
            <div>
              <div className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">Busiest day</div>
              <div className="text-[26px] tracking-[-1px] font-medium mt-1">{busiestDay.date}</div>
            </div>
          </div>
        </div>
        <div className="h-[280px] w-full" role="img" aria-label={`Feedback volume for the last seven days. ${totalThisWeek} reports in total.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dashboard.trend} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="feedbackFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0099ff" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#0099ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#262626" strokeDasharray="4 4" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#999999', fontSize: 12 }} dy={10} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#999999', fontSize: 12 }} width={38} />
              <RechartsTooltip
                cursor={{ stroke: '#0099ff', strokeOpacity: 0.35 }}
                contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '10px', color: '#fff', fontSize: '13px' }}
                formatter={(value) => [`${value} reports`, 'Feedback']}
                labelStyle={{ color: '#999999', marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0099ff"
                strokeWidth={3}
                fill="url(#feedbackFill)"
                dot={{ r: 3, fill: '#090909', stroke: '#0099ff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#ffffff', stroke: '#0099ff', strokeWidth: 3 }}
                animationDuration={reduceMotion ? 0 : 900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[13px] text-ink-muted mt-5">
          Use this chart to spot sudden increases. A spike can signal a new merchant problem that needs investigation.
        </p>
      </motion.section>

      {notifications.length > 0 && (
        <motion.section {...reveal(0.26)} className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent-blue" />
            <h2 className="text-[24px] font-medium">Workflow notifications</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {notifications.slice(0, 4).map((notification) => (
              <Link
                key={notification.id}
                href={`/issues/${notification.issueId}`}
                onClick={() => markNotificationRead.mutate({ id: notification.id }, {
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
                })}
                className={`rounded-[18px] border p-5 transition-colors ${notification.read ? 'bg-surface-1 border-border' : 'bg-accent-blue/5 border-accent-blue/30'}`}
              >
                <div className="font-medium mb-2">{notification.title}</div>
                <p className="text-[13px] text-ink-muted leading-relaxed">{notification.message}</p>
                <div className="text-[12px] text-ink-muted mt-3">{new Date(notification.createdAt).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Workflow queues */}
      <motion.section {...reveal(0.3)} className="space-y-8">
        <div>
          <h3 className="text-[32px] tracking-[-1px] font-medium">Issue workflow</h3>
          <p className="text-[14px] text-ink-muted mt-2">Active work stays separate from verified, completed issues.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <IssueQueue title="Ready for review" description="A team submitted a fix. Review these first." issues={readyForReview} icon={ShieldCheck} accent />
          <IssueQueue title="Needs attention" description="Detected issues that still need an owner." issues={needsAttention} icon={Bell} />
          <IssueQueue title="Active investigations" description="Assigned work currently being acknowledged, investigated, or revised." issues={activeInvestigations} icon={Search} />
          <IssueQueue title="Completed" description="Fixes verified and accepted by an authorized reviewer." issues={completedIssues} icon={CheckCircle2} completed />
        </div>
      </motion.section>
    </div>
  );
}

function IssueQueue({
  title,
  description,
  issues,
  icon: Icon,
  accent = false,
  completed = false,
}: {
  title: string;
  description: string;
  issues: Array<{ id: number; title: string; status: string; reportCount: number; assignedTeam?: string | null }>;
  icon: typeof Bell;
  accent?: boolean;
  completed?: boolean;
}) {
  return (
    <section className={`rounded-[22px] border p-6 ${accent ? 'bg-accent-blue/5 border-accent-blue/30' : 'bg-surface-1 border-border'}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${completed ? 'text-[#22c55e]' : accent ? 'text-accent-blue' : 'text-ink-muted'}`} /><h4 className="text-[18px] font-medium">{title}</h4></div>
          <p className="text-[12px] text-ink-muted mt-2">{description}</p>
        </div>
        <span className="rounded-full bg-background border border-border px-3 py-1 text-[12px]">{issues.length}</span>
      </div>
      <div className="space-y-2">
        {issues.length === 0 ? (
          <div className="rounded-[12px] bg-background/60 px-4 py-5 text-[13px] text-ink-muted">Nothing in this queue.</div>
        ) : issues.map((issue) => (
          <Link key={issue.id} href={`/issues/${issue.id}`} className="flex items-center justify-between gap-4 rounded-[12px] bg-background border border-border px-4 py-4 hover:border-white/15 transition-colors group">
            <div className="min-w-0">
              <div className="font-medium text-[14px] truncate">{issue.title}</div>
              <div className="text-[12px] text-ink-muted mt-1">{issue.assignedTeam ?? 'Unassigned'} · {issue.reportCount} reports</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-ink-muted group-hover:text-white shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
