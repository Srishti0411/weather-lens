export const EVENT_NAMES = { precipitation: 'Extreme Rainfall', temperature: 'Extreme Temperature Anomaly', wind_speed: 'Extreme Wind', pressure: 'Deep Low-Pressure System' }
export const RAMPS = {
  precipitation: [[0, [38, 84, 110]], [0.4, [40, 168, 180]], [0.7, [240, 192, 0]], [1, [255, 90, 77]]],
  temperature: [[0, [240, 160, 60]], [0.5, [150, 190, 210]], [1, [30, 90, 200]]],
  wind_speed: [[0, [38, 84, 110]], [0.4, [60, 190, 120]], [0.7, [240, 192, 0]], [1, [255, 90, 77]]],
  pressure: [[0, [38, 84, 110]], [0.5, [120, 100, 190]], [1, [210, 60, 160]]] }
export function rampColor(stops, v) {
  v = Math.max(0, Math.min(1, v))
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a)
    return 'rgb(' + ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(',') + ')' }
  return 'rgb(' + stops[stops.length - 1][1].join(',') + ')'
}
export const toPhysical = (f, s) => s.value_at_0 + (s.value_at_1 - s.value_at_0) * Math.pow(f, s.exponent)
export function blockAverage(g) {
  return g.filter((_, r) => r % 2 === 0).map((_, i) => { const r = i * 2
    return g[0].filter((_, c) => c % 2 === 0).map((_, j) => { const c = j * 2; let s = 0, n = 0
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const v = g[r + a] && g[r + a][c + b]; if (v !== undefined) { s += v; n++ } }
      return s / n }) })
}
/* IMD 24 h rainfall categories (mm) */
export const imd = mm => mm >= 204.5 ? { n: 'Extremely heavy', c: '#ff4d4d', w: 'Red' } : mm >= 115.6 ? { n: 'Very heavy', c: '#ff9a2e', w: 'Orange' }
  : mm >= 64.5 ? { n: 'Heavy', c: '#f0d000', w: 'Yellow' } : { n: 'Below heavy', c: '#3ccf7a', w: 'Green' }
export const km = (a, b, c, d) => { const r = Math.PI / 180; return 6371 * Math.hypot((c - a) * r, (d - b) * r * Math.cos((a + c) * r / 2)) }
export const peak = r => Math.max(...r.trajectory.map(p => p.rainfall_mm_24h))
const ts = s => Date.parse(s.replace(' UTC', '').replace(' ', 'T') + ':00Z')
export const lead = (run, t) => Math.round((ts(t) - ts(run.forecast_run)) / 36e5)

