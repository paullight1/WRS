import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button } from '../components/ui.jsx'

export default function DataContribution() {
  return (
    <AppShell title="Data Contribution" back avatar={false}>
      <StateView
        kind="empty"
        title="No published data tasks yet"
        desc="Demo task counts and XP estimates have been removed. You can submit supported AI training examples for review; XP is awarded only after a verified approval and an active reward rule."
        action={<Button to="/training">Open AI training</Button>}
      />
    </AppShell>
  )
}
