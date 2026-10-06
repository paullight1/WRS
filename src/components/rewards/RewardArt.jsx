/** Small, decorative reward illustrations; no external assets or animation costs. */
export default function RewardArt({ kind = 'xp', className = '' }) {
  return (
    <svg viewBox="0 0 120 100" className={className} fill="none" aria-hidden="true">
      {kind === 'referral' ? (
        <>
          <path d="M32 46h56" stroke="#00dbe7" strokeWidth="2" strokeDasharray="4 5" opacity=".5" />
          <circle cx="28" cy="31" r="13" fill="#263554" stroke="#8fa9ff" strokeWidth="2" />
          <path d="M9 69v-6c0-12 9-19 19-19s19 7 19 19v6" fill="#1b2947" stroke="#8fa9ff" strokeWidth="2" />
          <circle cx="92" cy="31" r="13" fill="#163f43" stroke="#00dbe7" strokeWidth="2" />
          <path d="M73 69v-6c0-12 9-19 19-19s19 7 19 19v6" fill="#133033" stroke="#00dbe7" strokeWidth="2" />
          <circle cx="60" cy="69" r="23" fill="#172f38" stroke="#00dbe7" strokeWidth="2" />
          <path d="m60 53 4.4 9 9.9 1.5-7.1 6.9 1.7 9.8-8.9-4.6-8.9 4.6 1.7-9.8-7.1-6.9 9.9-1.5z" fill="#00dbe7" />
        </>
      ) : (
        <>
          <path d="m42 12 18 13 18-13 3 32H39z" fill="#25375a" stroke="#7395ff" strokeWidth="2" />
          <path d="m60 31 25 15v29L60 90 35 75V46z" fill="#13343b" stroke="#00dbe7" strokeWidth="2" />
          <path d="m60 44 5.5 11 12 1.7-8.7 8.5 2 12-10.8-5.7-10.8 5.7 2-12-8.7-8.5 12-1.7z" fill="#00dbe7" />
          <path d="M17 40v10m-5-5h10m78 19v10m-5-5h10" stroke="#8fa9ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="96" cy="29" r="3" fill="#00dbe7" opacity=".6" />
        </>
      )}
    </svg>
  )
}
