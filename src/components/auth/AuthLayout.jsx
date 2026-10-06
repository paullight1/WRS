import { Link } from 'react-router-dom'

export default function AuthLayout({ children, maxWidth = 'max-w-md' }) {
  return (
    <main
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f4fb] px-5 py-9 text-[#211a2d] sm:px-8"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% -12%, rgba(126, 82, 190, .14), transparent 48%), linear-gradient(180deg, #fbfaff 0%, #f4f1fa 100%)',
      }}
    >
      <div className={`relative z-10 w-full ${maxWidth}`}>
        <header className="mb-7 flex flex-col items-center">
          <Link
            to="/"
            className="inline-flex rounded-2xl border border-[#e7e0f0] bg-white/90 px-5 py-3 shadow-[0_10px_28px_rgba(51,30,83,.08)] transition hover:shadow-[0_14px_34px_rgba(51,30,83,.12)]"
            aria-label="World Robotic System home"
          >
            <img src="/wrs-logo-footer.png" alt="World Robotic System" className="h-auto w-[180px] max-w-full" />
          </Link>
          <span className="mt-3 text-label-md font-bold uppercase tracking-[.16em] text-[#6c43a5]">WRS account</span>
        </header>
        {children}
      </div>
    </main>
  )
}
