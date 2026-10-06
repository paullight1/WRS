import { Link } from 'react-router-dom'

import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Icon, ACCENTS } from '../components/ui.jsx'
import SiteNav, { focusRing } from '../components/site/SiteNav.jsx'
import SiteFooter from '../components/site/SiteFooter.jsx'
import SiteBackdrop from '../components/site/SiteBackdrop.jsx'
import Section, { SITE_WIDTH } from '../components/site/Section.jsx'
import Reveal from '../components/site/Reveal.jsx'
import CardArt from '../components/site/CardArt.jsx'
import Faq from '../components/site/Faq.jsx'
import { audienceGroups, hero, steps, valuePillars } from '../components/site/content.js'
import { industries, dataTasks, trainingModules, palettes } from '../data/mock.js'
import { defaultRobotConfig } from '../data/robotParts.js'

/* One rule for imagery on this page, after the icon-tile version read as noise:
   icons are for interaction affordances only (menu, chevron, arrow). Anything
   explanatory is a drawing; anything measurable is type. Nothing is decorated
   twice. */

/* Figures are counts of what the platform contains, computed from the same data
   the app renders — never performance or earnings claims. */
const stats = [
  { value: palettes.length, label: 'Robot palettes' },
  { value: industries.length, label: 'Deployment sectors' },
  { value: trainingModules.length, label: 'Training modules' },
  { value: dataTasks.length, label: 'Data task types' },
]

/* Card art is tinted per column so the two grids share one colour rhythm. */
const TASK_ACCENT = [ACCENTS.blue, ACCENTS.teal, ACCENTS.violet, ACCENTS.indigo, ACCENTS.orange, ACCENTS.green]

const ctaGhost = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 px-7 text-label-md text-on-surface transition-colors duration-fast hover:bg-white/[.06] ${focusRing}`
const ctaLight = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#ded4ec] px-7 text-label-md text-[#45218a] transition-colors duration-fast hover:bg-[#f1eafb] ${focusRing}`

/** Label, one supporting line, one figure. No icon — the figure is the signal. */
function DataRow({ title, sub, right, tone = 'dark' }) {
  const light = tone === 'light'
  return (
    <li className={`flex items-baseline gap-4 border-b py-4 ${light ? 'border-[#e8e1f1]' : 'border-white/[.07]'}`}>
      <span className="min-w-0 flex-1">
        <span className={`block text-title-sm ${light ? 'text-[#211b2d]' : 'text-on-surface'}`}>{title}</span>
        <span className={`mt-0.5 block text-body-sm ${light ? 'text-[#655d72]' : 'text-on-surface-variant'}`}>
          {sub}
        </span>
      </span>
      <span className={`tnum shrink-0 font-mono text-data-sm ${light ? 'text-[#756e80]' : 'text-outline'}`}>
        {right}
      </span>
    </li>
  )
}

/** One feature deep-dive: a short claim on one side, a real product surface on the other. */
function Feature({ eyebrow, title, body, children, flip = false, tone = 'dark' }) {
  const light = tone === 'light'
  return (
    <div
      className={`border-t py-16 first:border-t-0 sm:py-20 lg:py-28 ${light ? 'border-[#e8e1f1] bg-[#fbf9fe]' : 'border-white/[.07] bg-[#111417]'}`}
    >
      <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal className={flip ? 'lg:order-2' : undefined}>
          <p
            className={`mb-6 flex items-center gap-3 text-site-eyebrow ${light ? 'text-[#746b82]' : 'text-on-surface-variant'}`}
          >
            <span className={`h-px w-8 ${light ? 'bg-[#8c5acb]' : 'bg-primary/60'}`} />
            {eyebrow}
          </p>
          <h3
            className={`max-w-[26ch] text-pretty font-display text-site-h2 ${light ? 'text-[#211b2d]' : 'text-on-surface'}`}
          >
            {title}
          </h3>
          <p className={`mt-6 max-w-[52ch] text-site-body ${light ? 'text-[#655d72]' : 'text-on-surface-variant'}`}>
            {body}
          </p>
        </Reveal>
        <Reveal delay={80} className={flip ? 'lg:order-1' : undefined}>
          {children}
        </Reveal>
      </div>
    </div>
  )
}

