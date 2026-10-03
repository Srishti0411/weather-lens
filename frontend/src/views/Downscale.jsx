import { Card } from '../ui'
import { RAMPS, rampColor, toPhysical, blockAverage } from '../lib'

export default function Downscale({ view }) {
  const f = view.field, v = view.v, coarse = blockAverage(f), fmax = Math.max(...f.flat()), cmax = Math.max(...coarse.flat())
  const dec = v.unit === '°C' || v.unit === 'hPa' ? 1 : 0, ramp = RAMPS[view.vk], cols = f[0].length
  let ri = 0; f.forEach((r, i) => { if (Math.max(...r) > Math.max(...f[ri])) ri = i })
  const row = f[ri], co = coarse[Math.floor(ri / 2)].flatMap(x => [x, x]).slice(0, row.length)
  const W = 600, H = 140, pl = a => a.map((x, i) => (i * W / (row.length - 1)).toFixed(1) + ',' + (H - 8 - x / fmax * (H - 20)).toFixed(1)).join(' ')
  return (<>
    <Card title="High-resolution downscaling" sub={v.legend}>
      <div className="res"><div><span>INPUT FORECAST</span><b>{view.downscaling.input_resolution}</b><small>Medium-resolution field</small></div><i>→</i>
        <div className="sel"><span>MODEL OUTPUT</span><b>{view.downscaling.output_resolution}</b><small>High-resolution field</small></div>
        <div><span>PEAK KEPT BY 5 KM</span><b>{cmax.toFixed(2)} → {fmax.toFixed(2)}</b><small>+{Math.round((fmax - cmax) / cmax * 100)}% vs coarse</small></div></div>
    </Card>
    <div className="two">
      <Card title="12 km view" sub="Simulated by block-averaging the 5 km field">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${coarse[0].length},1fr)` }}>{coarse.flat().map((x, i) => <div key={i} style={{ background: rampColor(ramp, x), height: 26 }} title={x.toFixed(2)} />)}</div></Card>
      <Card title="5 km downscaled field" sub="Hover a cell for the physical value">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>{f.flat().map((x, i) => <div key={i} style={{ background: rampColor(ramp, x), height: 13 }}
          title={`${toPhysical(x, v.field_scale).toFixed(dec)} ${v.unit} (index ${x.toFixed(2)})`} />)}</div></Card>
    </div>
    <Card title={`Peak-preservation transect (row ${ri + 1}, strongest row)`} sub="Orange: 5 km field · dashed: 12 km view. Averaging flattens the peak — the extreme-aware model keeps it.">
      <svg className="tr" viewBox={`0 0 ${W} ${H}`}><polyline className="c12" points={pl(co)} /><polyline className="c5" points={pl(row)} /></svg>
      <small>12 km peak {Math.max(...co).toFixed(2)} vs 5 km peak {Math.max(...row).toFixed(2)} (normalised index).</small>
    </Card>
  </>)
}
