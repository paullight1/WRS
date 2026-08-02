import Reveal from './Reveal.jsx'

/** Shared page width. Every band on the landing page aligns to this. */
export const SITE_WIDTH = 'mx-auto w-full max-w-[1120px] px-5 sm:px-8'

/**
 * One band of the landing page: page width, vertical rhythm, and the single
 * hairline that separates it from the band above. That hairline is the only
 * ornament on this page — no cards, no gradients, no glass.
 */
export default function Section({ id, eyebrow, title, lead, children, divide = true, className = '' }) {
  return (
    <section
      id={id}
      className={`${divide ? 'border-t border-white/[.07]' : ''} py-24 lg:py-40 ${className}`}
    >
      <div className={SITE_WIDTH}>
        {(eyebrow || title || lead) && (
          <Reveal>
            {eyebrow && (
              <p className="mb-6 flex items-center gap-3 text-site-eyebrow text-on-surface-variant">
                <span className="h-px w-8 bg-primary/60" />
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="max-w-[30ch] text-pretty font-display text-site-h2 text-on-surface">{title}</h2>
            )}
            {lead && <p className="mt-6 max-w-[64ch] text-site-lead text-on-surface-variant">{lead}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  )
}
