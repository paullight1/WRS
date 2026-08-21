import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { useRobot } from '../components/robot/RobotProvider.jsx'
import Robot3D from '../components/robot3d/Robot3D.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Icon, SectionTitle } from '../components/ui.jsx'

export default function RobotPassport() {
  const robotState = useRobot()
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let active = true
    robotState
      .loadPassport()
      .then((value) => {
        if (!active) return
        setPassport(value)
        setError(value ? '' : 'No passport is available for this robot.')
      })
      .catch((reason) => {
        if (!active) return
        setPassport(null)
        setError(
          reason instanceof Error ? reason.message : 'Robot passport could not be verified.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [robotState.robot?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (robotState.loading || loading) {
    return (
      <AppShell title="Robot Passport" back avatar={false}>
        <StateView
          kind="loading"
          title="Verifying robot passport"
          desc="Reading the current authoritative identity projection."
        />
      </AppShell>
    )
  }

  if (!passport) {
    return (
      <AppShell title="Robot Passport" back avatar={false}>
        <StateView
          kind="locked"
          title="Robot passport unavailable"
          desc={
            error ||
            robotState.error ||
            'Complete robot provisioning before requesting a passport.'
          }
          action={
            <Button to={robotState.robot ? '/robot' : '/onboarding'}>
              {robotState.robot ? 'Back to robot' : 'Complete onboarding'}
            </Button>
          }
        />
      </AppShell>
    )
  }

  const exportPdf = async () => {
    if (!passport.authoritative) return
    setExporting(true)
    setError('')
    try {
      const descriptor = await robotState.exportPassportPdf()
      if (!descriptor?.url) {
        throw new Error('The passport export service did not return a signed PDF URL.')
      }
      window.location.assign(descriptor.url)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Passport PDF export failed.')
    } finally {
      setExporting(false)
    }
  }

  const rows = [
    ['Robot ID', passport.robotId],
    ['Robot Name', passport.name],
    ['Robot Class', passport.robotClass],
    ['Package', passport.packageSlug],
    ['Lifecycle', passport.lifecycle],
    ['Activation Date', new Date(passport.activationDate).toLocaleDateString()],
    ['Level', String(passport.level)],
    ['Total XP', passport.totalXp.toLocaleString()],
    ['Public Verification ID', passport.publicVerificationId],
  ]

  return (
    <AppShell
      title={passport.authoritative ? 'Robot Passport' : 'Demo Robot Passport'}
      back
      avatar={false}
    >
      <section>
        <Card className="relative overflow-hidden p-card-padding">
          <div className="flex items-center gap-4">
            <Robot3D
              size={84}
              config={robotState.configuration || undefined}
              label={`${passport.name}, ${passport.authoritative ? 'verified robot' : 'demo robot'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-outline">World Robotic System</p>
              <h2 className="truncate font-headline-md text-headline-md text-on-surface">
                {passport.name}
              </h2>
              <p className="truncate font-data text-data-sm text-tertiary">
                {passport.publicVerificationId}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge t={passport.authoritative ? 'tertiary' : 'outline'}>
              {passport.authoritative ? 'Authoritative passport' : 'Demo only'}
            </Badge>
            <Badge t="primary">{passport.robotClass}</Badge>
            <Badge t="secondary">Level {passport.level}</Badge>
          </div>
          <p className="mt-4 text-label-sm leading-relaxed text-outline">
            {passport.authoritative
              ? 'This privacy-safe passport is generated from server-owned robot, skill, certification and history records. Owner PII and financial data are intentionally excluded.'
              : 'This is a local demo projection. It is not a credential, certification, proof of ownership or production passport.'}
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>Identity record</SectionTitle>
        <Card className="divide-y divide-white/8">
          {rows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-body-md text-on-surface-variant">{key}</span>
              <span className="max-w-[58%] break-all text-right text-label-md text-on-surface">
                {value}
              </span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Verified skills</SectionTitle>
        {passport.skills.length ? (
          <div className="flex flex-wrap gap-2">
            {passport.skills.map((skill) => (
              <span
                key={`${skill.slug}:${skill.version}`}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-label-sm text-on-surface-variant"
              >
                {skill.name} · {skill.version}
                {skill.verified ? ' · verified' : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-outline">No verified skill records are present.</p>
        )}
      </section>

      <section>
        <SectionTitle>Industry certifications</SectionTitle>
        {passport.certifications.length ? (
          <div className="space-y-2">
            {passport.certifications.map((certification) => (
              <Card
                key={certification.verificationReference}
                className="flex items-center gap-3 p-3.5"
              >
                <Icon name="workspace_premium" className="text-tertiary" fill />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md text-on-surface">{certification.name}</p>
                  <p className="text-label-sm text-outline">
                    {certification.issuer} · {certification.status}
                  </p>
                </div>
                <span className="font-data text-data-sm text-outline">
                  {certification.verificationReference}
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-outline">
            No authoritative certification records are present.
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Robot history</SectionTitle>
        {passport.history.length ? (
          <div className="space-y-2">
            {passport.history.map((event) => (
              <Card key={event.id} className="p-4">
                <p className="text-body-md text-on-surface">{event.publicSummary}</p>
                <p className="mt-1 text-label-sm text-outline">
                  {event.eventType} · {new Date(event.occurredAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-outline">No public robot-history events are present.</p>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-3 text-label-sm text-error"
        >
          {error}
        </p>
      )}
      <Button
        variant="ghost"
        full
        icon="picture_as_pdf"
        loading={exporting}
        disabled={!passport.authoritative}
        onClick={exportPdf}
      >
        {passport.authoritative
          ? 'Download Verified Passport PDF'
          : 'PDF unavailable for demo passport'}
      </Button>
    </AppShell>
  )
}
