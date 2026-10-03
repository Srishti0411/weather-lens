import { useState } from 'react'
import MapCard from '../MapCard'
import { Card, Chip } from '../ui'
import { lead } from '../lib'

const CROPS = {
  Rice: { impact: 'Waterlogging', st: { Nursery: 0.4, Tillering: 0.6, Flowering: 1, 'Grain filling': 0.7 }, act: 'Open field drains, hold fertiliser, protect flowering panicles.' },
  Cotton: { impact: 'Boll rot, lint damage', st: { Flowering: 0.6, 'Boll formation': 0.8, 'Boll opening': 1 }, act: 'Delay picking until dry, drain fields, protect opened bolls.' },
  Sugarcane: { impact: 'Lodging, waterlogging', st: { Germination: 0.5, 'Grand growth': 0.7, Maturity: 0.4 }, act: 'Earth-up stalks and clear field drains to limit lodging.' },
  Maize: { impact: 'Root-zone waterlogging', st: { Vegetative: 0.6, Tasseling: 0.9, 'Grain filling': 0.6 }, act: 'Drain waterlogged plots and stake plants against lodging.' } }
const level = mm => mm >= 140 ? { n: 'Severe', c: '#ff7430' } : mm >= 90 ? { n: 'Moderate', c: '#f0a500' } : { n: 'Low', c: '#2878d4' }
const risk = s => s >= 0.75 ? { n: 'High', c: '#ff5a4d' } : s >= 0.45 ? { n: 'Moderate', c: '#f0c000' } : { n: 'Low', c: '#3ccf7a' }
const ROLES = { farmer: 'Farmer', district: 'District officer', sdrf: 'SDRF / NDRF', hospital: 'Hospital' }
const SUB = [['twin', 'Forecast Stress Testing'], ['role', 'Role Alerts'], ['crop', 'Crop Impact'], ['marine', 'Pre-Cyclone']]

