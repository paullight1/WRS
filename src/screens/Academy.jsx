import { useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import { Badge, Button, Card, Chip, Icon, Progress, SectionTitle, Stat } from '../components/ui.jsx'
import { courses } from '../data/mock.js'

const cats = ['All', 'Robotics AI', 'Data', 'Hardware', 'Security', 'Business']

export default function Academy() {
  const [cat, setCat] = useState('All')
  const list = courses.filter((c) => cat === 'All' || c.cat === cat)
  const hero = courses[0]

  return (
    <AppShell title="Robot Academy" back avatar={false}>
      {/* ------------------------------------------------------------- hero */}
      <section>
        <Card className="relative overflow-hidden p-card-padding glow-primary">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary-container/25 blur-[80px]" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-breathe rounded-full bg-tertiary" />
              <span className="text-label-sm font-label-sm uppercase tracking-widest text-tertiary">In Progress</span>
            </div>
            <h2 className="mt-3 font-headline-lg-mobile text-[24px] text-on-primary-container">{hero.title}</h2>
            <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
              Master the advanced synchronization between human cognitive patterns and WRS-Pro neural cores.
            </p>

            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant">
                <span>Module completion</span>
                <span>{hero.progress}%</span>
              </div>
              <Progress value={hero.progress} />
            </div>

            <Button className="mt-5" trailingIcon="play_circle">
              Resume Learning
            </Button>
          </div>
        </Card>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {/* ---------------------------------------------------------- courses */}
      <section>
        <SectionTitle action={`${list.length} courses`}>Courses</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <Card key={c.title} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-headline-md text-[17px] leading-snug text-on-surface">{c.title}</h3>
                <Badge t={c.progress === 100 ? 'tertiary' : c.progress ? 'primary' : 'outline'}>
                  {c.progress === 100 ? 'Complete' : c.progress ? 'Active' : 'New'}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-label-sm font-label-sm text-outline">
                <span className="flex items-center gap-1">
                  <Icon name="workspace_premium" className="text-[15px]" /> {c.level}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="timer" className="text-[15px]" /> {c.duration}
                </span>
                <span className="flex items-center gap-1 text-tertiary">
                  <Icon name="bolt" className="text-[15px]" /> +{c.xp} XP
                </span>
              </div>

              <Progress value={c.progress} className="mt-4" height="h-1.5" showShimmer={false} />

              <div className="mt-4">
                {c.progress === 100 ? (
                  <Button variant="ghost" size="sm" full icon="download">
                    Download Certificate
                  </Button>
                ) : (
                  <Button size="sm" variant={c.progress ? 'tertiary' : 'tonal'} full>
                    {c.progress ? 'Continue Learning' : 'Start Course'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total XP" value="12,450" t="primary" />
        <Stat label="Certificates" value="08" t="secondary" />
        <Stat label="Learning Hours" value="142" t="tertiary" />
        <Stat label="Class Rank" value="Top 5%" />
      </section>
    </AppShell>
  )
}
