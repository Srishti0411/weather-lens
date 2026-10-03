import { Card, Chip } from '../ui'
import { imd, peak, cmpRuns, persist } from '../lib'

export default function Runs({ d, ri, pickRun }) {
  const r = d.runs[ri], n = persist(d, ri), pks = d.runs.map(peak).reverse(), mx = Math.max(...pks), y = v => 54 - v / mx * 48
  const sp = pks.map((v, i) => (i * 300 / (pks.length - 1)).toFixed(1) + ',' + y(v).toFixed(1)).join(' ')
  return (
    <Card title="Run-to-run consistency" sub="Does the model keep forecasting this event as new runs arrive? Click a run to load it.">
      <svg className="spark" viewBox="0 0 300 60" preserveAspectRatio="none"><line x1="0" x2="300" y1={y(115.6)} y2={y(115.6)} stroke="#ff9a2e" strokeDasharray="3 3" /><polyline fill="none" stroke="#4fc3f7" strokeWidth="2" points={sp} /></svg>
      <small>Peak rainfall per run, oldest → newest. Orange line: IMD “very heavy” (115.6 mm). Persisted for {n} consecutive runs from the selected one.</small>
      <table><thead><tr><th>RUN</th><th>PEAK (MM)</th><th>IMD CATEGORY</th><th>Δ RAIN vs SELECTED</th><th>Δ TRACK</th></tr></thead><tbody>
        {d.runs.map((q, i) => { const x = i === ri ? null : cmpRuns(q, r), p = peak(q), c = imd(p)
          return <tr key={i} className={'click ' + (i === ri ? 'sel' : '')} onClick={() => pickRun(i)}><td>{q.forecast_run}</td><td>{p}</td>
            <td><Chip c={c.c}>{c.w} · {c.n}</Chip></td><td>{x ? x[0].toFixed(0) + ' mm' : '—'}</td><td>{x ? x[1].toFixed(0) + ' km' : '—'}</td></tr> })}</tbody></table>
    </Card>)
}
