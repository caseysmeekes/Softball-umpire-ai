import type { Assignment, Game, Umpire } from './types'

export type AnalysisMatrix = {
  rowLabels: string[]
  columnLabels: string[]
  values: number[][]
}

export function splitTeams(value: string): string[] {
  return value
    .split(/\s+(?:vs\.?|v\.?|@)\s+/i)
    .map(team => team.trim())
    .filter(Boolean)
}

export function buildUmpirePairingMatrix(
  umpires: Umpire[],
  games: Game[],
  assignments: Assignment[],
): AnalysisMatrix {
  const labels = umpires.map(umpire => umpire.name)
  const values = labels.map(() => labels.map(() => 0))
  const indexById = new Map(umpires.map((umpire, index) => [umpire.id, index]))

  for (const game of games) {
    const gameUmpireIndexes = Array.from(
      new Set(
        assignments
          .filter(assignment => assignment.gameId === game.id)
          .map(assignment => indexById.get(assignment.umpireId))
          .filter((index): index is number => index !== undefined),
      ),
    )

    for (let i = 0; i < gameUmpireIndexes.length; i += 1) {
      for (let j = i + 1; j < gameUmpireIndexes.length; j += 1) {
        const first = gameUmpireIndexes[i]
        const second = gameUmpireIndexes[j]
        values[first][second] += 1
        values[second][first] += 1
      }
    }
  }

  return { rowLabels: labels, columnLabels: labels, values }
}

export function buildUmpireTeamMatrix(
  umpires: Umpire[],
  games: Game[],
  assignments: Assignment[],
): AnalysisMatrix {
  const teams = Array.from(new Set(games.flatMap(game => splitTeams(game.teams))))
    .sort((a, b) => a.localeCompare(b))
  const rowLabels = umpires.map(umpire => umpire.name)
  const values = rowLabels.map(() => teams.map(() => 0))
  const indexById = new Map(umpires.map((umpire, index) => [umpire.id, index]))
  const teamIndexByName = new Map(teams.map((team, index) => [team, index]))

  for (const game of games) {
    const teamIndexes = Array.from(new Set(splitTeams(game.teams)))
      .map(team => teamIndexByName.get(team))
      .filter((index): index is number => index !== undefined)
    const gameUmpireIndexes = Array.from(
      new Set(
        assignments
          .filter(assignment => assignment.gameId === game.id)
          .map(assignment => indexById.get(assignment.umpireId))
          .filter((index): index is number => index !== undefined),
      ),
    )

    for (const umpireIndex of gameUmpireIndexes) {
      for (const teamIndex of teamIndexes) {
        values[umpireIndex][teamIndex] += 1
      }
    }
  }

  return { rowLabels, columnLabels: teams, values }
}
