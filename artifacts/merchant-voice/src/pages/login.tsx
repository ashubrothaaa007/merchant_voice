import { useState } from 'react';
import { useLoginEmployee, getGetEmployeeSessionQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  
  const queryClient = useQueryClient();
  const login = useLoginEmployee();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    login.mutate({ data: { employeeId, password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEmployeeSessionQueryKey() });
      },
      onError: () => {
        setError('Invalid credentials');
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px]">
        <h1 className="text-[46px] sm:text-[56px] leading-[1] tracking-[-3px] font-medium mb-4 whitespace-nowrap">
          Merchant Voice
        </h1>
        <p className="text-[18px] tracking-[-0.18px] text-ink-muted mb-12">
          Product operations intelligence. Internal access only.
        </p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="employee-id" className="sr-only">Employee ID</label>
              <input
                id="employee-id"
                name="employeeId"
                type="text"
                autoComplete="username"
                placeholder="Employee ID"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full bg-surface-1 border border-transparent rounded-[10px] px-[14px] py-[10px] text-[15px] focus:outline-none focus:border-accent-blue/30 focus:ring-1 focus:ring-accent-blue/50 focus:shadow-[0_0_0_2px_rgba(0,153,255,0.15)] placeholder:text-ink-muted transition-all"
              />
            </div>
            <div>
              <label htmlFor="employee-password" className="sr-only">Password</label>
              <input
                id="employee-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surface-1 border border-transparent rounded-[10px] px-[14px] py-[10px] text-[15px] focus:outline-none focus:border-accent-blue/30 focus:ring-1 focus:ring-accent-blue/50 focus:shadow-[0_0_0_2px_rgba(0,153,255,0.15)] placeholder:text-ink-muted transition-all"
              />
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordHelp((open) => !open)}
                  className="text-[13px] text-ink-muted hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>
          {showPasswordHelp && (
            <div className="bg-surface-1 border border-border rounded-[14px] p-4 text-[13px] text-ink-muted leading-relaxed">
              Contact your Merchant Voice administrator and share your employee ID. Administrators can set a temporary password from <span className="text-white">Settings → Employee access</span>. For security, passwords cannot be recovered or sent by email.
            </div>
          )}
          {error && <div className="text-destructive text-sm font-medium">{error}</div>}
          <div className="pt-2">
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-primary text-primary-foreground rounded-full py-[12px] px-[24px] text-[15px] font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {login.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
