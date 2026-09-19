import { useListActions, useUpdateAction, getListActionsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

export default function ActionsPage() {
  const { data: actions, isLoading } = useListActions();
  const updateAction = useUpdateAction();
  const queryClient = useQueryClient();
  const mutateFnRef = useRef(updateAction.mutate);
  mutateFnRef.current = updateAction.mutate;

  const handleStatusChange = (id: number, status: 'Open' | 'In Progress' | 'Resolved') => {
    mutateFnRef.current({ id, data: { status } }, {
      onSuccess: () => {
        // Optimistic UI update could be added here, but invalidation is safe.
        queryClient.invalidateQueries({ queryKey: getListActionsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      <header className="space-y-4">
        <h1 className="text-[62px] leading-[1] tracking-[-3.1px] font-medium">Actions</h1>
        <p className="text-[18px] text-ink-muted max-w-2xl tracking-[-0.18px]">
          Operational tracking for product improvements generated from issues.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-surface-1 rounded-[20px] animate-pulse"></div>
          <div className="h-64 bg-surface-1 rounded-[20px] animate-pulse"></div>
          <div className="h-64 bg-surface-1 rounded-[20px] animate-pulse"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {['Open', 'In Progress', 'Resolved'].map(statusGroup => (
            <div key={statusGroup} className="space-y-4">
              <div className="text-[12px] uppercase tracking-widest font-bold text-ink-muted pb-3 border-b border-border">
                {statusGroup}
              </div>
              <div className="space-y-4">
                {actions?.filter(a => a.status === statusGroup).map(action => (
                  <div key={action.id} className="bg-surface-1 p-6 rounded-[20px] border border-border group shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest ${
                        action.priority === 'P1' ? 'bg-destructive/20 text-destructive' : 'bg-background border border-border text-ink-muted'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                    <h4 className="text-[16px] font-medium mb-3 leading-snug">{action.title}</h4>
                    <p className="text-[14px] text-ink-muted line-clamp-3 mb-6 leading-relaxed">{action.description}</p>
                    
                    <div className="flex items-center justify-between border-t border-border/50 pt-4">
                      <div className="text-[13px] font-medium text-ink bg-surface-2 px-2 py-1 rounded-[6px]">
                        {action.owner}
                      </div>
                      <select 
                        value={action.status}
                        onChange={(e) => handleStatusChange(action.id, e.target.value as any)}
                        className="bg-background border border-border text-[12px] font-bold tracking-wide uppercase text-ink-muted rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer appearance-none"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                ))}
                {(!actions || actions.filter(a => a.status === statusGroup).length === 0) && (
                  <div className="p-6 border border-dashed border-border rounded-[20px] text-center text-ink-muted text-[13px]">
                    No actions in {statusGroup}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
