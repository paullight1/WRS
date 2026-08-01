import { Link } from 'react-router-dom'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Atmosphere } from '../components/AppShell.jsx'
import { Button, Icon } from '../components/ui.jsx'

const pillars = [
  { icon: 'smart_toy', label: 'Robotics' },
  { icon: 'memory', label: 'AI' },
  { icon: 'analytics', label: 'Data' },
  { icon: 'trending_up', label: 'Opportunity' },
]

export default function Splash() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between px-margin-page py-12 text-center">
      <Atmosphere />

      <header className="mt-6 flex w-full max-w-md flex-col items-center">
        <span className="mb-6 grid h-16 w-16 animate-float place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <Icon name="language" className="text-[36px] text-primary drop-shadow-[0_0_18px_rgba(45,91,255,.7)]" fill />
        </span>
        <h1 className="font-headline-lg text-[30px] font-extrabold uppercase leading-tight tracking-tight text-on-surface sm:text-[36px]">
          World Robotic <span className="text-primary">System</span>
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">Own a Robot. Own the Future.</p>
      </header>

      <section className="relative flex w-full flex-1 items-center justify-center py-8">
        <div className="relative grid aspect-square w-full max-w-[320px] place-items-center">
          <div className="absolute inset-6 animate-breathe rounded-full bg-primary-container/25 blur-[60px]" />
          <div className="glass relative grid h-full w-full place-items-center overflow-hidden rounded-full">
            <div className="absolute inset-0 rounded-full border border-tertiary/20" />
            <RobotAvatar size={250} className="animate-float" />
          </div>
          <span className="glass absolute -right-2 top-4 grid h-14 w-14 animate-float place-items-center rounded-full">
            <Icon name="precision_manufacturing" className="text-tertiary" />
          </span>
          <span
            className="glass absolute -left-3 bottom-10 grid h-12 w-12 animate-float place-items-center rounded-full"
            style={{ animationDelay: '1.2s' }}
          >
            <Icon name="database" className="text-secondary text-[20px]" />
          </span>
        </div>
      </section>

      <footer className="w-full max-w-sm">
        <p className="mb-6 text-body-md leading-relaxed text-outline">
          Join the next generation of robotics, artificial intelligence, and human-powered data creation.
        </p>

        <div className="mb-8 flex items-center justify-center gap-5">
          {pillars.map((p, i) => (
            <div key={p.label} className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-1 opacity-60">
                <Icon name={p.icon} className="text-[18px]" />
                <span className="text-[10px] font-label-sm uppercase tracking-wider">{p.label}</span>
              </div>
              {i < pillars.length - 1 && <span className="h-8 w-px bg-outline-variant" />}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button to="/register" full size="lg" trailingIcon="arrow_forward">
            Get Started
          </Button>
          <Button to="/login" variant="ghost" full size="lg">
            Login
          </Button>
          <Link
            to="/register"
            className="mt-2 inline-block border-b border-primary/30 pb-0.5 text-label-sm font-label-sm text-primary transition-colors hover:text-tertiary"
          >
            Create New Account
          </Link>
        </div>
      </footer>
    </div>
  )
}
