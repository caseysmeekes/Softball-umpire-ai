import { TOURNAMENT_RULES, DEFAULT_RULE_IDS } from '../tournament-rules'
import type { Assignment, Experience, Game, Position, Umpire, UmpireAvailability } from '../types'
import { getSupabaseClient } from './client'
import type { Database } from './database.types'
import { emptyTournament, type Tournament } from '../tournament'

type Tables = Database['public']['Tables']

export type LocalAllocationChange = {
  id: string
  day: number
  gameId: string
  gameNumber: number
  time?: string
  diamond?: string
  position: string
  from: string
  to: string
  status: 'Pending' | 'Committed'
}

export type LocalStorageSnapshot = {
  tournament: Tournament
  umpires: Umpire[]
  enabledRuleIds: string[]
  history: LocalAllocationChange[]
  selectedDay: number
  source: 'tournament' | 'legacy'
}

export type MigrationReport = {
  status: 'migrated' | 'already_migrated'
  tournamentId: string
  source: LocalStorageSnapshot['source']
  transformations: string[]
  counts: {
    days: number
    games: number
    umpires: number
    availability: number
    allocations: number
    manualLocks: number
    rules: number
    tournamentRules: number
    history: number
  }
}

const TOURNAMENT_KEY = 'softball-tournament'
const UMPIRES_KEY = 'softball-umpires'
const RULES_KEY = 'softball-enabled-rules'
const HISTORY_KEY = 'softball-allocation-change-history'
const SELECTED_DAY_KEY = 'softball-selected-day'
const MIGRATION_ID_KEY = 'softball-supabase-migration-id'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function parseTime(value: string | undefined, field: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i)
  if (!match) throw new Error(`Invalid time in ${field}: "${value}". Expected HH:MM, HH:MM:SS, or 12-hour time.`)
  let hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] || '0')
  const meridiem = match[4]?.toUpperCase()
  if (minute > 59 || second > 59) throw new Error(`Invalid time in ${field}: "${value}".`)
  if (meridiem) {
    if (hour < 1 || hour > 12) throw new Error(`Invalid 12-hour time in ${field}: "${value}".`)
    if (meridiem === 'AM') hour = hour === 12 ? 0 : hour
    else hour = hour === 12 ? 12 : hour + 12
  } else if (hour > 23) {
    throw new Error(`Invalid 24-hour time in ${field}: "${value}".`)
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}

function assertDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Invalid date in ${field}: "${value}". Expected YYYY-MM-DD.`)
  }
}

function assertPosition(value: string, field: string): asserts value is Position {
  if (!['Plate', 'Base 1', 'Base 2', 'Base 3'].includes(value)) throw new Error(`Invalid position in ${field}: "${value}".`)
}

function assertExperience(value: string, field: string): asserts value is Experience {
  if (!['International', 'National', 'Regional', 'Developing'].includes(value)) throw new Error(`Invalid experience in ${field}: "${value}".`)
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`)
    seen.add(value)
  }
}

export function readLocalStorageSnapshot(): LocalStorageSnapshot {
  if (typeof window === 'undefined') throw new Error('Local storage migration must be triggered from a browser context.')

  const rawTournament = localStorage.getItem(TOURNAMENT_KEY)
  const legacy = !rawTournament
  const tournament = rawTournament ? (JSON.parse(rawTournament) as Tournament) : emptyTournament()
  if (!tournament?.days?.length) throw new Error('No valid softball tournament data was found in localStorage.')

  if (legacy) {
    tournament.days[0].games = readJson<Game[]>('softball-games', [])
    tournament.days[0].assignments = readJson<Assignment[]>('softball-assignments', [])
    tournament.days[0].manualLocks = readJson<string[]>('softball-manual-locks', [])
    tournament.days[0].date = tournament.days[0].games[0]?.date
  }

  const enabledRuleIds = readJson<string[]>(RULES_KEY, [])
  const history = readJson<LocalAllocationChange[]>(HISTORY_KEY, [])
  const selectedDay = Math.max(0, Math.min(4, Number(localStorage.getItem(SELECTED_DAY_KEY) || 0)))
  const umpires = readJson<Umpire[]>(UMPIRES_KEY, [])

  return {
    tournament,
    umpires,
    enabledRuleIds,
    history,
    selectedDay,
    source: legacy ? 'legacy' : 'tournament',
  }
}

