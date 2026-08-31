import { getSupabaseClient } from './client'
import type { Database } from './database.types'

type TournamentRow = Database['public']['Tables']['tournaments']['Row']
export type TournamentSummary = TournamentRow & { dayCount:number; gameCount:number; umpireCount:number }

export async function getTournamentSummaries(): Promise<TournamentSummary[]> {
  const s=getSupabaseClient()
  const {data:ts,error:te}=await s.from('tournaments').select('*').order('updated_at',{ascending:false})
  if(te) throw te
  const rows=ts||[]; if(!rows.length) return []
  const ids=rows.map(t=>t.id)
  const [{data:ds,error:de},{data:us,error:ue}]=await Promise.all([
    s.from('tournament_days').select('id,tournament_id').in('tournament_id',ids),
    s.from('umpires').select('id,tournament_id').in('tournament_id',ids)
  ])
  if(de) throw de; if(ue) throw ue
  const days=ds||[], dayIds=days.map(d=>d.id), byDay=new Map(days.map(d=>[d.id,d.tournament_id]))
  const {data:gs,error:ge}=dayIds.length?s.from('games').select('id,tournament_day_id').in('tournament_day_id',dayIds):{data:[],error:null}
  if(ge) throw ge
  const dayCount=new Map<string,number>(),gameCount=new Map<string,number>(),umpireCount=new Map<string,number>()
  days.forEach(d=>dayCount.set(d.tournament_id,(dayCount.get(d.tournament_id)||0)+1))
  ;(gs||[]).forEach(g=>{const id=byDay.get(g.tournament_day_id);if(id)gameCount.set(id,(gameCount.get(id)||0)+1)})
  ;(us||[]).forEach(u=>umpireCount.set(u.tournament_id,(umpireCount.get(u.tournament_id)||0)+1))
  return rows.map(t=>({...t,dayCount:dayCount.get(t.id)||0,gameCount:gameCount.get(t.id)||0,umpireCount:umpireCount.get(t.id)||0}))
}

export async function createTournamentWithDays(name:string):Promise<TournamentRow>{
  const trimmed=name.trim(); if(!trimmed) throw new Error('Tournament name is required.')
  const s=getSupabaseClient(); const {data:t,error}=await s.from('tournaments').insert({name:trimmed}).select('*').single()
  if(error) throw error
  const days=[1,2,3,4,5].map(i=>({tournament_id:t.id,legacy_id:`day-${i}`,day_index:i-1,name:`Day ${i}`}))
  const {error:de}=await s.from('tournament_days').insert(days)
  if(de){await s.from('tournaments').delete().eq('id',t.id);throw de}
  return t
}

export async function getTournamentOverview(tournamentId:string){
  const s=getSupabaseClient(); const {data:t,error:te}=await s.from('tournaments').select('*').eq('id',tournamentId).maybeSingle()
  if(te) throw te; if(!t) throw new Error('Tournament not found.')
  const {data:days,error:de}=await s.from('tournament_days').select('*').eq('tournament_id',tournamentId).order('day_index')
  if(de) throw de
  const ids=(days||[]).map(d=>d.id)
  const [{data:games,error:ge},{data:umpires,error:ue}]=await Promise.all([
    ids.length?s.from('games').select('id,date').in('tournament_day_id',ids):Promise.resolve({data:[],error:null}),
    s.from('umpires').select('id').eq('tournament_id',tournamentId)
  ])
  if(ge) throw ge; if(ue) throw ue
  return {tournament:t,days:days||[],gameCount:(games||[]).length,umpireCount:(umpires||[]).length,dates:(games||[]).map(g=>g.date).filter(Boolean).sort()}
}
