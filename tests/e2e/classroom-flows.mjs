// ATLAS classroom regression: message-send stability + teacher switching.
// Runs the production build in headless Edge (found via channel).
//   npm run build && npm run test:e2e
// Uses ATLAS_E2E_URL when set instead of starting its own preview server.
/* global process, fetch, console */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SHOTS = path.join(os.tmpdir(), 'atlas-e2e')
const EDGE_CHANNEL = 'msedge'

let server = null
async function ensureServer() {
  if (process.env.ATLAS_E2E_URL) return process.env.ATLAS_E2E_URL
  const port = 4173
  server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    shell: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  for (let i = 0; i < 60; i++) {
    await sleep(500)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`)
      if (res.ok) return `http://127.0.0.1:${port}`
    } catch {
      // not ready yet
    }
  }
  throw new Error('preview server did not start on port 4173')
}

async function stopServer() {
  if (!server) return
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
      shell: true,
      stdio: 'ignore',
    })
    await new Promise((resolve) => killer.on('exit', resolve))
  } else {
    server.kill('SIGKILL')
  }
  server = null
}

const failures = []
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
  if (!ok) failures.push(name)
}

let browser = null
try {
  const base = await ensureServer()
  browser = await chromium.launch({ channel: EDGE_CHANNEL, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${String(e && e.message).slice(0, 300)}`))

  await page.goto(`${base}/#/`, { waitUntil: 'networkidle' })
  check('dashboard loads', await page.locator('h1').first().isVisible())

  await page.locator('a[href="#/classroom?teacher=atlas"]').first().click()
  await page.getByRole('heading', { name: 'Atlas' }).first().waitFor({ timeout: 8000 })
  check('atlas classroom opens', /classroom/.test(page.url()))

  // BUG 1: sending must not leave or break the classroom.
  await page.getByLabel('Message').fill('Hello Atlas, what is gravity?')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByText('Hello Atlas, what is gravity?').first().waitFor({ timeout: 5000 })
  check('send keeps classroom + shows message', /classroom/.test(page.url()))
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(SHOTS, 'send.png') })

  // BUG 2: dashboard -> other teacher -> tabs -> same-route nav.
  await page.locator('header nav a[href="#/"]').first().click()
  await page.waitForURL(/\/$/, { timeout: 5000 })
  await page.locator('a[href="#/classroom?teacher=orion"]').first().click()
  await page.getByRole('heading', { name: 'Orion' }).first().waitFor({ timeout: 8000 })
  check('orion classroom opens', true)

  await page.getByRole('tab', { name: /Lyra/ }).click()
  await page.getByRole('heading', { name: 'Lyra' }).first().waitFor({ timeout: 8000 })
  check('tab switch shows Lyra + syncs URL', /teacher=lyra/.test(page.url()), page.url())

  await page.evaluate(() => {
    window.location.hash = '#/classroom?teacher=atlas'
  })
  await page.getByRole('heading', { name: 'Atlas' }).first().waitFor({ timeout: 8000 })
  check('same-route navigation switches stage', true)
  await page.screenshot({ path: path.join(SHOTS, 'switch.png') })

  for (const name of ['Orion', 'Atlas', 'Lyra']) {
    await page.getByRole('tab', { name: new RegExp(name) }).click()
    await page.waitForTimeout(400)
  }
  const h1 = await page.locator('h1').first().textContent().catch(() => '(missing)')
  check('survives rapid switching', h1 === 'AI Classroom', `h1=${h1}`)

  check('zero console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
} finally {
  await browser?.close()
  await stopServer()
}

if (failures.length > 0) {
  console.log(`${failures.length} CHECKS FAILED: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('ALL CHECKS PASSED')
