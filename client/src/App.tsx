import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Chart from './pages/Chart';
import Today from './pages/Today';

function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-sm text-indigo-soft">aligning…</p>
    </main>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route
        path="/onboarding"
        element={!user ? <Navigate to="/login" replace /> : user.hasChart ? <Navigate to="/chart" replace /> : <Onboarding />}
      />
      <Route
        path="/today"
        element={!user ? <Navigate to="/login" replace /> : !user.hasChart ? <Navigate to="/onboarding" replace /> : <Today />}
      />
      <Route
        path="/chart"
        element={!user ? <Navigate to="/login" replace /> : !user.hasChart ? <Navigate to="/onboarding" replace /> : <Chart />}
      />

      {/* Home routes to the right place based on state. */}
      <Route
        path="*"
        element={
          <Navigate to={!user ? '/login' : user.hasChart ? '/today' : '/onboarding'} replace />
        }
      />
    </Routes>
  );
}
