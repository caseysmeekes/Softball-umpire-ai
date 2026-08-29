import { describe, expect, it } from 'vitest'
import { validateUmpire } from './rules'
import { Assignment, Game, Umpire } from './types'

const umpire: Umpire = { id:'u1', name:'Test', availability:'All day', maxGames:3, experience:'National' }
const games: Game[] = [
 {id:'g1',number:1,date:'2026-08-30',start:'09:00',end:'10:20',field:'1',teams:'A v B',division:'X',positions:['Plate','Base']},
 {id:'g2',number:2,date:'2026-08-30',start:'10:30',end:'11:50',field:'1',teams:'C v D',division:'X',positions:['Plate','Base']},
 {id:'g3',number:3,date:'2026-08-30',start:'12:00',end:'13:20',field:'1',teams:'E v F',division:'X',positions:['Plate','Base']},
 {id:'g4',number:4,date:'2026-08-30',start:'13:30',end:'14:50',field:'1',teams:'G v H',division:'X',positions:['Plate','Base']}
]
const a=(gameId:string,position:'Plate'|'Base'):Assignment=>({gameId,position,umpireId:'u1'})

describe('allocation rules',()=>{
 it('allows Base -> Plate back-to-back',()=>expect(validateUmpire(umpire,games,[a('g1','Base'),a('g2','Plate')])).toHaveLength(0))
 it('rejects Plate -> Base',()=>expect(validateUmpire(umpire,games,[a('g1','Plate'),a('g2','Base')]).some(v=>v.rule==='PLATE_BREAK')).toBe(true))
 it('allows Plate -> OFF -> Base',()=>expect(validateUmpire(umpire,games,[a('g1','Plate'),a('g3','Base')])).toHaveLength(0))
 it('rejects Base -> Base',()=>expect(validateUmpire(umpire,games,[a('g1','Base'),a('g2','Base')]).some(v=>v.rule==='BACK_TO_BACK')).toBe(true))
 it('rejects a fourth game',()=>expect(validateUmpire(umpire,games,[a('g1','Base'),a('g2','Plate'),a('g3','Base'),a('g4','Plate')]).some(v=>v.rule==='MAX_GAMES')).toBe(true))
})
