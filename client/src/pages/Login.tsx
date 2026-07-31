import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 401 ? 'Wrong email or password.' : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Pick up the thread.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {err && <p className="text-clay text-sm font-mono">{err}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full bg-indigo text-paper py-3 font-mono text-sm uppercase tracking-widest hover:bg-indigo-soft transition disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-indigo-soft">
        New here?{' '}
        <Link to="/register" className="text-brass underline underline-offset-2">Create an account</Link>
      </p>
      <DemoHint />
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brass uppercase">sutra</p>
        <h1 className="mt-3 text-5xl leading-none text-indigo">{title}</h1>
        <p className="mt-3 text-indigo-soft">{subtitle}</p>
        <div className="mt-8 bg-paper border border-indigo/15 p-7 rounded-sm">{children}</div>
      </div>
    </main>
  );
}

export function Field({
  label, type = 'text', value, onChange, autoComplete, placeholder,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  autoComplete?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-widest text-indigo-soft">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} placeholder={placeholder} required
        className="mt-1 w-full bg-stone border border-indigo/20 px-3 py-2 text-indigo focus:border-brass outline-none"
      />
    </label>
  );
}

function DemoHint() {
  return (
    <div className="mt-6 border-t border-indigo/10 pt-4 font-mono text-xs text-indigo-soft">
      <span className="text-brass">demo</span> · seeded account arrives in a later build
    </div>
  );
}
