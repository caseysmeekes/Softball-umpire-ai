import { Assignment, Game, Position, Umpire, Violation } from './types'
import { DEFAULT_RULE_IDS } from './tournament-rules'

const start = (g: Game) => new Date(`${g.date}T${g.start}:00`).getTime()
const end = (g: Game) => g.end ? new Date(`${g.date}T${g.end}:00`).getTime() : start(g)
const orderedGames = (games: Game[]) => [...games].sort((a, b) => start(a) - start(b) || a.number - b.number)

const configuredRuleIds = () => {
  if (typeof window === 'undefined') return DEFAULT_RULE_IDS
  try {
    const raw = window.localStorage.getItem('softball-enabled-rules')
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_RULE_IDS
  } catch {
    return DEFAULT_RULE_IDS
  }
}

const enabled = (ids?: string[]) => new Set(ids ?? configuredRuleIds())
const countriesInGame = (game: Game) => game.teams.split(/\s+(?:v|vs|versus)\s+/i).map(x => x.trim().toLowerCase()).filter(Boolean)
const isBase = (position: Position) => position !== 'Plate'

const availabilityForGame = (umpire: Umpire, dayIndex: number) => {
  // Validation can be called from an event handler immediately after availability
  // changes. Prefer the latest persisted umpire record when available so the
  // validation layer cannot retain an older availability snapshot.
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('softball-umpires')
      const stored = raw ? JSON.parse(raw) : null
      if (Array.isArray(stored)) {
        const current = stored.find((u: Umpire) => u.id === umpire.id)
        if (current) return current.availabilityByDay?.[dayIndex]
      }
    } catch {
      // Fall back to the umpire object supplied by the caller.
    }
  }
  return umpire.availabilityByDay?.[dayIndex]
}

const availabilityCoversGame = (umpire: Umpire, game: Game, dayIndex: number) => {
  const configured = availabilityForGame(umpire, dayIndex)
  if (!configured) return true
  if (!configured.enabled) return false
  if (!configured.from || !configured.until) return false
  const gameStart = game.start
  const gameEnd = game.end || game.start
  return gameStart >= configured.from && gameEnd <= configured.until
}

