import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const budgets = JSON.parse(fs.readFileSync(path.join(root, 'performance-budgets.json'), 'utf8')).bundle
const assetsDir = path.join(root, 'dist', 'assets')

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets does not exist. Run the production build before the bundle budget check.')
  process.exit(1)
}

const files = fs.readdirSync(assetsDir).map((name) => ({
  name,
  bytes: fs.statSync(path.join(assetsDir, name)).size,
}))
const js = files.filter((item) => item.name.endsWith('.js'))
const css = files.filter((item) => item.name.endsWith('.css'))
const initialJs = js.find((item) => /^index-[^.]+\.js$/.test(item.name))
const initialCss = css.find((item) => /^index-[^.]+\.css$/.test(item.name))
const lazy = js.filter((item) => item !== initialJs)
const largestLazy = lazy.sort((a, b) => b.bytes - a.bytes)[0]
const totalJsBytes = js.reduce((sum, item) => sum + item.bytes, 0)
const kb = (bytes) => bytes / 1024

const failures = []
function enforce(label, actualKb, limitKb) {
  if (!Number.isFinite(actualKb) || actualKb > limitKb) {
    failures.push(`${label}: ${actualKb.toFixed(2)} KB > ${limitKb} KB`)
  } else {
    console.log(`${label}: ${actualKb.toFixed(2)} KB / ${limitKb} KB`)
  }
}

if (!initialJs) failures.push('Initial index JavaScript bundle was not found.')
else enforce('Initial JS', kb(initialJs.bytes), budgets.maxInitialJsKb)
if (!largestLazy) failures.push('Lazy JavaScript bundle was not found.')
else enforce(`Largest lazy JS (${largestLazy.name})`, kb(largestLazy.bytes), budgets.maxLargestLazyJsKb)
enforce('Total JS', kb(totalJsBytes), budgets.maxTotalJsKb)
if (!initialCss) failures.push('Initial index CSS bundle was not found.')
else enforce('Initial CSS', kb(initialCss.bytes), budgets.maxInitialCssKb)

if (failures.length) {
  console.error('Bundle budget failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Bundle budget passed.')
