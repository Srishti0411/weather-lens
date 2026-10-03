const API = import.meta.env.VITE_API_URL || '/api'
/* Try the FastAPI backend first; if it is down (or on a static host) fall back to bundled mock data. */
export async function loadData(region = 'delhi') {
  try {
    const r = await fetch(`${API}/data?region=${region}`, { signal: AbortSignal.timeout(2500) })
    if (!r.ok) throw new Error('bad status')
    return { data: await r.json(), source: 'api' }
  } catch {
    const r = await fetch(region === 'delhi' ? '/mock_data.json' : `/mock_data_${region}.json`)
    if (!r.ok) throw new Error('Could not load mock data for ' + region)
    return { data: await r.json(), source: 'mock' }
  }
}