export function validateUmpire(
  umpire: Umpire,
  games: Game[],
  assignments: Assignment[],
  activeRuleIds?: string[],
  dayIndex = 0,
): Violation[] {
  const rules = enabled(activeRuleIds)
  const ordered = orderedGames(games)
  const mine = assignments
    .filter(a => a.umpireId === umpire.id)
    .map(a => ({ ...a, game: games.find(g => g.id === a.gameId) }))
    .filter((a): a is typeof a & { game: Game } => Boolean(a.game))
    .sort((a, b) => start(a.game) - start(b.game) || a.position.localeCompare(b.position))

  const issues: Violation[] = []

  const byGame = new Map<string, typeof mine>()
  for (const item of mine) {
    const existing = byGame.get(item.gameId) ?? []
    existing.push(item)
    byGame.set(item.gameId, existing)
  }
  for (const [gameId, items] of byGame) {
    if (items.length > 1) {
      const game = items[0].game
      const positions = items.map(item => item.position).join(' and ')
      issues.push({
        umpireId: umpire.id,
        rule: 'SAME_GAME_MULTIPLE_POSITIONS',
        severity: 'hard',
        gameId,
        message: `Core rule: One position per game. ${umpire.name} is assigned to multiple positions in Game ${game.number} (${positions}).`,
      })
    }
  }

  const byDate = new Map<string, Set<string>>()
  for (const item of mine) {
    const ids = byDate.get(item.game.date) ?? new Set<string>()
    ids.add(item.gameId)
    byDate.set(item.game.date, ids)
  }

  if (rules.has('max-games')) {
    for (const [date, ids] of byDate) {
      if (ids.size > umpire.maxGames) {
        issues.push({
          umpireId: umpire.id,
          rule: 'MAX_GAMES',
          severity: 'hard',
          message: `Rule 1: ${umpire.name} has ${ids.size} games on ${date}, exceeding the maximum of ${umpire.maxGames}.`,
        })
      }
    }
  }

  if (rules.has('no-double-booking')) {
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        const a = mine[i]
        const b = mine[j]
        if (a.game.date !== b.game.date || a.gameId === b.gameId) continue

        const aStart = start(a.game)
        const bStart = start(b.game)
        const aEnd = Math.max(end(a.game), aStart)
        const bEnd = Math.max(end(b.game), bStart)
        const overlaps = aStart === bStart || (aStart < bEnd && bStart < aEnd)

        if (overlaps) {
          const message = `Core rule: No double booking. ${umpire.name} is assigned to Game ${a.game.number} and Game ${b.game.number} at overlapping times (${a.game.start} and ${b.game.start}).`
          issues.push({ umpireId: umpire.id, rule: 'NO_DOUBLE_BOOKING', severity: 'hard', gameId: a.gameId, message })
          issues.push({ umpireId: umpire.id, rule: 'NO_DOUBLE_BOOKING', severity: 'hard', gameId: b.gameId, message })
        }
      }
    }
  }

  const gamesForUmpire = [...byGame.values()]
    .map(items => ({ game: items[0].game, positions: items.map(item => item.position) }))
    .sort((a, b) => start(a.game) - start(b.game) || a.game.number - b.game.number)

  for (let i = 0; i < gamesForUmpire.length - 1; i++) {
    const current = gamesForUmpire[i]
    const next = gamesForUmpire[i + 1]
    if (current.game.date !== next.game.date) continue

    const ci = ordered.findIndex(g => g.id === current.game.id)
    const ni = ordered.findIndex(g => g.id === next.game.id)
    if (ci < 0 || ni !== ci + 1) continue

    if (rules.has('plate-break') && current.positions.includes('Plate')) {
      issues.push({
        umpireId: umpire.id,
        rule: 'PLATE_BREAK',
        severity: 'hard',
        gameId: next.game.id,
        message: `Rule 3: Plate on Game ${current.game.number} requires the next scheduled game off.`,
      })
    }

    const plateToBase = current.positions.includes('Plate') && next.positions.some(isBase)
    if (rules.has('back-to-back') && plateToBase) {
      issues.push({
        umpireId: umpire.id,
        rule: 'BACK_TO_BACK',
        severity: 'hard',
        gameId: next.game.id,
        message: `Core rule: Back-to-back games cannot be Plate → Base. ${umpire.name} worked Plate on Game ${current.game.number} and Base on Game ${next.game.number}.`,
      })
    }
  }

  if (rules.has('availability')) {
    for (const item of mine) {
      const configured = availabilityForGame(umpire, dayIndex)
      if (configured && !availabilityCoversGame(umpire, item.game, dayIndex)) {
        const window = configured.enabled && configured.from && configured.until ? `${configured.from}–${configured.until}` : 'unavailable'
        issues.push({
          umpireId: umpire.id,
          rule: 'AVAILABILITY',
          severity: 'hard',
          gameId: item.gameId,
          message: `Core rule: Umpire availability. ${umpire.name} is not available for Game ${item.game.number} (${item.game.start}${item.game.end ? `–${item.game.end}` : ''}). Configured availability: ${window}.`,
        })
      }
    }
  }

  if (rules.has('one-plate')) {
    const plates = new Map<string, number>()
    for (const item of mine) {
      if (item.position === 'Plate') plates.set(item.game.date, (plates.get(item.game.date) || 0) + 1)
    }
    for (const [date, count] of plates) {
      if (count > 1) {
        issues.push({
          umpireId: umpire.id,
          rule: 'ONE_PLATE',
          severity: 'soft',
          message: `Soft rule: ${umpire.name} has ${count} Plate assignments on ${date}. Aim for no more than one Plate game per day.`,
        })
      }
    }
  }

  return issues
}

