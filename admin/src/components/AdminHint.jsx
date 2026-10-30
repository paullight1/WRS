export default function AdminHint({ label, children }) {
  return (
    <details className="admin-hint">
      <summary
        role="button"
        aria-label={label}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement.contains(event.relatedTarget))
            event.currentTarget.parentElement.open = false
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.currentTarget.parentElement.open = false
        }}
      >
        <span aria-hidden="true">?</span>
      </summary>
      <div className="admin-hint-content">
        <strong>{label}</strong>
        <p>{children}</p>
      </div>
    </details>
  )
}
