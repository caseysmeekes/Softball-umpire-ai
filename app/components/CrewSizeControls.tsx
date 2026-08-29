'use client'
import {useEffect} from 'react'

type Position='Plate'|'Base'|'Base 1'|'Base 2'|'Base 3'
const CREWS:Record<number,Position[]>={2:['Plate','Base 1'],3:['Plate','Base 1','Base 2'],4:['Plate','Base 1','Base 2','Base 3']}

export default function CrewSizeControls(){
 useEffect(()=>{
  const migrateLegacyBase=()=>{
   try{
    const games=JSON.parse(localStorage.getItem('softball-games')||'[]') as any[]
    const assignments=JSON.parse(localStorage.getItem('softball-assignments')||'[]') as any[]
    let changed=false
    const migratedGames=games.map(game=>{
      if(!Array.isArray(game.positions))return game
      const positions=game.positions.map((p:string)=>p==='Base'?'Base 1':p)
      if(JSON.stringify(positions)!==JSON.stringify(game.positions)){changed=true;return {...game,positions:[...new Set(positions)]}}
      return game
    })
    const migratedAssignments=assignments.map(a=>a.position==='Base'?{...a,position:'Base 1'}:a)
    if(assignments.some((a,i)=>a.position!==migratedAssignments[i].position))changed=true
    if(changed){localStorage.setItem('softball-games',JSON.stringify(migratedGames));localStorage.setItem('softball-assignments',JSON.stringify(migratedAssignments));window.location.reload();return true}
   }catch{}
   return false
  }
  if(migrateLegacyBase())return
  const enhance=()=>{document.querySelectorAll('tbody tr').forEach(row=>{if(row.querySelector('[data-crew-controls]'))return;const cells=row.querySelectorAll('td');if(cells.length<5)return;const m=(cells[0]?.textContent||'').match(/#(\d+)/);if(!m)return;const games=read<any[]>('softball-games',[]),game=games.find(g=>Number(g.number)===Number(m[1]));if(!game)return;const cell=cells[4],wrap=document.createElement('div');wrap.dataset.crewControls='true';wrap.className='crew-controls';[2,3,4].forEach(size=>{const b=document.createElement('button');b.type='button';b.textContent=String(size);b.className=game.positions?.length===size?'active':'';b.title=`Use a ${size}-umpire crew`;b.onclick=()=>changeCrew(game.id,size);wrap.appendChild(b)});cell.innerHTML='';cell.appendChild(wrap)})}
  const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance();return()=>observer.disconnect()
 },[])
 return null
}
function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
function changeCrew(gameId:string,size:number){const games=read<any[]>('softball-games',[]),game=games.find(g=>g.id===gameId);if(!game)return;const oldSize=game.positions?.length||2;if(oldSize===size)return;if(size<oldSize){const removed=(game.positions||[]).slice(size),assignments=read<any[]>('softball-assignments',[]),occupied=removed.some((p:string)=>assignments.some(a=>a.gameId===gameId&&a.position===p));if(occupied&&!window.confirm(`Reduce this game from ${oldSize} to ${size} umpires?\n\nExisting assignments in the removed positions will be cleared.`))return}game.positions=CREWS[size];localStorage.setItem('softball-games',JSON.stringify(games));const assignments=read<any[]>('softball-assignments',[]).filter(a=>a.gameId!==gameId||game.positions.includes(a.position));localStorage.setItem('softball-assignments',JSON.stringify(assignments));window.location.reload()}
