import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui.jsx'
import { SITE_WIDTH } from './Section.jsx'
import { navLinks } from './content.js'

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function Wordmark({ className = '' }) {
  return <img src="/wrs-logo-footer.png" alt="World Robotic System" className={`block h-auto w-[124px] ${className}`} />
}

/**
 * Sticky light header, with a subtle shadow once the page moves beneath it.
 */
export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The mobile sheet is the only thing that can lock scroll, and only while open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-nav border-b transition-colors duration-slow ease-out ${
        scrolled || open
          ? 'border-[#ebe5f5] bg-white/95 shadow-[0_4px_24px_rgba(45,31,73,.06)] backdrop-blur-md'
          : 'border-transparent bg-white'
      }`}
    >
      <div className={`${SITE_WIDTH} flex h-[68px] items-center justify-between gap-6`}>
        <a href="#top" className={`rounded-lg ${focusRing}`} onClick={() => setOpen(false)}>
          <Wordmark className="w-[112px] sm:w-[132px]" />
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-lg text-label-md text-[#665c76] transition-colors duration-fast hover:text-[#45218a] ${focusRing}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={`hidden min-h-[44px] items-center rounded-xl px-4 text-label-md text-[#665c76] transition-colors duration-fast hover:text-[#45218a] sm:inline-flex ${focusRing}`}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl bg-[#6839bb] px-4 text-label-md text-white shadow-[0_8px_20px_rgba(104,57,187,.2)] transition-colors duration-fast hover:bg-[#51289d] sm:px-5 ${focusRing}`}
          >
            Get Started
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className={`grid h-11 w-11 place-items-center rounded-xl border border-[#e7e1ef] text-[#332543] transition-colors duration-fast hover:bg-[#f7f3fc] lg:hidden ${focusRing}`}
          >
            <Icon name={open ? 'close' : 'menu'} className="text-[22px]" />
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="border-t border-[#eee9f5] bg-white lg:hidden">
          <nav aria-label="Sections" className={`${SITE_WIDTH} flex flex-col py-2`}>
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-[52px] items-center rounded-lg text-title text-[#665c76] transition-colors duration-fast hover:text-[#45218a] ${focusRing}`}
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className={`flex min-h-[52px] items-center rounded-lg text-title text-[#665c76] transition-colors duration-fast hover:text-[#45218a] ${focusRing} sm:hidden`}
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
