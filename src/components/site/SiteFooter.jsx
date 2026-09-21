import { Link } from 'react-router-dom'
import { SITE_WIDTH } from './Section.jsx'
import { focusRing } from './SiteNav.jsx'
import { footerLinks } from './content.js'
import { Icon } from '../ui.jsx'
import { useTheme } from '../ThemeProvider.jsx'

/* The footer is a landing strip, not a sitemap: the brand, the three actions
   worth taking from the bottom of the page, and the legal line. Everything the
   old columns held was either already in the sticky nav or behind a login. */
export default function SiteFooter() {
  const { theme, toggleTheme } = useTheme()

  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-low py-9 sm:py-12 lg:py-16">
      <div className={SITE_WIDTH}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="max-w-[40ch]">
            <img src="/wrs-logo-footer.png" alt="World Robotics System" className="h-auto w-[210px] max-w-full" />
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

        <div className="mt-8 flex flex-col gap-5 border-t border-outline-variant/20 pt-5 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-7">
          <p className="text-label-sm text-outline">© {new Date().getFullYear()} World Robotic System.</p>
          <button
            type="button"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            onClick={toggleTheme}
            className={`inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-outline-variant/40 px-3 text-label-sm text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary sm:self-auto ${focusRing}`}
          >
            <Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} className="text-[18px]" />
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </div>
    </footer>
  )
}
