import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext(null)
const lightTheme = { theme: 'light' }

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.dataset.theme = 'light'
  }, [])

  return <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