export function validateLocalSnapshot(snapshot: LocalStorageSnapshot) {
  const { tournament, umpires, history } = snapshot
  if (!tournament.name?.trim()) throw new Error('Tournament name is empty.')
  if (tournament.days.length !== 5) throw new Error(`Expected 5 tournament days, found ${tournament.days.length}.`)

  assertUnique(umpires.map(u => u.id), 'umpire ID')
  assertUnique(tournament.days.map(d => d.id), 'day ID')
  assertUnique(tournament.days.flatMap(d => d.games.map(g => g.id)), 'game ID')
  assertUnique(tournament.days.flatMap(d => d.assignments.map(a => `${a.gameId}::${a.position}`)), 'allocation slot')
  assertUnique(history.map(h => h.id), 'history ID')

  const umpireIds = new Set(umpires.map(u => u.id))
  const gameIds = new Set(tournament.days.flatMap(d => d.games.map(g => g.id)))
  const ruleIds = new Set(TOURNAMENT_RULES.map(r => r.id))

  for (const [dayIndex, day] of tournament.days.entries()) {
    if (day.id !== `day-${dayIndex + 1}` && !day.id) throw new Error(`Day ${dayIndex + 1} has no ID.`)
    if (day.date) assertDate(day.date, `Day ${dayIndex + 1} date`)
    const dayAssignments = new Set<string>()
    for (const game of day.games) {
      assertDate(game.date, `Game ${game.number} date`)
      parseTime(game.start, `Game ${game.number} start`)
      parseTime(game.end, `Game ${game.number} end`)
      for (const position of game.positions) assertPosition(position, `Game ${game.number} position`)
    }
    for (const assignment of day.assignments) {
      assertPosition(assignment.position, `Game ${assignment.gameId} allocation`)
      if (!gameIds.has(assignment.gameId)) throw new Error(`Allocation references unknown game ${assignment.gameId}.`)
      if (!umpireIds.has(assignment.umpireId)) throw new Error(`Allocation references unknown umpire ${assignment.umpireId}.`)
      const slot = `${assignment.gameId}::${assignment.position}`
      if (dayAssignments.has(slot)) throw new Error(`Duplicate allocation slot ${slot}.`)
      dayAssignments.add(slot)
    }
    for (const lock of day.manualLocks || []) {
      const [gameId, position] = lock.split('::')
      assertPosition(position, `Manual lock ${lock}`)
      if (!dayAssignments.has(lock)) throw new Error(`Manual lock ${lock} has no matching allocation.`)
      if (!gameIds.has(gameId)) throw new Error(`Manual lock references unknown game ${gameId}.`)
    }
  }

  for (const umpire of umpires) {
    assertExperience(umpire.experience, `Umpire ${umpire.id} experience`)
    if (!Number.isInteger(umpire.maxGames) || umpire.maxGames < 1 || umpire.maxGames > 10) throw new Error(`Invalid max games for umpire ${umpire.id}.`)
    for (const [dayIndex, availability] of Object.entries(umpire.availabilityByDay || {})) {
      if (!/^\d+$/.test(dayIndex) || Number(dayIndex) < 0 || Number(dayIndex) >= 5) throw new Error(`Invalid availability day ${dayIndex} for umpire ${umpire.id}.`)
      if (availability.enabled) {
        parseTime(availability.from, `Umpire ${umpire.id} availability from`)
        parseTime(availability.until, `Umpire ${umpire.id} availability until`)
      }
    }
  }

  const effectiveRules = snapshot.enabledRuleIds.length ? snapshot.enabledRuleIds : DEFAULT_RULE_IDS
  for (const id of effectiveRules) if (!ruleIds.has(id)) throw new Error(`Unknown enabled rule ID: ${id}`)

  for (const item of history) {
    if (item.day < 0 || item.day >= 5) throw new Error(`History item ${item.id} has invalid day ${item.day}.`)
    if (!gameIds.has(item.gameId)) throw new Error(`History item ${item.id} references unknown game ${item.gameId}.`)
    assertPosition(item.position, `History item ${item.id}`)
  }
}

