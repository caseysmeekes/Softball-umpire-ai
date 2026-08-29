import { Assignment, Game, Position, Umpire, Violation } from './types'

const start = (g: Game) => new Date(`${g.date}T${g.start}:00`).getTime()
const end = (g: Game) => new Date(`${g.date}T${g.end}:00`).getTime()
const orderedGames = (games: Game[]) => [...games].sort((a,b) => start(a) - start(b) || a.number - b.number)

/** Rules are deliberately independent so new tournament rules can be added later. */
export function validateUmpire(umpire: Umpire, games: Game[], assignments: Assignment[]): Violation[] {
  const ordered = orderedGames(games)
  const mine = assignments
    .filter(a => a.umpireId === umpire.id)
    .map(a => ({ ...a, game: games.find(g => g.id === a.gameId)! }))
    .filter(a => a.game)
    .sort((a,b) => start(a.game) - start(b.game) || a.position.localeCompare(b.position))

  const violations: Violation[] = []
  const gameCount = new Set(mine.map(a => a.gameId)).size
  if (gameCount > umpire.maxGames) violations.push({ umpireId: umpire.id, rule: 'MAX_GAMES', message: `Maximum ${umpire.maxGames} games per day exceeded.` })

  for (let i = 0; i < mine.length - 1; i++) {
    const current = mine[i]
    const next = mine[i + 1]
    if (current.gameId === next.gameId) continue

    const currentIndex = ordered.findIndex(g => g.id === current.gameId)
    const nextIndex = ordered.findIndex(g => g.id === next.gameId)
    const consecutive = currentIndex >= 0 && nextIndex === currentIndex + 1 && end(current.game) <= start(next.game)
    if (!consecutive) continue

    if (current.position === 'Plate') {
      violations.push({ umpireId: umpire.id, rule: 'PLATE_BREAK', gameId: next.gameId, message: `Rule 3: Plate on Game ${current.game.number} requires at least one game off before Game ${next.game.number}.` })
    } else if (next.position !== 'Plate') {
      violations.push({ umpireId: umpire.id, rule: 'BACK_TO_BACK', gameId: next.gameId, message: `Rule 2: back-to-back games must be Base → Plate. Game ${current.game.number} is ${current.position}, so Game ${next.game.number} must be Plate.` })
    }
  }
  return violations
}

export function canAssign(umpire: Umpire, game: Game, position: Position, games: Game[], assignments: Assignment[]) {
  if (assignments.some(a => a.gameId === game.id && a.umpireId === umpire.id)) return false
  const trial = [...assignments, { gameId: game.id, umpireId: umpire.id, position }]
  return !validateUmpire(umpire, games, trial).some(v => v.umpireId === umpire.id && (v.gameId === game.id || v.rule === 'MAX_GAMES'))
}

export function allocate(games: Game[], umpires: Umpire[]) {
  const assignments: Assignment[] = []
  const unallocated: { game: Game; position: Position; reasons: string[] }[] = []
  for (const game of orderedGames(games)) {
    // Bases are allocated first so a Base umpire can naturally roll into Plate on the next game.
    const positions = [...game.positions].sort((a,b) => (a === 'Plate' ? 1 : 0) - (b === 'Plate' ? 1 : 0))
    for (const position of positions) {
      const candidates = umpires.filter(u => canAssign(u, game, position, games, assignments)).sort((a,b) => {
        const score = (u: Umpire) => {
          const mine = assignments.filter(x => x.umpireId === u.id)
          const plates = mine.filter(x => x.position === 'Plate').length
          const gamesDone = new Set(mine.map(x => x.gameId)).size
          return gamesDone * 100 + plates * 10
        }
        return score(a) - score(b)
      })
      if (candidates[0]) assignments.push({ gameId: game.id, umpireId: candidates[0].id, position })
      else unallocated.push({ game, position, reasons: ['No available umpire satisfies all active rules.'] })
    }
  }
  return { assignments, unallocated }
}
