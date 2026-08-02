import { useEffect, useRef, useState } from 'react'

/**
 * Fade-and-rise on first entry into the viewport. The page's only motion
 * beyond hover and the robot's turntable — one gesture, used consistently.
 *
 * With `prefers-reduced-motion: reduce` the content simply starts visible;
 * nothing animates and no observer is created.
 */
export default function Reveal({ children, delay = 0, as: As = 'div', className = '' }) {
  const host = useRef(null)
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(reduced)

  useEffect(() => {
    if (reduced || shown || !host.current) return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(host.current)
    return () => io.disconnect()
  }, [reduced, shown])

  return (
    <As
      ref={host}
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: shown ? 1 : 0,
              transform: shown ? 'none' : 'translateY(14px)',
              transition: `opacity 560ms var(--ease-out) ${delay}ms, transform 560ms var(--ease-out) ${delay}ms`,
            }
      }
    >
      {children}
    </As>
  )
}
