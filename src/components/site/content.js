import { ACCENTS } from '../ui.jsx'

/* Landing page copy. Kept out of the JSX so the page file stays a layout, and
   so wording can be revised without touching markup.

   Two rules for this file:
   - Nothing may state or imply a return on money paid. Figures on the page are
     counts computed from `src/data/mock.js`, never performance claims.
   - Keep it short. Every line here competes with the thing it describes; the
     product surfaces on the page do the explaining. Prose is the fallback. */

/* The headline is segmented so three verbs can carry brand colour. Any segment
   without a `c` inherits the heading colour. */
export const hero = {
  title: [
    { t: 'Own intelligence. ', c: 'text-on-surface' },
    { t: 'Build the future.', c: 'text-primary' },
  ],
  lead: 'Create an AI robot you can train, deploy, and grow through approved digital work.',
}

export const valuePillars = [
  { icon: 'psychology', title: 'Build your AI', body: 'Start with a robot you can shape around the work you care about.' },
  { icon: 'lock', title: 'Own your intelligence', body: 'Keep your robot, data, and learned capabilities connected to your account.' },
  { icon: 'rocket_launch', title: 'Deploy anywhere', body: 'Put trained capability into digital tasks across a growing set of sectors.' },
  { icon: 'workspace_premium', title: 'Earn from approved work', body: 'Track eligible tasks and rewards with clear status at every step.' },
  { icon: 'hub', title: 'Join a global network', body: 'Build alongside people, teams, and robots making AI more useful.' },
]

export const audienceGroups = [
  { icon: 'person', title: 'Individuals', body: 'Build an AI that grows with you.' },
  { icon: 'business', title: 'Businesses', body: 'Automate repeatable work with adaptable intelligence.' },
  { icon: 'code', title: 'Developers', body: 'Create capabilities and deploy them globally.' },
  { icon: 'groups', title: 'The ecosystem', body: 'Help shape a more open AI ownership economy.' },
]

export const insights = [
  { category: 'Ownership', title: 'What does it mean to own an AI?', excerpt: 'A practical look at the difference between using a tool and building intelligence that stays with you.', time: '4 min read' },
  { category: 'Training', title: 'From training data to useful robot skills', excerpt: 'How voice, language, movement, and task knowledge become capability you can put to work.', time: '5 min read' },
  { category: 'Deployment', title: 'How robot deployment work is reviewed', excerpt: 'Why clear task status, approval, and traceable outcomes matter when intelligence goes to work.', time: '4 min read' },
]

/* The product loop from PRODUCT.md — one line each, one drawing each.
   `art` keys into src/components/site/CardArt.jsx. */
export const steps = [
  { title: 'Create', art: 'own', accent: ACCENTS.blue, body: 'Start with a robot you can make your own.' },
  { title: 'Train', art: 'train', accent: ACCENTS.indigo, body: 'Build voice, language, movement, and task skills.' },
  {
    title: 'Learn',
    art: 'contribute',
    accent: ACCENTS.teal,
    body: 'Contribute responsibly and keep progress visible.',
  },
  { title: 'Deploy', art: 'deploy', accent: ACCENTS.violet, body: 'Send it to work in a sector.' },
  { title: 'Monitor', art: 'monitor', accent: ACCENTS.orange, body: 'Uptime, tasks and performance, live.' },
  { title: 'Earn', art: 'earn', accent: ACCENTS.green, body: 'Track approved work and eligible rewards.' },
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
    q: 'Are packages an investment?',
    a: 'No. A package buys capability — robot class, how many languages and skills it holds, which deployment categories and data tasks it can take on. It is not a deposit and carries no promised return.',
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

/* Deliberately short. The section anchors already live in a sticky nav that is
   on screen at all times, and the deeper app routes (training, data, deploy,
   community) need an account — sending a logged-out visitor there is a dead
   end, not a link. What is left is the only three things to do from here. */
export const footerLinks = [
  { label: 'Get started', to: '/register' },
  { label: 'Sign in', to: '/login' },
  { label: 'Start for free', to: '/register' },
]

export const navLinks = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'Insights', href: '#insights' },
  { label: 'Start for free', href: '#packages' },
  { label: 'Questions', href: '#faq' },
]