function buildRows(snapshot: LocalStorageSnapshot, tournamentId: string) {
  const { tournament, umpires, history } = snapshot
  const dayIds = tournament.days.map(() => crypto.randomUUID())
  const dayIdByIndex = new Map(tournament.days.map((day, index) => [index, dayIds[index]]))
  const dayIdByLegacy = new Map(tournament.days.map((day, index) => [day.id, dayIds[index]]))

  const days: Tables['tournament_days']['Insert'][] = tournament.days.map((day, index) => ({
    id: dayIds[index], tournament_id: tournamentId, legacy_id: day.id, day_index: index, name: day.name,
    date: day.date || day.games[0]?.date || null,
  }))

  const games: Tables['games']['Insert'][] = tournament.days.flatMap(day => day.games.map(game => ({
    id: game.id, tournament_day_id: dayIdByLegacy.get(day.id)!, number: game.number, date: game.date,
    start_time: parseTime(game.start, `Game ${game.number} start`)!, end_time: parseTime(game.end, `Game ${game.number} end`),
    field: game.field, teams: game.teams, division: game.division, positions: game.positions,
  })))

  const allocations: Tables['allocations']['Insert'][] = tournament.days.flatMap(day => day.assignments.map(a => ({ game_id: a.gameId, umpire_id: a.umpireId, position: a.position })))
  const manualLocks: Tables['manual_locks']['Insert'][] = tournament.days.flatMap(day => (day.manualLocks || []).map(key => {
    const [gameId, position] = key.split('::')
    const assignment = day.assignments.find(a => a.gameId === gameId && a.position === position)
    return { game_id: gameId, position: position as Position, umpire_id: assignment!.umpireId }
  }))

  const availability: Tables['umpire_availability']['Insert'][] = umpires.flatMap(umpire =>
    tournament.days.map((day, dayIndex) => {
      const value: UmpireAvailability = umpire.availabilityByDay?.[dayIndex] || { enabled: true, from: '00:00', until: '23:59' }
      return {
        umpire_id: umpire.id, tournament_day_id: dayIdByIndex.get(dayIndex)!, enabled: value.enabled,
        from_time: value.enabled ? parseTime(value.from, `Umpire ${umpire.id} availability from`) : null,
        until_time: value.enabled ? parseTime(value.until, `Umpire ${umpire.id} availability until`) : null,
      }
    })
  )

  const rules: Tables['rules']['Insert'][] = TOURNAMENT_RULES.map(rule => ({
    id: rule.id, name: rule.name, category: rule.category, description: rule.description, default_enabled: rule.defaultEnabled,
  }))
  const effectiveRules = new Set(snapshot.enabledRuleIds.length ? snapshot.enabledRuleIds : DEFAULT_RULE_IDS)
  const tournamentRules: Tables['tournament_rules']['Insert'][] = TOURNAMENT_RULES.map(rule => ({ tournament_id: tournamentId, rule_id: rule.id, enabled: effectiveRules.has(rule.id) }))

  const historyRows: Tables['allocation_change_history']['Insert'][] = history.map(item => ({
    id: item.id, tournament_day_id: dayIdByIndex.get(item.day)!, game_id: item.gameId, game_number: item.gameNumber,
    time: item.time || null, diamond: item.diamond || null, position: item.position as Position,
    from_umpire: item.from, to_umpire: item.to, status: item.status,
  }))

  return { days, games, allocations, manualLocks, availability, rules, tournamentRules, historyRows, dayIds, gameIds: games.map(g => g.id), umpireIds: umpires.map(u => u.id) }
}

