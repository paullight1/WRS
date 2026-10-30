import '../../admin/src/styles.css'
import Operations from '../../admin/src/screens/Operations.jsx'
import { AdminThemeProvider } from '../../admin/src/theme/AdminThemeProvider.jsx'

export default function AdminOperationsProduction() {
  return (
    <AdminThemeProvider>
      <Operations />
    </AdminThemeProvider>
  )
}
