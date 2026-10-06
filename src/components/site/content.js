import { ACCENTS } from '../ui.jsx'

/* Landing page copy. Kept out of the JSX so the page file stays a layout, and
   so wording can be revised without touching markup. Keep it short: every line
   competes with the thing it describes; product surfaces do the explaining. */

/* The headline is segmented so three verbs can carry brand colour. Any segment
   without a `c` inherits the heading colour. */
export const hero = {
  title: [
    { t: 'Own', c: 'text-primary' },
    { t: ' a robot. ' },
    { t: 'Train', c: 'text-tertiary' },
    { t: ' it, ' },
    { t: 'deploy', c: 'text-secondary' },
    { t: ' it, and see what it produces.' },
  ],
  lead: 'A personal AI robot you create, teach and put to work. No technical knowledge needed.',
}

/* The product loop from PRODUCT.md — one line each, one drawing each.
   `art` keys into src/components/site/CardArt.jsx. */
export const steps = [
  { title: 'Own', art: 'own', accent: ACCENTS.blue, body: 'Choose a robot. Make it yours.' },
  { title: 'Train', art: 'train', accent: ACCENTS.indigo, body: 'Voice, language, movement, skills.' },
  {
    title: 'Contribute',
    art: 'contribute',
    accent: ACCENTS.teal,
    body: 'Record, annotate, translate. Quality scored.',
  },
  { title: 'Deploy', art: 'deploy', accent: ACCENTS.violet, body: 'Send it to work in a sector.' },
  { title: 'Monitor', art: 'monitor', accent: ACCENTS.orange, body: 'Uptime, tasks and performance, live.' },
  { title: 'Earn', art: 'earn', accent: ACCENTS.green, body: 'Payouts and rewards, every figure labelled.' },
]

export const valuePillars = [
  {
    icon: 'psychology',
    title: 'Build your AI',
    body: 'Shape your robot around the work and capabilities you care about.',
  },
  {
    icon: 'lock',
    title: 'Keep it yours',
    body: 'Keep your robot, data and learned capabilities connected to your account.',
  },
  {
    icon: 'rocket_launch',
    title: 'Put it to work',
    body: 'Deploy trained capabilities across a growing set of digital work.',
  },
  {
    icon: 'workspace_premium',
    title: 'Track progress',
    body: 'Follow eligible tasks, XP and rewards with a clear status at every step.',
  },
  { icon: 'hub', title: 'Build together', body: 'Join a community of people making useful AI capabilities.' },
]

export const audienceGroups = [
  { icon: 'person', title: 'Individuals', body: 'Build an AI robot that grows with your interests and skills.' },
  { icon: 'business', title: 'Businesses', body: 'Explore adaptable intelligence for repeatable digital work.' },
  { icon: 'code', title: 'Developers', body: 'Create capabilities and connect them to new kinds of work.' },
  { icon: 'groups', title: 'The community', body: 'Help shape how people build, train and use AI.' },
]

export const faq = [
  {
    q: 'Do I need to know anything about robotics or code?',
    a: 'No. Every screen is plain language and asks for one thing at a time.',
  },
  {
    q: 'Is the robot physical or digital?',
    a: 'Digital. You own it, customise it, train it, and deploy it to digital and virtual assignments from your phone.',
  },
  {
    q: 'How do earnings work?',
    a: 'Your robot can be paid for completed deployments and for approved data contributions. Nothing is guaranteed — amounts depend on work completed and approved, and every figure in the app is labelled confirmed, pending, estimated or promotional so you always know which you are looking at.',
  },
  {
    q: 'Can I customise my robot?',
    a: 'Yes. You can change its palette, face, parts and personality as you develop it.',
  },
  {
    q: 'What data do I contribute, and what happens to it?',
    a: 'Voice, images, video, text and translations — and face or movement capture only if you choose a module that needs it. Before any capture the app shows what is collected, what it is used for, and how to delete it.',
  },
  {
    q: 'Will it work on my phone?',
    a: 'Yes. Built phone-first for mid-range Android on slow connections, and full-screen on a laptop.',
  },
]

/* Keep the footer focused on account entry actions. The deeper app routes need
   an account, so they belong inside the app rather than on the public page. */
export const footerLinks = [
  { label: 'Get started', to: '/register' },
  { label: 'Sign in', to: '/login' },
]

export const navLinks = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'Questions', href: '#faq' },
]
