export const Chip = ({ c, children }) => <span className="chip" style={{ background: c }}>{children}</span>
export const Card = ({ title, sub, right, children, cls = '' }) => (
  <section className={'card ' + cls}><div className="row"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{right}</div>{children}</section>)
