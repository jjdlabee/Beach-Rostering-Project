import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { workersApi } from '../api/services'
import { Modal, StatusBadge, PageLoader, EmptyState, Field, ConfirmDialog } from '../components/ui'
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react'

const PAY_TYPES   = ['hourly', 'daily', 'weekly']
const STATUSES    = ['active', 'inactive']

function WorkerForm({ worker, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: worker ?? { pay_type: 'hourly', status: 'active', pay_rate: '', date_hired: '' },
  })

  const mutation = useMutation({
    mutationFn: (data) => worker
      ? workersApi.update(worker.id, data)
      : workersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] })
      toast.success(worker ? 'Worker updated.' : 'Worker added.')
      onClose()
    },
    onError: (err) => {
      const msg = Object.values(err.response?.data ?? {}).flat().join(' ')
      toast.error(msg || 'Something went wrong.')
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" error={errors.first_name?.message}>
          <input className="input" {...register('first_name', { required: 'Required' })} />
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          <input className="input" {...register('last_name', { required: 'Required' })} />
        </Field>
      </div>
      <Field label="Email">
        <input type="email" className="input" {...register('email')} />
      </Field>
      <Field label="Phone">
        <input className="input" {...register('phone')} />
      </Field>
      <Field label="Job title">
        <input className="input" {...register('job_title')} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date hired" error={errors.date_hired?.message}>
          <input type="date" className="input" {...register('date_hired', { required: 'Required' })} />
        </Field>
        <Field label="Status">
          <select className="input" {...register('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Pay type">
          <select className="input" {...register('pay_type')}>
            {PAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Pay rate (TTD)" error={errors.pay_rate?.message}>
          <input type="number" step="0.01" className="input" {...register('pay_rate', { required: 'Required' })} />
        </Field>
      </div>
      <div className="flex gap-3 pt-1">
        <Field label="">
          <label className="flex items-center gap-2 text-sm text-ocean-700 cursor-pointer">
            <input type="checkbox" className="rounded" {...register('nis_exempt')} />
            NIS exempt
          </label>
        </Field>
        <Field label="">
          <label className="flex items-center gap-2 text-sm text-ocean-700 cursor-pointer">
            <input type="checkbox" className="rounded" {...register('health_surcharge_exempt')} />
            HS exempt
          </label>
        </Field>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : (worker ? 'Save changes' : 'Add worker')}
        </button>
      </div>
    </form>
  )
}

export default function WorkersPage() {
  const qc = useQueryClient()
  const [modal, setModal]       = useState(null) // null | 'add' | Worker object
  const [delTarget, setDelTarget] = useState(null)
  const [search, setSearch]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['workers', search],
    queryFn:  () => workersApi.list({ search }).then(r => r.data),
  })
  const workers = data?.results ?? data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id) => workersApi.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['workers'] }); toast.success('Worker removed.') },
    onError:    () => toast.error('Failed to delete worker.'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workers</h1>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus size={16} /> Add worker
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ocean-400" />
        <input
          className="input pl-9"
          placeholder="Search workers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {workers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No workers yet"
          description="Add your first worker to get started."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus size={16} />Add worker</button>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th>
                <th>Job title</th>
                <th>Pay</th>
                <th>Status</th>
                <th>Hired</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id}>
                  <td className="font-medium text-ocean-900">{w.full_name}</td>
                  <td>{w.job_title || '—'}</td>
                  <td>
                    <span className="font-mono text-xs">TTD {w.pay_rate}</span>
                    <span className="text-ocean-400 text-xs ml-1">/{w.pay_type}</span>
                  </td>
                  <td><StatusBadge status={w.status} /></td>
                  <td>{w.date_hired}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setModal(w)} className="p-1.5 rounded-lg hover:bg-sand-50 text-ocean-400 hover:text-ocean-700 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDelTarget(w)} className="p-1.5 rounded-lg hover:bg-red-50 text-ocean-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'add' ? 'Add worker' : `Edit — ${modal.full_name}`}
          onClose={() => setModal(null)}
          wide
        >
          <WorkerForm worker={modal === 'add' ? null : modal} onClose={() => setModal(null)} />
        </Modal>
      )}

      {delTarget && (
        <ConfirmDialog
          title="Remove worker"
          message={`Are you sure you want to remove ${delTarget.full_name}? This cannot be undone.`}
          danger
          onConfirm={() => { deleteMutation.mutate(delTarget.id); setDelTarget(null) }}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}
