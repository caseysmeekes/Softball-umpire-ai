import { test, expect } from '@playwright/test'

const game = (id: string, number: number, start: string) => ({
  id,
  number,
  date: '2026-08-30',
  start,
  end: '11:00',
  field: `Diamond ${number}`,
  teams: `Team ${number} vs Team ${number + 1}`,
  division: 'Test',
  positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'],
})

test.beforeEach(async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
  })
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Umpire Allocation' })).toBeVisible()
  await expect.poll(() => pageErrors).toEqual([])
})

test('application smoke test', async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Allocation Dashboard')).toBeVisible()
  await expect(page.getByText('Game Schedule · Day 1')).toBeVisible()
})

test('main navigation works', async ({ page }) => {
  await page.getByRole('button', { name: 'Build / Upload Schedule' }).click()
  await expect(page).toHaveURL(/\/schedule$/)
  await expect(page.getByRole('heading', { name: 'Build / Upload Schedule' })).toBeVisible()

  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Rules' }).click()
  await expect(page).toHaveURL(/\/rules$/)
  await expect(page.getByRole('heading', { name: 'Tournament Rules' })).toBeVisible()

  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Umpires' }).click()
  await expect(page.getByText('Umpires · Tournament-wide')).toBeVisible()

  await page.goto('/allocation')
  await expect(page.getByRole('heading', { name: 'Allocation Control' })).toBeVisible()
})

test('multi-day selector switches between Day 1 and Day 2', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Day 1', exact: true })).toHaveClass(/selected/)
  await page.getByRole('button', { name: 'Day 2', exact: true }).click()
  await expect(page.getByText('Allocation Dashboard')).toBeVisible()
  await expect(page.getByText('Day 2', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Day 1', exact: true }).click()
  await expect(page.getByText('Game Schedule · Day 1')).toBeVisible()
})

test('schedule manual entry controls are available', async ({ page }) => {
  await page.goto('/schedule')
  await expect(page.getByRole('heading', { name: 'Add Game Manually' })).toBeVisible()
  await expect(page.getByLabel('Team 1')).toBeVisible()
  await expect(page.getByLabel('Team 2')).toBeVisible()
  await expect(page.getByLabel('Time')).toBeVisible()
  await expect(page.getByLabel('Diamond')).toBeVisible()
  await expect(page.getByText('Crew size')).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add Game' })).toBeVisible()
})

test('umpire management controls are available', async ({ page }) => {
  await expect(page.getByText('Umpires · Tournament-wide')).toBeVisible()
  await expect(page.getByPlaceholder('First name')).toBeVisible()
  await expect(page.getByPlaceholder('Last name')).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add Umpire' })).toBeVisible()
  await expect(page.getByText('Max games')).toBeVisible()
  await expect(page.getByText('Availability · Day 1')).toBeVisible()
})

test('allocation dashboard exposes workload and status controls', async ({ page }) => {
  await expect(page.getByText('Umpire Workload · Day 1')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'PLATE' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '1ST BASE' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '2ND BASE' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '3RD BASE' })).toBeVisible()
  await expect(page.getByRole('button', { name: '⚡ Auto Allocate' })).toBeVisible()
})

test('existing double-booking violation is visible and clickable', async ({ page }) => {
  await page.addInitScript(({ games, assignments }) => {
    localStorage.setItem('softball-games', JSON.stringify(games))
    localStorage.setItem('softball-umpires', JSON.stringify([
      { id: 'test-umpire', name: 'Test Smith', availability: 'All day', maxGames: 5, experience: 'National' },
    ]))
    localStorage.setItem('softball-assignments', JSON.stringify(assignments))
    localStorage.setItem('softball-enabled-rules', JSON.stringify(['no-double-booking']))
  }, {
    games: [game('g1', 1, '10:00'), game('g2', 2, '10:00')],
    assignments: [
      { gameId: 'g1', umpireId: 'test-umpire', position: 'Plate' },
      { gameId: 'g2', umpireId: 'test-umpire', position: 'Plate' },
    ],
  })

  await page.reload()
  const violation = page.getByRole('button', { name: '🔴 Rule violation' }).first()
  await expect(violation).toBeVisible()
  await violation.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/No double booking/i)).toBeVisible()
  await expect(page.getByText(/Game 1 and Game 2/i)).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
