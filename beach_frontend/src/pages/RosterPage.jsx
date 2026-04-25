import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { rosterApi, shiftsApi, workersApi } from '../api/services'
import { Modal, PageLoader, EmptyState, Field, StatusBadge } from '../components/ui'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Settings, Trash2 } from 'lucide-react'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ShiftManager({ onClose }) {
  const qc = useQueryClient()
  const { data: shiftsData } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftsApi.list().then(r => r.data) })
  const shifts = shiftsData?.results ?? shiftsData ?? []

  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', start_time: '', end_time: '', color: '#3B82F6' } })
  const createMutation = useMutation({
    mutationFn: (data) => shiftsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); reset(); toast.success('Shift created.') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => shiftsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); toast.success('Shift deleted.') },
  })

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {shifts.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-sand-100 bg-sand-50">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-medium text-sm text-ocean-800">{s.name}</span>
              <span className="text-xs text-ocean-400">{s.start_time} – {s.end_time}</span>
            </div>
            <button onClick={() => deleteMutation.mutate(s.id)} className="p-1 text-ocean-300 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="border-t border-sand-100 pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ocean-500">Add shift</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className="input" {...register('name', { required: true })} placeholder="Morning" /></Field>
          <Field label="Color"><input type="color" className="input h-[42px] p-1.5" {...register('color')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time"><input type="time" className="input" {...register('start_time', { required: true })} /></Field>
          <Field label="End time"><input type="time" className="input" {...register('end_time', { required: true })} /></Field>
        </div>
        <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
          <Plus size={15} /> Add shift
        </button>
      </form>
      <div className="flex justify-end"><button onClick={onClose} className="btn-secondary">Done</button></div>
    </div>
  )
}

function AssignForm({ date, onClose }) {
  const qc = useQueryClient()
  const { data: workerData } = useQuery({ queryKey: ['workers'], queryFn: () => workersApi.list({ status: 'active' }).then(r => r.data) })
  const { data: shiftsData  } = useQuery({ queryKey: ['shifts'],  queryFn: () => shiftsApi.list().then(r => r.data) })
  const workers = workerData?.results ?? workerData ?? []
  const shifts  = shiftsData?.results ?? shiftsData ?? []

  const { register, handleSubmit } = useForm({ defaultValues: { worker: '', shift: '', date, notes: '' } })
  const mutation = useMutation({
    mutationFn: (data) => rosterApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roster-week'] }); toast.success('Assigned.'); onClose() },
    onError: (err) => { const msg = Object.values(err.response?.data ?? {}).flat().join(' '); toast.error(msg || 'Failed.') },
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <Field label="Worker"><select className="input" {...register('worker', { required: true })}><option value="">Select…</option>{workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}</select></Field>
      <Field label="Shift"><select className="input" {...register('shift', { required: true })}><option value="">Select…</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}</select></Field>
      <Field label="Date"><input type="date" className="input" {...register('date', { required: true })} /></Field>
      <Field label="Notes"><input className="input" {...register('notes')} placeholder="Optional" /></Field>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving…' : 'Assign'}</button>
      </div>
    </form>
  )
}

export default function RosterPage() {
  const qc = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [modal, setModal]         = useState(null) // null | 'shifts' | { date }
  const startStr = format(weekStart, 'yyyy-MM-dd')

  const { data: entries, isLoading } = useQuery({
    queryKey: ['roster-week', startStr],
    queryFn:  () => rosterApi.week(startStr).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => rosterApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roster-week'] }); toast.success('Entry removed.') },
  })

  // Build a map: date → entries[]
  const entriesByDate = {}
  ;(entries ?? []).forEach(e => {
    if (!entriesByDate[e.date]) entriesByDate[e.date] = []
    entriesByDate[e.date].push(e)
  })

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Roster</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal('shifts')} className="btn-secondary"><Settings size={15} /> Manage shifts</button>
          <button onClick={() => setModal({ date: format(new Date(), 'yyyy-MM-dd') })} className="btn-primary"><Plus size={16} /> Assign</button>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="btn-secondary p-2"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium text-ocean-700 min-w-52 text-center">
          Week of {format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}
        </span>
        <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="btn-secondary p-2"><ChevronRight size={16} /></button>
        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="btn-secondary text-xs">Today</button>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const dateStr  = format(day, 'yyyy-MM-dd')
            const dayEntries = entriesByDate[dateStr] ?? []
            const isToday  = dateStr === format(new Date(), 'yyyy-MM-dd')
            return (
              <div key={dateStr} className={`rounded-2xl border p-3 min-h-32 ${isToday ? 'border-ocean-400 bg-ocean-50' : 'border-sand-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-ocean-400">{WEEK_DAYS[i]}</p>
                    <p className={`text-lg font-bold leading-tight ${isToday ? 'text-ocean-700' : 'text-ocean-900'}`}>{format(day, 'd')}</p>
                  </div>
                  <button onClick={() => setModal({ date: dateStr })}
                    className="w-6 h-6 rounded-lg bg-sand-100 hover:bg-ocean-100 flex items-center justify-center text-ocean-500 transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {dayEntries.map(e => (
                    <div key={e.id}
                      className="relative group rounded-lg p-1.5 text-xs text-white leading-tight cursor-default"
                      style={{ backgroundColor: e.shift_detail?.color ?? '#0f4c5c' }}
                    >
                      <p className="font-semibold truncate">{e.worker_detail?.full_name?.split(' ')[0]}</p>
                      <p className="opacity-80">{e.shift_detail?.name}</p>
                      <button
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal === 'shifts' && (
        <Modal title="Manage shifts" onClose={() => setModal(null)}>
          <ShiftManager onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal && modal.date && (
        <Modal title={`Assign shift — ${modal.date}`} onClose={() => setModal(null)}>
          <AssignForm date={modal.date} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}
