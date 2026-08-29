import { Assignment, Game, Position, Umpire, Violation } from './types'

const start = (g: Game) => new Date(`${g.date}T${g.start}:00`).getTime()
const end = (g: Game) => new Date(`${g.date}T${g.end}:00`).getTime()
const orderedGames = (games: Game[]) => [...games].sort((a,b) => start(a)-start(b) || a.number-b.number)

export function validateUmpire(umpire: Umpire, games: Game[], assignments: Assignment[]): Violation[] {
  const ordered = orderedGames(games)
  const mine = assignments
    .filter(a => a.umpireId === umpire.id)
    .map(a => ({ ...a, game: games.find(g => g.id === a.gameId) }))
    .filter((a): a is typeof a & { game: Game } => Boolean(a.game))
    .sort((a,b) => start(a.game)-start(b.game) || a.position.localeCompare(b.position))
  const violations: Violation[] = []

  // Rule 1 is a daily limit, not a limit across the whole tournament.
  const byDate = new Map<string, Set<string>>()
  for (const item of mine) {
    const ids = byDate.get(item.game.date) ?? new Set<string>()
    ids.add(item.gameId)
    byDate.set(item.game.date, ids)
  }
  for (const [date, ids] of byDate) {
    if (ids.size > umpire.maxGames) violations.push({
      umpireId: umpire.id, rule: 'MAX_GAMES',
      message: `Rule 1: ${umpire.name} has ${ids.size} games on ${date}, exceeding the maximum of ${umpire.maxGames}.`
    })
  }

  // An umpire can never be on two games at the same time.
  for (let i=0;i<mine.length;i++) for (let j=i+1;j<mine.length;j++) {
    const a=mine[i].game, b=mine[j].game
    if (a.date===b.date && start(b)<end(a) && start(a)<end(b)) violations.push({
      umpireId: umpire.id, rule: 'BACK_TO_BACK', gameId: mine[j].gameId,
      message: `Rule check: ${umpire.name} is double-booked between Game ${a.number} and Game ${b.number}.`
    })
  }

  // Rules 2 and 3 use tournament schedule order. A short changeover gap is NOT a break.
  for (let i=0;i<mine.length-1;i++) {
    const current=mine[i], next=mine[i+1]
    if (current.gameId===next.gameId || current.game.date!==next.game.date) continue
    const ci=ordered.findIndex(g=>g.id===current.gameId), ni=ordered.findIndex(g=>g.id===next.gameId)
    if (ci<0 || ni<=ci) continue
    const isBackToBack = ni===ci+1
    if (isBackToBack && current.position==='Plate') violations.push({
      umpireId: umpire.id, rule: 'PLATE_BREAK', gameId: next.gameId,
      message: `Rule 3: Plate on Game ${current.game.number} requires at least one game off before Game ${next.game.number}.`
    })
    else if (isBackToBack && next.position!=='Plate') violations.push({
      umpireId: umpire.id, rule: 'BACK_TO_BACK', gameId: next.gameId,
      message: `Rule 2: back-to-back games must be Base → Plate. Game ${current.game.number} is ${current.position}, so Game ${next.game.number} must be Plate.`
    })
  }
  return violations
}

export function canAssign(umpire: Umpire, game: Game, position: Position, games: Game[], assignments: Assignment[]) {
  if (assignments.some(a=>a.gameId===game.id && a.umpireId===umpire.id)) return false
  const trial=[...assignments,{gameId:game.id,umpireId:umpire.id,position}]
  const violations=validateUmpire(umpire,games,trial)
  return !violations.some(v=>v.rule==='MAX_GAMES' || v.gameId===game.id)
}

export function allocate(games: Game[], umpires: Umpire[]) {
  const assignments: Assignment[]=[]
  const unallocated:{game:Game;position:Position;reasons:string[]}[]=[]
  for (const game of orderedGames(games)) {
    // Allocate bases first so Base → Plate can naturally be selected on the next game.
    const positions=[...game.positions].sort((a,b)=>(a==='Plate'?1:0)-(b==='Plate'?1:0))
    for (const position of positions) {
      const candidates=umpires.filter(u=>canAssign(u,game,position,games,assignments)).sort((a,b)=>{
        const score=(u:Umpire)=>{
          const mine=assignments.filter(x=>x.umpireId===u.id)
          const count=new Set(mine.map(x=>x.gameId)).size
          const plates=mine.filter(x=>x.position==='Plate').length
          return count*100+plates*15+mine.length
        }
        return score(a)-score(b) || a.name.localeCompare(b.name)
      })
      if (candidates[0]) assignments.push({gameId:game.id,umpireId:candidates[0].id,position})
      else unallocated.push({game,position,reasons:['No available umpire satisfies all active rules.']})
    }
  }
  return {assignments,unallocated}
}