async function preflight(snapshot: LocalStorageSnapshot, tournamentId: string, rows: ReturnType<typeof buildRows>) {
  const supabase = getSupabaseClient()
  const tournament = await supabase.from('tournaments').select('id').eq('id', tournamentId).maybeSingle()
  if (tournament.error) throw tournament.error
  if (tournament.data) throw new Error(`A Supabase tournament already exists with migration ID ${tournamentId}. Use verification instead of migrating again.`)

  const [games, umpires, history] = await Promise.all([
    rows.gameIds.length ? supabase.from('games').select('id').in('id', rows.gameIds) : Promise.resolve({ data: [], error: null } as any),
    rows.umpireIds.length ? supabase.from('umpires').select('id').in('id', rows.umpireIds) : Promise.resolve({ data: [], error: null } as any),
    snapshot.history.length ? supabase.from('allocation_change_history').select('id').in('id', snapshot.history.map(x => x.id)) : Promise.resolve({ data: [], error: null } as any),
  ])
  for (const result of [games, umpires, history]) if (result.error) throw result.error
  if (games.data?.length) throw new Error(`Migration would duplicate ${games.data.length} existing game ID(s).`)
  if (umpires.data?.length) throw new Error(`Migration would conflict with ${umpires.data.length} existing umpire ID(s).`)
  if (history.data?.length) throw new Error(`Migration would duplicate ${history.data.length} history ID(s).`)

  const existingRules = await supabase.from('rules').select('*').in('id', rows.rules.map(r => r.id))
  if (existingRules.error) throw existingRules.error
  for (const rule of existingRules.data || []) {
    const local = rows.rules.find(r => r.id === rule.id)!
    if (rule.name !== local.name || rule.category !== local.category || rule.description !== local.description || rule.default_enabled !== local.default_enabled) {
      throw new Error(`Rule ${rule.id} already exists with different definition. Migration stopped.`)
    }
  }
}

async function rollback(tournamentId: string, dayIds: string[], gameIds: string[], umpireIds: string[]) {
  const supabase = getSupabaseClient()
  const errors: string[] = []
  const attempts: Array<PromiseLike<{ error: any }>> = []
  if (gameIds.length) {
    attempts.push(supabase.from('allocation_change_history').delete().in('game_id', gameIds))
    attempts.push(supabase.from('manual_locks').delete().in('game_id', gameIds))
    attempts.push(supabase.from('allocations').delete().in('game_id', gameIds))
    attempts.push(supabase.from('games').delete().in('id', gameIds))
  }
  if (dayIds.length) attempts.push(supabase.from('umpire_availability').delete().in('tournament_day_id', dayIds))
  attempts.push(supabase.from('allocation_change_history').delete().in('tournament_day_id', dayIds))
  attempts.push(supabase.from('tournament_rules').delete().eq('tournament_id', tournamentId))
  if (dayIds.length) attempts.push(supabase.from('tournament_days').delete().in('id', dayIds))
  if (umpireIds.length) attempts.push(supabase.from('umpires').delete().in('id', umpireIds))
  for (const attempt of attempts) {
    try { const result = await attempt; if (result.error) errors.push(result.error.message) } catch (error) { errors.push(String(error)) }
  }
  const tournament = await supabase.from('tournaments').delete().eq('id', tournamentId)
  if (tournament.error) errors.push(tournament.error.message)
  return errors
}

