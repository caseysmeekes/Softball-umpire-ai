'use client'
import { useEffect, useState } from 'react'

export type AllocationChange = {
  id: string
  day: number
  gameId: string
  gameNumber: number
  time?: string
  diamond?: string
  position: string
  from: string
  to: string
  status: 'Pending' | 'Committed'
}

const key = 'softball-allocation-change-history'

export function readAllocationHistory(): AllocationChange[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
export function writeAllocationHistory(items: AllocationChange[]) { localStorage.setItem(key, JSON.stringify(items)) }
export function clearAllocationHistory() { localStorage.removeItem(key) }

export default function AllocationChangeHistory({ dayIndex }: { dayIndex: number }) {
  const [items, setItems] = useState<AllocationChange[]>([])
  useEffect(() => { setItems(readAllocationHistory().filter(x => x.day === dayIndex)) }, [dayIndex])
  const pending = items.filter(x => x.status === 'Pending').length
  return <section className="card history-card">
    <div className="history-head"><div><h2>Allocation Change History</h2><p>Manual changes for {`Day ${dayIndex + 1}`}</p></div><span className="history-count">🟢 {items.length} {items.length === 1 ? 'change' : 'changes'}</span></div>
    {items.length === 0 ? <div className="history-empty">No manual allocation changes yet.</div> : <div className="history-list">{items.slice().reverse().map(x => <div className="history-item" key={x.id}><div><b>Game {x.gameNumber}</b><span>{x.time || ''}{x.diamond ? ` · ${x.diamond}` : ''} · {x.position}</span></div><div className="history-change">{x.from} → {x.to}</div><small className={x.status === 'Pending' ? 'pending' : 'committed'}>{x.status}</small></div>)}</div>}
    {pending > 0 && <div className="history-note">{pending} pending manual {pending === 1 ? 'change' : 'changes'} will be committed with the allocation.</div>}
  </section>
}
