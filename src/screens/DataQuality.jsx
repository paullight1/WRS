import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button } from '../components/ui.jsx'

export default function DataQuality() {
  return (
    <AppShell title="Contribution Quality" back avatar={false}>
      <StateView
        kind="empty"
        title="No verified quality score yet"
        desc="Quality scores and contributor levels will appear after reviewed submissions are available."
        action={<Button to="/training">View training contributions</Button>}
      />
    </AppShell>
  )
}
