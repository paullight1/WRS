import { createContext, useContext } from 'react'

const ThemeContext = createContext(null)
const lightTheme = { theme: 'light', colorScheme: 'light' }

export function AdminThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={lightTheme}>
      <div className="admin-app" data-theme="light" data-admin-theme="light">
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useAdminTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useAdminTheme must be used within AdminThemeProvider')
  return value
}
