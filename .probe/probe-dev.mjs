// Throwaway reproduction probe for the two reported bugs. Deleted after use.
import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:5173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const browser = await chromium.launch({ executablePath: EDGE, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${String(e.message).slice(0, 300)}`))

// 1. Dashboard loads
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
check('dashboard loads', await page.locator('h1').first().isVisible())
await page.screenshot({ path: '.probe/s1-dashboard.png' })

// 2. Open Atlas classroom from dashboard card
await page.locator('a[href="#/classroom?teacher=atlas"]').first().click()
await page.waitForURL(/classroom/, { timeout: 5000 })
const atlasH2 = await page.locator('h2', { hasText: 'Atlas' }).first().isVisible().catch(() => false)
check('atlas classroom opens with Atlas stage', atlasH2, page.url())
await page.screenshot({ path: '.probe/s2-atlas.png' })

// 3. BUG 1: send a message, classroom must stay
await page.getByLabel('Message').fill('Hello Atlas, what is gravity?')
await page.getByRole('button', { name: 'Send' }).click()
await page.waitForTimeout(1500)
const stillClassroom = /classroom/.test(page.url())
const learnerMsg = await page.getByText('Hello Atlas, what is gravity?').isVisible().catch(() => false)
const h1 = await page.locator('h1').first().textContent().catch(() => '(none)')
check('BUG1: still on classroom after send', stillClassroom, page.url())
check('BUG1: learner message visible', learnerMsg, `h1=${h1}`)
await page.screenshot({ path: '.probe/s3-after-send.png' })

// 4. BUG 2: back to dashboard, open Orion
await page.locator('header nav a[href="#/"]').first().click()
await page.waitForURL(/\/$/, { timeout: 5000 })
check('back to dashboard', /#\/$/.test(page.url()), page.url())
await page.locator('a[href="#/classroom?teacher=orion"]').first().click()
await page.waitForURL(/classroom/, { timeout: 5000 })
await page.waitForTimeout(800)
const orionH2 = await page.locator('h2', { hasText: 'Orion' }).first().isVisible().catch(() => false)
check('BUG2: orion classroom opens with Orion stage', orionH2, page.url())
await page.screenshot({ path: '.probe/s4-orion.png' })

// 5. Switch teacher via in-classroom tab (Orion -> Lyra)
await page.getByRole('tab', { name: /Lyra/ }).click()
await page.waitForTimeout(800)
const lyraH2 = await page.locator('h2', { hasText: 'Lyra' }).first().isVisible().catch(() => false)
check('tab switch orion->lyra shows Lyra', lyraH2, page.url())
await page.screenshot({ path: '.probe/s5-lyra-tab.png' })

// 6. Classroom -> classroom direct navigation (dashboard link while in classroom is N/A;
// use back+forward style: go dashboard then Atlas again)
await page.locator('header nav a[href="#/"]').first().click()
await page.waitForURL(/\/$/, { timeout: 5000 })
await page.locator('a[href="#/classroom?teacher=atlas"]').first().click()
await page.waitForURL(/classroom/, { timeout: 5000 })
await page.waitForTimeout(800)
const atlasAgain = await page.locator('h2', { hasText: 'Atlas' }).first().isVisible().catch(() => false)
check('reopen atlas classroom (canvas remount)', atlasAgain, page.url())
await page.screenshot({ path: '.probe/s6-atlas-again.png' })

console.log(`console errors: ${consoleErrors.length}`)
for (const e of consoleErrors.slice(0, 12)) console.log(`  [console] ${e}`)
const failed = results.filter((r) => !r.ok)
console.log(failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECKS FAILED`)
await browser.close()
process.exit(failed.length === 0 ? 0 : 1)
