import { useParams } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Button } from '../components/ui.jsx'

export default function DataTask() {
  const { slug } = useParams()
  return (
    <AppShell title="Data task" back avatar={false}>
      <StateView
        kind="empty"
        title="This task is not published"
        desc={`“${slug || 'This task'}” is not part of the server-approved task catalogue. No response or XP can be created here.`}
        action={<Button to="/training">View available training</Button>}
      />
    </AppShell>
  )
}
