import { useState } from 'react'
import MapCard from '../MapCard'
import { Card, Chip } from '../ui'
import { lead, imd, cityHits, citiesOf } from '../lib'

export default function Tracking({ d, ri, view, step, setStep, place }) {
  const [all, setAll] = useState(false), [wide, setWide] = useState(false), [fld, setFld] = useState(false), H = cityHits(d.runs[ri], citiesOf(d)), tot = H.reduce((s, h) => s + h.pop, 0)
  return (<>
    <Card title="Weather tracking map" sub="Click anywhere on the map for local details. Black dots are cities inside the uncertainty zone."
      right={<div className="chks"><label className="chk"><input type="checkbox" checked={fld} onChange={e => setFld(e.target.checked)} /> 5 km field</label><label className="chk"><input type="checkbox" checked={wide} onChange={e => setWide(e.target.checked)} /> India-wide view</label><label className="chk"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Show all runs</label></div>}>
      <MapCard d={d} ri={ri} view={view} step={step} allRuns={all} wide={wide} showField={fld} placeMode={place.on} onPlace={place.fn} cities height={620} />
    </Card>
    <Card title="Forecast timeline" sub="Select a step to inspect event movement">
      <div className="timeline">{view.traj.map((p, i) => (
        <button key={i} className={i === step ? 'on' : ''} onClick={() => setStep(i)}>
          <i /><b>{p.t.slice(5, 16)}</b><small>{i === 0 ? 'Initial' : '+' + lead(view, p.t) + 'h'}</small><small>{p.val} {view.v.unit}</small></button>))}</div>
    </Card>
    <Card title="Cities in the forecast path" sub={`~${(tot / 100).toFixed(0)} lakh residents in listed cities fall inside the uncertainty radius at some step (population approx., Census 2011).`}>
      <table><thead><tr><th>CITY</th><th>POP (LAKH)</th><th>IN PATH FROM</th><th>LEAD</th><th>IMD CATEGORY</th></tr></thead><tbody>
        {H.map(h => { const c = imd(h.mx); return <tr key={h.n}><td>{h.n}</td><td>{(h.pop / 100).toFixed(1)}</td><td>{h.t}</td><td>+{h.lead} h</td><td><Chip c={c.c}>{c.w} · {c.n}</Chip></td></tr> })}
        {!H.length && <tr><td colSpan={5}>No listed city in path</td></tr>}</tbody></table>
    </Card>
  </>)
}
