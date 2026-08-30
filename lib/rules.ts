import { Assignment, Game, Position, Umpire, Violation } from './types'
import { DEFAULT_RULE_IDS } from './tournament-rules'

const start = (g: Game) => new Date(`${g.date}T${g.start}:00`).getTime()
const orderedGames = (games: Game[]) => [...games].sort((a,b)=>start(a)-start(b)||a.number-b.number)
const configuredRuleIds = () => {
  if (typeof window === 'undefined') return DEFAULT_RULE_IDS
  try { const raw=window.localStorage.getItem('softball-enabled-rules'); const parsed=raw?JSON.parse(raw):null; return Array.isArray(parsed)&&parsed.length?parsed:DEFAULT_RULE_IDS } catch { return DEFAULT_RULE_IDS }
}
const enabled = (ids?: string[]) => new Set(ids ?? configuredRuleIds())

// Treat the two team names in a game as the countries represented in that game.
// Supports the common "Team A v Team B" / "Team A vs Team B" schedule formats.
const countriesInGame = (game: Game): string[] => game.teams.split(/\s+(?:v|vs|versus)\s+/i).map(x=>x.trim().toLowerCase()).filter(Boolean)

export function validateUmpire(umpire: Umpire, games: Game[], assignments: Assignment[], activeRuleIds?: string[]): Violation[] {
  const rules=enabled(activeRuleIds), ordered=orderedGames(games)
  const mine=assignments.filter(a=>a.umpireId===umpire.id).map(a=>({...a,game:games.find(g=>g.id===a.gameId)})).filter((a):a is typeof a&{game:Game}=>Boolean(a.game)).sort((a,b)=>start(a.game)-start(b.game)||a.position.localeCompare(b.position))
  const issues: Violation[]=[]
  const byDate=new Map<string,Set<string>>()
  for(const item of mine){const ids=byDate.get(item.game.date)??new Set<string>();ids.add(item.gameId);byDate.set(item.game.date,ids)}
  if(rules.has('max-games')) for(const [date,ids] of byDate) if(ids.size>umpire.maxGames) issues.push({umpireId:umpire.id,rule:'MAX_GAMES',severity:'hard',message:`Rule 1: ${umpire.name} has ${ids.size} games on ${date}, exceeding the maximum of ${umpire.maxGames}.`})
  if(rules.has('no-double-booking')) for(let i=0;i<mine.length;i++) for(let j=i+1;j<mine.length;j++){const a=mine[i].game,b=mine[j].game;if(a.date===b.date&&start(b)<new Date(`${a.date}T${a.end}:00`).getTime()&&start(a)<new Date(`${b.date}T${b.end}:00`).getTime()) issues.push({umpireId:umpire.id,rule:'NO_DOUBLE_BOOKING',severity:'hard',gameId:mine[j].gameId,message:`${umpire.name} is double-booked between Game ${a.number} and Game ${b.number}.`})}
  for(let i=0;i<mine.length-1;i++){const current=mine[i],next=mine[i+1];if(current.game.date!==next.game.date)continue;const ci=ordered.findIndex(g=>g.id===current.gameId),ni=ordered.findIndex(g=>g.id===next.gameId);if(ni!==ci+1)continue;if(rules.has('plate-break')&&current.position==='Plate')issues.push({umpireId:umpire.id,rule:'PLATE_BREAK',severity:'hard',gameId:next.gameId,message:`Rule 3: Plate on Game ${current.game.number} requires the next scheduled game off.`});if(rules.has('back-to-back')&&current.position!=='Plate'&&next.position!=='Plate')issues.push({umpireId:umpire.id,rule:'BACK_TO_BACK',severity:'hard',gameId:next.gameId,message:`Rule 2: back-to-back games must be Base → Plate. Game ${current.game.number} is Base, so Game ${next.game.number} must be Plate.`})}
  if(rules.has('one-plate')){const plates=new Map<string,number>();for(const item of mine)if(item.position==='Plate')plates.set(item.game.date,(plates.get(item.game.date)||0)+1);for(const [date,count] of plates)if(count>1)issues.push({umpireId:umpire.id,rule:'ONE_PLATE',severity:'soft',message:`Soft rule: ${umpire.name} has ${count} Plate assignments on ${date}. Aim for no more than one Plate game per day.`})}
  return issues
}

export function canAssign(umpire:Umpire,game:Game,position:Position,games:Game[],assignments:Assignment[],activeRuleIds?:string[]){if(assignments.some(a=>a.gameId===game.id&&a.umpireId===umpire.id))return false;const trial=[...assignments,{gameId:game.id,umpireId:umpire.id,position}];return !validateUmpire(umpire,games,trial,activeRuleIds).some(v=>v.severity==='hard'&&(v.gameId===game.id||v.rule==='MAX_GAMES'||v.rule==='NO_DOUBLE_BOOKING'||v.rule==='BACK_TO_BACK'||v.rule==='PLATE_BREAK'))}
export function allocate(games:Game[],umpires:Umpire[],activeRuleIds?:string[]){return allocateUnlocked(games,umpires,[],activeRuleIds)}

export function allocateUnlocked(games:Game[],umpires:Umpire[],lockedAssignments:Assignment[],activeRuleIds?:string[]){
 const rules=enabled(activeRuleIds),assignments=[...lockedAssignments];const unallocated:{game:Game;position:Position;reasons:string[]}[]=[]
 for(const game of orderedGames(games))for(const position of game.positions){if(assignments.some(a=>a.gameId===game.id&&a.position===position))continue
  const candidates=umpires.filter(u=>canAssign(u,game,position,games,assignments,activeRuleIds)).sort((a,b)=>{
   const score=(u:Umpire)=>{const mine=assignments.filter(x=>x.umpireId===u.id),count=new Set(mine.map(x=>x.gameId)).size,plates=mine.filter(x=>x.position==='Plate').length;let s=count*100+mine.length
    if(rules.has('plate-balance'))s+=plates*40
    if(rules.has('one-plate'))s+=plates*25
    if(rules.has('same-country')){const targetCountries=countriesInGame(game);for(const x of mine){const g=games.find(y=>y.id===x.gameId);if(g&&targetCountries.some(c=>countriesInGame(g).includes(c)))s+=25}}
    if(rules.has('same-partner')){const partners=assignments.filter(x=>x.gameId===game.id&&x.umpireId!==u.id);for(const p of partners){const prior=assignments.filter(x=>x.umpireId===u.id&&x.gameId!==game.id&&assignments.some(y=>y.gameId===x.gameId&&y.umpireId===p.umpireId));if(prior.length)s+=35}}
    return s}
   return score(a)-score(b)||a.name.localeCompare(b.name)
  })
  if(candidates[0])assignments.push({gameId:game.id,umpireId:candidates[0].id,position});else unallocated.push({game,position,reasons:['No available umpire satisfies the enabled hard rules. Locked assignments were preserved.']})
 }
 return {assignments,unallocated}
}