export async function migrateLocalStorageToSupabase(): Promise<MigrationReport> {
  const snapshot = readLocalStorageSnapshot()
  validateLocalSnapshot(snapshot)

  let tournamentId = localStorage.getItem(MIGRATION_ID_KEY)
  if (!tournamentId) {
    tournamentId = crypto.randomUUID()
    localStorage.setItem(MIGRATION_ID_KEY, tournamentId)
  }

  const rows = buildRows(snapshot, tournamentId)
  await preflight(snapshot, tournamentId, rows)
  const supabase = getSupabaseClient()
  const transformations = [
    'Generated a new Supabase tournament UUID because the existing local Tournament model has no persistent tournament ID.',
    'Preserved existing tournament day IDs in tournament_days.legacy_id.',
    'Converted local game and availability times to PostgreSQL HH:MM:SS time values where necessary.',
    'Preserved existing game IDs, umpire IDs, allocation slot identities, and change-history IDs.',
    'Effective rule enablement uses the existing default rule set when the local enabled-rule list is empty, matching current application behaviour.',
    'Draft state is not migrated separately because the current application does not persist draft state in localStorage; persisted assignments represent the current committed state.',
  ]

  try {
    const tournament = await supabase.from('tournaments').insert({ id: tournamentId, name: snapshot.tournament.name }).select().single()
    if (tournament.error) throw tournament.error

    const dayResult = await supabase.from('tournament_days').insert(rows.days).select('id')
    if (dayResult.error) throw dayResult.error

    const umpireRows: Tables['umpires']['Insert'][] = snapshot.umpires.map(u => ({ id: u.id, tournament_id: tournamentId, name: u.name, experience: u.experience, max_games: u.maxGames, legacy_availability: u.availability }))
    if (umpireRows.length) { const result = await supabase.from('umpires').insert(umpireRows); if (result.error) throw result.error }
    if (rows.availability.length) { const result = await supabase.from('umpire_availability').insert(rows.availability); if (result.error) throw result.error }
    if (rows.games.length) { const result = await supabase.from('games').insert(rows.games); if (result.error) throw result.error }
    if (rows.allocations.length) { const result = await supabase.from('allocations').insert(rows.allocations); if (result.error) throw result.error }
    if (rows.manualLocks.length) { const result = await supabase.from('manual_locks').insert(rows.manualLocks); if (result.error) throw result.error }

    const existingRules = await supabase.from('rules').select('id').in('id', rows.rules.map(r => r.id))
    if (existingRules.error) throw existingRules.error
    const existingRuleIds = new Set((existingRules.data || []).map(r => r.id))
    const missingRules = rows.rules.filter(rule => !existingRuleIds.has(rule.id))
    if (missingRules.length) { const result = await supabase.from('rules').insert(missingRules); if (result.error) throw result.error }
    if (rows.tournamentRules.length) { const result = await supabase.from('tournament_rules').insert(rows.tournamentRules); if (result.error) throw result.error }
    if (rows.historyRows.length) { const result = await supabase.from('allocation_change_history').insert(rows.historyRows); if (result.error) throw result.error }

    return {
      status: 'migrated', tournamentId, source: snapshot.source, transformations,
      counts: { days: rows.days.length, games: rows.games.length, umpires: umpireRows.length, availability: rows.availability.length,
        allocations: rows.allocations.length, manualLocks: rows.manualLocks.length, rules: rows.rules.length,
        tournamentRules: rows.tournamentRules.length, history: rows.historyRows.length },
    }
  } catch (error) {
    const rollbackErrors = await rollback(tournamentId, rows.dayIds, rows.gameIds, rows.umpireIds)
    if (rollbackErrors.length) throw new Error(`Migration failed and rollback was incomplete: ${String(error)} | Rollback errors: ${rollbackErrors.join('; ')}`)
    localStorage.removeItem(MIGRATION_ID_KEY)
    throw new Error(`Migration failed. No migrated records were retained. ${String(error)}`)
  }
}