export function canAssign(
  umpire: Umpire,
  game: Game,
  position: Position,
  games: Game[],
  assignments: Assignment[],
  activeRuleIds?: string[],
  dayIndex = 0,
) {
  if (assignments.some(a => a.gameId === game.id && a.umpireId === umpire.id)) return false
  const trial = [...assignments, { gameId: game.id, umpireId: umpire.id, position }]
  return !validateUmpire(umpire, games, trial, activeRuleIds, dayIndex).some(v =>
    v.severity === 'hard' &&
    (v.gameId === game.id || v.rule === 'MAX_GAMES' || v.rule === 'NO_DOUBLE_BOOKING' || v.rule === 'BACK_TO_BACK' || v.rule === 'PLATE_BREAK' || v.rule === 'AVAILABILITY' || v.rule === 'SAME_GAME_MULTIPLE_POSITIONS')
  )
}

export function allocate(games: Game[], umpires: Umpire[], activeRuleIds?: string[], lockedAssignments: Assignment[] = [], dayIndex = 0) {
  return allocateUnlocked(games, umpires, lockedAssignments, activeRuleIds, dayIndex)
}

export function allocateUnlocked(games: Game[], umpires: Umpire[], lockedAssignments: Assignment[], activeRuleIds?: string[], dayIndex = 0) {
  const rules = enabled(activeRuleIds)
  const assignments = [...lockedAssignments]
  const unallocated: { game: Game; position: Position; reasons: string[] }[] = []
  const gameCount = (u: Umpire) => new Set(assignments.filter(a => a.umpireId === u.id).map(a => a.gameId)).size
  const plateCount = (u: Umpire) => assignments.filter(a => a.umpireId === u.id && a.position === 'Plate').length
  const randomTie = (u: Umpire) => u.id + '-' + Math.random().toString(36).slice(2, 10)

  for (const game of orderedGames(games)) {
    for (const position of game.positions) {
      if (assignments.some(a => a.gameId === game.id && a.position === position)) continue
      let candidates = umpires.filter(u => canAssign(u, game, position, games, assignments, activeRuleIds, dayIndex))
      const tieBreak = new Map(candidates.map(u => [u.id, randomTie(u)]))
      candidates.sort((a, b) => {
        const score = (u: Umpire) => {
          const mine = assignments.filter(x => x.umpireId === u.id)
          const count = gameCount(u)
          const plates = plateCount(u)
          let s = count * 100 + mine.length
          if (position === 'Plate' && rules.has('one-plate')) s += plates * 250
          if (position === 'Plate' && rules.has('plate-balance')) s += plates * 100
          if (position !== 'Plate' && rules.has('plate-balance')) s += plates * 20
          if (rules.has('one-plate')) s += plates * 80
          if (rules.has('same-country')) {
            const target = countriesInGame(game)
            for (const x of mine) {
              const g = games.find(y => y.id === x.gameId)
              if (g && target.some(c => countriesInGame(g).includes(c))) s += 25
            }
          }
          if (rules.has('same-partner')) {
            const partners = assignments.filter(x => x.gameId === game.id && x.umpireId !== u.id)
            for (const p of partners) {
              const prior = assignments.some(x =>
                x.umpireId === u.id &&
                x.gameId !== game.id &&
                assignments.some(y => y.gameId === x.gameId && y.umpireId === p.umpireId)
              )
              if (prior) s += 35
            }
          }
          return s
        }
        return score(a) - score(b) || tieBreak.get(a.id)!.localeCompare(tieBreak.get(b.id)!)
      })

      if (position === 'Plate' && rules.has('one-plate')) {
        const unplated = candidates.filter(u => plateCount(u) === 0)
        if (unplated.length) candidates = unplated
      }

      if (candidates[0]) assignments.push({ gameId: game.id, umpireId: candidates[0].id, position })
      else unallocated.push({ game, position, reasons: ['No available umpire satisfies the enabled hard rules. Locked assignments were preserved.'] })
    }
  }

  return { assignments, unallocated }
}
