import { Link } from 'react-router-dom'

import RobotAvatar from '../components/RobotAvatar.jsx'
import { Icon, ACCENTS } from '../components/ui.jsx'
import SiteNav, { focusRing } from '../components/site/SiteNav.jsx'
import SiteFooter from '../components/site/SiteFooter.jsx'
import SiteBackdrop from '../components/site/SiteBackdrop.jsx'
import Section, { SITE_WIDTH } from '../components/site/Section.jsx'
import Reveal from '../components/site/Reveal.jsx'
import CardArt from '../components/site/CardArt.jsx'
import Faq from '../components/site/Faq.jsx'
import { audienceGroups, hero, insights, steps, valuePillars } from '../components/site/content.js'
import { industries, dataTasks, trainingModules } from '../data/mock.js'

/* One rule for imagery on this page, after the icon-tile version read as noise:
   icons are for interaction affordances only (menu, chevron, arrow). Anything
   explanatory is a drawing; anything measurable is type. Nothing is decorated
   twice. */

/* Card art is tinted per column so the two grids share one colour rhythm. */
const TASK_ACCENT = [ACCENTS.blue, ACCENTS.teal, ACCENTS.violet, ACCENTS.indigo, ACCENTS.orange, ACCENTS.green]

const ctaPrimary = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-container px-7 text-label-md text-white transition-colors duration-fast hover:brightness-95 active:brightness-90 ${focusRing}`
const ctaGhost = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-outline-variant/40 px-7 text-label-md text-on-surface transition-colors duration-fast hover:bg-primary/10 ${focusRing}`