export async function verifyLocalStorageMigration(tournamentId = localStorage.getItem(MIGRATION_ID_KEY) || '') {
  if (!tournamentId) throw new Error('No Supabase migration ID is stored locally.')
  const snapshot = readLocalStorageSnapshot()
  validateLocalSnapshot(snapshot)
  const supabase = getSupabaseClient()
  const tournament = await supabase.from('tournaments').select('*').eq('id', tournamentId).single()
  if (tournament.error) throw tournament.error
  const days = await supabase.from('tournament_days').select('*').eq('tournament_id', tournamentId).order('day_index')
  if (days.error) throw days.error
  const umpires = await supabase.from('umpires').select('*').eq('tournament_id', tournamentId).order('id')
  if (umpires.error) throw umpires.error
  const dayIds = (days.data || []).map(d => d.id)
  const games = dayIds.length ? await supabase.from('games').select('*').in('tournament_day_id', dayIds).order('id') : { data: [], error: null } as any
  if (games.error) throw games.error
  const gameIds = (games.data || []).map(g => g.id)
  const allocations = gameIds.length ? await supabase.from('allocations').select('*').in('game_id', gameIds).order('game_id') : { data: [], error: null } as any
  if (allocations.error) throw allocations.error
  const locks = gameIds.length ? await supabase.from('manual_locks').select('*').in('game_id', gameIds).order('game_id') : { data: [], error: null } as any
  if (locks.error) throw locks.error
  const availability = dayIds.length ? await supabase.from('umpire_availability').select('*').in('tournament_day_id', dayIds).order('umpire_id') : { data: [], error: null } as any
  if (availability.error) throw availability.error
  const rules = await supabase.from('tournament_rules').select('*').eq('tournament_id', tournamentId).order('rule_id')
  if (rules.error) throw rules.error
  const history = dayIds.length ? await supabase.from('allocation_change_history').select('*').in('tournament_day_id', dayIds).order('id') : { data: [], error: null } as any
  if (history.error) throw history.error

  const localAllocations = snapshot.tournament.days.flatMap(d => d.assignments).map(a => ({ game_id: a.gameId, umpire_id: a.umpireId, position: a.position })).sort((a,b) => `${a.game_id}:${a.position}`.localeCompare(`${b.game_id}:${b.position}`))
  const remoteAllocations = (allocations.data || []).map(a => ({ game_id: a.game_id, umpire_id: a.umpire_id, position: a.position })).sort((a,b) => `${a.game_id}:${a.position}`.localeCompare(`${b.game_id}:${b.position}`))
  const localGames = snapshot.tournament.days.flatMap(d => d.games).map(g => ({ id:g.id, number:g.number, date:g.date, start:parseTime(g.start,`Game ${g.number} start`), end:parseTime(g.end,`Game ${g.number} end`), field:g.field, teams:g.teams, division:g.division, positions:g.positions })).sort((a,b)=>a.id.localeCompare(b.id))
  const remoteGames = (games.data || []).map(g => ({ id:g.id, number:g.number, date:g.date, start:g.start_time, end:g.end_time, field:g.field, teams:g.teams, division:g.division, positions:g.positions })).sort((a,b)=>a.id.localeCompare(b.id))

  const equal = JSON.stringify({ name:snapshot.tournament.name, games:localGames, allocations:localAllocations, umpires:snapshot.umpires.map(u=>({id:u.id,name:u.name,experience:u.experience,maxGames:u.maxGames,availability:u.availability})).sort((a,b)=>a.id.localeCompare(b.id)) }) ===
    JSON.stringify({ name:tournament.data.name, games:remoteGames, allocations:remoteAllocations, umpires:(umpires.data || []).map(u=>({id:u.id,name:u.name,experience:u.experience,maxGames:u.max_games,availability:u.legacy_availability})).sort((a,b)=>a.id.localeCompare(b.id)) })

  return {
    equivalentCoreData: equal,
    counts: { days: days.data?.length || 0, games: games.data?.length || 0, umpires: umpires.data?.length || 0, allocations: allocations.data?.length || 0, manualLocks: locks.data?.length || 0, availability: availability.data?.length || 0, tournamentRules: rules.data?.length || 0, history: history.data?.length || 0 },
    note: 'Core tournament, game, umpire and allocation identity is compared directly. Day IDs are compared through legacy_id; derived workload, validation and selected-day UI state are intentionally not persisted.',
  }
}

export { MIGRATION_ID_KEY }
