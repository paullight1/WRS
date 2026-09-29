import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('production member routes do not select mock experiences', () => {
  it('does not render a shared demo data notice or demo account identity', () => {
    const shell = source('../../src/components/AppShell.jsx')
    expect(shell).not.toMatch(/DemoDataBanner|Demo account|demo-user|illustrative only|auth\.isDemo\s*\?\s*['"]DE/i)
  })

  it('does not select demo content for member reward, marketplace, profile, or settings routes', () => {
    const app = source('../../src/App.jsx')
    expect(app).not.toMatch(
      /runtimeConfig\.isDemo\s*\?\s*(Rewards|EventCode|Boosts|Marketplace|Academy|Community|Referrals|Settings|Support)/,
    )
    expect(app).toMatch(/const\s+MarketplaceScreen\s*=\s*MarketplaceProduction/)
    expect(app).toMatch(/const\s+ProfileScreen\s*=\s*ProfileProduction/)
    expect(app).toMatch(/const\s+SettingsScreen\s*=\s*SettingsProduction/)
  })

  it('keeps member robot pages from describing or exposing locally stored robots as verified', () => {
    const home = source('../../src/screens/Home.jsx')
    const myRobot = source('../../src/screens/MyRobot.jsx')
    const passport = source('../../src/screens/RobotPassport.jsx')
    expect(home).not.toMatch(/demo robot|Authoritative boundaries|stored locally for demonstration/i)
    expect(myRobot).not.toMatch(/Demo robot|demo state/i)
    expect(passport).not.toMatch(/Demo Robot Passport|Demo only|local demo projection/i)
  })

  it('keeps checkout, transactions, and data revenue on server-backed content only', () => {
    expect(source('../../src/screens/Checkout.jsx')).not.toMatch(/DemoCheckout|Illustrative catalogue price/)
    expect(source('../../src/screens/Transactions.jsx')).not.toMatch(
      /DemoTransactions|Sample statement|illustrative entries/,
    )
    expect(source('../../src/screens/DataRevenue.jsx')).not.toMatch(/DemoDataRevenue|Sample contributor revenue/)
  })
})
