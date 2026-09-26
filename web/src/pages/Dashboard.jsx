import { Link } from 'react-router-dom';
import { Loading, PageHeader, Stat, useApi } from '../components/ui.jsx';
import { fmtNum, timeAgo } from '../util.js';

function OnlineChart({ points }) {
  const w = 600, h = 160, pad = 24;
  if (!points || points.length < 2) return <p className="muted">Not enough data yet.</p>;
  const max = Math.max(1, ...points.map((p) => p.online)) * 1.1;
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.online)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Players online, last 24 hours">
      <path d={area} className="chart-area" />
      <path d={line} className="chart-line" />
      {points.map((p, i) =>
        i % 4 === 0 ? (
          <text key={i} x={x(i)} y={h - 6} className="chart-label" textAnchor="middle">
            {new Date(p.at).getHours()}:00
          </text>
        ) : null,
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.online)} r="3" className="chart-dot">
          <title>{`${new Date(p.at).getHours()}:00: ${p.online} online`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const { data, error } = useApi('/dashboard');
  if (!data) return <Loading error={error} />;
  const s = data.stats;
  const maxSpecies = Math.max(1, ...s.species.map((x) => x.count));
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid stats">
        <Stat label="Online now" value={fmtNum(s.onlineNow)} tone="green" />
        <Stat label="Registered players" value={fmtNum(s.totalPlayers)} sub={`${fmtNum(s.activeToday)} active today`} />
        <Stat label="Open reports" value={fmtNum(s.openReports)} tone={s.openReports ? 'amber' : ''} sub={<Link to="/reports">Review →</Link>} />
        <Stat label="Banned / muted" value={`${fmtNum(s.banned)} / ${fmtNum(s.muted)}`} tone="red" />
        <Stat label="Servers online" value={`${s.serversOnline} / ${s.serversTotal}`} />
      </div>
      <div className="grid two">
        <div className="card">
          <h2>Players online · last 24h</h2>
          <OnlineChart points={s.onlineHistory} />
        </div>
        <div className="card">
          <h2>Main animal</h2>
          <div className="bars">
            {s.species.map((sp) => (
              <div key={sp.name} className="bar-row">
                <span className="bar-name">{sp.name}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(sp.count / maxSpecies) * 100}%` }} /></div>
                <span className="bar-val">{sp.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {data.recentActions && <div className="card">
        <h2>Recent staff actions</h2>
        {data.recentActions.length === 0 ? (
          <p className="muted">No actions yet.</p>
        ) : (
          <table className="table">
            <tbody>
              {data.recentActions.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap muted">{timeAgo(a.at)}</td>
                  <td><b>{a.admin}</b></td>
                  <td><code>{a.action}</code></td>
                  <td>{a.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>}
    </>
  );
}
