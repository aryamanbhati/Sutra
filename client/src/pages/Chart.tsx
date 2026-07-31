import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { KundliSquare } from '../components/KundliSquare';

export default function Chart() {
  const { user, logout } = useAuth();
  if (!user?.natalChart || !user.birthData) return null;
  const { natalChart: chart, birthData } = user;

  return (
    <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass uppercase">sutra · natal chart</p>
          <h1 className="mt-2 text-5xl leading-none text-indigo">{user.name}</h1>
        </div>
        <nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-indigo-soft">
          <Link to="/today" className="hover:text-brass">today</Link>
          <Link to="/life" className="hover:text-brass">life file</Link>
          <button onClick={logout} className="hover:text-clay">sign out</button>
        </nav>
      </header>

      <p className="mt-3 font-mono text-sm text-indigo-soft">
        {birthData.date} · {birthData.time} · {birthData.placeName}
      </p>

      <div className="mt-10 grid md:grid-cols-2 gap-10 items-start">
        <div className="bg-paper border border-indigo/15 p-6 rounded-sm flex justify-center">
          <KundliSquare chart={chart} />
        </div>

        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-soft">Ascendant</span>
            <span className="font-display text-2xl text-indigo">{chart.ascendant}</span>
          </div>
          <table className="mt-4 w-full text-left">
            <thead>
              <tr className="font-mono text-xs uppercase tracking-widest text-indigo-soft border-b border-indigo/15">
                <th className="py-2 font-normal">Graha</th>
                <th className="py-2 font-normal">Sign</th>
                <th className="py-2 font-normal">House</th>
                <th className="py-2 font-normal text-right">Degree</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {chart.planets.map((p) => (
                <tr key={p.body} className="border-b border-indigo/10">
                  <td className="py-2 text-indigo">{p.body}{p.retrograde && <span className="text-clay"> ℞</span>}</td>
                  <td className="py-2 text-indigo-soft">{p.sign}</td>
                  <td className="py-2 text-indigo-soft">{p.house}</td>
                  <td className="py-2 text-right text-indigo">{p.degree.toFixed(2)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 font-mono text-xs text-indigo-soft/70">
            Sidereal · Lahiri ayanamsa · whole-sign houses
          </p>
        </div>
      </div>
    </main>
  );
}
