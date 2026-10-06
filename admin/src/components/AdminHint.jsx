export default function AdminHint({ label, children }) {
  return <details className="admin-hint" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') event.currentTarget.open = false
  }}>
    <summary aria-label={label}><span aria-hidden="true">?</span></summary>
    <div className="admin-hint-content"><strong>{label}</strong><p>{children}</p></div>
  </details>
}
