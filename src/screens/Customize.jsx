import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Badge, Button, Card, Icon, SectionTitle, Toast } from '../components/ui.jsx'
import { personalities, palettes, robot } from '../data/mock.js'

const eyeFor = (name) =>
  ({ 'Oceania Flow': '#00dbe7', 'Neon Genesis': '#ddb7ff', 'Empire Gold': '#ffd700', 'Deep Carbon': '#8e90a2' })[name] ||
  '#00dbe7'

export default function Customize() {
  const [attrs, setAttrs] = useState({ speed: 92, battery: 78, sensor: 64 })
  const [pers, setPers] = useState(robot.personality)
  const [palette, setPalette] = useState('Oceania Flow')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const sliders = [
    { key: 'speed', label: 'Processing Speed' },
    { key: 'battery', label: 'Battery Optimization' },
    { key: 'sensor', label: 'Sensor Sensitivity' },
  ]

  return (
    <AppShell title="Customization" back avatar={false} wide>
      <div className="grid gap-section-gap lg:grid-cols-[300px_1fr_300px]">
        {/* --------------------------------------------------- configuration */}
        <div className="space-y-gutter-stack lg:order-1">
          <Card className="space-y-5 p-card-padding">
            <p className="text-label-sm font-label-sm uppercase tracking-widest text-outline">Configuration</p>

            <div>
              <p className="mb-2 text-label-sm font-label-sm text-on-surface-variant">Model Framework</p>
              <button className="flex w-full items-center justify-between rounded-xl border border-tertiary/30 bg-tertiary/5 px-4 py-3">
                <span className="font-headline-md text-[15px] text-on-surface">WRS Phantom v2</span>
                <Icon name="expand_more" className="text-tertiary" />
              </button>
            </div>

            <div className="space-y-5">
              {sliders.map((s) => (
                <div key={s.key}>
                  <div className="mb-2 flex justify-between text-label-sm font-label-sm">
                    <span className="text-on-surface-variant">{s.label}</span>
                    <span className="text-tertiary">{attrs[s.key]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={attrs[s.key]}
                    onChange={(e) => setAttrs({ ...attrs, [s.key]: +e.target.value })}
                    className="range-wrs"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-card-padding">
            <p className="mb-4 text-label-sm font-label-sm uppercase tracking-widest text-outline">Personality</p>
            <div className="grid grid-cols-2 gap-2">
              {personalities.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPers(p.name)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-label-sm font-label-sm transition-all ${
                    pers === p.name
                      ? 'bg-primary-container text-white'
                      : 'border border-white/10 bg-white/5 text-on-surface-variant hover:bg-white/10'
                  }`}
                >
                  <Icon name={p.icon} className="text-[16px]" />
                  {p.name}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* -------------------------------------------------------- viewport */}
        <div className="lg:order-2">
          <Card className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden p-card-padding">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
              <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-tertiary/10 blur-[60px]" />
            </div>

            <RobotAvatar size={240} eye={eyeFor(palette)} className="relative animate-float" />

            <div className="relative mt-6 flex flex-wrap justify-center gap-2">
              {[
                { icon: 'settings_input_component', label: 'Parts', t: 'tertiary' },
                { icon: 'palette', label: 'Colors', t: 'primary' },
                { icon: 'record_voice_over', label: 'Voice', t: 'secondary' },
                { icon: 'rocket_launch', label: 'Model', t: 'outline' },
              ].map((h) => (
                <button
                  key={h.label}
                  className="glass flex items-center gap-2 rounded-full px-4 py-2 text-label-sm font-label-sm text-on-surface-variant transition-all hover:border-white/30"
                >
                  <Icon name={h.icon} className="text-[18px]" />
                  {h.label}
                </button>
              ))}
            </div>

            <div className="relative mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="ghost" icon="visibility">
                Preview Changes
              </Button>
              <Button icon="save" onClick={save}>
                Save Robot
              </Button>
            </div>
          </Card>
        </div>

        {/* --------------------------------------------------------- palettes */}
        <div className="space-y-gutter-stack lg:order-3">
          <Card className="p-card-padding">
            <p className="mb-4 text-label-sm font-label-sm uppercase tracking-widest text-outline">Color Palettes</p>
            <div className="space-y-2">
              {palettes.map((p) => {
                const locked = p.state.startsWith('Locked')
                const active = palette === p.name
                return (
                  <button
                    key={p.name}
                    disabled={locked}
                    onClick={() => setPalette(p.name)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-all ${
                      active ? 'border-tertiary/40 bg-tertiary/5' : 'border-white/5 hover:bg-white/5'
                    } ${locked ? 'opacity-50' : ''}`}
                  >
                    <span className="flex -space-x-2">
                      {p.colors.map((c) => (
                        <span
                          key={c}
                          className="h-8 w-8 rounded-full border-2 border-background"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-md font-label-md text-on-surface">{p.name}</span>
                      <span className={`block text-[10px] ${active ? 'text-tertiary' : 'text-outline'}`}>
                        {active ? 'Applied' : p.state}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="p-card-padding">
            <p className="mb-4 text-label-sm font-label-sm uppercase tracking-widest text-outline">Recent Upgrades</p>
            <div className="space-y-2">
              {[
                { icon: 'memory', label: 'Quantum Core v1.4', t: 'tertiary' },
                { icon: 'sensors', label: 'LIDAR 360 Gen-4', t: 'secondary' },
              ].map((u) => (
                <div key={u.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5">
                  <Icon name={u.icon} className={u.t === 'tertiary' ? 'text-tertiary' : 'text-secondary'} />
                  <span className="text-label-sm font-label-sm text-on-surface-variant">{u.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <SectionTitle className="!mb-0">Applied setup</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Badge t="primary">{pers}</Badge>
        <Badge t="tertiary">{palette}</Badge>
        <Badge t="secondary">Speed {attrs.speed}%</Badge>
        <Badge t="outline">Sensors {attrs.sensor}%</Badge>
      </div>

      <Toast show={saved} message="Robot configuration saved" />
    </AppShell>
  )
}
