import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Badge, Button, Card, GradIcon, Icon, SectionTitle, Toast } from '../components/ui.jsx'
import { personalities, palettes, robot } from '../data/mock.js'
import { defaultParts, defaultTuning, modules } from '../data/robotParts.js'

/* Extra palettes beyond the shared mock set, so the colour tab feels alive. */
const EXTRA_PALETTES = [
  { name: 'Solar Flare', colors: ['#ffa63d', '#e0611a', '#2b1405'], state: 'Owned' },
  { name: 'Verdant Core', colors: ['#4ade80', '#15803d', '#08160e'], state: 'Owned' },
]

const CATEGORIES = [
  { key: 'Parts', icon: 'settings_input_component', from: '#57c9ff', to: '#1f6fd0' },
  { key: 'Colors', icon: 'palette', from: '#ff5f9e', to: '#c62368' },
  { key: 'Voice', icon: 'record_voice_over', from: '#0fd6b0', to: '#0a7f8c' },
  { key: 'Traits', icon: 'psychology', from: '#a78bfa', to: '#6d28d9' },
]

const VOICES = [
  { name: 'David — Custom EN/YO', tag: 'Your voice', icon: 'graphic_eq', from: '#0fd6b0', to: '#0a7f8c' },
  { name: 'Sonora Calm', tag: 'Marketplace', icon: 'spa', from: '#57c9ff', to: '#1f6fd0' },
  { name: 'Command Bold', tag: 'Owned', icon: 'campaign', from: '#ffa63d', to: '#e0611a' },
  { name: 'Aria Warm', tag: 'Locked — LVL 32', icon: 'lock', from: '#8e90a2', to: '#4b4f60' },
]

const SLIDERS = [
  { key: 'speed', label: 'Processing Speed', color: '#00dbe7' },
  { key: 'battery', label: 'Battery Optimization', color: '#4ade80' },
  { key: 'sensor', label: 'Sensor Sensitivity', color: '#ff5f9e' },
]