export function getView(d, ri, vk) {
  const run = d.runs[ri], v = run.variables[vk]
  return { ...run, event: EVENT_NAMES[vk] || run.event, severity: v.severity, detection: v.detection, peakScore: v.peak_amplitude_score, v, vk,
    traj: run.trajectory.map((p, k) => ({ ...p, peak: v.peaks[k], val: p[v.value_key] })), field: v.field }
}
/* name, lat, lon, population in thousands — approximate (Census 2011 era), verify before presenting */
export const CITIES = [['Delhi', 28.61, 77.21, 16788], ['Gurugram', 28.46, 77.03, 876], ['Faridabad', 28.41, 77.31, 1404], ['Noida', 28.54, 77.39, 642], ['Ghaziabad', 28.67, 77.45, 1648],
  ['Meerut', 28.98, 77.71, 1309], ['Moradabad', 28.84, 78.78, 889], ['Bareilly', 28.35, 79.43, 903], ['Agra', 27.18, 78.01, 1585], ['Dehradun', 30.32, 78.03, 578], ['Haridwar', 29.95, 78.16, 228],
  ['Shimla', 31.1, 77.17, 169], ['Chandigarh', 30.73, 76.78, 960], ['Ludhiana', 30.9, 75.86, 1618], ['Amritsar', 31.63, 74.87, 1132], ['Srinagar', 34.08, 74.8, 1180], ['Jaipur', 26.91, 75.79, 3046], ['Kota', 25.18, 75.84, 1001],
  ['Lucknow', 26.85, 80.95, 2817], ['Kanpur', 26.45, 80.35, 2768], ['Varanasi', 25.32, 83.01, 1201], ['Patna', 25.59, 85.14, 1684], ['Ranchi', 23.34, 85.31, 1073], ['Kolkata', 22.57, 88.36, 4497],
  ['Bhubaneswar', 20.3, 85.82, 838], ['Cuttack', 20.46, 85.88, 606], ['Visakhapatnam', 17.69, 83.22, 1728], ['Vijayawada', 16.51, 80.65, 1048], ['Nellore', 14.44, 79.99, 500], ['Tirupati', 13.63, 79.42, 375],
  ['Chennai', 13.08, 80.27, 4646], ['Kanchipuram', 12.83, 79.7, 164], ['Vellore', 12.92, 79.13, 423], ['Puducherry', 11.93, 79.83, 658], ['Cuddalore', 11.75, 79.77, 173], ['Madurai', 9.93, 78.12, 1017],
  ['Coimbatore', 11.02, 76.96, 1051], ['Bengaluru', 12.97, 77.59, 8425], ['Hyderabad', 17.39, 78.49, 6731], ['Mangaluru', 12.91, 74.86, 484], ['Kochi', 9.93, 76.27, 602], ['Thiruvananthapuram', 8.52, 76.94, 957],
  ['Panaji', 15.5, 73.83, 115], ['Mumbai', 19.08, 72.88, 12442], ['Pune', 18.52, 73.86, 3124], ['Nashik', 20.0, 73.79, 1486], ['Nagpur', 21.15, 79.09, 2406], ['Surat', 21.17, 72.83, 4467],
  ['Vadodara', 22.31, 73.18, 1670], ['Ahmedabad', 23.02, 72.57, 5577], ['Rajkot', 22.3, 70.8, 1287], ['Jamnagar', 22.47, 70.07, 600], ['Bhavnagar', 21.76, 72.15, 593], ['Porbandar', 21.64, 69.6, 134],
  ['Bhopal', 23.26, 77.41, 1798], ['Indore', 22.72, 75.86, 1964], ['Raipur', 21.25, 81.63, 1010], ['Guwahati', 26.14, 91.74, 957], ['Dibrugarh', 27.48, 94.91, 154], ['Shillong', 25.57, 91.88, 143], ['Imphal', 24.82, 93.94, 268]]
export const citiesOf = () => CITIES
export function cityHits(run, cities) {
  return cities.map(([n, la, lo, pop]) => { let f = null, mx = 0
    run.trajectory.forEach(p => { if (km(la, lo, p.lat, p.lon) <= Math.max(p.spread_km, 25)) { f = f || p; mx = Math.max(mx, p.rainfall_mm_24h) } })
    return f && { n, la, lo, pop, t: f.t, lead: lead(run, f.t), mx } }).filter(Boolean).sort((a, b) => a.lead - b.lead)
}
export function persist(d, i) { let n = 0; while (d.runs[i + n] && peak(d.runs[i + n]) >= 115.6) n++; return n }
export function cmpRuns(a, b) {
  const m = {}; b.trajectory.forEach(p => m[p.t] = p); let r = 0, k = 0, n = 0
  a.trajectory.forEach(p => { const q = m[p.t]; if (q) { r += Math.abs(p.rainfall_mm_24h - q.rainfall_mm_24h); k += km(p.lat, p.lon, q.lat, q.lon); n++ } })
  return n ? [r / n, k / n] : null
}
export function capXml(r) {
  const pk = peak(r), c = imd(pk), b = r.bbox, T = r.trajectory, iso = s => s.replace(' UTC', ':00+00:00').replace(' ', 'T')
  const sev = { Red: 'Extreme', Orange: 'Severe', Yellow: 'Moderate' }[c.w] || 'Minor'
  const poly = [[b[0], b[1]], [b[0], b[3]], [b[2], b[3]], [b[2], b[1]], [b[0], b[1]]].map(x => x.join(',')).join(' ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>SIH26078-${r.forecast_run.replace(/\D/g, '')}</identifier>
  <sender>weatherlens-prototype@example.invalid</sender>
  <sent>${iso(r.forecast_run)}</sent>
  <status>Exercise</status><msgType>Alert</msgType><scope>Public</scope>
  <info><language>en-IN</language><category>Met</category>
    <event>${r.event}</event><urgency>Expected</urgency><severity>${sev}</severity><certainty>Likely</certainty>
    <onset>${iso(T[0].t)}</onset><expires>${iso(T[T.length - 1].t)}</expires>
    <headline>${c.w} alert: ${c.n} rainfall (peak ${pk} mm/24h)</headline>
    <description>Medium-range forecast tracks an extreme rainfall event over ${T.length} steps. Prototype output.</description>
    <area><areaDesc>Forecast impact box</areaDesc><polygon>${poly}</polygon></area>
  </info>
</alert>`
}
