import { useEffect, useMemo, useState } from 'react'
import { loadData } from './api'
import { getView, imd, peak, cityHits, persist, citiesOf } from './lib'
import { PRESETS, DEFAULT_CUSTOM, makeRegion } from './regions'
import Tracking from './views/Tracking'
import Downscale from './views/Downscale'
import Impact from './views/Impact'
import Runs from './views/Runs'
import Verify from './views/Verify'

const TABS = [['tracking', 'Tracking'], ['downscale', 'Downscaling'], ['impact', 'Impact & Advisory'], ['runs', 'Run Consistency'], ['verify', 'Validation & Alerts']]
const VIEWS = { tracking: Tracking, downscale: Downscale, impact: Impact, runs: Runs, verify: Verify }
const HEADS = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]]

export default function App() {
  const [base, setBase] = useState(null), [src, setSrc] = useState(''), [err, setErr] = useState('')
  const [ri, setRi] = useState(0), [vk, setVk] = useState('precipitation'), [step, setStep] = useState(0), [tab, setTab] = useState('tracking')
  const [region, setRegion] = useState('delhi'), [custom, setCustom] = useState(null), [placeMode, setPlaceMode] = useState(false)
  useEffect(() => {
    loadData().then(({ data, source }) => {
      setBase(data); setSrc(source); setVk(data.default_variable || 'precipitation')
      const i = data.runs.findIndex(r => r.forecast_run === data.forecast_run); setRi(i < 0 ? 0 : i)
    }).catch(e => setErr(String(e)))
  }, [])
  const spec = region === 'custom' ? custom : PRESETS[region].lat !== undefined ? PRESETS[region] : null
  const d = useMemo(() => base && (spec ? makeRegion(base, spec) : base), [base, spec])
  if (!d) return <div className="load">{err || 'Loading forecast…'}</div>

  const view = getView(d, ri, vk), rain = getView(d, ri, 'precipitation'), run = d.runs[ri]
  const pk = peak(run), c = imd(pk), H = cityHits(run, citiesOf(d)), n = persist(d, ri), det = rain.detection
  const pickRun = i => { setRi(i); setStep(0) }
  const cur = spec || { ...DEFAULT_CUSTOM, lat: 28.9, lon: 77.5, heading: 45, len: 300 }
  const edit = patch => { setCustom({ ...cur, name: 'Custom location', ...patch }); setRegion('custom'); setStep(0) }
  const place = { on: placeMode, fn: ([lat, lon]) => { edit({ lat: +lat.toFixed(2), lon: +lon.toFixed(2) }); setPlaceMode(false) } }
  const View = VIEWS[tab]
  const K = ({ l, v, s, col = '#4fc3f7' }) => <div className="kpi" style={{ borderTopColor: col }}><span>{l}</span><strong style={{ color: col === '#4fc3f7' ? '#e8eef2' : col }}>{v}</strong><small>{s}</small></div>

  return (<>
    <header className="top">
      <div className="brand"><div className="logo">☁</div><div><h1>WeatherLens</h1><p>Spatio-temporal tracking & high-resolution analysis of extreme weather</p></div></div>
      {src === 'api' && <div className="src api"><i /> LIVE API</div>}
    </header>
    <nav className="tabs">{TABS.map(([k, t]) => <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</nav>
    <div className="bar">
      <label>Region<select value={region} onChange={e => { setRegion(e.target.value); setStep(0); if (e.target.value === 'custom' && !custom) setCustom({ ...cur, name: 'Custom location' }) }}>
        {Object.entries(PRESETS).map(([k, r]) => <option key={k} value={k}>{r.name}</option>)}<option value="custom">Custom location</option></select></label>
      <button className={'btn ' + (placeMode ? 'on' : '')} onClick={() => { setPlaceMode(!placeMode); if (!placeMode) setTab(t => t === 'tracking' || t === 'impact' ? t : 'tracking') }}>📍 {placeMode ? 'Click the map…' : 'Place event on map'}</button>
      <label>Track heading<select value={Math.round(cur.heading / 45) * 45 % 360} onChange={e => edit({ heading: +e.target.value })}>{HEADS.map(([n, v]) => <option key={n} value={v}>Moving {n}</option>)}</select></label>
      <label>Track length: {cur.len} km<input type="range" min="200" max="1200" step="50" value={cur.len} onChange={e => edit({ len: +e.target.value })} /></label>
      <label>Forecast run<select value={ri} onChange={e => pickRun(+e.target.value)}>{d.runs.map((r, i) => <option key={i} value={i}>{r.forecast_run}</option>)}</select></label>
      <label>Variable<select value={vk} onChange={e => setVk(e.target.value)}>{d.variables_catalog.map(v => <option key={v.id} value={v.id} disabled={!v.enabled}>{v.label}</option>)}</select></label>
      <label>Forecast step<select value={step} onChange={e => setStep(+e.target.value)}>{view.traj.map((p, i) => <option key={i} value={i}>{i === 0 ? 'Initial' : '+' + (i * 12) + ' h'} · {p.t.slice(5, 16)}</option>)}</select></label>
      <div className="ev"><span>EVENT</span><b>{view.event}</b><em style={{ background: view.severity === 'Severe' ? '#ff7430' : view.severity === 'Moderate' ? '#f0a500' : '#2878d4' }}>{view.severity}</em></div>
    </div>
    {placeMode && <div className="hint">Click anywhere on the map to put the event there. Use heading and length to shape the track.</div>}
    <div className="kpis">
      <K l="IMD-STYLE WARNING" v={c.w.toUpperCase()} s={c.n + ' rainfall'} col={c.c} />
      <K l={'DETECTION (' + det.index + ')'} v={det.score.toFixed(2)} s={'threshold ' + det.threshold + (det.exceeded ? ' · exceeded' : '')} />
      <K l="PEAK RAINFALL" v={pk + ' mm'} s="per 24 h, in path" />
      <K l="FIRST CITY IMPACT" v={H[0] ? H[0].n : 'None'} s={H[0] ? 'in +' + H[0].lead + ' h' : 'no listed city in path'} />
      <K l="SIGNAL PERSISTENCE" v={n + ' runs'} s={n ? 'consecutive runs ≥ very heavy' : 'below very heavy'} />
    </div>
    <main className="content"><View d={d} ri={ri} view={view} rain={rain} step={step} setStep={setStep} pickRun={pickRun} place={place} /></main>
  </>)
}
