import { Assignment, Game, Position, Umpire, Violation } from './types'

const start = (g: Game) => new Date(`${g.date}T${g.start}:00`).getTime()
const orderedGames = (games: Game[]) => [...games].sort((a,b)=>start(a)-start(b)||a.number-b.number)

export function validateUmpire(umpire: Umpire, games: Game[], assignments: Assignment[]): Violation[] {
  const ordered=orderedGames(games)
  const mine=assignments.filter(a=>a.umpireId===umpire.id).map(a=>({...a,game:games.find(g=>g.id===a.gameId)})).filter((a):a is typeof a & {game:Game}=>Boolean(a.game)).sort((a,b)=>start(a.game)-start(b.game)||a.position.localeCompare(b.position))
  const issues:Violation[]=[]

  const byDate=new Map<string,Set<string>>()
  for(const item of mine){const ids=byDate.get(item.game.date)??new Set<string>();ids.add(item.gameId);byDate.set(item.game.date,ids)}
  for(const [date,ids] of byDate) if(ids.size>umpire.maxGames) issues.push({umpireId:umpire.id,rule:'MAX_GAMES',severity:'hard',message:`Rule 1: ${umpire.name} has ${ids.size} games on ${date}, exceeding the maximum of ${umpire.maxGames}.`})

  for(let i=0;i<mine.length;i++) for(let j=i+1;j<mine.length;j++){
    const a=mine[i].game,b=mine[j].game
    if(a.date===b.date && start(b)<new Date(`${a.date}T${a.end}:00`).getTime() && start(a)<new Date(`${b.date}T${b.end}:00`).getTime()) issues.push({umpireId:umpire.id,rule:'BACK_TO_BACK',severity:'hard',gameId:mine[j].gameId,message:`${umpire.name} is double-booked between Game ${a.number} and Game ${b.number}.`})
  }

  for(let i=0;i<mine.length-1;i++){
    const current=mine[i],next=mine[i+1]
    if(current.game.date!==next.game.date) continue
    const ci=ordered.findIndex(g=>g.id===current.gameId),ni=ordered.findIndex(g=>g.id===next.gameId)
    if(ni!==ci+1) continue
    if(current.position==='Plate') issues.push({umpireId:umpire.id,rule:'PLATE_BREAK',severity:'hard',gameId:next.gameId,message:`Rule 3: Plate on Game ${current.game.number} requires the next scheduled game off.`})
    else if(next.position==='Base'||next.position==='Base 1'||next.position==='Base 2'||next.position==='Base 3') issues.push({umpireId:umpire.id,rule:'BACK_TO_BACK',severity:'hard',gameId:next.gameId,message:`Rule 2: back-to-back games must be Base → Plate. Game ${current.game.number} is Base, so Game ${next.game.number} must be Plate.`})
  }

  const plateCountByDate=new Map<string,number>()
  for(const item of mine) if(item.position==='Plate') plateCountByDate.set(item.game.date,(plateCountByDate.get(item.game.date)||0)+1)
  for(const [date,count] of plateCountByDate) if(count>1) issues.push({umpireId:umpire.id,rule:'PLATE_BALANCE',severity:'soft',message:`Soft rule: ${umpire.name} has ${count} Plate assignments on ${date}. Aim for no more than one Plate game per day.`})
  return issues
}

export function canAssign(umpire:Umpire,game:Game,position:Position,games:Game[],assignments:Assignment[]){
  if(assignments.some(a=>a.gameId===game.id&&a.umpireId===umpire.id)) return false
  const trial=[...assignments,{gameId:game.id,umpireId:umpire.id,position}]
  return !validateUmpire(umpire,games,trial).some(v=>v.severity==='hard'&&(v.gameId===game.id||v.rule==='MAX_GAMES'||v.rule==='BACK_TO_BACK'))
}

export function allocate(games:Game[],umpires:Umpire[]){
  const assignments:Assignment[]=[]
  const unallocated:{game:Game;position:Position;reasons:string[]}[]=[]
  for(const game of orderedGames(games)){
    for(const position of game.positions){
      const candidates=umpires.filter(u=>canAssign(u,game,position,games,assignments)).sort((a,b)=>{
        const score=(u:Umpire)=>{const mine=assignments.filter(x=>x.umpireId===u.id),count=new Set(mine.map(x=>x.gameId)).size,plates=mine.filter(x=>x.position==='Plate').length;return count*100+plates*40+mine.length}
        return score(a)-score(b)||a.name.localeCompare(b.name)
      })
      if(candidates[0]) assignments.push({gameId:game.id,umpireId:candidates[0].id,position})
      else unallocated.push({game,position,reasons:['No available umpire satisfies all hard rules.']})
    }
  }
  return {assignments,unallocated}
}