/** Label, one supporting line, one figure. No icon — the figure is the signal. */
function DataRow({ title, sub, right, compact = false }) {
  return (
    <li className={compact ? 'flex min-h-[92px] items-baseline gap-4 rounded-2xl border border-outline-variant/20 bg-surface/70 p-4' : 'flex items-baseline gap-4 border-b border-outline-variant/20 py-4'}>
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
    <div className="flex h-full flex-col rounded-2xl border border-outline-variant/30 bg-white/75 p-4 shadow-[0_12px_32px_rgba(55,35,100,.08)] dark:bg-surface-container-low/80 sm:p-5">
      <div className="mb-5 overflow-hidden rounded-xl border border-outline-variant/20 bg-white/70 px-4 pt-4 dark:bg-white/[.03]">
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

function BrandedImage({ src, alt, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low ${className}`}>
      <img src={src} alt={alt} className="block h-full w-full object-cover" />
      <img
        src="/wrs-logo-footer.png"
        alt=""
        aria-hidden="true"
        className="absolute left-4 top-4 w-24 rounded-lg bg-white/75 p-2 backdrop-blur-sm sm:left-5 sm:top-5 sm:w-28"
      />
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
        <section id="top" className="relative overflow-hidden pb-16 pt-[156px] lg:pb-24 lg:pt-[152px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-[center_top] bg-no-repeat opacity-[.15] mix-blend-multiply dark:opacity-[.2] dark:mix-blend-screen md:hidden"
            style={{ backgroundImage: "url('/robot-ai-ownership-hero.png')" }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--surface-0)]/35 via-transparent to-[var(--surface-0)] md:hidden" />
          <div className={`${SITE_WIDTH} grid items-center gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16`}>
            <Reveal>
              <p className="mb-7 text-site-eyebrow font-semibold text-on-surface-variant">Build → Train → Deploy → Earn</p>

              <h1 className="max-w-[15ch] text-pretty font-display text-site-display font-bold tracking-[-0.035em] text-on-surface">
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

            <Reveal delay={120} className="relative hidden flex-col items-center md:flex">
              <div className="relative overflow-hidden rounded-[2rem] border border-outline-variant/20 bg-surface-container-low shadow-[0_24px_80px_rgba(109,68,184,.16)]">
                <BrandedImage
                  src="/robot-ai-ownership-hero.png"
                  alt="White and graphite AI robot in a connected robotics atrium"
                  className="aspect-[4/5] w-full max-w-[440px]"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------- value pillars */}
        <Section tone="soft" eyebrow="Why WRS" title="Own the intelligence behind the work." lead="WRS brings creation, training, deployment, and approved rewards into one place.">
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {valuePillars.map((pillar, i) => (
              <Reveal as="li" key={pillar.title} delay={i * 35} className="h-full">
                <div className="h-full rounded-2xl border border-outline-variant/25 bg-white/80 p-5 shadow-[0_12px_32px_rgba(55,35,100,.07)] dark:bg-surface-container-low/80">
                  <div className="mb-8 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon name={pillar.icon} className="text-[22px]" />
                  </div>
                  <h3 className="font-display text-title-md text-on-surface">{pillar.title}</h3>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* --------------------------------------------------- how it works */}
        <Section id="how" divide={false} tone="lavender" eyebrow="How it works" title="One loop. Six steps.">
          <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div id="features" className="border-t border-outline-variant/20">
          <div className={SITE_WIDTH}>
            <Feature
              eyebrow="Own intelligence"
              title="Your first AI employee."
              body="Give your robot a direction, then build useful capability around the work you want it to take on."
            >
              <BrandedImage
                src="/robot-ai-employee.png"
                alt="AI robot working with holographic task panels"
                className="aspect-[3/2]"
              />
            </Feature>

            <Feature
              flip
              eyebrow="Train it"
              title="Teach it to do more."
              body="Short modules build the skills your robot needs before it takes on digital work."
            >
              <div className="space-y-6">
                <BrandedImage src="/robot-training-lab.png" alt="AI robot learning in a robotics training lab" className="h-48 sm:h-56" />
                <ul className="grid gap-2 sm:grid-cols-2">
                {trainingModules.map((m) => (
                  <DataRow key={m.slug} title={m.title} sub={m.desc} right={`${m.progress}%`} compact />
                ))}
                </ul>
              </div>
            </Feature>

            <Feature
              eyebrow="Deploy it"
              title="Send it where work is waiting."
              body="Pick a sector, start a deployment, and monitor the work as your robot runs."
            >
              <div className="space-y-6">
                <BrandedImage src="/robot-deployment-city.png" alt="AI robot deployed in an automated logistics environment" className="h-48 sm:h-56" />
                <ul className="grid gap-2 sm:grid-cols-2">
                {industries.slice(0, 6).map((s) => (
                  <DataRow key={s.name} title={s.name} sub={s.desc} right={s.demand} compact />
                ))}
                </ul>
              </div>
            </Feature>
          </div>
        </div>

        {/* ------------------------------------------------------ audience fit */}
        <Section tone="soft" eyebrow="Built for more than one kind of owner" title="Start where you are. Grow from there.">
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {audienceGroups.map((group, i) => (
              <Reveal as="li" key={group.title} delay={i * 40} className="h-full">
                <div className="h-full rounded-2xl border border-outline-variant/25 bg-background/70 p-5">
                  <Icon name={group.icon} className="text-[28px] text-primary" />
                  <h3 className="mt-7 font-display text-title-md text-on-surface">{group.title}</h3>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{group.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* ------------------------------------------------------ data grid */}
        <Section tone="soft" eyebrow="Contribute" title="Work your robot can do for the data it learns from.">
          <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        <Section
          id="packages"
          eyebrow="Get started"
          title="Start for free."
          lead="Create your account and start building your robot."
          tone="accent"
        >
          <Reveal>
            <div className="mt-10 grid max-w-3xl overflow-hidden rounded-3xl border border-primary/25 bg-surface/65 sm:grid-cols-[.8fr_1.2fr]">
              <img src="/robot-deployment-purple.png" alt="World Robotic System robot ready for deployment" className="h-52 w-full object-cover sm:h-full" />
              <div className="p-6 sm:p-8">
                <p className="font-display text-site-h2 text-on-surface">Free</p>
                <p className="mt-3 text-body-md text-on-surface-variant">Get to know WRS and make your robot your own.</p>
                <Link to="/register" className={`mt-7 ${ctaPrimary}`}>
                  Get started for free
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
              </div>
            </div>
          </Reveal>
        </Section>

        {/* ---------------------------------------------------------- insights */}
        <Section id="insights" tone="soft" eyebrow="Insights" title="Ideas for the ownership economy." lead="A clearer way to think about building, training, and putting AI to work.">
          <BrandedImage
            src="/robot-editorial-portrait.png"
            alt="Close-up portrait of a white and graphite AI robot"
            className="mb-10 h-64 max-w-2xl sm:h-80"
          />
          <ul className="mt-12 grid gap-3 lg:grid-cols-3">
            {insights.map((article, i) => (
              <Reveal as="li" key={article.title} delay={i * 50} className="h-full">
                <article className="flex h-full flex-col rounded-2xl border border-outline-variant/25 bg-white/80 p-6 shadow-[0_12px_32px_rgba(55,35,100,.06)] dark:bg-surface-container-low/80">
                  <p className="text-site-eyebrow text-primary">{article.category}</p>
                  <h3 className="mt-6 font-display text-site-h3 text-on-surface">{article.title}</h3>
                  <p className="mt-3 flex-1 text-body-md text-on-surface-variant">{article.excerpt}</p>
                  <p className="mt-7 text-label-sm text-outline">{article.time}</p>
                </article>
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* ------------------------------------------------------------ FAQ */}
        <Section id="faq" tone="soft" eyebrow="Questions" title="Worth knowing before you start.">
          <Faq />
        </Section>

        {/* --------------------------------------------------- closing CTA */}
        <Section divide className="text-center">
          <Reveal>
            <div className="mx-auto mb-8 w-fit">
              <RobotAvatar size={96} eye="#00dbe7" glow={false} />
            </div>
            <h2 className="mx-auto max-w-[18ch] text-pretty font-display text-site-display text-on-surface">
              The future belongs to owners, not just users.
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-pretty text-site-lead text-on-surface-variant">
              Create your first robot and put intelligence to work with a clearer path from idea to deployment.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/register" className={ctaGhost}>
                Create your account
              </Link>
            </div>
          </Reveal>
        </Section>
      </main>

      <SiteFooter />
    </div>
  )
}
