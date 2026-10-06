import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MantineProvider } from '@mantine/core'

const KEY = 'wrs-admin-theme'
const ThemeContext = createContext(null)

function readTheme() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme)
  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light'
      try { localStorage.setItem(KEY, next) } catch { /* Storage can be disabled; the in-memory choice still works. */ }
      return next
    })
  }, [])
  const value = useMemo(() => ({ theme, colorScheme: theme, toggleTheme }), [theme, toggleTheme])
  return (
    <ThemeContext.Provider value={value}>
      <MantineProvider forceColorScheme={theme}>
        <div className="admin-app" data-theme={theme} data-admin-theme={theme}>{children}</div>
      </MantineProvider>
    </ThemeContext.Provider>
  )
}

export function useAdminTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useAdminTheme must be used within AdminThemeProvider')
  return value
}
