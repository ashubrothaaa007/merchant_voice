import { useListIssues } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowUpRight } from 'lucide-react';

export default function IssuesPage() {
  const { data: issues, isLoading } = useListIssues();

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="space-y-4">
        <h1 className="text-[62px] leading-[1] tracking-[-3.1px] font-medium">Issues</h1>
        <p className="text-[18px] text-ink-muted max-w-2xl tracking-[-0.18px]">
          Clustered merchant problems prioritized by impact and volume.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="h-32 bg-surface-1 rounded-[20px] animate-pulse"></div>
          <div className="h-32 bg-surface-1 rounded-[20px] animate-pulse"></div>
          <div className="h-32 bg-surface-1 rounded-[20px] animate-pulse"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {issues?.map(issue => (
            <Link key={issue.id} href={`/issues/${issue.id}`} className="block bg-surface-1 rounded-[20px] p-6 hover:bg-surface-2 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] border border-transparent hover:border-white/5 group">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-[6px] text-[11px] font-bold tracking-widest uppercase ${
                      issue.priority === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-background border border-border text-ink-muted'
                    }`}>
                      {issue.priority} Priority
                    </span>
                    <span className="text-[13px] text-ink-muted font-medium">{issue.status}</span>
                  </div>
                  <h2 className="text-[24px] tracking-[-0.5px] font-medium leading-tight">{issue.title}</h2>
                  <p className="text-[15px] text-ink-muted line-clamp-2 leading-relaxed max-w-4xl">{issue.summary}</p>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-6 md:gap-2 pt-4 md:pt-0">
                  <div className="text-center md:text-right">
                    <div className="text-[32px] tracking-[-1px] font-medium">{issue.reportCount}</div>
                    <div className="text-[12px] text-ink-muted uppercase tracking-widest font-semibold">Reports</div>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-[20px] tracking-[-0.5px] text-accent-blue font-medium">+{issue.trendPercent}%</div>
                    <div className="text-[12px] text-ink-muted uppercase tracking-widest font-semibold">Trend</div>
                  </div>
                  <div className="hidden md:flex h-10 w-10 rounded-full bg-surface-2 items-center justify-center group-hover:bg-primary transition-colors mt-2">
                    <ArrowUpRight className="w-5 h-5 text-ink group-hover:text-primary-foreground" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
