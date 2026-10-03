/* Pick any area: re-project the base mock event (Delhi-NCR) to a new centre, heading and length. Mock data only. */
export const PRESETS = {
  delhi: { name: 'Delhi-NCR & western UP' },
  chennai: { name: 'Chennai & Tamil Nadu coast', lat: 12.9, lon: 81.0, heading: 285, len: 600 },
  mumbai: { name: 'Mumbai & Konkan coast', lat: 19.0, lon: 71.2, heading: 80, len: 500 },
  kerala: { name: 'Kerala & Karnataka coast', lat: 10.5, lon: 74.6, heading: 60, len: 400 },
  odisha: { name: 'Odisha & Bengal coast', lat: 19.5, lon: 86.0, heading: 315, len: 600 },
  gujarat: { name: 'Gujarat & Saurashtra', lat: 20.5, lon: 69.2, heading: 50, len: 500 },
  assam: { name: 'Assam & Northeast', lat: 26.2, lon: 92.0, heading: 100, len: 450 },
  uttarakhand: { name: 'Uttarakhand & Himachal', lat: 30.2, lon: 78.3, heading: 60, len: 300 } }
export const DEFAULT_CUSTOM = { name: 'Custom location', lat: 22.5, lon: 79.0, heading: 45, len: 500 }

export function makeRegion(base, spec) {
  const ref = base.runs.find(r => r.forecast_run === base.forecast_run) || base.runs[0], T = ref.trajectory, a = T[0], z = T[T.length - 1]
  const lat0 = (a.lat + z.lat) / 2, lon0 = (a.lon + z.lon) / 2, k = 111.2, c0 = Math.cos(lat0 * Math.PI / 180)
  const toXY = (la, lo) => [(lo - lon0) * c0 * k, (la - lat0) * k]
  const [ax, ay] = toXY(a.lat, a.lon), [zx, zy] = toXY(z.lat, z.lon)
  const s = spec.len / Math.hypot(zx - ax, zy - ay), ph = (90 - spec.heading) * Math.PI / 180 - Math.atan2(zy - ay, zx - ax)
  const cs = Math.cos(ph), sn = Math.sin(ph), c1 = Math.cos(spec.lat * Math.PI / 180)
  const map = (la, lo) => { const [x, y] = toXY(la, lo); return [spec.lat + s * (x * sn + y * cs) / k, spec.lon + s * (x * cs - y * sn) / (c1 * k)] }
  const fix = o => {
    const tr = o.trajectory.map(p => { const [la, lo] = map(p.lat, p.lon); return { ...p, lat: +la.toFixed(2), lon: +lo.toFixed(2) } })
    const pad = Math.max(...tr.map(p => p.spread_km)) / 111 + 0.25, la = tr.map(p => p.lat), lo = tr.map(p => p.lon)
    return { ...o, trajectory: tr, bbox: [Math.min(...la) - pad, Math.min(...lo) - pad, Math.max(...la) + pad, Math.max(...lo) + pad].map(v => +v.toFixed(2)),
      validation: { ...o.validation, event: 'Scenario: ' + spec.name } }
  }
  return { ...fix(base), runs: base.runs.map(fix), region_id: 'gen', region_name: spec.name }
}
