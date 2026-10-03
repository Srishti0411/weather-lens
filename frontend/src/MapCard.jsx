import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Rectangle, Circle, Tooltip, Popup, useMap, useMapEvents } from 'react-leaflet'
import { citiesOf, cityHits, lead, km, toPhysical, imd, rampColor, RAMPS } from './lib'
import { Chip } from './ui'

function Fit({ bounds, step, pt, wide }) {
  const map = useMap()
  useEffect(() => { map.invalidateSize(); if (wide) map.fitBounds([[6, 68], [36, 98]]); else if (step > 0 && pt) map.flyTo(pt, 8, { duration: 0.8 }); else map.fitBounds(bounds, { padding: [30, 30] }) },
    [JSON.stringify(bounds), step, wide]) // eslint-disable-line
  return null
}
function Clicker({ onPick }) { useMapEvents({ click: e => onPick([e.latlng.lat, e.latlng.lng]) }); return null }

/* What does the forecast say at the clicked point? */
function probe([la, lo], view, cs) {
  let bi = 0, bd = 1e9
  view.traj.forEach((p, i) => { const k = km(la, lo, p.lat, p.lon); if (k < bd) { bd = k; bi = i } })
  const p = view.traj[bi], b = view.bbox, f = view.field, rows = f.length, cols = f[0].length
  const inBox = la >= b[0] && la <= b[2] && lo >= b[1] && lo <= b[3]
  let cell = null
  if (inBox) {
    const r = Math.min(rows - 1, Math.floor((b[2] - la) / (b[2] - b[0]) * rows)), c = Math.min(cols - 1, Math.floor((lo - b[1]) / (b[3] - b[1]) * cols))
    cell = toPhysical(f[r][c], view.v.field_scale)
  }
  let nc = null
  cs.forEach(([n, a, o]) => { const k = km(la, lo, a, o); if (!nc || k < nc.k) nc = { n, k } })
  return { bd, p, inside: bd <= Math.max(p.spread_km, 25), inBox, cell, nc }
}

/* scenario = {i, s} draws the what-if overlay; hotspot = bbox draws the Bay of Bengal box; showField paints the 5 km grid on the map */
export default function MapCard({ d, ri, view, step, allRuns, cities, scenario, hotspot, wide, showField, placeMode, onPlace, height = 600 }) {
  const [pick, setPick] = useState(null)
  const col = view.severity === 'Low' ? '#2878d4' : view.severity === 'Moderate' ? '#f0a500' : '#ff7430'
  const b = view.bbox, bounds = hotspot ? [[hotspot.bbox[0], hotspot.bbox[1]], [hotspot.bbox[2], hotspot.bbox[3]]] : [[b[0], b[1]], [b[2], b[3]]]
  const cs = citiesOf(d), hits = cityHits(d.runs[ri], cs).map(h => h.n), cur = view.traj[Math.min(step, view.traj.length - 1)]
  const shifted = scenario && view.traj.map(p => ({ ...p, pos: [p.lat, p.lon + scenario.s / (111 * Math.cos(p.lat * Math.PI / 180))], rad: (p.spread_km || 20) + Math.abs(scenario.s) * 0.2 }))
  const q = pick && !hotspot ? probe(pick, view, cs) : null, u = view.v.unit, dec = u === '°C' || u === 'hPa' ? 1 : 0
  const rows = view.field.length, cols = view.field[0].length, dLa = (b[2] - b[0]) / rows, dLo = (b[3] - b[1]) / cols
  return (
    <MapContainer center={[28.6, 77.2]} zoom={7} style={{ height }} className={'map' + (placeMode ? ' place' : '')}>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
      <Fit bounds={bounds} step={step} pt={cur && [cur.lat, cur.lon]} wide={wide} />
      {!hotspot && <Clicker onPick={placeMode ? onPlace : setPick} />}
      {hotspot ? <>
        <Rectangle bounds={bounds} pathOptions={{ color: '#ff7430', dashArray: '6 4', fillOpacity: 0.25 }} />
        <CircleMarker center={hotspot.center} radius={5} pathOptions={{ color: '#ff7430' }}><Tooltip permanent direction="top">{hotspot.label}</Tooltip></CircleMarker></> : <>
        {showField && view.field.map((row, r) => row.map((x, c2) => <Rectangle key={r + '-' + c2} interactive={false}
          bounds={[[b[2] - (r + 1) * dLa, b[1] + c2 * dLo], [b[2] - r * dLa, b[1] + (c2 + 1) * dLo]]} pathOptions={{ stroke: false, fillColor: rampColor(RAMPS[view.vk], x), fillOpacity: 0.55 }} />))}
        {allRuns && d.runs.map((r, i) => i !== ri && <Polyline key={i} positions={r.trajectory.map(p => [p.lat, p.lon])} pathOptions={{ color: '#7fa3b4', weight: 1.5, opacity: 0.6 }} />)}
        <Rectangle bounds={bounds} interactive={false} pathOptions={{ color: col, weight: 2, fillOpacity: showField ? 0 : 0.15 }} />
        <Polyline positions={view.traj.map(p => [p.lat, p.lon])} pathOptions={{ color: col, weight: 4 }} />
        {view.traj.map((p, i) => <CircleMarker key={i} center={[p.lat, p.lon]} radius={i === step ? 10 : 5} pathOptions={{ color: col, fillOpacity: i === step ? 1 : 0.8 }}>
          <Tooltip>+{lead(view, p.t)} h · {p.val} {u} · ±{p.spread_km} km</Tooltip></CircleMarker>)}
        {cities && cs.map(([n, la, lo]) => <CircleMarker key={n} center={[la, lo]} radius={3} pathOptions={{ color: hits.includes(n) ? '#000' : '#5c7785', fillOpacity: 1 }}><Tooltip>{n}{hits.includes(n) ? ' — in path' : ''}</Tooltip></CircleMarker>)}
        {shifted && <>
          <Polyline positions={shifted.map(p => p.pos)} pathOptions={{ color: '#4fc3f7', dashArray: '8 6', weight: 3 }} />
          {shifted.map((p, i) => <Circle key={i} center={p.pos} radius={p.rad * 1000} pathOptions={{ color: '#4fc3f7', weight: 1, dashArray: '4 4', fillOpacity: i === step ? 0.2 : 0.06 }} />)}</>}
        {q && <>
          <CircleMarker center={pick} radius={6} pathOptions={{ color: '#fff', fillColor: '#2878d4', fillOpacity: 1, weight: 2 }} />
          <Popup key={pick.join()} position={pick} minWidth={230}>
            <div className="pop">
              <b>{pick[0].toFixed(2)}°N, {pick[1].toFixed(2)}°E</b>
              <div>{q.inBox ? <>5 km cell {view.v.label.toLowerCase()}: <b>{q.cell.toFixed(dec)} {u}</b></> : 'Outside the forecast box'}</div>
              {view.vk === 'precipitation' && q.inBox && (() => { const c = imd(q.cell); return <div><Chip c={c.c}>{c.w} · {c.n}</Chip></div> })()}
              <div>Nearest track point: {Math.round(q.bd)} km away, +{lead(view, q.p.t)} h<br />{q.inside ? <b style={{ color: '#d9480f' }}>Inside the uncertainty zone (±{q.p.spread_km} km)</b> : 'Outside the uncertainty zone'}</div>
              <div>Nearest city: {q.nc.n} ({Math.round(q.nc.k)} km)</div>
              <small>Approximate: the 5 km grid is stretched over the forecast box.</small>
            </div>
          </Popup></>}
      </>}
    </MapContainer>)
}
