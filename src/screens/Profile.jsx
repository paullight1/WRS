import AppShell, { UserAvatar } from '../components/AppShell.jsx'
import RobotAvatar from '../components/RobotAvatar.jsx'
import { Badge, Button, Card, Icon, ListRow, SectionTitle } from '../components/ui.jsx'
import { user, robot } from '../data/mock.js'

export default function Profile() {
  return (
    <AppShell title="Profile" back avatar={false}>
      <section>
        <Card className="relative overflow-hidden p-card-padding text-center">
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-primary-container/20 blur-[70px]" />
          <div className="relative flex flex-col items-center">
            <UserAvatar size={84} />
            <h2 className="mt-3 font-headline-md text-[21px] font-bold text-on-surface">{user.name}</h2>
            <p className="font-label-sm text-label-sm text-outline">WRS ID: {user.wrsId}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge t="tertiary">
                <Icon name="verified" className="text-[12px]" fill /> Verified
              </Badge>
              <Badge t="primary">{user.package}</Badge>
              <Badge t="outline">{user.country}</Badge>
            </div>
            <p className="mt-3 text-label-sm font-label-sm text-outline">Member since {user.memberSince}</p>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle action="View robot" to="/robot">
          Linked robot
        </SectionTitle>
        <Card className="flex items-center gap-4 p-4">
          <RobotAvatar size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-md text-on-surface">{robot.name}</p>
            <p className="text-label-sm font-label-sm text-outline">
              Level {robot.level} · {robot.xp.toLocaleString()} XP · {robot.status}
            </p>
          </div>
          <Icon name="chevron_right" className="text-outline" />
        </Card>
      </section>

      <section>
        <SectionTitle>Account</SectionTitle>
        <div className="space-y-2">
          <ListRow icon="person" t="primary" title="Personal details" subtitle="Name, email, phone, country" to="/settings" />
          <ListRow icon="verified_user" t="tertiary" title="Verification status" subtitle="Email, phone and identity" to="/settings" />
          <ListRow icon="security" t="secondary" title="Security" subtitle="Password and 2FA" to="/settings" />
          <ListRow icon="account_balance_wallet" t="primary" title="Wallet" subtitle="Balance and payouts" to="/wallet" />
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button to="/settings" variant="ghost" full icon="settings">
          Settings
        </Button>
        <Button to="/support" variant="ghost" full icon="help_outline">
          Support
        </Button>
      </div>
    </AppShell>
  )
}
