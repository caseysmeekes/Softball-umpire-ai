'use client'

import { FormEvent, useEffect, useState } from 'react'
import { clearStoredUserId, getCurrentUser, identifyUser, type AppUser } from '../../lib/supabase/userIdentity'

export default function UsernameGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void getCurrentUser()
      .then(current => {
        if (!cancelled) setUser(current)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to check user identity.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const identified = await identifyUser(username)
      setUser(identified)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to continue.')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearStoredUserId()
    setUser(null)
    setUsername('')
    setError('')
    window.location.href = '/tournaments'
  }

  if (loading) {
    return <main className="identity-shell"><div className="identity-card"><p>Loading…</p></div></main>
  }

  if (user) {
    return (
      <>
        <div className="user-bar">
          <span>Signed in as <strong>{user.username}</strong></span>
          <button type="button" onClick={logout}>Log out</button>
        </div>
        {children}
      </>
    )
  }

  return (
    <main className="identity-shell">
      <section className="identity-card">
        <div className="identity-brand">DIAMOND • OFFICIATING</div>
        <h1>Softball Umpire AI</h1>
        <p className="identity-copy">Enter your username to continue.</p>
        <form onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={event => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            maxLength={50}
            placeholder="Enter username"
            disabled={saving}
          />
          <button type="submit" disabled={saving || !username.trim()}>{saving ? 'Continuing…' : 'Continue'}</button>
        </form>
        {error && <div className="identity-error">{error}</div>}
      </section>
      <style jsx>{`
        .identity-shell{min-height:100vh;display:grid;place-items:center;background:#f5f7f8;padding:24px;font-family:Arial,sans-serif;color:#1c2b33}
        .identity-card{width:min(430px,100%);background:#fff;border:1px solid #dce4e8;border-radius:12px;padding:36px;box-shadow:0 8px 30px rgba(25,48,68,.08)}
        .identity-brand{font-size:11px;letter-spacing:2px;color:#5d7380;margin-bottom:10px}
        h1{margin:0;font-size:30px}
        .identity-copy{color:#6d7e86;font-size:14px;margin:10px 0 26px}
        form{display:grid;gap:9px}
        label{font-size:13px;font-weight:700}
        input{box-sizing:border-box;width:100%;padding:12px 13px;border:1px solid #cbd6dc;border-radius:7px;font-size:15px;outline:none}
        input:focus{border-color:#1587b2;box-shadow:0 0 0 3px rgba(21,135,178,.1)}
        form button{margin-top:7px;padding:12px 15px;border:0;border-radius:7px;background:#1587b2;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
        form button:disabled{opacity:.55;cursor:not-allowed}
        .identity-error{margin-top:16px;padding:11px 12px;border-radius:7px;background:#fff1ef;border:1px solid #e4b9b3;color:#6d4540;font-size:13px}
        .user-bar{height:38px;box-sizing:border-box;padding:0 6%;display:flex;align-items:center;justify-content:flex-end;gap:12px;background:#fff;border-bottom:1px solid #e3e9ec;color:#687982;font:12px Arial,sans-serif}
        .user-bar button{border:1px solid #cbd6dc;background:#fff;color:#465963;border-radius:6px;padding:5px 9px;font:700 12px Arial,sans-serif;cursor:pointer}
        .user-bar button:hover{background:#f5f7f8}
      `}</style>
    </main>
  )
}
