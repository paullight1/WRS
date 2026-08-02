import { Link } from 'react-router-dom'
import { SITE_WIDTH } from './Section.jsx'
import { Wordmark, focusRing } from './SiteNav.jsx'
import { footerLinks } from './content.js'

/* The footer is a landing strip, not a sitemap: the brand, the three actions
   worth taking from the bottom of the page, and the legal line. Everything the
   old columns held was either already in the sticky nav or behind a login. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[.07] py-9 sm:py-12 lg:py-16">
      <div className={SITE_WIDTH}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="max-w-[40ch]">
            <Wordmark />
            <p className="mt-2.5 text-body-sm text-on-surface-variant sm:text-body-md">
              Own a robot, make it more capable, and see what that ownership is producing.
            </p>
          </div>

          <nav aria-label="Get started">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 sm:flex-col sm:gap-2.5 sm:text-right">
              {footerLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className={`rounded-lg text-body-sm text-on-surface-variant transition-colors duration-fast hover:text-on-surface sm:text-body-md ${focusRing}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-1.5 border-t border-white/[.07] pt-5 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-7">
          <p className="text-label-sm text-outline">© {new Date().getFullYear()} World Robotic System.</p>
          <p className="text-label-sm text-outline">
            Prototype — figures are illustrative mock data, not performance claims.
          </p>
        </div>
      </div>
    </footer>
  )
}
