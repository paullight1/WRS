import { Outlet } from 'react-router-dom'
import '../application.css'

// Vite waits for this route's stylesheet before rendering the outlet.
export default function ApplicationStyles() {
  return <Outlet />
}
