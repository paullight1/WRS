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
  { title: 'Own', art: 'own', accent: ACCENTS.blue, body: 'Pick a package. Build your robot.' },
  { title: 'Train', art: 'train', accent: ACCENTS.indigo, body: 'Voice, language, movement, skills.' },
  { title: 'Contribute', art: 'contribute', accent: ACCENTS.teal, body: 'Record, annotate, translate. Quality scored.' },
  { title: 'Deploy', art: 'deploy', accent: ACCENTS.violet, body: 'Send it to work in a sector.' },
  { title: 'Monitor', art: 'monitor', accent: ACCENTS.orange, body: 'Uptime, tasks and performance, live.' },
  { title: 'Earn', art: 'earn', accent: ACCENTS.green, body: 'Payouts and rewards, every figure labelled.' },
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
  { label: 'All packages', to: '/packages' },
]

export const navLinks = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'Packages', href: '#packages' },
  { label: 'Questions', href: '#faq' },
]
