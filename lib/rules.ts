import { Assignment, Game, Position, Umpire, Violation } from './types'

const minutes = (game: Game) => {
  const [h, m] = game.start.split(':').map(Number)
  return h * 60 + m
}

const endMinutes = (game: Game) => {
  const [h, m] = game.end.split(':').map(Number)
  return h * 60 + m
}

export function validateUmpire(umpire: Umpire, games: Game[], assignments: Assignment[]): Violation[] {
  const mine = assignments
    .filter(a => a.umpireId === umpire.id)
    .map(a => ({ ...a, game: games.find(g => g.id === a.gameId)! }))
    .filter(a => a.game)
    .sort((a, b) => minutes(a.game) - minutes(b.game))

  const violations: Violation[] = []
  if (mine.length > umpire.maxGames) {
    violations.push({ umpireId: umpire.id, rule: 'MAX_GAMES', message: `Maximum ${umpire.maxGames} games per day exceeded.` })
  }

  for (let i = 0; i < mine.length - 1; i++) {
    const current = mine[i]
    const next = mine[i + 1]
    const consecutive = endMinutes(current.game) >= minutes(next.game)

    if (consecutive && current.position === 'Plate') {
      violations.push({ umpireId: umpire.id, rule: 'PLATE_BREAK', gameId: next.gameId, message: `Plate on Game ${current.game.number} requires at least one game off before Game ${next.game.number}.` })
    } else if (consecutive && current.position === 'Base' && next.position !== 'Plate') {
      violations.push({ umpireId: umpire.id, rule: 'BACK_TO_BACK', gameId: next.gameId, message: `Back-to-back games must follow Base → Plate. Game ${current.game.number} is Base, so Game ${next.game.number} must be Plate.` })
    } else if (consecutive && current.position === 'Plate') {
      violations.push({ umpireId: umpire.id, rule: 'PLATE_BREAK', gameId: next.gameId, message: `A break is required after a Plate assignment.` })
    }
  }
  return violations
}

export function canAssign(umpire: Umpire, game: Game, position: Position, games: Game[], assignments: Assignment[]) {
  const trial = [...assignments, { gameId: game.id, umpireId: umpire.id, position }]
  return validateUmpire(umpire, games, trial).filter(v => v.gameId === game.id || v.rule === 'MAX_GAMES').length === 0
}

export function allocate(games: Game[], umpires: Umpire[]) {
  const assignments: Assignment[] = []
  const unallocated: { game: Game; position: Position; reasons: string[] }[] = []
  const ordered = [...games].sort((a, b) => new Date(`${a.date}T${a.start}`).getTime() - new Date(`${b.date}T${b.start}`).getTime())

  for (const game of ordered) {
    for (const position of game.positions) {
      const candidates = umpires
        .filter(u => canAssign(u, game, position, games, assignments))
        .sort((a, b) => {
          const ac = assignments.filter(x => x.umpireId === a.id).length
          const bc = assignments.filter(x => x.umpireId === b.id).length
          const ap = assignments.filter(x => x.umpireId === a.id && x.position === 'Plate').length
          const bp = assignments.filter(x => x.umpireId === b.id && x.position === 'Plate').length
          return (ac * 10 + ap) - (bc * 10 + bp)
        })
      const chosen = candidates[0]
      if (chosen) assignments.push({ gameId: game.id, umpireId: chosen.id, position })
      else unallocated.push({ game, position, reasons: ['No available umpire satisfies all active allocation rules.'] })
    }
  }
  return { assignments, unallocated }
}
