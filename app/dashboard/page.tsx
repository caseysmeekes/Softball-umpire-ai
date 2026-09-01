import MultiDayDashboard from './MultiDayDashboard'
import TournamentCompletionBar from './TournamentCompletionBar'
import StartNewTournament from './StartNewTournament'

export default function DashboardPage() {
  return (
    <>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <a href="/tournaments" style={{ color: '#1587b2', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
          ← My Tournaments
        </a>
      </div>
      <TournamentCompletionBar />
      <div className="start-new-wrap">
        <StartNewTournament />
      </div>
      <MultiDayDashboard />
    </>
  )
}
