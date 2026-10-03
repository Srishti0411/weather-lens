import { Card } from '../ui'
import { capXml } from '../lib'

export default function Verify({ d, ri }) {
  const r = d.runs[ri], v = r.validation, xml = capXml(r)
  const dl = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' })); a.download = `alert_${r.forecast_run.replace(/\D/g, '')}.cap.xml`; a.click() }
  const P = [['1 · DETECT', 'EFI vs climatology'], ['2 · TRACK', 'Spatio-temporal graph across steps'], ['3 · DOWNSCALE', 'Extreme-preserving 12→5 km'], ['4 · IMPACT', 'Cities, crops, roles'], ['5 · ALERT', 'CAP message for dissemination']]
  const M = [[v.detection_accuracy + '%', 'Detection accuracy'], [v.trajectory_error_km + ' km', 'Mean track error'], [v.peak_amplitude_score, 'Peak amplitude score'], ['+' + v.downscaling_gain_percent + '%', 'Downscaling gain']]
  return (<>
    <Card title="Pipeline & validation" sub={`Back-test reference: ${v.event}`}>
      <div className="pipe">{P.map(([a, b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}</div>
      <div className="mets">{M.map(([a, b]) => <div key={b}><strong>{a}</strong><span>{b}</span></div>)}</div>
    </Card>
    <Card title="Machine-readable alert" sub="CAP 1.2 · status: Exercise" right={<button className="btn" onClick={dl}>Download CAP XML</button>}>
      <pre>{xml}</pre></Card>
    <Card title="Data sources"><p>IFS HRES (0.25°) · ERA5 baseline & surface (0.25°) · IBTrACS & IMERG Final</p></Card>
  </>)
}
