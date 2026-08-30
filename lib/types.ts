export type Position = 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'
export type Experience = 'International' | 'National' | 'Regional' | 'Developing'
export type UmpireAvailability = { enabled: boolean; from: string; until: string }
export type Game = { id:string; number:number; date:string; start:string; end?:string; field:string; teams:string; division:string; positions:Position[] }
export type Umpire = { id:string; name:string; availability:string; availabilityByDay?: Record<number, UmpireAvailability>; maxGames:number; experience:Experience }
export type Assignment = { gameId:string; umpireId:string; position:Position }
export type Violation = { umpireId:string; rule:'MAX_GAMES'|'BACK_TO_BACK'|'PLATE_BREAK'|'PLATE_BALANCE'|'NO_DOUBLE_BOOKING'|'ONE_PLATE'|'SAME_GAME_MULTIPLE_POSITIONS'|'AVAILABILITY'; severity:'hard'|'soft'; message:string; gameId?:string }
