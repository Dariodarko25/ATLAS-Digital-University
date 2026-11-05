// Deep-dive probe: 3D render check, same-route nav, rapid switching.
import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:4173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
  return ok
}

const browser = await chromium.launch({ executablePath: EDGE, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${String(e.message).slice(0, 300)}`))

// A. Atlas stage renders 3D (screenshot at top)
await page.goto(`${BASE}/#/classroom?teacher=atlas`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(400)
await page.screenshot({ path: '.probe/d1-atlas-top.png' })
const canvasCount = await page.locator('canvas').count()
check('A: 3D canvas present in atlas stage', canvasCount > 0, `canvases=${canvasCount}`)

// B. Same-route navigation: change ?teacher= hash without reload
await page.evaluate(() => { window.location.hash = '#/classroom?teacher=lyra' })
await page.waitForTimeout(800)
const lyraStage = await page.locator('h2', { hasText: 'Lyra' }).first().isVisible().catch(() => false)
const atlasStage = await page.locator('h2', { hasText: 'Atlas' }).first().isVisible().catch(() => false)
check('B: same-route nav atlas->lyra updates stage', lyraStage, `lyra=${lyraStage} atlas=${atlasStage}`)
await page.screenshot({ path: '.probe/d2-sameroute.png' })

// C. Rapid teacher-tab switching (canvas mount/unmount churn)
await page.goto(`${BASE}/#/classroom?teacher=atlas`, { waitUntil: 'networkidle' })
for (const name of ['Orion', 'Atlas', 'Lyra', 'Atlas', 'Orion']) {
  await page.getByRole('tab', { name: new RegExp(name) }).click()
  await page.waitForTimeout(350)
}
await page.waitForTimeout(800)
const h1 = await page.locator('h1').first().textContent().catch(() => '(CRASH: no h1)')
const orionStage = await page.locator('h2', { hasText: 'Orion' }).first().isVisible().catch(() => false)
check('C: survives rapid tab switching, ends on Orion', h1 === 'AI Classroom' && orionStage, `h1=${h1}`)
await page.screenshot({ path: '.probe/d3-rapid-switch.png' })

// D. Send in non-3D classroom (isolate 3D involvement)
await page.getByLabel('Message').fill('Orion probe message')
await page.getByRole('button', { name: 'Send' }).click()
await page.waitForTimeout(1500)
const msgVisible = await page.getByText('Orion probe message').first().isVisible().catch(() => false)
check('D: send works in orion classroom', /classroom/.test(page.url()) && msgVisible, page.url())

// E. Send via suggested-question button
await page.getByRole('button', { name: /Why does an apple fall/ }).click()
await page.waitForTimeout(1500)
const sugVisible = await page.getByText(/Why does an apple fall/).first().isVisible().catch(() => false)
check('E: suggested-question send works', /classroom/.test(page.url()) && sugVisible, page.url())
await page.screenshot({ path: '.probe/d4-orion-send.png' })

console.log(`console errors: ${consoleErrors.length}`)
for (const e of consoleErrors.slice(0, 12)) console.log(`  [console] ${e}`)
await browser.close()
