import { Icon } from '../ui.jsx'
import { focusRing } from './SiteNav.jsx'
import { faq } from './content.js'

/**
 * Native <details> rather than a custom accordion: keyboard behaviour,
 * screen-reader semantics and in-page find all work without any JS.
 */
export default function Faq() {
  return (
    <div className="mt-14 border-t border-white/[.07]">
      {faq.map((item) => (
        <details key={item.q} className="group border-b border-white/[.07]">
          <summary
            className={`flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-title text-on-surface transition-colors duration-fast hover:text-primary ${focusRing}`}
          >
            <span className="max-w-[52ch]">{item.q}</span>
            <Icon
              name="add"
              className="shrink-0 text-[22px] text-on-surface-variant transition-transform duration-slow ease-out group-open:rotate-45"
            />
          </summary>
          <p className="max-w-[68ch] pb-6 pr-10 text-site-body text-on-surface-variant">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
