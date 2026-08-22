import { Link } from 'react-router-dom'

import Robot3D from '../components/robot3d/Robot3D.jsx'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Icon, ACCENTS } from '../components/ui.jsx'
import SiteNav, { focusRing } from '../components/site/SiteNav.jsx'
import SiteFooter from '../components/site/SiteFooter.jsx'
import SiteBackdrop from '../components/site/SiteBackdrop.jsx'
import Section, { SITE_WIDTH } from '../components/site/Section.jsx'
import Reveal from '../components/site/Reveal.jsx'
import CardArt from '../components/site/CardArt.jsx'
import Faq from '../components/site/Faq.jsx'
import { hero, steps } from '../components/site/content.js'
import { packages, industries, dataTasks, trainingModules, palettes } from '../data/mock.js'
import { defaultRobotConfig } from '../data/robotParts.js'

/* One rule for imagery on this page, after the icon-tile version read as noise:
   icons are for interaction affordances only (menu, chevron, arrow). Anything
   explanatory is a drawing; anything measurable is type. Nothing is decorated
   twice. */

/* Figures are counts of what the platform contains, computed from the same data
   the app renders — never performance or earnings claims. */
const stats = [
  { value: packages.length, label: 'Ownership tiers' },
  { value: industries.length, label: 'Deployment sectors' },
  { value: trainingModules.length, label: 'Training modules' },
  { value: dataTasks.length, label: 'Data task types' },
]

/* Card art is tinted per column so the two grids share one colour rhythm. */
const TASK_ACCENT = [ACCENTS.blue, ACCENTS.teal, ACCENTS.violet, ACCENTS.indigo, ACCENTS.orange, ACCENTS.green]

/* One colour per tier, ascending. `tint` is vivid and only ever fills or draws
   an edge; `ink` is the light variant and is the only one that carries text —
   the vivid values are tuned for contrast against white, not against #111417. */
const TIERS = [
  { tint: '#2f6bff', ink: '#b8c3ff' },
  { tint: '#8b2fd6', ink: '#ddb7ff' },
  { tint: '#0f8fa0', ink: '#00dbe7' },
  { tint: '#128b57', ink: '#3ddc97' },
  { tint: '#b07d00', ink: '#f7c948' },
  { tint: '#d81b7a', ink: '#ff9ec7' },
]

