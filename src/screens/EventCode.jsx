import { useEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Disclosure, Icon, SectionTitle, Toast } from '../components/ui.jsx'

const LEN = 9 // WRS + 6 digits
const PREFIX = 'WRS'

/* Neon ticket illustration — pure SVG so the screen ships no image assets. */
function TicketArt() {
  return (
    <svg viewBox="0 0 260 130" className="mx-auto w-full max-w-[280px]" role="img" aria-label="Event ticket">
      <defs>
        <linearGradient id="tk-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00dbe7" />
          <stop offset="55%" stopColor="#6f00be" />
          <stop offset="100%" stopColor="#ff5f9e" />
        </linearGradient>
        <linearGradient id="tk-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(45,91,255,.22)" />
          <stop offset="100%" stopColor="rgba(10,14,22,.6)" />
        </linearGradient>
        <radialGradient id="tk-glow">
          <stop offset="0%" stopColor="rgba(0,219,231,.45)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <ellipse cx="130" cy="70" rx="112" ry="52" fill="url(#tk-glow)" />
      <g transform="rotate(-6 130 65)">
        <path
          d="M30 26h130l40 22v46a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10z"
          fill="url(#tk-body)"
          stroke="url(#tk-edge)"
          strokeWidth="2.5"
        />
        <path d="M160 26l40 22h-40z" fill="rgba(255,95,158,.35)" stroke="url(#tk-edge)" strokeWidth="2" />
        <line x1="150" y1="34" x2="150" y2="96" stroke="url(#tk-edge)" strokeWidth="2" strokeDasharray="5 6" />
        <path
          d="M92 44l6.8 13.8 15.2 2.2-11 10.7 2.6 15.1L92 78.7 78.4 85.8 81 70.7l-11-10.7 15.2-2.2z"
          fill="#00dbe7"
          opacity=".9"
        >
          <animate attributeName="opacity" values=".55;1;.55" dur="2.6s" repeatCount="indefinite" />
        </path>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={166 + i * 8} y={56} width="3.5" height="28" rx="1.75" fill="#ddb7ff" opacity={0.5 + i * 0.12} />
        ))}
      </g>
    </svg>
  )
}

export default function EventCode() {
  const [left, setLeft] = useState(465)
  const [chars, setChars] = useState(() => PREFIX.split('').concat(Array(LEN - PREFIX.length).fill('')))
  const [toast, setToast] = useState('')
  const [tToneErr, setTToneErr] = useState(false)
  const refs = useRef([])

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')} : ${String(left % 60).padStart(2, '0')}`
  const filled = chars.every(Boolean)

  const setAt = (i, v) => {
    const next = [...chars]
    next[i] = v.slice(-1).toUpperCase()
    setChars(next)
    if (v && i < LEN - 1) refs.current[i + 1]?.focus()
  }

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LEN)
    if (!text) return
    e.preventDefault()
    const next = Array(LEN).fill('')
    text.split('').forEach((ch, i) => (next[i] = ch))
    setChars(next)
    refs.current[Math.min(text.length, LEN - 1)]?.focus()
  }

  const submit = () => {
    const expired = left === 0
    setTToneErr(expired || !filled)
    setToast(expired ? 'This code has expired' : filled ? 'Code accepted — +250 XP applied' : 'Enter all 9 characters')
    setTimeout(() => setToast(''), 2400)
  }

  return (
    <AppShell title="Enter Event Code" back avatar={false}>
      <section>
        <Card className="p-card-padding text-center">
          <TicketArt />

          <p className="mt-5 text-body-md leading-relaxed text-on-surface-variant">
            Enter the code you received during
            <br />
            <span className="font-semibold text-on-surface">the meeting or event</span>
          </p>

          {/* ------------------------------------------------- code boxes */}
          <div className="mt-6 flex items-center justify-center gap-1.5 sm:gap-2" onPaste={onPaste}>
            {chars.map((ch, i) => (
              <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                <input
                  ref={(el) => (refs.current[i] = el)}
                  value={ch}
                  inputMode={i < PREFIX.length ? 'text' : 'numeric'}
                  onChange={(e) => setAt(i, e.target.value)}
                  onKeyDown={(e) => onKey(i, e)}
                  onFocus={(e) => e.target.select()}
                  aria-label={`Code character ${i + 1}`}
                  className={`h-12 w-[9vw] max-w-[38px] rounded-xl border bg-black/40 text-center font-data text-[17px] font-bold uppercase tracking-normal text-on-surface outline-none transition-all sm:w-9 ${
                    ch
                      ? 'border-tertiary/60 shadow-[0_0_14px_rgba(0,219,231,.25)]'
                      : 'border-outline-variant focus:border-tertiary'
                  }`}
                />
                {i === PREFIX.length - 1 && <span className="text-[18px] text-outline">–</span>}
              </div>
            ))}
          </div>

          <p className="mt-5 text-label-sm text-outline">
            Code expires in{' '}
            <span className={`text-label-md ${left < 60 ? 'text-error' : 'text-tertiary'}`}>{mmss}</span>
          </p>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[.03] px-4 py-3">
            <p className="text-label-sm text-outline">You will earn</p>
            <p className="mt-1 flex items-center justify-center gap-2 font-headline-md text-headline-md text-on-surface">
              <span className="text-success">+250 XP</span>
              <Icon name="rocket_launch" className="text-[18px] text-tertiary" fill />
              <span className="text-label-md text-on-surface-variant">and boost your robot</span>
            </p>
          </div>

          <Button full size="lg" className="mt-5" onClick={submit} disabled={left === 0}>
            Submit Code
          </Button>

          <button className="mt-3 text-label-sm text-outline underline-offset-4 hover:text-tertiary hover:underline">
            Where do I get a code?
          </button>
        </Card>
      </section>

      <section>
        <SectionTitle>Reward breakdown</SectionTitle>
        <Card className="divide-y divide-white/8">
          {[
            ['bolt', 'XP', '+250 XP'],
            ['stars', 'Points', '+250 pts'],
            ['rocket_launch', 'Robot boost', 'Speed +5% / 24h'],
            ['military_tech', 'Badge progress', 'Event Regular 3/5'],
            ['event_available', 'Participation record', 'Logged to passport'],
          ].map(([icon, k, v]) => (
            <div key={k} className="flex items-center gap-3 px-5 py-3.5">
              <Icon name={icon} className="text-[20px] text-tertiary" fill />
              <span className="flex-1 text-body-md text-on-surface-variant">{k}</span>
              <span className="text-label-md text-on-surface">{v}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Security rules</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {[
            'Active 5–10 minutes',
            'One claim per verified account',
            'Device + account verification',
            'Duplicate claims blocked',
            'Invalid attempts monitored',
            'Admin-generated codes only',
          ].map((r) => (
            <Badge key={r} t="outline">
              {r}
            </Badge>
          ))}
        </div>
      </section>

      <Disclosure icon="shield">
        Event codes confirm attendance only. Repeated invalid attempts may temporarily lock code entry on your account.
      </Disclosure>

      <Toast show={!!toast} message={toast} t={tToneErr ? 'error' : 'tertiary'} icon={tToneErr ? 'error' : 'check_circle'} />
    </AppShell>
  )
}
