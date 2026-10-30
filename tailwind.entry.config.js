import path from 'node:path'
import { fileURLToPath } from 'node:url'
import base from './tailwind.config.js'

const root = path.dirname(fileURLToPath(import.meta.url))
// Only public entry-point utilities load up front. Member routes load the full
// utility sheet through ApplicationStyles before their screens are displayed.
export default {
  ...base,
  content: [
    'index.html',
    'src/App.jsx',
    'src/screens/Landing.jsx',
    'src/components/site/**/*.{js,jsx}',
    'src/components/ui.jsx',
    'src/components/robot3d/**/*.{js,jsx}',
    'src/components/{auth,notifications,states}/**/*.{js,jsx}',
    'src/data/*.js',
  ].map((file) => path.join(root, file)),
}
