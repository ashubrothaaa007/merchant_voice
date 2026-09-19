import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, AlertCircle, CheckSquare, Settings, LayoutDashboard, LogOut, BrainCircuit, Loader2, Menu, X } from "lucide-react";
import { useLogoutEmployee, getGetEmployeeSessionQueryKey, useQueryAssistant } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const logout = useLogoutEmployee();
  const queryClient = useQueryClient();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        queryClient.invalidateQueries({ queryKey: getGetEmployeeSessionQueryKey() });
      }
    });
  };

  const menu = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/feedback", label: "Feedback", icon: MessageSquare },
    { href: "/issues", label: "Issues", icon: AlertCircle },
    { href: "/actions", label: "Actions", icon: CheckSquare },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background font-sans text-foreground selection:bg-accent-blue/30 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="w-[280px] border-r border-border bg-background flex-col shrink-0 hidden md:flex">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3 font-medium text-[20px] tracking-[-0.5px]">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-[14px] font-bold">M</span>
            </div>
            Merchant Voice
          </Link>
        </div>
        <nav className="flex-1 px-6 space-y-2 mt-4">
          {menu.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-5 py-[12px] rounded-full text-[15px] font-medium transition-colors ${isActive ? 'bg-surface-2 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-ink-muted hover:bg-surface-1 hover:text-ink'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-border space-y-4">
          <button onClick={() => setAssistantOpen(true)} className="w-full flex items-center justify-center gap-3 px-5 py-[12px] rounded-full text-[15px] font-medium transition-transform active:scale-[0.98] bg-surface-1 text-ink hover:bg-surface-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <BrainCircuit className="w-5 h-5 text-accent-blue" />
            Ask Assistant
          </button>
          <div className="flex gap-2">
            <Link href="/settings" className={`flex-1 flex items-center justify-center gap-2 px-4 py-[10px] rounded-full text-[14px] font-medium transition-colors ${location === "/settings" ? 'bg-surface-2 text-ink' : 'bg-surface-1 text-ink-muted hover:text-ink hover:bg-surface-2'}`}>
              <Settings className="w-[18px] h-[18px]" />
            </Link>
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-4 py-[10px] rounded-full text-[14px] font-medium transition-colors bg-surface-1 text-ink-muted hover:text-ink hover:bg-surface-2">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto bg-background relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background/80 backdrop-blur-xl z-30">
           <Link href="/" className="flex items-center gap-3 font-medium text-[18px] tracking-[-0.5px]">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-[10px] font-bold">M</span>
            </div>
            Merchant Voice
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="text-ink-muted">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-12 lg:p-16 max-w-[1200px] mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <span className="font-medium text-[18px]">Navigation</span>
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6 text-ink-muted" />
            </button>
          </div>
          <nav className="flex-1 p-6 space-y-4">
             {menu.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-4 px-6 py-4 rounded-[20px] text-[18px] font-medium transition-colors ${isActive ? 'bg-surface-2 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'bg-surface-1 text-ink-muted'}`}>
                  <item.icon className="w-6 h-6" />
                  {item.label}
                </Link>
              );
            })}
            <button onClick={() => { setMobileMenuOpen(false); setAssistantOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-[18px] font-medium bg-surface-1 text-ink mt-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <BrainCircuit className="w-6 h-6 text-accent-blue" />
              Ask Assistant
            </button>
          </nav>
          <div className="p-6 flex gap-4">
             <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] text-[16px] font-medium bg-surface-1 text-ink">
              <Settings className="w-5 h-5" /> Settings
            </Link>
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[20px] text-[16px] font-medium bg-surface-1 text-destructive">
              <LogOut className="w-5 h-5" /> Sign out
            </button>
          </div>
        </div>
      )}

      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}

function AssistantPanel({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const assistant = useQueryAssistant();
  const [answer, setAnswer] = useState<any>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAnswer(null);
    assistant.mutate({ data: { question: query } }, {
      onSuccess: (data) => setAnswer(data),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-surface-1 border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-accent-blue" />
            </div>
            <span className="font-medium text-[16px] tracking-[-0.16px]">AI Assistant</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-2 transition-colors">
            <X className="w-5 h-5 text-ink-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {assistant.isPending && (
             <div className="flex flex-col items-center justify-center h-40 text-ink-muted gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
              <p className="text-[14px]">Querying intelligence...</p>
            </div>
          )}

          {answer && !assistant.isPending && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-[15px] leading-relaxed text-ink">
                {answer.insufficientData ? (
                  <div className="p-4 bg-surface-2 rounded-[15px] text-ink-muted border border-border">
                    Not enough verified evidence to conclude. Try asking about specific product areas.
                  </div>
                ) : (
                  <p>{answer.answer}</p>
                )}
              </div>
              
              {answer.evidence && answer.evidence.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[12px] uppercase tracking-widest font-semibold text-ink-muted">Evidence</h4>
                  <div className="space-y-3">
                    {answer.evidence.map((fb: any) => (
                      <div key={fb.id} className="p-4 bg-surface-2 rounded-[15px] text-[13px] space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-transparent">
                        <p className="text-ink-muted leading-relaxed">"{fb.message}"</p>
                        <div className="flex items-center gap-2">
                          <span className="bg-background border border-border px-2 py-1 rounded-[6px] text-ink-muted font-medium">{fb.source}</span>
                          {fb.sentiment === "Negative" && <span className="text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-[6px]">Negative</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!answer && !assistant.isPending && (
            <div className="h-full flex flex-col items-center justify-center text-center text-ink-muted opacity-50">
              <BrainCircuit className="w-16 h-16 mb-6" />
              <p className="text-[15px] max-w-[250px] leading-relaxed">
                Ask questions about merchant signals, trends, or feature requests.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-background">
          <form onSubmit={handleSubmit} className="relative">
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              disabled={assistant.isPending}
              className="w-full bg-surface-1 border border-transparent rounded-full pl-[20px] pr-[90px] py-[12px] text-[15px] focus:outline-none focus:border-accent-blue/30 focus:ring-1 focus:ring-accent-blue/50 focus:shadow-[0_0_0_2px_rgba(0,153,255,0.15)] transition-all placeholder:text-ink-muted disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={assistant.isPending || !query.trim()}
              className="absolute right-[4px] top-[4px] bottom-[4px] bg-primary text-primary-foreground rounded-full px-[16px] text-[13px] font-medium active:scale-95 transition-transform disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
