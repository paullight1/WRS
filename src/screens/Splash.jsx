import { Link } from 'react-router-dom'
import { Button, Icon } from '../components/ui.jsx'

/**
 * Swap this for a photo/render (e.g. '/hero-robot.jpg') — nothing else
 * needs to change; the layer below is already full-bleed and cover-fitted.
 */
const HERO = '/hero-robot.svg'

const pillars = ['Robotics', 'AI', 'Data', 'Opportunity']

export default function Splash() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ------------------------------------------------ fullscreen hero */}
      <img
        src={HERO}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />

      {/* bottom scrim so the copy and actions stay legible over the image */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%]"
        style={{
          backgroundImage:
            'linear-gradient(to top, #111417 0%, rgba(17,20,23,.94) 26%, rgba(17,20,23,.72) 48%, rgba(17,20,23,.28) 74%, rgba(17,20,23,0) 100%)',
        }}
      />
      {/* light top scrim to seat the wordmark */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ backgroundImage: 'linear-gradient(to bottom, rgba(17,20,23,.85), rgba(17,20,23,0))' }}
      />

      {/* ----------------------------------------------------- foreground */}
      <div className="relative flex min-h-screen flex-col justify-between px-margin-page pb-10 pt-14 text-center">
        <header className="flex flex-col items-center">
          <h1 className="font-headline-lg text-headline-lg font-extrabold uppercase leading-tight tracking-tight text-on-surface sm:text-[34px]">
            World Robotic <span className="text-primary">System</span>
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">Own a Robot. Own the Future.</p>
        </header>

        <footer className="mx-auto w-full max-w-sm">
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Join the next generation of robotics, artificial intelligence, and human-powered data creation.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            {pillars.map((p, i) => (
              <div key={p} className="flex items-center gap-3">
                <span className="text-label-sm text-outline">{p}</span>
                {i < pillars.length - 1 && <span className="h-1 w-1 rounded-full bg-outline/60" />}
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <Link
              to="/register"
              className="flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-label-md font-bold text-white transition-all active:scale-[.97]"
              style={{
                backgroundImage: 'linear-gradient(135deg, #2d5bff 0%, #6f00be 100%)',
                boxShadow: '0 12px 30px -12px rgba(45,91,255,.9)',
              }}
            >
              Get Started
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>

            <Button to="/login" variant="ghost" full size="lg">
              Login
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
