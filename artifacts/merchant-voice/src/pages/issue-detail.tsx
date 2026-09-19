import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCircle2, Circle, Clock3, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'wouter';
import {
  getGetDashboardQueryKey,
  getGetIssueQueryKey,
  getListIssuesQueryKey,
  getListNotificationsQueryKey,
  useAdvanceIssue,
  useCreateAction,
  useGetEmployeeSession,
  useGetIssue,
  useReviewIssueFix,
  useSubmitIssueFix,
  type IssueDetail,
} from '@workspace/api-client-react';

const lifecycle = ['Detected', 'Assigned', 'Acknowledged', 'Investigating', 'Ready for Review', 'Completed'] as const;
const inputClass = 'w-full bg-background border border-border rounded-[10px] px-4 py-3 text-[14px] focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/30';
const primaryButton = 'rounded-full bg-primary text-primary-foreground px-5 py-3 text-[14px] font-medium disabled:opacity-40 active:scale-[0.98] transition-transform';
const secondaryButton = 'rounded-full bg-surface-2 border border-border px-5 py-3 text-[14px] font-medium disabled:opacity-40';

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const issueId = Number(id);
  const queryClient = useQueryClient();
  const { data: issue, isLoading } = useGetIssue(issueId);
  const { data: session } = useGetEmployeeSession();
  const advance = useAdvanceIssue();
  const submitFix = useSubmitIssueFix();
  const reviewFix = useReviewIssueFix();
  const createAction = useCreateAction();
  const [assignedTeam, setAssignedTeam] = useState('');
  const [fix, setFix] = useState({ summary: '', resolutionDetails: '', evidence: '' });
  const [checks, setChecks] = useState({ fixDeployed: false, behaviorVerified: false, metricsChecked: false });
  const [reviewReason, setReviewReason] = useState('');
  const [message, setMessage] = useState('');

  const isReviewer = ['administrator', 'admin', 'product operations', 'reviewer', 'product owner']
    .includes(session?.employee?.role.toLowerCase() ?? '');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetIssueQueryKey(issueId) }),
      queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    ]);
  };

  const advanceIssue = (action: 'assign' | 'acknowledge' | 'investigate') => {
    setMessage('');
    advance.mutate({ id: issueId, data: { action, assignedTeam: action === 'assign' ? assignedTeam : undefined } }, {
      onSuccess: () => { setAssignedTeam(''); setMessage('Issue updated.'); refresh(); },
      onError: () => setMessage('This issue could not move to the next step. Refresh and try again.'),
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    submitFix.mutate({ id: issueId, data: fix }, {
      onSuccess: () => { setFix({ summary: '', resolutionDetails: '', evidence: '' }); setMessage('Fix submitted for review.'); refresh(); },
      onError: () => setMessage('The fix could not be submitted. Check the required summary and try again.'),
    });
  };

  const review = (outcome: 'accept' | 'request_changes') => {
    setMessage('');
    reviewFix.mutate({ id: issueId, data: { outcome, ...checks, reason: reviewReason || undefined } }, {
      onSuccess: () => { setReviewReason(''); setMessage(outcome === 'accept' ? 'Fix verified and issue completed.' : 'Changes requested and issue returned for investigation.'); refresh(); },
      onError: () => setMessage(outcome === 'accept'
        ? 'Complete every verification check. A different authorized reviewer must approve the fix.'
        : 'Add a reason before requesting changes.'),
    });
  };

  const generateAction = () => {
    if (!issue) return;
    createAction.mutate({ data: {
      title: `Address ${issue.title}`,
      description: issue.recommendation.description,
      issueId: issue.id,
      priority: issue.recommendation.priority,
      owner: issue.recommendation.suggestedOwner || 'Unassigned',
    } }, { onSuccess: () => { setMessage('Action created and issue assigned.'); refresh(); } });
  };

  if (isLoading) return <div className="h-[520px] rounded-[24px] bg-surface-1 animate-pulse" />;
  if (!issue) return <div className="py-20 text-center"><h1 className="text-[32px]">Issue not found</h1></div>;

  const currentIndex = issue.status === 'Changes Requested' ? 3 : lifecycle.indexOf(issue.status as typeof lifecycle[number]);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <header className="space-y-5">
        <Link href="/issues" className="inline-flex items-center gap-2 text-[14px] text-ink-muted hover:text-ink"><ArrowLeft className="w-4 h-4" /> Back to issues</Link>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-surface-1 border border-border text-[12px]">Issue #{issue.id}</span>
          <span className="px-3 py-1 rounded-full bg-surface-1 border border-border text-[12px]">{issue.priority} priority</span>
          <span className="px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-[12px]">{issue.status}</span>
        </div>
        <h1 className="text-[44px] md:text-[62px] leading-[1] tracking-[-3px] font-medium max-w-4xl">{issue.title}</h1>
        <p className="text-[20px] text-ink-muted max-w-3xl leading-relaxed">{issue.summary}</p>
      </header>

      <section className="bg-surface-1 border border-border rounded-[24px] p-6 md:p-8">
        <h2 className="text-[22px] font-medium mb-2">Issue lifecycle</h2>
        <p className="text-[14px] text-ink-muted mb-6">A fix is only completed after an authorized reviewer verifies it.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {lifecycle.map((step, index) => {
            const complete = currentIndex > index || issue.status === 'Completed';
            const current = currentIndex === index && issue.status !== 'Completed';
            return (
              <div key={step} className={`rounded-[14px] p-4 border ${current ? 'border-accent-blue bg-accent-blue/5' : 'border-border bg-background'}`}>
                {complete ? <CheckCircle2 className="w-5 h-5 text-[#22c55e] mb-3" /> : current ? <Clock3 className="w-5 h-5 text-accent-blue mb-3" /> : <Circle className="w-5 h-5 text-ink-muted mb-3" />}
                <div className="text-[13px] font-medium">{step}</div>
              </div>
            );
          })}
        </div>
      </section>

      {message && <div className="bg-surface-1 border border-border rounded-[14px] px-5 py-4 text-[14px]">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <main className="lg:col-span-2 space-y-8">
          <WorkflowPanel
            issue={issue}
            assignedTeam={assignedTeam}
            setAssignedTeam={setAssignedTeam}
            advanceIssue={advanceIssue}
            advancePending={advance.isPending}
            fix={fix}
            setFix={setFix}
            submit={submit}
            submitPending={submitFix.isPending}
            checks={checks}
            setChecks={setChecks}
            reviewReason={reviewReason}
            setReviewReason={setReviewReason}
            review={review}
            reviewPending={reviewFix.isPending}
            isReviewer={isReviewer}
          />

          <section className="bg-gradient-to-br from-[#ff7a3d] to-[#e5591d] rounded-[24px] p-8 text-white">
            <div className="text-[11px] uppercase tracking-widest font-bold text-white/70 mb-4">AI-generated interpretation</div>
            <h2 className="text-[28px] tracking-[-1px] font-medium mb-4">{issue.interpretation.title}</h2>
            <p className="text-[16px] text-white/85 leading-relaxed">{issue.interpretation.body}</p>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-[24px] font-medium">Database evidence</h2>
              <p className="text-[14px] text-ink-muted mt-1">Merchant reports stored in the feedback database.</p>
            </div>
            {issue.evidence.map((item) => (
              <article key={item.id} className="bg-surface-1 border border-border rounded-[18px] p-5">
                <p className="leading-relaxed">“{item.message}”</p>
                <div className="text-[12px] text-ink-muted mt-4">{item.source} · {new Date(item.createdAt).toLocaleDateString()}</div>
              </article>
            ))}
          </section>
        </main>

        <aside className="space-y-6">
          <section className="bg-surface-1 border border-border rounded-[20px] p-6">
            <div className="text-[11px] uppercase tracking-widest text-ink-muted mb-4">Recommended action</div>
            <h2 className="text-[20px] font-medium mb-3">{issue.recommendation.title}</h2>
            <p className="text-[14px] text-ink-muted leading-relaxed mb-5">{issue.recommendation.description}</p>
            <button onClick={generateAction} disabled={createAction.isPending || issue.status !== 'Detected'} className={`${primaryButton} w-full`}>
              {issue.status === 'Detected' ? 'Create & assign action' : `Assigned to ${issue.assignedTeam ?? 'team'}`}
            </button>
          </section>

          <section className="bg-surface-1 border border-border rounded-[20px] p-6">
            <h2 className="text-[20px] font-medium mb-5">Audit timeline</h2>
            <div className="space-y-5">
              {issue.events.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-blue mt-2 shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium">{event.eventType.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())}</div>
                    <div className="text-[12px] text-ink-muted mt-1">{event.actorName} · {new Date(event.createdAt).toLocaleString()}</div>
                    {'reason' in event.details && <div className="text-[12px] text-ink-muted mt-2">{String(event.details.reason)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

type WorkflowProps = {
  issue: IssueDetail;
  assignedTeam: string;
  setAssignedTeam: (value: string) => void;
  advanceIssue: (action: 'assign' | 'acknowledge' | 'investigate') => void;
  advancePending: boolean;
  fix: { summary: string; resolutionDetails: string; evidence: string };
  setFix: (value: { summary: string; resolutionDetails: string; evidence: string }) => void;
  submit: (event: React.FormEvent) => void;
  submitPending: boolean;
  checks: { fixDeployed: boolean; behaviorVerified: boolean; metricsChecked: boolean };
  setChecks: (value: { fixDeployed: boolean; behaviorVerified: boolean; metricsChecked: boolean }) => void;
  reviewReason: string;
  setReviewReason: (value: string) => void;
  review: (outcome: 'accept' | 'request_changes') => void;
  reviewPending: boolean;
  isReviewer: boolean;
};

function WorkflowPanel(props: WorkflowProps) {
  const { issue } = props;
  if (issue.status === 'Detected') return (
    <section className="bg-surface-1 border border-border rounded-[24px] p-6 md:p-8">
      <h2 className="text-[24px] font-medium">Assign an internal team</h2>
      <p className="text-[14px] text-ink-muted mt-2 mb-5">Choose who owns the investigation.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={props.assignedTeam} onChange={(e) => props.setAssignedTeam(e.target.value)} placeholder="e.g. Authentication Team" className={inputClass} />
        <button onClick={() => props.advanceIssue('assign')} disabled={props.advancePending || props.assignedTeam.trim().length < 2} className={`${primaryButton} shrink-0`}>Assign issue</button>
      </div>
    </section>
  );
  if (issue.status === 'Assigned') return <ActionState title="Issue assigned" body={`${issue.assignedTeam} must acknowledge ownership before investigation begins.`} action="Acknowledge issue" onClick={() => props.advanceIssue('acknowledge')} pending={props.advancePending} />;
  if (issue.status === 'Acknowledged' || issue.status === 'Changes Requested') return <ActionState title={issue.status === 'Changes Requested' ? 'Further investigation required' : 'Issue acknowledged'} body={issue.latestFix?.reviewReason ?? 'Start the investigation when the team begins working on the issue.'} action="Start investigation" onClick={() => props.advanceIssue('investigate')} pending={props.advancePending} />;
  if (issue.status === 'Investigating') return (
    <section className="bg-surface-1 border border-border rounded-[24px] p-6 md:p-8">
      <h2 className="text-[24px] font-medium">Submit fix for review</h2>
      <p className="text-[14px] text-ink-muted mt-2 mb-6">The issue will become Ready for Review—not Completed—until a reviewer verifies it.</p>
      <form onSubmit={props.submit} className="space-y-4">
        <label className="block"><span className="block text-[13px] mb-2">Fix summary *</span><textarea required value={props.fix.summary} onChange={(e) => props.setFix({ ...props.fix, summary: e.target.value })} placeholder="What was changed?" className={`${inputClass} min-h-24`} /></label>
        <label className="block"><span className="block text-[13px] mb-2">Resolution details</span><textarea value={props.fix.resolutionDetails} onChange={(e) => props.setFix({ ...props.fix, resolutionDetails: e.target.value })} placeholder="What did the team do to address the issue?" className={`${inputClass} min-h-24`} /></label>
        <label className="block"><span className="block text-[13px] mb-2">Evidence or reference</span><input value={props.fix.evidence} onChange={(e) => props.setFix({ ...props.fix, evidence: e.target.value })} placeholder="Deployment ID, link, test result, or notes" className={inputClass} /></label>
        <button disabled={props.submitPending} className={primaryButton}>Submit for review</button>
      </form>
    </section>
  );
  if (issue.status === 'Ready for Review' && issue.latestFix) return (
    <section className="bg-surface-1 border border-accent-blue/40 rounded-[24px] p-6 md:p-8">
      <div className="flex items-center gap-2 text-accent-blue text-[13px] font-medium mb-5"><ShieldCheck className="w-4 h-4" /> Fix submitted for review</div>
      <div className="space-y-4 mb-8">
        <Fact label="Submitted by" value={`${issue.latestFix.submittedByName} · ${issue.latestFix.submittedByTeam}`} />
        <Fact label="What changed" value={issue.latestFix.summary} />
        {issue.latestFix.resolutionDetails && <Fact label="Resolution details" value={issue.latestFix.resolutionDetails} />}
        {issue.latestFix.evidence && <Fact label="Team-submitted evidence" value={issue.latestFix.evidence} />}
      </div>
      {props.isReviewer ? (
        <div className="border-t border-border pt-6">
          <h3 className="text-[20px] font-medium">Verification checklist</h3>
          <p className="text-[13px] text-ink-muted mt-1 mb-5">Check only what you personally verified.</p>
          <div className="space-y-3 mb-5">
            {([['fixDeployed', 'Fix is deployed'], ['behaviorVerified', 'Expected behavior was tested'], ['metricsChecked', 'Error rate or relevant metric was checked']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 p-3 bg-background border border-border rounded-[12px] cursor-pointer">
                <input type="checkbox" checked={props.checks[key]} onChange={(e) => props.setChecks({ ...props.checks, [key]: e.target.checked })} className="accent-[#0099ff]" />
                <span className="text-[14px]">{label}</span>
              </label>
            ))}
          </div>
          <textarea value={props.reviewReason} onChange={(e) => props.setReviewReason(e.target.value)} placeholder="Reason required when requesting changes" className={`${inputClass} min-h-24 mb-4`} />
          <div className="flex flex-wrap gap-3">
            <button onClick={() => props.review('accept')} disabled={props.reviewPending} className={primaryButton}><Check className="w-4 h-4 inline mr-2" />Accept & complete</button>
            <button onClick={() => props.review('request_changes')} disabled={props.reviewPending} className={secondaryButton}>Request changes</button>
          </div>
        </div>
      ) : <p className="text-[14px] text-ink-muted border-t border-border pt-5">Waiting for an authorized reviewer to verify this fix.</p>}
    </section>
  );
  return (
    <section className="bg-surface-1 border border-[#22c55e]/30 rounded-[24px] p-6 md:p-8">
      <div className="flex items-center gap-3"><CheckCircle2 className="w-6 h-6 text-[#22c55e]" /><h2 className="text-[24px] font-medium">Completed</h2></div>
      <p className="text-[14px] text-ink-muted mt-3">Verified by {issue.completedByName} on {issue.completedAt ? new Date(issue.completedAt).toLocaleString() : '—'}.</p>
      {issue.latestFix && <div className="mt-5"><Fact label="Verified resolution" value={issue.latestFix.summary} /></div>}
    </section>
  );
}

function ActionState({ title, body, action, onClick, pending }: { title: string; body: string; action: string; onClick: () => void; pending: boolean }) {
  return <section className="bg-surface-1 border border-border rounded-[24px] p-6 md:p-8"><h2 className="text-[24px] font-medium">{title}</h2><p className="text-[14px] text-ink-muted mt-2 mb-5">{body}</p><button onClick={onClick} disabled={pending} className={primaryButton}>{action}</button></section>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[11px] uppercase tracking-widest text-ink-muted mb-1">{label}</div><div className="text-[15px] leading-relaxed">{value}</div></div>;
}