/** Illustration above, then title, then one line. Used by both card grids. */
function ArtCard({ art, accent, title, sub, meta, index, tone = 'dark' }) {
  const light = tone === 'light'
  return (
    <div className={`flex h-full flex-col p-6 sm:p-7 ${light ? 'bg-white' : 'bg-[#111417]'}`}>
      <div
        className={`mb-7 overflow-hidden rounded-xl border px-5 pt-5 ${light ? 'border-[#ece6f3] bg-[#f8f5fc]' : 'border-white/[.07] bg-white/[.02]'}`}
      >
        <CardArt name={art} accent={accent} />
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={`font-display text-site-h3 ${light ? 'text-[#211b2d]' : 'text-on-surface'}`}>{title}</h3>
        {index != null && (
          <span className={`tnum font-mono text-data-sm ${light ? 'text-[#756e80]' : 'text-outline'}`}>{index}</span>
        )}
      </div>
      <p className={`mt-2 text-body-md ${light ? 'text-[#655d72]' : 'text-on-surface-variant'}`}>{sub}</p>
      {meta && <p className={`mt-4 text-label-sm ${light ? 'text-[#756e80]' : 'text-outline'}`}>{meta}</p>}
    </div>
  )
}

function ClosingCta() {
  const glyphs = 'WRSROBOTLEARNBUILDTRAINDEPLOYWORKREWARD'.split('')
  return (
    <section
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty('--matrix-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`)
        event.currentTarget.style.setProperty('--matrix-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`)
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty('--matrix-x', '50%')
        event.currentTarget.style.setProperty('--matrix-y', '50%')
      }}
      className="site-matrix relative isolate overflow-hidden bg-[#171224] px-5 py-20 text-center sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="site-matrix-grid absolute inset-0 grid grid-cols-10 content-center overflow-hidden px-2 sm:px-10"
      >
        {Array.from({ length: 120 }, (_, i) => (
          <span key={i} className="site-matrix-glyph" style={{ animationDelay: `${(i % 19) * -0.19}s` }}>
            {glyphs[(i * 11 + Math.floor(i / 10)) % glyphs.length]}
          </span>
        ))}
      </div>
      <Reveal className="relative z-10 mx-auto max-w-[760px] rounded-[28px] border border-white/10 bg-[#171224]/70 px-6 py-10 shadow-[0_28px_90px_rgba(0,0,0,.25)] backdrop-blur-sm sm:px-12 sm:py-14">
        <p className="mb-5 text-site-eyebrow text-[#c7b2ee]">Start building</p>
        <h2 className="mx-auto max-w-[18ch] text-pretty font-display text-site-display text-white">
          Build your robot.
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-pretty text-site-lead text-[#d1cbdc]">
          Create a robot, teach it new skills, and follow its progress from one place.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#8052d1] px-7 text-label-md font-semibold text-white shadow-[0_10px_28px_rgba(110,64,190,.3)] transition-colors hover:bg-[#9167dd]"
          >
            Get Started
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
          <Link to="/login" className={ctaGhost}>
            Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#111417]">
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
        <section
          id="top"
          className="relative isolate overflow-hidden bg-[#faf8fd] pb-14 pt-[100px] text-[#211b2d] sm:pt-[118px] lg:pb-20 lg:pt-[138px]"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 lg:hidden">
            <img
              src="/robot-ai-ownership-hero.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[72%_center] opacity-40"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#faf8fd] via-[#faf8fd]/85 to-[#faf8fd]/30" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#faf8fd]/5 via-transparent to-[#faf8fd]/90" />
          </div>
          <div className={`${SITE_WIDTH} relative z-10 grid items-center gap-9 lg:grid-cols-[1fr_0.88fr] lg:gap-12`}>
            <Reveal>
              <p className="mb-7 flex items-center gap-3 text-site-eyebrow text-[#746b82]">
                <span className="h-px w-8 bg-[#8959c6]" />
                Own <span className="text-[#a79ab8]">→</span> Train <span className="text-[#a79ab8]">→</span> Deploy{' '}
                <span className="text-[#a79ab8]">→</span> Earn
              </p>

              <h1 className="max-w-[18ch] text-pretty font-display text-site-display text-[#211b2d]">
                {hero.title.map((s, i) => (
                  <span key={i} className={i === 2 || i === 4 ? 'text-[#7441bf]' : i === 0 ? 'text-[#344fbd]' : ''}>
                    {s.t}
                  </span>
                ))}
              </h1>

              <p className="mt-6 max-w-[48ch] text-pretty text-site-lead text-[#625a70]">{hero.lead}</p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#6839bb] px-7 text-label-md text-white shadow-[0_10px_24px_rgba(104,57,187,.2)] transition-colors duration-fast hover:bg-[#51289d]"
                >
                  Get Started
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
                <a href="#how" className={ctaLight}>
                  How it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={120} className="relative mx-auto hidden w-full max-w-[470px] lg:block">
              <div className="overflow-hidden rounded-[28px] bg-[#eee8fa] shadow-[0_24px_64px_rgba(59,35,95,.12)]">
                <img
                  src="/robot-ai-ownership-hero.jpg"
                  alt="A white and purple WRS robot in a bright, connected city workspace"
                  className="aspect-[.94] w-full object-cover object-[61%_center] sm:aspect-[1.02] lg:aspect-[.88]"
                  fetchPriority="high"
                />
              </div>
              <div className="absolute bottom-4 left-4 rounded-xl border border-white/70 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-6">
                <p className="text-label-sm font-semibold text-[#332543]">Your robot. Your direction.</p>
                <p className="mt-0.5 text-label-sm text-[#746b82]">Build it, teach it, put it to work.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------- trust strip */}
        <div className="border-y border-[#e9e2f1] bg-white">
          <div className={`${SITE_WIDTH} grid grid-cols-2 lg:grid-cols-4`}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`py-7 lg:py-9 ${i % 2 === 1 ? 'border-l border-[#e9e2f1] pl-6' : ''} ${
                  i >= 2 ? 'border-t border-[#e9e2f1] lg:border-t-0' : ''
                } ${i > 0 ? 'lg:border-l lg:pl-8' : ''}`}
              >
                <p className="tnum font-display text-site-h2 text-[#3f2b59]">{s.value}</p>
                <p className="mt-1 text-body-sm text-[#746b82]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------- why WRS */}
        <Section
          tone="dark"
          eyebrow="Why WRS"
          title="Own the intelligence behind the work."
          lead="Create, train and deploy a robot, then follow its progress in one place."
        >
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {valuePillars.map((pillar, i) => (
              <Reveal as="li" key={pillar.title} delay={i * 35} className="h-full">
                <div className="h-full rounded-2xl border border-white/[.07] bg-[#191e23] p-5">
                  <span className="mb-7 grid h-11 w-11 place-items-center rounded-xl bg-[#7441bf]/15 text-[#b895ef]">
                    <Icon name={pillar.icon} className="text-[22px]" />
                  </span>
                  <h3 className="font-display text-title-md text-on-surface">{pillar.title}</h3>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Section>

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
        <div id="features" className="bg-[#111417]">
          <Feature
            tone="light"
            eyebrow="Customise"
            title="It should look like yours, because it is."
            body="Palette, face, parts and personality — changeable whenever you like."
          >
            {/* Side-by-side only from sm: at 375 the bust plus the palette
                  list overflows the viewport. */}
            <div className="grid items-center gap-5 sm:grid-cols-[minmax(180px,.85fr)_1fr] sm:gap-8">
              <Robot3D
                size={260}
                fill
                interactive
                config={defaultRobotConfig}
                label="A customisable WRS robot — drag to rotate"
                className="mx-auto w-full max-w-[270px]"
              />
              <ul className="border-t border-[#e8e1f1]">
                {palettes.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-4 border-b border-[#e8e1f1] py-3.5">
                    <span className="flex items-center gap-3">
                      <span className="flex">
                        {p.colors.map((c) => (
                          <span
                            key={c}
                            className="-ml-1.5 h-6 w-6 rounded-full border border-black/10 first:ml-0"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="text-title-sm text-[#332543]">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-label-sm text-[#756e80]">{p.state}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Feature>

          <Feature
            tone="dark"
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
            tone="light"
            eyebrow="Deploy"
            title="Then you put it to work."
            body="Pick a sector and watch the deployment run. Demand differs by sector and changes over time."
          >
            <ul className="border-t border-[#e8e1f1]">
              {industries.slice(0, 6).map((s) => (
                <DataRow key={s.name} title={s.name} sub={s.desc} right={s.demand} tone="light" />
              ))}
            </ul>
          </Feature>
        </div>

        {/* ---------------------------------------------------- audience fit */}
        <Section
          tone="light"
          eyebrow="Built for different kinds of builders"
          title="Start where you are. Grow from there."
        >
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {audienceGroups.map((group, i) => (
              <Reveal as="li" key={group.title} delay={i * 40} className="h-full">
                <div className="h-full rounded-2xl border border-[#e8e1f1] bg-white p-5 shadow-[0_12px_32px_rgba(55,35,100,.05)]">
                  <Icon name={group.icon} className="text-[28px] text-[#7441bf]" />
                  <h3 className="mt-7 font-display text-title-md text-[#211b2d]">{group.title}</h3>
                  <p className="mt-2 text-body-sm text-[#655d72]">{group.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Section>

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

        {/* ------------------------------------------------------------ FAQ */}
        <Section id="faq" tone="dark" eyebrow="Questions" title="Worth knowing before you start.">
          <Faq />
        </Section>

        {/* --------------------------------------------------- closing CTA */}
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  )
}
