import AppShell from '../components/AppShell.jsx'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import { Badge, Button, Card, Icon, ListRow, SectionTitle } from '../components/ui.jsx'
import { packageDefinition } from '../domain/robot/packages.ts'

export default function Profile() {
  const auth = useAuth()
  const robotState = useRobot()
  const session = auth.session

  return (
    <AppShell title="Profile" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding text-center">
          <div className="relative flex flex-col items-center">
            <span className="grid h-[84px] w-[84px] place-items-center rounded-full bg-primary-container/35">
              <Icon name="person" className="text-[36px] text-on-surface" />
            </span>
            <h2 className="mt-3 font-headline-md text-headline-md text-on-surface">
              {auth.isDemo ? 'Demo account' : 'Verified WRS account'}
            </h2>
            <p className="max-w-full break-all font-data text-data-sm text-outline">User ID: {session?.userId || 'Unavailable'}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge t={session?.emailVerified ? 'tertiary' : 'outline'}>
                <Icon name={session?.emailVerified ? 'verified' : 'schedule'} className="text-[12px]" fill={session?.emailVerified} />
                Email {session?.emailVerified ? 'verified' : 'pending'}
              </Badge>
              <Badge t={session?.phoneVerified ? 'tertiary' : 'outline'}>Phone {session?.phoneVerified ? 'verified' : 'pending'}</Badge>
              <Badge t={session?.mfaEnabled ? 'secondary' : 'outline'}>MFA {session?.mfaEnabled ? 'enabled' : 'not enabled'}</Badge>
              <Badge t={session?.kycStatus === 'verified' ? 'primary' : 'outline'}>KYC {session?.kycStatus || 'unverified'}</Badge>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle action={robotState.robot ? 'View robot' : undefined} to={robotState.robot ? '/robot' : undefined}>
          Linked robot
        </SectionTitle>
        {robotState.robot ? (
          <Card className="flex items-center gap-4 p-4">
            <Robot3D size={72} config={robotState.configuration || undefined} label={`${robotState.robot.name}, linked robot`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-md text-on-surface">{robotState.robot.name}</p>
              <p className="text-label-sm text-outline">
                {packageDefinition(robotState.robot.packageSlug).robotClass} · {robotState.robot.lifecycle}
              </p>
              <p className="truncate font-data text-data-sm text-outline">{robotState.robot.publicVerificationId}</p>
            </div>
            <Icon name="chevron_right" className="text-outline" />
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-body-md text-on-surface-variant">{robotState.error || 'No robot has been provisioned for this account.'}</p>
            <Button to="/onboarding" size="sm" className="mt-3">Open onboarding</Button>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Account</SectionTitle>
        <div className="space-y-2">
          <ListRow icon="verified_user" t="tertiary" title="Verification status" subtitle="Email and phone are enforced by the authentication service" to="/settings" />
          <ListRow icon="security" t="secondary" title="Security" subtitle="Password recovery and two-factor authentication" to="/settings/security" />
          <ListRow icon="badge" t="primary" title="Robot passport" subtitle="Privacy-safe robot verification record" to="/robot/passport" />
          <ListRow icon="account_balance_wallet" t="primary" title="Wallet" subtitle="Ledger-owned balance and payouts" to="/wallet" />
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button to="/settings" variant="ghost" full icon="settings">Settings</Button>
        <Button to="/support" variant="ghost" full icon="help_outline">Support</Button>
      </div>
    </AppShell>
  )
}