export default function Customize() {
  const [cat, setCat] = useState('Parts')
  const [attrs, setAttrs] = useState(defaultTuning)
  const [pers, setPers] = useState(robot.personality)
  const [palette, setPalette] = useState('Oceania Flow')
  const [parts, setParts] = useState(defaultParts)
  const [module, setModule] = useState('head')
  const [voice, setVoice] = useState(robot.voiceProfile)
  const [saved, setSaved] = useState(false)
  const [grabbed, setGrabbed] = useState(false)

  const allPalettes = [...palettes, ...EXTRA_PALETTES]

  /* What the 3D robot renders. Everything the user touches feeds this object. */
  const config = { palette, parts, personality: pers, tuning: attrs }

  const activeModule = modules.find((m) => m.key === module)
  const optionName = (m) => m.options.find((o) => o.id === parts[m.key])?.name

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <AppShell title="Customize Robot" subtitle={`${robot.name} · ${robot.unit}`} back avatar={false}>
      {/* -------------------------------------------------------- viewport */}
      <section>
        <Card className="relative flex flex-col items-center overflow-hidden p-card-padding">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-8 top-6 h-[2px] animate-scan bg-tertiary/40" />
          </div>

          <div onPointerDown={() => setGrabbed(true)}>
            <Robot3D
              size={260}
              config={config}
              highlight={cat === 'Parts' ? module : null}
              interactive
              className="relative"
              label={`${robot.name}, live preview`}
            />
          </div>

          <p
            className={`relative -mt-2 flex items-center gap-1.5 text-label-sm text-outline transition-opacity duration-slow ${
              grabbed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <Icon name="360" className="text-[16px]" />
            Drag to rotate
          </p>

          <div className="relative mt-3 flex flex-wrap justify-center gap-2">
            <Badge t="primary">{pers}</Badge>
            <Badge t="tertiary">{palette}</Badge>
            <Badge t="outline">{activeModule ? optionName(activeModule) : ''}</Badge>
          </div>
        </Card>
      </section>

      {/* ----------------------------------------------------- category bar */}
      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((c) => {
          const active = cat === c.key
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`surface flex flex-col items-center gap-2 rounded-2xl px-2 py-3 transition-all active:scale-[.97] ${
                active ? 'border-white/30 bg-white/[.06]' : 'hover:border-white/20'
              }`}
            >
              <GradIcon
                icon={c.icon}
                from={c.from}
                to={c.to}
                size={38}
                radius={12}
                className={active ? '' : 'opacity-70 grayscale-[.35]'}
              />
              <span className={`text-[11px] ${active ? 'text-on-surface' : 'text-outline'}`}>{c.key}</span>
            </button>
          )
        })}
      </div>

      {/* -------------------------------------------------------------- parts */}
      {cat === 'Parts' && (
        <>
          <section>
            <SectionTitle action={`${modules.length} modules`}>Robot parts</SectionTitle>
            <div className="space-y-2">
              {modules.map((m) => {
                const active = module === m.key
                return (
                  <div
                    key={m.key}
                    className={`surface rounded-2xl transition-all ${
                      active ? 'border-tertiary/50 bg-tertiary/[.06]' : 'hover:border-white/25'
                    }`}
                  >
                    <button
                      onClick={() => setModule(m.key)}
                      aria-expanded={active}
                      className="flex w-full items-center gap-3.5 p-3.5 text-left transition-transform active:scale-[.99]"
                    >
                      <GradIcon icon={m.icon} from={m.from} to={m.to} size={44} radius={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-md font-medium text-on-surface">{m.name}</span>
                        <span className="block truncate text-label-sm text-outline">{optionName(m)}</span>
                      </span>
                      <Icon
                        name={active ? 'expand_less' : 'chevron_right'}
                        className={active ? 'text-tertiary' : 'text-outline'}
                      />
                    </button>

                    {/* Variants rebuild the model as you tap, so the choice is
                        never abstract — you see the part before you commit. */}
                    {active && (
                      <div className="flex gap-2 overflow-x-auto px-3.5 pb-3.5">
                        {m.options.map((o) => {
                          const on = parts[m.key] === o.id
                          return (
                            <button
                              key={o.id}
                              onClick={() => setParts({ ...parts, [m.key]: o.id })}
                              aria-pressed={on}
                              className={`min-w-[7.5rem] flex-1 rounded-xl border p-2.5 text-left transition-colors duration-fast ${
                                on
                                  ? 'border-tertiary/60 bg-tertiary/12'
                                  : 'border-white/12 bg-white/[.03] hover:border-white/25'
                              }`}
                            >
                              <span className={`block truncate text-label-md ${on ? 'text-tertiary' : 'text-on-surface'}`}>
                                {o.name}
                              </span>
                              <span className="mt-0.5 block truncate text-label-sm text-outline">{o.desc}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle>Performance tuning</SectionTitle>
            <Card className="space-y-5 p-card-padding">
              {SLIDERS.map((s) => (
                <div key={s.key}>
                  <div className="mb-2 flex justify-between text-label-sm">
                    <span className="text-on-surface-variant">{s.label}</span>
                    <span style={{ color: s.color }}>{attrs[s.key]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={attrs[s.key]}
                    onChange={(e) => setAttrs({ ...attrs, [s.key]: +e.target.value })}
                    className="range-wrs"
                    style={{ accentColor: s.color }}
                  />
                </div>
              ))}
            </Card>
          </section>
        </>
      )}

      {/* ------------------------------------------------------------ colours */}
      {cat === 'Colors' && (
        <section>
          <SectionTitle action={`${allPalettes.length} palettes`}>Colour palettes</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {allPalettes.map((p) => {
              const locked = p.state.startsWith('Locked')
              const active = palette === p.name
              return (
                <button
                  key={p.name}
                  disabled={locked}
                  onClick={() => setPalette(p.name)}
                  className={`surface flex w-full items-center gap-4 rounded-2xl p-3.5 text-left transition-all active:scale-[.99] ${
                    active ? 'border-tertiary/50 bg-tertiary/[.06]' : 'hover:border-white/25'
                  } ${locked ? 'opacity-45' : ''}`}
                >
                  <span className="flex -space-x-2.5">
                    {p.colors.map((c) => (
                      <span
                        key={c}
                        className="h-9 w-9 rounded-full border-2 border-background"
                        style={{ background: c, boxShadow: `0 4px 14px -4px ${c}` }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md font-medium text-on-surface">{p.name}</span>
                    <span className={`block text-label-sm ${active ? 'text-tertiary' : 'text-outline'}`}>
                      {active ? 'Applied' : p.state}
                    </span>
                  </span>
                  {locked && <Icon name="lock" className="text-[18px] text-outline" />}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- voice */}
      {cat === 'Voice' && (
        <>
          <section>
            <SectionTitle action="Trained">Voice profile</SectionTitle>
            <div className="space-y-2">
              {VOICES.map((v) => {
                const locked = v.tag.startsWith('Locked')
                const active = voice === v.name
                return (
                  <button
                    key={v.name}
                    disabled={locked}
                    onClick={() => setVoice(v.name)}
                    className={`surface flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all active:scale-[.99] ${
                      active ? 'border-tertiary/50 bg-tertiary/[.06]' : 'hover:border-white/25'
                    } ${locked ? 'opacity-45' : ''}`}
                  >
                    <GradIcon icon={v.icon} from={v.from} to={v.to} size={44} radius={14} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-md font-medium text-on-surface">{v.name}</span>
                      <span className="block truncate text-label-sm text-outline">{v.tag}</span>
                    </span>
                    <Icon name={active ? 'volume_up' : 'play_circle'} className={active ? 'text-tertiary' : 'text-outline'} />
                  </button>
                )
              })}
            </div>
          </section>

          <Button to="/training/voice" variant="tonal" full icon="mic">
            Record More Voice Data
          </Button>
        </>
      )}

      {/* ------------------------------------------------------------- traits */}
      {cat === 'Traits' && (
        <section>
          <SectionTitle>Personality</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {personalities.map((p) => {
              const active = pers === p.name
              return (
                <button
                  key={p.name}
                  onClick={() => setPers(p.name)}
                  className={`surface flex flex-col items-center gap-2 rounded-2xl px-3 py-4 transition-all active:scale-[.98] ${
                    active ? 'border-primary/60 bg-primary-container/20' : 'hover:border-white/25'
                  }`}
                >
                  <Icon name={p.icon} className={`text-[26px] ${active ? 'text-primary' : 'text-outline'}`} fill={active} />
                  <span className={`text-label-md ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {p.name}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ actions */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="ghost" full icon="visibility">
          Preview Changes
        </Button>
        <Button full icon="save" onClick={save}>
          Save Robot
        </Button>
      </div>

      <Toast show={saved} message="Robot configuration saved" />
    </AppShell>
  )
}
