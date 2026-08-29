'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Game } from '../../lib/types'
import { CREW_POSITIONS, positionsForCrew } from '../components/CrewSizeControls'

const DEFAULT_DATE = '2026-08-30'
const blankGame = (): Game => ({
  id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  number: 1,
  date: DEFAULT_DATE,
  start: '09:00',
  end: '10:20',
  field: 'Diamond 1',
  teams: '',
  division: '',
  positions: CREW_POSITIONS[2],
})

const readGames = (): Game[] => {
  try {
    const stored = JSON.parse(localStorage.getItem('softball-games') || 'null')
    if (Array.isArray(stored) && stored.length) return stored
  } catch {}
  return []
}

export default function SchedulePage() {
  const [games, setGames] = useState<Game[]>([])
  const [mounted, setMounted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Game>(blankGame())
  const [message, setMessage] = useState('')

  useEffect(() => {
    setGames(readGames())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem('softball-games', JSON.stringify(games))
  }, [games, mounted])

  const resetForm = () => {
    const nextNumber = games.length ? Math.max(...games.map(g => g.number)) + 1 : 1
    setForm({ ...blankGame(), number: nextNumber })
    setEditingId(null)
  }

  const saveGame = (e: FormEvent) => {
    e.preventDefault()
    if (!form.teams.trim() || !form.field.trim() || !form.start || !form.end) {
      setMessage('Please enter both teams, time and diamond.')
      return
    }
    if (form.end <= form.start) {
      setMessage('End time must be after start time.')
      return
    }
    if (editingId) {
      setGames(current => current.map(g => g.id === editingId ? form : g))
      setMessage(`Game ${form.number} updated.`)
    } else {
      setGames(current => [...current, form].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.number - b.number))
      setMessage(`Game ${form.number} added.`)
    }
    resetForm()
  }

  const editGame = (game: Game) => {
    setEditingId(game.id)
    setForm({ ...game })
    setMessage('Editing game. Save changes when finished.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteGame = (id: string) => {
    const game = games.find(g => g.id === id)
    if (!game || !window.confirm(`Delete Game ${game.number}? Existing umpire appointments for this game will also be removed.`)) return
    setGames(current => current.filter(g => g.id !== id))
    try {
      const assignments = JSON.parse(localStorage.getItem('softball-assignments') || '[]')
      localStorage.setItem('softball-assignments', JSON.stringify(assignments.filter((a: { gameId: string }) => a.gameId !== id)))
    } catch {}
    setMessage(`Game ${game.number} deleted.`)
  }

  const setCrew = (size: 2 | 3 | 4) => setForm(current => ({ ...current, positions: positionsForCrew(size) }))

  if (!mounted) return <main><div className="loading">Loading schedule…</div></main>

  return <main>
    <header><div><div className="brand">DIAMOND • OFFICIATING</div><h1>Build / Upload Schedule</h1><p>Create games manually or use CSV upload.</p></div><a href="/dashboard">← Dashboard</a></header>
    <section className="card">
      <div className="section-head"><div><h2>{editingId ? `Edit Game ${form.number}` : 'Add Game'}</h2><p>Enter the game details, then choose the crew size.</p></div>{editingId && <button onClick={resetForm}>Cancel edit</button>}</div>
      <form onSubmit={saveGame}>
        <label>Game number<input type="number" min="1" value={form.number} onChange={e => setForm({ ...form, number: Number(e.target.value) })}/></label>
        <label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label>
        <label>Team 1<input value={form.teams.split(' vs ')[0] || ''} onChange={e => setForm({ ...form, teams: `${e.target.value} vs ${form.teams.split(' vs ')[1] || ''}` })} placeholder="Team 1"/></label>
        <label>Team 2<input value={form.teams.split(' vs ')[1] || ''} onChange={e => setForm({ ...form, teams: `${form.teams.split(' vs ')[0] || ''} vs ${e.target.value}` })} placeholder="Team 2"/></label>
        <label>Start time<input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })}/></label>
        <label>End time<input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })}/></label>
        <label>Diamond<input value={form.field} onChange={e => setForm({ ...form, field: e.target.value })} placeholder="Diamond 1"/></label>
        <label>Competition / Division<input value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} placeholder="e.g. Premier"/></label>
        <div className="crew"><span>Crew size</span><div>{([2,3,4] as const).map(size => <button type="button" key={size} className={form.positions.length === size ? 'active' : ''} onClick={() => setCrew(size)}>{size}</button>)}</div><small>{form.positions.length === 2 ? 'Plate + 1st Base' : form.positions.length === 3 ? 'Plate + 1st Base + 3rd Base' : 'Plate + 1st Base + 2nd Base + 3rd Base'}</small></div>
        {message && <div className="message">{message}</div>}
        <button className="primary" type="submit">{editingId ? 'Save Game Changes' : '+ Add Game'}</button>
      </form>
    </section>
    <section className="card"><div className="section-head"><div><h2>Current Schedule</h2><p>{games.length} game{games.length === 1 ? '' : 's'} in the tournament.</p></div><a href="/dashboard">View allocation dashboard →</a></div>
      <div className="table"><table><thead><tr><th>Game</th><th>Date</th><th>Time</th><th>Diamond</th><th>Teams</th><th>Division</th><th>Crew</th><th>Actions</th></tr></thead><tbody>{games.map(g => <tr key={g.id}><td>#{g.number}</td><td>{g.date}</td><td>{g.start}–{g.end}</td><td>{g.field}</td><td>{g.teams}</td><td>{g.division || '—'}</td><td>{g.positions.length}</td><td><button onClick={() => editGame(g)}>Edit</button><button className="delete" onClick={() => deleteGame(g.id)}>Delete</button></td></tr>)}</tbody></table></div>
      {!games.length && <div className="empty">No games yet. Add your first game above or use the existing CSV upload from the dashboard.</div>}
    </section>
    <style jsx>{`main{min-height:100vh;background:#f5f7f8;color:#1c2b33;font-family:Arial,sans-serif;padding-bottom:60px}.loading{min-height:100vh;display:grid;place-items:center;color:#667983}header{background:#fff;border-bottom:1px solid #dde5e9;padding:24px 5%;display:flex;justify-content:space-between;align-items:center}header a,.section-head a{color:#1587b2;text-decoration:none;font-weight:600;font-size:13px}.brand{font-size:11px;letter-spacing:2px;color:#5d7380}h1{margin:5px 0}p{color:#6d7e86;font-size:13px}.card{margin:20px 5%;background:#fff;border:1px solid #dce4e8;border-radius:8px;padding:22px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.section-head h2{margin:0 0 5px}form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}label{font-size:11px;font-weight:700;color:#536771;display:flex;flex-direction:column;gap:6px}input{padding:10px;border:1px solid #cbd6dc;border-radius:5px;font:inherit;color:#1c2b33}.crew{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:14px;background:#f7f9fa;border-radius:6px}.crew span{font-size:12px;font-weight:700}.crew button,button{border:1px solid #cbd6dc;background:#fff;border-radius:5px;padding:9px 13px;cursor:pointer}.crew button{padding:7px 13px}.crew button.active{background:#1587b2;color:#fff;border-color:#1587b2}.crew small{color:#687982}.primary{grid-column:1/-1;background:#1587b2;color:#fff;border-color:#1587b2;font-weight:700}.message{grid-column:1/-1;padding:10px;background:#eef7fa;border:1px solid #c7e2ea;border-radius:5px;color:#356673;font-size:12px}.table{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:11px;border-bottom:1px solid #e7ecef;text-align:left;white-space:nowrap}th{background:#f7f9fa;color:#667983;font-size:9px;letter-spacing:1px}td button{padding:6px 9px;margin-right:5px}.delete{color:#a43d35}.empty{padding:30px;text-align:center;color:#74858d}@media(max-width:800px){form{grid-template-columns:repeat(2,minmax(0,1fr))}.crew{flex-wrap:wrap}header{gap:15px;align-items:flex-start}}@media(max-width:520px){form{grid-template-columns:1fr}.card{margin-left:3%;margin-right:3%}.section-head{align-items:flex-start;gap:10px;flex-direction:column}}`}</style>
  </main>
}
