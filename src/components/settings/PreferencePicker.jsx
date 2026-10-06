import { useId, useState } from 'react'

export default function PreferencePicker({ label, value, options, onChange, disabled = false }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const filtered = options.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div className="relative">
      <span id={`${id}-label`} className="mb-2 block text-body-sm text-on-surface-variant">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => {
          setOpen(!open)
          setQuery('')
        }}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.02] px-3 py-3 text-left text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span id={`${id}-value`}>{selected?.label || value || 'Choose a country'}</span>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          id={`${id}-options`}
          className="mt-2 rounded-xl border border-white/15 bg-surface p-2"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          <input
            autoFocus
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={`Search ${label.toLowerCase()}…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mb-2 min-h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-on-surface"
          />
          <div className="max-h-60 overflow-y-auto overscroll-contain" role="group" aria-label={`${label} options`}>
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value === option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-body-sm ${value === option.value ? 'bg-primary/20 text-on-surface' : 'text-on-surface-variant hover:bg-white/5'}`}
              >
                <span>{option.label}</span>
                <span className="ml-2 text-label-sm text-outline">{option.value}</span>
              </button>
            ))}
            {!filtered.length && <p className="p-3 text-body-sm text-outline">No matches. Try a name or code.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