export default function Impact({ d, ri, view, rain, step, place }) {
  const [tab, setTab] = useState('twin'), [S, setS] = useState({ i: 0, s: 0 }), [role, setRole] = useState('farmer')
  const [stage, setStage] = useState({ Rice: 'Flowering', Cotton: 'Boll opening', Sugarcane: 'Grand growth', Maize: 'Grain filling' })
  const PC = d.runs[ri].pre_cyclone, p = rain.traj[Math.min(step, rain.traj.length - 1)]
  const mm = Math.round(p.rainfall_mm_24h * (1 + S.i / 100)), wind = Math.round(p.wind_kmh * (1 + S.i / 200)), rad = Math.round((p.spread_km || 20) + Math.abs(S.s) * 0.2)
  const l = level(mm), area = Math.round(Math.PI * rad ** 2)
  const rows = Object.keys(CROPS).map(name => { const c = CROPS[name], r = risk((mm / 200) * c.st[stage[name]])
    return { name, c, r, sc: c.st[stage[name]], st: stage[name], act: r.n === 'High' ? c.act : r.n === 'Moderate' ? 'Check drainage channels and inspect fields after rain.' : 'No action needed. Continue routine monitoring.' } })
  const top = [...rows].sort((a, b) => b.sc - a.sc)[0], teams = { Severe: 6, Moderate: 3, Low: 0 }[l.n]
  const R = {
    farmer: [`${top.name} (${top.st}): ${top.r.n} ${top.c.impact.toLowerCase()} risk`, [top.act, `Illustrative ${mm} mm in 24 h. Act before ${p.t}.`]],
    district: [`Prepare vulnerable areas (about ${area} km² in the impact zone)`, [l.n !== 'Low' ? 'Pre-alert low-lying blocks and open relief shelters.' : 'Keep control room on watch.', 'Position pumps at known waterlogging points and clear major drains.']],
    sdrf: [`Position ${teams || 'standby'} ${teams ? 'response teams' : 'team'} near ${p.lat}°N, ${p.lon}°E`, [teams ? 'Stage boats and pumps at the edge of the impact zone.' : 'No deployment yet; keep teams on standby.', `Review road access before ${p.t}.`]],
    hospital: [l.n !== 'Low' ? 'Activate emergency preparedness' : 'Routine readiness', [l.n !== 'Low' ? 'Reserve surge beds and check backup power and fuel.' : 'Confirm backup power is working.', 'Stock supplies for waterborne illness and plan staff access.']] }
  return (<>
    <Card title="Impact map" sub={tab === 'marine' ? PC.hotspot.display : 'Dashed blue = what-if scenario from the sliders'}>
      <MapCard d={d} ri={ri} view={rain} step={step} scenario={tab === 'twin' ? S : null} hotspot={tab === 'marine' ? PC.hotspot : null} placeMode={place.on} onPlace={place.fn} height={480} />
    </Card>
    <Card title="Decision intelligence">
      <div className="subtabs">{SUB.map(([k, t]) => <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
      {tab === 'twin' && <><p className="note">Adjust rainfall intensity and track to see how the uncertainty zone and impact change at each forecast step.</p>
        <div className="sliders">
          <label>Rainfall shift <b>{S.i > 0 ? '+' : ''}{S.i}%</b><input type="range" min="-30" max="30" step="5" value={S.i} onChange={e => setS({ ...S, i: +e.target.value })} /></label>
          <label>Track shift (east + / west −) <b>{S.s > 0 ? '+' : ''}{S.s} km</b><input type="range" min="-100" max="100" step="10" value={S.s} onChange={e => setS({ ...S, s: +e.target.value })} /></label>
          <button className="btn" onClick={() => setS({ i: 0, s: 0 })}>Reset</button></div>
        <div className="mets">{[['Rainfall (illustrative)', mm + ' mm', 'baseline ' + p.rainfall_mm_24h + ' mm'], ['Peak wind', wind + ' km/h', 'scenario'], ['Uncertainty radius', rad + ' km', '+' + lead(rain, p.t) + ' h lead'], ['5 km impact cells', Math.round(Math.PI * rad ** 2 / 25), l.n + ' alert level']]
          .map(([a, b, c]) => <div key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</div></>}
      {tab === 'role' && <><p className="note">Same weather event, different advice for each stakeholder.</p>
        <div className="subtabs">{Object.entries(ROLES).map(([k, t]) => <button key={k} className={k === role ? 'on' : ''} onClick={() => setRole(k)}>{t}</button>)}</div>
        <div className="alert" style={{ borderLeftColor: l.c }}><Chip c={l.c}>{l.n}</Chip> <span>{ROLES[role]} alert · {p.t}</span><h3>{R[role][0]}</h3><ul>{R[role][1].map(a => <li key={a}>{a}</li>)}</ul></div></>}
      {tab === 'crop' && rows.map(x => <div className="crop" key={x.name}><strong>{x.name}</strong>
        <select value={x.st} onChange={e => setStage({ ...stage, [x.name]: e.target.value })}>{Object.keys(x.c.st).map(s => <option key={s}>{s}</option>)}</select>
        <div><Chip c={x.r.c}>{x.r.n}</Chip> {x.c.impact} risk<br /><small>{x.act}</small></div></div>)}
      {tab === 'marine' && <><div className="alert"><h3>{PC.level} · score {PC.score}</h3><small>Expected window ~{PC.expected_window_days} days · {PC.hotspot.display}</small></div>
        {PC.indicators.map(i => <div key={i.id} className="ind"><div><span>{i.label}</span><b>{i.display}</b></div><div className="bar2"><i style={{ width: i.bar * 100 + '%' }} /></div></div>)}
        <h3 style={{ marginTop: 14 }}>Historical analogues</h3><ul>{PC.analogues.map(a => <li key={a.name}>{a.name} — {a.period}, {a.category}, landfall: {a.landfall} (similarity {a.similarity})</li>)}</ul>
        <p className="warn">Early indication of environmental conditions that may support cyclone development, not a prediction that one will form. {PC.disclaimer}</p></>}
    </Card>
  </>)
}
