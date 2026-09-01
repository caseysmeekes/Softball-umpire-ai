import MultiDayDashboard from './MultiDayDashboard'
import TournamentCompletionBar from './TournamentCompletionBar'
import StartNewTournament from './StartNewTournament'

export default function DashboardPage() {
  return (
    <>
      <TournamentCompletionBar />
      <div className="start-new-wrap">
        <StartNewTournament />
      </div>
      <MultiDayDashboard />
    </>
  )
}
