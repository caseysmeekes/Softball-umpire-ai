'use client'

import { useMemo, useState } from 'react'
import { allocate, validateUmpire } from '../lib/rules'
import { Assignment, Game, Position, Umpire } from '../lib/types'

const seedGames: Game[] = [
  { id: 'g1', number: 1, date: '2026-08-30', start: '09:00', end: '10:20', field: 'Field 1', teams: 'NZ vs Australia', division: 'Senior Women', positions: ['Plate', 'Base'] },
  { id: 'g2', number: 2, date: '2026-08-30', start: '10:30', end: '11:50', field: 'Field 1', teams: 'Japan vs USA', division: 'Senior Women', positions: ['Plate', 'Base'] },
  { id: 'g3', number: 3, date: '2026-08-30', start: '12:00', end: '13:20', field: 'Field 1', teams: 'Canada vs Mexico', division: 'Senior Women', positions: ['Plate', 'Base'] },
  { id: 'g4', number: 4, date: '2026-08-30', start: '13:30', end: '14:50', field: 'Field 1', teams: 'Australia vs Japan', division: 'Senior Women', positions: ['Plate', 'Base'] },
  { id: 'g5', number: 5, date: '2026-08-30', start: '15:00', end: '16:20', field: 'Field 1', teams: 'USA vs NZ', division: 'Senior Women', positions: ['Plate', 'Base'] },
  { id: 'g6', number: 6, date: '2026-08-30', start: '16:30', end: '17:50', field: 'Field 1', teams: 'Mexico vs Canada', division: 'Senior Women', positions: ['Plate', 'Base'] },
]

const seedUmpires: Umpire[] = [
  { id: 'u1', name: 'Smith', availability: 'All day', maxGames: 3, experience: 'International' },
  { id: 'u2', name: 'Jones', availability: 'All day', maxGames: 3, experience: 'National' },
  { id: 'u3', name: 'Brown', availability: 'All day', maxGames: 3, experience: 'National' },
  { id: 'u4', name: 'Wilson', availability: 'All day', maxGames: 3, experience: 'Regional' },
  { id: 'u5', name: 'Taylor', availability: 'All day', maxGames: 3, experience: 'Developing' },
]

