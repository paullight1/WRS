import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button } from '../components/ui.jsx'

export default function Notifications() {
  return (
    <AppShell title="Notifications" back avatar={false}>
      <StateView
        kind="empty"
        title="No live notification feed yet"
        desc="There are no server-backed notifications to show. New robot, referral, training, and reward activity will appear here once the notification service is connected."
        action={<Button to="/home">Go to dashboard</Button>}
      />
    </AppShell>
  )
}
