/**
 * The landing page's dark backdrop.
 *
 * Generated rather than photographic — the repo ships no imagery, and a
 * procedural backdrop costs nothing to download, never pixelates, and tints
 * itself from the brand palette.
 *
 * To use a real image or video instead, drop the file in `public/` and set
 * MEDIA below. Everything else keeps working: the media sits underneath the
 * same glow, mesh and vignette layers, so it reads as backdrop rather than
 * content. Video is muted, looping and inert, and is skipped entirely when
 * the visitor prefers reduced motion.
 *
 *   const MEDIA = { type: 'video', src: '/hero-bg.mp4', poster: '/hero-bg.jpg' }
 *   const MEDIA = { type: 'image', src: '/hero-bg.jpg' }
 */
const MEDIA = null

const reduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function SiteBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {MEDIA?.type === 'image' && (
        <img src={MEDIA.src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      {MEDIA?.type === 'video' && !reduced && (
        <video
          src={MEDIA.src}
          poster={MEDIA.poster}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
      )}
      {MEDIA?.type === 'video' && reduced && MEDIA.poster && (
        <img src={MEDIA.poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      )}

      {/* Brand glows — the only colour in the page's background. */}
      <div
        className="absolute -left-[10%] -top-[20%] h-[70vh] w-[70vw] rounded-full opacity-[.18] blur-[120px]"
        style={{ background: 'radial-gradient(circle, #2d5bff 0%, transparent 68%)' }}
      />
      <div
        className="absolute -right-[15%] top-[38%] h-[60vh] w-[55vw] rounded-full opacity-[.13] blur-[130px]"
        style={{ background: 'radial-gradient(circle, #00dbe7 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[25%] left-[20%] h-[55vh] w-[55vw] rounded-full opacity-[.10] blur-[140px]"
        style={{ background: 'radial-gradient(circle, #6f00be 0%, transparent 70%)' }}
      />

      {/* Engineering mesh, faded out toward the edges so it never draws a hard box. */}
      <div
        className="absolute inset-0 opacity-[.5]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, #000 30%, transparent 100%)',
        }}
      />

      {/* Vignette — settles the whole thing back to the app's surface colour. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 0%, transparent 30%, #111417 100%)' }}
      />
    </div>
  )
}
