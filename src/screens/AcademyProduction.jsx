import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Progress, SectionTitle } from '../components/ui.jsx'
import { browserEcosystemClient } from '../infrastructure/ecosystem/browserEcosystemClient.ts'

export default function AcademyProduction() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const refresh = async () => setSnapshot(await browserEcosystemClient.academy())

  useEffect(() => {
    let active = true
    browserEcosystemClient
      .academy()
      .then((next) => {
        if (active) setSnapshot(next)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Academy service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const enroll = async (course) => {
    setBusy(course.id)
    setMessage('')
    try {
      await browserEcosystemClient.enrollCourse(course.id)
      setMessage(`Enrollment in ${course.title} confirmed.`)
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Enrollment failed.')
    } finally {
      setBusy('')
    }
  }

  const completeModule = async (enrollment, module) => {
    setBusy(module.id)
    setMessage('')
    try {
      await browserEcosystemClient.recordProgress(enrollment.id, module.id, 100)
      setMessage(`${module.title} progress recorded. Certificate issuance still requires an internal assessment.`)
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Progress update failed.')
    } finally {
      setBusy('')
    }
  }

  const courses = snapshot?.courses || []
  const enrollments = snapshot?.enrollments || []

  return (
    <AppShell title="Academy" subtitle="Assessment-backed learning">
      {loading && (
        <StateView kind="loading" title="Loading Academy" desc="Reading published courses and your progress." />
      )}
      {!loading && error && <StateView kind="error" title="Academy unavailable" desc={error} />}
      {!loading && !error && (
        <section>
          <SectionTitle action={`${courses.length} courses`}>Published courses</SectionTitle>
          <div className="space-y-3">
            {courses.map((course) => {
              const enrollment = enrollments.find((entry) => entry.course_id === course.id)
              const modules = course.academy_modules || []
              const progressRows = enrollment?.academy_progress || []
              const completed = progressRows.filter((row) => Number(row.progress_percent) >= 100).length
              const percent = modules.length ? Math.round((completed / modules.length) * 100) : 0
              const certificate = Array.isArray(enrollment?.academy_certificates)
                ? enrollment.academy_certificates[0]
                : enrollment?.academy_certificates
              return (
                <Card key={course.id} className="p-card-padding">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-title font-semibold text-on-surface">{course.title}</h2>
                      <p className="mt-1 text-body-sm text-on-surface-variant">{course.description}</p>
                    </div>
                    <Badge t={certificate?.status === 'active' ? 'success' : enrollment ? 'primary' : 'outline'}>
                      {certificate?.status === 'active' ? 'Certified' : enrollment ? enrollment.status : 'Not enrolled'}
                    </Badge>
                  </div>
                  {enrollment ? (
                    <>
                      <div className="mt-4">
                        <Progress value={percent} />
                      </div>
                      <div className="mt-4 space-y-2">
                        {modules.map((module) => {
                          const progress = progressRows.find((row) => row.module_id === module.id)
                          const done = Number(progress?.progress_percent || 0) >= 100
                          return (
                            <div
                              key={module.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/8 p-3"
                            >
                              <span className="text-body-sm text-on-surface">{module.title}</span>
                              <Button
                                size="sm"
                                variant={done ? 'ghost' : 'primary'}
                                loading={busy === module.id}
                                disabled={done}
                                onClick={() => completeModule(enrollment, module)}
                              >
                                {done ? 'Completed' : 'Mark complete'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                      {certificate?.public_verification_id && (
                        <p className="mt-3 font-data text-data-sm text-outline">
                          Certificate verification: {certificate.public_verification_id}
                        </p>
                      )}
                    </>
                  ) : (
                    <Button full className="mt-4" loading={busy === course.id} onClick={() => enroll(course)}>
                      Enroll
                    </Button>
                  )}
                </Card>
              )
            })}
            {!courses.length && (
              <StateView
                kind="empty"
                title="No published Academy courses"
                desc="Courses appear only after server publication."
              />
            )}
          </div>
        </section>
      )}
      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