export default function Home() {
  const [games, setGames] = useState(seedGames)
  const [umpires, setUmpires] = useState(seedUmpires)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [tab, setTab] = useState<'schedule' | 'umpires'>('schedule')
  const [message, setMessage] = useState('Ready to allocate')

  const violations = useMemo(() => umpires.flatMap(u => validateUmpire(u, games, assignments)), [umpires, games, assignments])
  const stats = useMemo(() => ({ assigned: new Set(assignments.map(a => a.gameId)).size, slots: games.reduce((n, g) => n + g.positions.length, 0), violations: violations.length }), [assignments, games, violations])

  const runAllocation = () => {
    const result = allocate(games, umpires)
    setAssignments(result.assignments)
    setMessage(result.unallocated.length ? `${result.unallocated.length} assignment(s) could not be allocated.` : 'Allocation complete and valid.')
  }

  const assignmentFor = (gameId: string, position: Position) => {
    const a = assignments.find(x => x.gameId === gameId && x.position === position)
    return a ? umpires.find(u => u.id === a.umpireId)?.name : 'Unallocated'
  }

  const swapAssignment = (game: Game, position: Position, value: string) => {
    const remaining = assignments.filter(a => !(a.gameId === game.id && a.position === position))
    if (value !== '') remaining.push({ gameId: game.id, umpireId: value, position })
    setAssignments(remaining)
    setMessage('Manual change saved. Check any warnings before publishing.')
  }

  return <main>
    <header className="topbar">
      <div><div className="brand">DIAMOND <span>•</span> OFFICIATING</div><h1>Umpire Allocation</h1></div>
      <div className="header-actions"><span className="pill">SAT 30 AUG 2026</span><button className="secondary" onClick={() => window.print()}>Print / Export</button><button className="primary" onClick={runAllocation}>⚡ Auto Allocate</button></div>
    </header>

    <section className="hero">
      <div><p className="eyebrow">TOURNAMENT CONTROL</p><h2>Allocation Dashboard</h2><p>Rules-first scheduling for fair, valid umpire assignments.</p></div>
      <div className="status"><span className={violations.length ? 'dot warn' : 'dot'}></span>{message}</div>
    </section>

    <section className="metrics">
      <div><span>GAMES</span><strong>{games.length}</strong><small>Scheduled today</small></div>
      <div><span>UMPIRES</span><strong>{umpires.length}</strong><small>Available today</small></div>
      <div><span>ALLOCATED</span><strong>{stats.assigned}<em>/{games.length}</em></strong><small>Games with assignments</small></div>
      <div className={violations.length ? 'danger' : ''}><span>RULE CHECKS</span><strong>{violations.length}</strong><small>{violations.length ? 'Issues require attention' : 'All rules satisfied'}</small></div>
    </section>

    <nav className="tabs"><button className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>Game Schedule</button><button className={tab === 'umpires' ? 'active' : ''} onClick={() => setTab('umpires')}>Umpire Workload</button></nav>

    {tab === 'schedule' ? <section className="card"><div className="card-head"><div><h3>Game Schedule</h3><p>Chronological allocation with live rule validation</p></div><div className="legend"><span>🟢 Valid</span><span>🟠 Warning</span><span>🔴 Violation</span></div></div><div className="table-wrap"><table><thead><tr><th>GAME</th><th>TIME</th><th>FIELD</th><th>TEAMS / DIVISION</th><th>PLATE</th><th>BASE</th><th>STATUS</th></tr></thead><tbody>{games.map(g => { const va = violations.filter(v => v.gameId === g.id); return <tr key={g.id}><td><b>#{g.number}</b></td><td>{g.start}<small>– {g.end}</small></td><td>{g.field}</td><td><b>{g.teams}</b><small>{g.division}</small></td>{(['Plate','Base'] as Position[]).map(p => <td key={p}><select value={assignments.find(a => a.gameId === g.id && a.position === p)?.umpireId || ''} onChange={e => swapAssignment(g,p,e.target.value)}><option value="">Unallocated</option>{umpires.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></td>)}<td><span className={va.length ? 'badge bad' : assignments.filter(a => a.gameId === g.id).length === g.positions.length ? 'badge good' : 'badge warn'}>{va.length ? 'Violation' : assignments.filter(a => a.gameId === g.id).length === g.positions.length ? 'Valid' : 'Open'}</span></td></tr>})}</tbody></table></div></section> : <section className="card"><div className="card-head"><div><h3>Umpire Workload</h3><p>Daily workload, positioning and next assignment</p></div></div><div className="table-wrap"><table><thead><tr><th>UMPIRE</th><th>GAMES</th><th>PLATE</th><th>BASE</th><th>NEXT GAME</th><th>STATUS</th></tr></thead><tbody>{umpires.map(u => { const mine = assignments.filter(a => a.umpireId === u.id); const plates = mine.filter(a => a.position === 'Plate').length; const bases = mine.filter(a => a.position === 'Base').length; const v = violations.filter(x => x.umpireId === u.id); const next = games.find(g => g.number > Math.max(0,...mine.map(a => games.find(x => x.id === a.gameId)?.number || 0)) && !mine.some(a => a.gameId === g.id)); return <tr key={u.id}><td><b>{u.name}</b><small>{u.experience}</small></td><td><b>{mine.length}/{u.maxGames}</b></td><td>{plates}</td><td>{bases}</td><td>{next ? `Game ${next.number}` : '—'}</td><td><span className={v.length ? 'badge bad' : mine.length >= u.maxGames ? 'badge warn' : 'badge good'}>{v.length ? 'Rule violation' : mine.length >= u.maxGames ? 'Max reached' : plates && next ? 'Break required' : 'Available'}</span></td></tr>})}</tbody></table></div></section>}

    <section className="rules"><div><p className="eyebrow">RULE ENGINE</p><h3>Rules are evaluated before allocation</h3><p>The scheduler prioritises validity first, then fairness and balanced workload.</p></div><div className="rule-list"><article><strong>01</strong><div><b>Maximum 3 games</b><span>No umpire can be allocated a fourth game.</span></div></article><article><strong>02</strong><div><b>Back-to-back = Base → Plate</b><span>Consecutive games must move from Base to Plate.</span></div></article><article><strong>03</strong><div><b>Plate requires a break</b><span>At least one game off after every Plate assignment.</span></div></article></div></section>

    {violations.length > 0 && <section className="alerts"><h3>Attention required</h3>{violations.map((v,i) => <div key={i}>🔴 <b>{umpires.find(u => u.id === v.umpireId)?.name}</b> · {v.message}</div>)}</section>}
    <footer>DIAMOND OFFICIATING · Rules-first tournament scheduling</footer>
  </main>
}
