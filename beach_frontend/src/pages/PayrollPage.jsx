import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { periodsApi, hoursApi, workersApi } from '../api/services'
import { Modal, StatusBadge, PageLoader, EmptyState, Field } from '../components/ui'
import { DollarSign, Plus, Clock, ChevronRight, Calculator } from 'lucide-react'

function NewPeriodForm({ onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { period_type: 'weekly', start_date: '', end_date: '' },
  })
  const periodType = watch('period_type')

  const mutation = useMutation({
    mutationFn: (data) => periodsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['periods'] }); toast.success('Pay period created.'); onClose() },
    onError: () => toast.error('Failed to create period.'),
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <Field label="Period type">
        <select className="input" {...register('period_type')}>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" error={errors.start_date?.message}>
          <input type="date" className="input" {...register('start_date', { required: 'Required' })} />
        </Field>
        <Field label="End date" error={errors.end_date?.message}>
          <input type="date" className="input" {...register('end_date', { required: 'Required' })} />
        </Field>
      </div>
      <p className="text-xs text-ocean-400">
        {periodType === 'weekly'
          ? 'Weekly periods typically run Monday → Sunday.'
          : 'Daily periods cover a single working day.'}
      </p>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Creating…' : 'Create period'}
        </button>
      </div>
    </form>
  )
}

function HoursEntryForm({ onClose }) {
  const qc = useQueryClient()
  const { data: workerData } = useQuery({
    queryKey: ['workers'],
    queryFn: () => workersApi.list({ status: 'active' }).then(r => r.data),
  })
  const workers = workerData?.results ?? workerData ?? []

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { worker: '', date: format(new Date(), 'yyyy-MM-dd'), hours_worked: '', clock_in: '', clock_out: '' },
  })

  const mutation = useMutation({
    mutationFn: (data) => hoursApi.create({
      ...data,
      clock_in:  data.clock_in  || null,
      clock_out: data.clock_out || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hours'] }); toast.success('Hours logged.'); onClose() },
    onError: (err) => {
      const msg = Object.values(err.response?.data ?? {}).flat().join(' ')
      toast.error(msg || 'Failed to log hours.')
    },
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <Field label="Worker" error={errors.worker?.message}>
        <select className="input" {...register('worker', { required: 'Required' })}>
          <option value="">Select worker…</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
        </select>
      </Field>
      <Field label="Date" error={errors.date?.message}>
        <input type="date" className="input" {...register('date', { required: 'Required' })} />
      </Field>
      <Field label="Hours worked (manual)" error={errors.hours_worked?.message}>
        <input type="number" step="0.25" min="0" max="24" className="input" placeholder="e.g. 7.5"
          {...register('hours_worked')} />
      </Field>
      <p className="text-xs text-ocean-400 text-center">— or use clock in / out —</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Clock in">
          <input type="time" className="input" {...register('clock_in')} />
        </Field>
        <Field label="Clock out">
          <input type="time" className="input" {...register('clock_out')} />
        </Field>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : 'Log hours'}
        </button>
      </div>
    </form>
  )
}

export default function PayrollPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [modal, setModal] = useState(null) // 'period' | 'hours'

  const { data, isLoading } = useQuery({
    queryKey: ['periods'],
    queryFn:  () => periodsApi.list().then(r => r.data),
  })
  const periods = data?.results ?? data ?? []

  const calculateMutation = useMutation({
    mutationFn: (id) => periodsApi.calculate(id),
    onSuccess:  (_, id) => { qc.invalidateQueries({ queryKey: ['period', id] }); toast.success('Payroll calculated.') },
    onError:    () => toast.error('Calculation failed.'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payroll</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal('hours')} className="btn-secondary">
            <Clock size={16} /> Log hours
          </button>
          <button onClick={() => setModal('period')} className="btn-primary">
            <Plus size={16} /> New period
          </button>
        </div>
      </div>

      {periods.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No pay periods"
          description="Create a pay period, log hours, then run payroll to calculate NIS and Health Surcharge deductions."
          action={<button onClick={() => setModal('period')} className="btn-primary"><Plus size={16} />New period</button>}
        />
      ) : (
        <div className="space-y-3">
          {periods.map(p => (
            <div key={p.id} className="card flex items-center gap-4 hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => navigate(`/payroll/${p.id}`)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-ocean-900 capitalize">{p.period_type} period</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-ocean-500">{p.start_date} → {p.end_date}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.status === 'draft' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); calculateMutation.mutate(p.id) }}
                    disabled={calculateMutation.isPending}
                    className="btn-secondary text-xs"
                  >
                    <Calculator size={14} />
                    {calculateMutation.isPending ? 'Calculating…' : 'Run payroll'}
                  </button>
                )}
                <ChevronRight size={18} className="text-ocean-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'period' && (
        <Modal title="New pay period" onClose={() => setModal(null)}>
          <NewPeriodForm onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'hours' && (
        <Modal title="Log hours" onClose={() => setModal(null)}>
          <HoursEntryForm onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}