const ctaPrimary = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-container px-7 text-label-md text-white transition-colors duration-fast hover:bg-[#2450e6] active:bg-[#1f47cc] ${focusRing}`
const ctaGhost = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 px-7 text-label-md text-on-surface transition-colors duration-fast hover:bg-white/[.06] ${focusRing}`

/** Label, one supporting line, one figure. No icon — the figure is the signal. */
function DataRow({ title, sub, right }) {
  return (
    <li className="flex items-baseline gap-4 border-b border-white/[.07] py-4">
      <span className="min-w-0 flex-1">
        <span className="block text-title-sm text-on-surface">{title}</span>
        <span className="mt-0.5 block text-body-sm text-on-surface-variant">{sub}</span>
      </span>
      <span className="tnum shrink-0 font-mono text-data-sm text-outline">{right}</span>
    </li>
  )
}

/** One feature deep-dive: a short claim on one side, a real product surface on the other. */
function Feature({ eyebrow, title, body, children, flip = false }) {
  return (
    <div className="grid items-center gap-12 border-t border-white/[.07] py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
      <Reveal className={flip ? 'lg:order-2' : undefined}>
        <p className="mb-6 flex items-center gap-3 text-site-eyebrow text-on-surface-variant">
          <span className="h-px w-8 bg-primary/60" />
          {eyebrow}
        </p>
        <h3 className="max-w-[26ch] text-pretty font-display text-site-h2 text-on-surface">{title}</h3>
        <p className="mt-6 max-w-[52ch] text-site-body text-on-surface-variant">{body}</p>
      </Reveal>
      <Reveal delay={80} className={flip ? 'lg:order-1' : undefined}>
        {children}
      </Reveal>
    </div>
  )
}

/** Illustration above, then title, then one line. Used by both card grids. */
function ArtCard({ art, accent, title, sub, meta, index }) {
  return (
    <div className="flex h-full flex-col bg-background/80 p-6 sm:p-7">
      <div className="mb-7 overflow-hidden rounded-xl border border-white/[.07] bg-white/[.02] px-5 pt-5">
        <CardArt name={art} accent={accent} />
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-site-h3 text-on-surface">{title}</h3>
        {index != null && <span className="tnum font-mono text-data-sm text-outline">{index}</span>}
      </div>
      <p className="mt-2 text-body-md text-on-surface-variant">{sub}</p>
      {meta && <p className="mt-4 text-label-sm text-outline">{meta}</p>}
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteBackdrop />

      <a
        href="#main"
        className="sr-only rounded-xl bg-primary-container px-4 py-3 text-label-md text-white focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-toast"
      >
        Skip to content
      </a>

      <SiteNav />

      <main id="main">
        {/* ------------------------------------------------------------ hero */}
        <section id="top" className="pb-16 pt-[124px] lg:pb-24 lg:pt-[152px]">
          <div className={`${SITE_WIDTH} grid items-center gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16`}>
            <Reveal>
              <p className="mb-7 text-site-eyebrow text-on-surface-variant">Own → Train → Deploy → Earn</p>

              <h1 className="max-w-[20ch] text-pretty font-display text-site-display text-on-surface">
                {hero.title.map((s, i) => (
                  <span key={i} className={s.c}>
                    {s.t}
                  </span>
                ))}
              </h1>

              <p className="mt-6 max-w-[52ch] text-pretty text-site-lead text-on-surface-variant">{hero.lead}</p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/register" className={ctaPrimary}>
                  Get Started
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
                <a href="#how" className={ctaGhost}>
                  How it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={120} className="flex flex-col items-center">
              <Robot3D
                size={440}
                fill
                interactive
                config={defaultRobotConfig}
                label="A World Robotic System robot — drag to rotate"
                className="w-full"
              />
              <p className="mt-2 text-label-sm text-outline">Drag to rotate</p>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------- trust strip */}
        <div className="border-y border-white/[.07]">
          <div className={`${SITE_WIDTH} grid grid-cols-2 lg:grid-cols-4`}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`py-7 lg:py-9 ${i % 2 === 1 ? 'border-l border-white/[.07] pl-6' : ''} ${
                  i >= 2 ? 'border-t border-white/[.07] lg:border-t-0' : ''
                } ${i > 0 ? 'lg:border-l lg:pl-8' : ''}`}
              >
                <p className="tnum font-display text-site-h2 text-on-surface">{s.value}</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------- how it works */}
        <Section id="how" divide={false} eyebrow="How it works" title="One loop. Six steps.">
          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.06] sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 40} className="h-full">
                <ArtCard
                  art={s.art}
                  accent={s.accent}
                  title={s.title}
                  sub={s.body}
                  index={String(i + 1).padStart(2, '0')}
                />
              </Reveal>
            ))}
          </ol>
        </Section>

        {/* ------------------------------------------------------- features */}
        <div id="features" className="border-t border-white/[.07]">
          <div className={SITE_WIDTH}>
            <Feature
              eyebrow="Customise"
              title="It should look like yours, because it is."
              body="Palette, face, parts and personality — changeable whenever you like."
            >
              {/* Side-by-side only from sm: at 375 the bust plus the palette
                  list overflows the viewport. */}
              <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
                <RobotAvatar size={180} eye={palettes[0].colors[1]} glow={false} className="mx-auto sm:mx-0" />
                <ul className="border-t border-white/[.07]">
                  {palettes.map((p) => (
                    <li
                      key={p.name}
                      className="flex items-center justify-between gap-4 border-b border-white/[.07] py-3.5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex">
                          {p.colors.map((c) => (
                            <span
                              key={c}
                              className="-ml-1.5 h-6 w-6 rounded-full border border-white/15 first:ml-0"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </span>
                        <span className="text-title-sm text-on-surface">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-label-sm text-outline">{p.state}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Feature>

            <Feature
              flip
              eyebrow="Train"
              title="Teaching it is the whole game."
              body="Short modules you can finish on a phone. Every session moves a level you can see."
            >
              <ul className="border-t border-white/[.07]">
                {trainingModules.map((m) => (
                  <DataRow key={m.slug} title={m.title} sub={m.desc} right={`${m.progress}%`} />
                ))}
              </ul>
            </Feature>

            <Feature
              eyebrow="Deploy"
              title="Then you put it to work."
              body="Pick a sector and watch the deployment run. Demand differs by sector and changes over time."
            >
              <ul className="border-t border-white/[.07]">
                {industries.slice(0, 6).map((s) => (
                  <DataRow key={s.name} title={s.name} sub={s.desc} right={s.demand} />
                ))}
              </ul>
            </Feature>
          </div>
        </div>

        {/* ------------------------------------------------------ data grid */}
        <Section eyebrow="Contribute" title="Work your robot can do for the data it learns from.">
          <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.06] sm:grid-cols-2 lg:grid-cols-3">
            {dataTasks.map((t, i) => (
              <Reveal as="li" key={t.slug} delay={i * 30} className="h-full">
                <ArtCard
                  art={t.slug}
                  accent={TASK_ACCENT[i % TASK_ACCENT.length]}
                  title={t.title}
                  sub={t.cat}
                  meta={`${t.xp} XP · ${t.time}`}
                />
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* ------------------------------------------------------- packages */}
        <Section
          id="packages"
          eyebrow="Packages"
          title="Every tier buys capability, not a promised return."
          lead="A package sets your robot's class and what it is allowed to do."
        >
          {/* On a phone this stays a list. Six tinted cards stacked is six
              screens of scrolling for a comparison people make by scanning
              names and prices — the cards only earn their space once they can
              sit side by side. */}
          <ul className="mt-10 border-t border-white/[.07] sm:hidden">
            {packages.map((p, i) => {
              const c = TIERS[i % TIERS.length]
              return (
                <Reveal as="li" key={p.slug} delay={i * 30}>
                  <Link
                    to={`/packages/${p.slug}`}
                    className={`flex items-center gap-3.5 border-b border-white/[.07] py-4 ${focusRing}`}
                  >
                    <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: c.tint }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-title-sm" style={{ color: c.ink }}>
                        {p.name}
                      </span>
                      <span className="mt-0.5 block truncate text-body-sm text-on-surface-variant">{p.robotClass}</span>
                    </span>
                    <span className="tnum shrink-0 font-mono text-data-md text-on-surface">${p.price}</span>
                    <Icon name="chevron_right" className="shrink-0 text-outline" />
                  </Link>
                </Reveal>
              )
            })}
          </ul>

          <ul className="mt-12 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p, i) => {
              const c = TIERS[i % TIERS.length]
              return (
                <Reveal as="li" key={p.slug} delay={i * 40} className="h-full">
                  <Link
                    to={`/packages/${p.slug}`}
                    className={`group flex h-full flex-col rounded-2xl border p-6 transition-colors duration-fast ${focusRing}`}
                    style={{ backgroundColor: `${c.tint}14`, borderColor: `${c.tint}4d` }}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-site-h3" style={{ color: c.ink }}>
                        {p.name}
                      </span>
                      <span className="tnum font-mono text-data-sm text-outline">{String(i + 1).padStart(2, '0')}</span>
                    </span>

                    <span className="mt-4 flex items-baseline gap-1.5">
                      <span className="tnum font-display text-site-h2 text-on-surface">${p.price}</span>
                      <span className="text-label-sm text-on-surface-variant">one-off</span>
                    </span>

                    <span
                      className="mt-4 w-fit rounded-md px-2 py-1 text-label-sm"
                      style={{ backgroundColor: `${c.tint}2e`, color: c.ink }}
                    >
                      {p.robotClass}
                    </span>

                    <span className="mt-4 text-body-md text-on-surface-variant">{p.bestFor}</span>

                    <span className="mt-5 block h-px w-full" style={{ backgroundColor: `${c.tint}3d` }} />

                    <ul className="mt-4 space-y-2">
                      {p.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-body-sm text-on-surface-variant">
                          <span
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: c.ink }}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <span
                      className="mt-auto flex items-center gap-1.5 pt-6 text-label-md transition-transform duration-fast group-hover:translate-x-0.5"
                      style={{ color: c.ink }}
                    >
                      View package
                      <Icon name="arrow_forward" className="text-[17px]" />
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </ul>
          <Reveal delay={80}>
            <p className="mt-7 max-w-[64ch] text-body-sm text-outline">
              Prices are one-off package costs. Nothing here is an offer of investment, and no earnings are guaranteed.
            </p>
            <Link
              to="/packages"
              className={`mt-6 inline-flex items-center gap-2 rounded-lg text-label-md text-primary hover:underline ${focusRing}`}
            >
              Compare all packages
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </Reveal>
        </Section>

        {/* ------------------------------------------------------------ FAQ */}
        <Section id="faq" eyebrow="Questions" title="Worth knowing before you start.">
          <Faq />
        </Section>

        {/* --------------------------------------------------- closing CTA */}
        <Section divide className="text-center">
          <Reveal>
            <div className="mx-auto mb-8 w-fit">
              <RobotAvatar size={96} eye="#00dbe7" glow={false} />
            </div>
            <h2 className="mx-auto max-w-[18ch] text-pretty font-display text-site-display text-on-surface">
              Build your robot.
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-pretty text-site-lead text-on-surface-variant">
              Six steps, and you have a working robot before you spend anything.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/register" className={ctaPrimary}>
                Get Started
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
              <Link to="/login" className={ctaGhost}>
                Sign in
              </Link>
            </div>
          </Reveal>
        </Section>
      </main>

      <SiteFooter />
    </div>
  )
}
