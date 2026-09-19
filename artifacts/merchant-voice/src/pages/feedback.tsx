import { useState } from 'react';
import { useListFeedback, useImportFeedback, getListFeedbackQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Upload } from 'lucide-react';

export default function FeedbackPage() {
  const { data: feedback, isLoading } = useListFeedback();
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState('Zendesk');
  const [importMessage, setImportMessage] = useState('');
  
  const importFeedback = useImportFeedback();
  const queryClient = useQueryClient();

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if(!importMessage.trim()) return;
    
    importFeedback.mutate({
      data: {
        rows: [
          { source: importSource, message: importMessage }
        ]
      }
    }, {
      onSuccess: () => {
        setImportOpen(false);
        setImportMessage('');
        queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-[62px] leading-[1] tracking-[-3.1px] font-medium">Feedback Inbox</h1>
          <p className="text-[18px] text-ink-muted max-w-2xl tracking-[-0.18px]">
            Raw signals from merchants, automatically categorized and scored.
          </p>
        </div>
        <button 
          onClick={() => setImportOpen(true)}
          className="bg-primary text-primary-foreground rounded-full px-[24px] py-[12px] text-[14px] font-medium active:scale-95 transition-transform whitespace-nowrap flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Import Data
        </button>
      </header>
      
      {isLoading ? (
        <div className="animate-pulse h-96 bg-surface-1 rounded-[20px]"></div>
      ) : (
        <div className="bg-surface-1 border border-border rounded-[20px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-1">
                  <th className="py-4 px-6 text-[13px] font-medium text-ink-muted w-[120px]">Date</th>
                  <th className="py-4 px-6 text-[13px] font-medium text-ink-muted">Message</th>
                  <th className="py-4 px-6 text-[13px] font-medium text-ink-muted w-[150px]">Source</th>
                  <th className="py-4 px-6 text-[13px] font-medium text-ink-muted w-[120px]">Sentiment</th>
                  <th className="py-4 px-6 text-[13px] font-medium text-ink-muted w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {feedback?.map(f => (
                  <tr key={f.id} className="hover:bg-surface-2 transition-colors group">
                    <td className="py-5 px-6 text-[14px] text-ink-muted whitespace-nowrap">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-5 px-6 text-[15px] font-medium text-ink/90">
                      <div className="line-clamp-2 leading-relaxed">{f.message}</div>
                    </td>
                    <td className="py-5 px-6 text-[14px]">
                      <span className="px-2 py-1 border border-border bg-background rounded-[6px] text-ink-muted font-medium">{f.source}</span>
                    </td>
                    <td className="py-5 px-6">
                      <span className={`px-2 py-1 rounded-[6px] text-[12px] font-semibold tracking-wide uppercase ${
                        f.sentiment === 'Negative' ? 'bg-destructive/10 text-destructive' :
                        f.sentiment === 'Positive' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                        'bg-surface-2 border border-border text-ink-muted'
                      }`}>
                        {f.sentiment}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-[14px] text-ink-muted font-medium">
                      {f.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!feedback || feedback.length === 0) && (
              <div className="py-20 text-center text-ink-muted text-[15px]">
                No feedback imported yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setImportOpen(false)}></div>
          <div className="relative bg-surface-1 border border-border rounded-[24px] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[24px] font-medium tracking-[-0.5px]">Import Feedback</h2>
              <button onClick={() => setImportOpen(false)} className="p-2 hover:bg-surface-2 rounded-full transition-colors text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleImport} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink-muted mb-2">Source</label>
                  <select 
                    value={importSource}
                    onChange={e => setImportSource(e.target.value)}
                    className="w-full bg-surface-2 border border-transparent rounded-[10px] px-[14px] py-[10px] text-[15px] focus:outline-none focus:border-accent-blue/30 focus:ring-1 focus:ring-accent-blue/50 focus:shadow-[0_0_0_2px_rgba(0,153,255,0.15)] transition-all"
                  >
                    <option value="Zendesk">Zendesk</option>
                    <option value="App Store">App Store</option>
                    <option value="Twitter">Twitter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink-muted mb-2">Raw Message</label>
                  <textarea 
                    value={importMessage}
                    onChange={e => setImportMessage(e.target.value)}
                    placeholder="Paste the customer message here..."
                    rows={5}
                    className="w-full bg-surface-2 border border-transparent rounded-[10px] px-[14px] py-[10px] text-[15px] focus:outline-none focus:border-accent-blue/30 focus:ring-1 focus:ring-accent-blue/50 focus:shadow-[0_0_0_2px_rgba(0,153,255,0.15)] transition-all resize-none"
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={importFeedback.isPending || !importMessage.trim()}
                className="w-full bg-primary text-primary-foreground rounded-full py-[12px] px-[24px] text-[15px] font-medium active:scale-95 transition-transform disabled:opacity-50"
              >
                {importFeedback.isPending ? 'Processing...' : 'Analyze & Import'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
