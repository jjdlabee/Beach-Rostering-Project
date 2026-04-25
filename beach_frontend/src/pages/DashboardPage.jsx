import { useQuery } from '@tanstack/react-query'
import { workersApi, periodsApi, bookingsApi } from '../api/services'
import { Users, DollarSign, CalendarDays, Warehouse } from 'lucide-react'
import { PageLoader } from '../components/ui'
import { format } from 'date-fns'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ocean-400">{label}</p>
        <p className="text-2xl font-bold text-ocean-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-ocean-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: workers, isLoading: loadingWorkers } = useQuery({
    queryKey: ['workers'],
    queryFn:  () => workersApi.list({ status: 'active' }).then(r => r.data),
  })

  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['periods'],
    queryFn:  () => periodsApi.list().then(r => r.data),
  })

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings-upcoming'],
    queryFn:  () => bookingsApi.list({ start_date: today, status: 'confirmed' }).then(r => r.data),
  })

  if (loadingWorkers || loadingPeriods || loadingBookings) return <PageLoader />

  const activeWorkers   = workers?.results?.length ?? workers?.length ?? 0
  const draftPeriods    = periods?.results?.filter(p => p.status === 'draft').length ?? 0
  const upcomingBookings = bookings?.results?.length ?? bookings?.length ?? 0
  const recentPeriods   = (periods?.results ?? periods ?? []).slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-ocean-400">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}       label="Active Workers"    value={activeWorkers}   color="bg-ocean-700" />
        <StatCard icon={DollarSign}  label="Draft Pay Periods" value={draftPeriods}    color="bg-sand-500"  />
        <StatCard icon={Warehouse}   label="Upcoming Bookings" value={upcomingBookings} color="bg-emerald-600" />
        <StatCard icon={CalendarDays} label="Today"            value={format(new Date(), 'EEE')} sub={format(new Date(), 'MMM d')} color="bg-ocean-500" />
      </div>

      {/* Recent pay periods */}
      <div className="card">
        <h2 className="font-display text-xl text-ocean-900 mb-4">Recent Pay Periods</h2>
        {recentPeriods.length === 0 ? (
          <p className="text-sm text-ocean-400 py-6 text-center">No pay periods yet.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Type</th>
                <th>Period</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentPeriods.map(p => (
                <tr key={p.id}>
                  <td className="capitalize">{p.period_type}</td>
                  <td>{p.start_date} → {p.end_date}</td>
                  <td>
                    <span className={`badge ${
                      p.status === 'paid' ? 'bg-emerald-50 text-emerald-700'
                      : p.status === 'finalised' ? 'bg-ocean-50 text-ocean-700'
                      : 'bg-sand-100 text-sand-600'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{format(new Date(p.created_at), 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
