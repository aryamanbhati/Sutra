import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { AuthShell, Field } from './Login';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register(email, password, name);
      nav('/onboarding');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErr('That email is already registered.');
      else if (e instanceof ApiError && e.status === 400) setErr('Check your details — password needs 6+ characters.');
      else setErr('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Begin the thread" subtitle="One chart. Every day, remembered.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        {err && <p className="text-clay text-sm font-mono">{err}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full bg-indigo text-paper py-3 font-mono text-sm uppercase tracking-widest hover:bg-indigo-soft transition disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-indigo-soft">
        Already have an account?{' '}
        <Link to="/login" className="text-brass underline underline-offset-2">Sign in</Link>
      </p>
    </AuthShell>
  );
}
