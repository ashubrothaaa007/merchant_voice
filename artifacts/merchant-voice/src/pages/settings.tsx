import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListEmployeesQueryKey,
  useChangeEmployeePassword,
  useCreateEmployee,
  useGetEmployeeSession,
  useListEmployees,
  useResetEmployeePassword,
  useUpdateEmployeeAccess,
} from '@workspace/api-client-react';

const inputClass = 'w-full bg-surface-2 border border-transparent rounded-[10px] px-[14px] py-[10px] text-[15px] focus:outline-none focus:border-accent-blue/30 focus:ring-1 focus:ring-accent-blue/50 transition-all';
const primaryButton = 'bg-primary text-primary-foreground rounded-full py-[10px] px-[20px] text-[14px] font-medium active:scale-[0.98] transition-transform disabled:opacity-50';

export default function SettingsPage() {
  const { data: session } = useGetEmployeeSession();
  const isAdministrator = ['administrator', 'admin', 'product operations'].includes(session?.employee?.role.toLowerCase() ?? '');

  return (
    <div className="space-y-12 pb-20 max-w-5xl animate-in fade-in duration-700">
      <header className="space-y-4">
        <h1 className="text-[62px] leading-[1] tracking-[-3.1px] font-medium">Settings</h1>
        <p className="text-[18px] text-ink-muted tracking-[-0.18px]">
          Manage your password{isAdministrator ? ' and employee access' : ''}.
        </p>
      </header>
      <PasswordSection />
      {isAdministrator && <EmployeeAccessSection currentEmployeeId={session?.employee?.id} />}
    </div>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const changePassword = useChangeEmployeePassword();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }
    changePassword.mutate({ data: { currentPassword, newPassword } }, {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage('Password changed. Your other signed-in sessions were revoked.');
      },
      onError: () => setMessage('Password could not be changed. Check your current password and try again.'),
    });
  };

  return (
    <section className="bg-surface-1 rounded-[24px] p-8 md:p-10 border border-border space-y-6">
      <div>
        <h2 className="text-[24px] font-medium tracking-[-0.5px]">Change password</h2>
        <p className="text-[14px] text-ink-muted mt-2">Use at least 8 characters. Changing it signs out your other sessions.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PasswordInput label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordInput label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        </div>
        {message && <p className="text-[14px] text-ink-muted">{message}</p>}
        <button type="submit" disabled={changePassword.isPending} className={primaryButton}>
          {changePassword.isPending ? 'Changing...' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

function EmployeeAccessSection({ currentEmployeeId }: { currentEmployeeId?: number }) {
  const queryClient = useQueryClient();
  const { data: employees, isLoading } = useListEmployees();
  const createEmployee = useCreateEmployee();
  const updateAccess = useUpdateEmployeeAccess();
  const resetPassword = useResetEmployeePassword();
  const [form, setForm] = useState({ employeeId: '', name: '', role: 'Employee' as 'Administrator' | 'Employee', temporaryPassword: '' });
  const [resetId, setResetId] = useState<number | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
  const create = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    createEmployee.mutate({ data: form }, {
      onSuccess: () => {
        setForm({ employeeId: '', name: '', role: 'Employee', temporaryPassword: '' });
        setMessage('Employee access created.');
        refresh();
      },
      onError: () => setMessage('Employee could not be created. The employee ID may already be in use.'),
    });
  };

  const toggleAccess = (id: number, active: boolean) => {
    setMessage('');
    updateAccess.mutate({ id, data: { active: !active } }, {
      onSuccess: () => {
        setMessage(active ? 'Employee disabled and active sessions revoked.' : 'Employee reactivated.');
        refresh();
      },
      onError: () => setMessage('Employee access could not be updated.'),
    });
  };

  const reset = (event: React.FormEvent, id: number) => {
    event.preventDefault();
    resetPassword.mutate({ id, data: { temporaryPassword } }, {
      onSuccess: () => {
        setResetId(null);
        setTemporaryPassword('');
        setMessage('Temporary password set and active sessions revoked.');
      },
      onError: () => setMessage('Password could not be reset. Use at least 8 characters.'),
    });
  };

  return (
    <section className="bg-surface-1 rounded-[24px] p-8 md:p-10 border border-border space-y-8">
      <div>
        <h2 className="text-[24px] font-medium tracking-[-0.5px]">Employee access</h2>
        <p className="text-[14px] text-ink-muted mt-2">Create accounts, assign roles, reset passwords, and control access.</p>
      </div>

      <form onSubmit={create} className="space-y-4 p-5 bg-surface-2 rounded-[16px]">
        <h3 className="font-medium">Add employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInput label="Employee ID" value={form.employeeId} onChange={(value) => setForm({ ...form, employeeId: value })} />
          <LabeledInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <label className="space-y-2">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Role</span>
            <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as 'Administrator' | 'Employee' })}>
              <option value="Employee">Employee</option>
              <option value="Administrator">Administrator</option>
            </select>
          </label>
          <PasswordInput label="Temporary password" value={form.temporaryPassword} onChange={(value) => setForm({ ...form, temporaryPassword: value })} autoComplete="new-password" />
        </div>
        <button type="submit" disabled={createEmployee.isPending} className={primaryButton}>Add employee</button>
      </form>

      {message && <p className="text-[14px] text-ink-muted">{message}</p>}
      {isLoading ? (
        <p className="text-ink-muted">Loading employees...</p>
      ) : (
        <div className="space-y-3">
          {employees?.map((employee) => (
            <div key={employee.id} className="p-5 bg-surface-2 rounded-[16px] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-[13px] text-ink-muted">{employee.employeeId} · {employee.role} · {employee.active ? 'Active' : 'Disabled'}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setResetId(resetId === employee.id ? null : employee.id); setTemporaryPassword(''); }} className="border border-border rounded-full px-4 py-2 text-[13px] font-medium">
                    Reset password
                  </button>
                  <button
                    type="button"
                    disabled={employee.id === currentEmployeeId || updateAccess.isPending}
                    onClick={() => toggleAccess(employee.id, employee.active)}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium disabled:opacity-40 ${employee.active ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
                  >
                    {employee.active ? 'Disable' : 'Reactivate'}
                  </button>
                </div>
              </div>
              {resetId === employee.id && (
                <form onSubmit={(event) => reset(event, employee.id)} className="flex flex-col sm:flex-row gap-3 border-t border-border pt-4">
                  <input required minLength={8} type="password" autoComplete="new-password" placeholder="New temporary password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} className={inputClass} />
                  <button disabled={resetPassword.isPending} className={`${primaryButton} shrink-0`}>Set password</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <input required value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function PasswordInput({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return (
    <label className="space-y-2">
      <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <input required minLength={8} type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}