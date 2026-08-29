export type Position = 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'

export type Game = {
  id: string
  number: number
  date: string
  start: string
  end: string
  field: string
  teams: string
  division: string
  positions: Position[]
}

export type Umpire = {
  id: string
  name: string
  availability: string
  maxGames: number
  experience: 'International' | 'National' | 'Regional' | 'Developing'
}

export type Assignment = {
  gameId: string
  umpireId: string
  position: Position
}

export type Violation = {
  umpireId: string
  rule: 'MAX_GAMES' | 'BACK_TO_BACK' | 'PLATE_BREAK'
  message: string
  gameId?: string
}
