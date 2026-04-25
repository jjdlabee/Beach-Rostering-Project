import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useState } from 'react'
import {
  ArrowLeft, Calculator, Lock, CheckCircle,
  ChevronDown, ChevronRight, Pencil, Trash2,
} from 'lucide-react'
import { periodsApi, hoursApi } from '../api/services'
import { PageLoader, StatusBadge, ConfirmDialog, Modal, Field, Spinner } from '../components/ui'

function fmt(val) {
  return `TTD ${Number(val).toFixed(2)}`
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-TT', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ── Edit hours modal ───────────────────────────────────────────────────────────
function EditHoursModal({ entry, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    hours_worked: entry.hours_worked,
    clock_in:     entry.clock_in  ?? '',
    clock_out:    entry.clock_out ?? '',
    notes:        entry.notes     ?? '',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    const data = { hours_worked: form.hours_worked, notes: form.notes }
    if (form.clock_in)  data.clock_in  = form.clock_in
    if (form.clock_out) data.clock_out = form.clock_out
    onSave(data)
  }

  return (
    <Modal title={`Edit hours — ${fmtDate(entry.date)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Hours worked">
          <input
            type="number" step="0.01" min="0" max="24"
            value={form.hours_worked} onChange={set('hours_worked')}
            className="input" required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clock in">
            <input type="time" value={form.clock_in} onChange={set('clock_in')} className="input" />
          </Field>
          <Field label="Clock out">
            <input type="time" value={form.clock_out} onChange={set('clock_out')} className="input" />
          </Field>
        </div>
        <Field label="Notes">
          <input
            type="text" value={form.notes} onChange={set('notes')}
            className="input" placeholder="Optional"
          />
        </Field>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Expandable worker row ──────────────────────────────────────────────────────
function WorkerRow({ slip, period, periodId, isDraft }) {
  const qc = useQueryClient()
  const [open,     setOpen]     = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['hours', slip.worker.id, period.start_date, period.end_date],
    queryFn:  () => hoursApi.list({
      worker:    slip.worker.id,
      date__gte: period.start_date,
      date__lte: period.end_date,
    }).then(r => r.data.results ?? r.data),
    enabled: open,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => hoursApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hours', slip.worker.id] })
      qc.invalidateQueries({ queryKey: ['period', periodId] })
      setEditing(null)
      toast.success('Hours updated.')
    },
    onError: () => toast.error('Failed to update hours.'),
  })

  const deleteMutation = useMutation({
    mutationFn: id => hoursApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hours', slip.worker.id] })
      qc.invalidateQueries({ queryKey: ['period', periodId] })
      setDeleting(null)
      toast.success('Entry deleted.')
    },
    onError: () => toast.error('Failed to delete entry.'),
  })

  return (
    <>
      {/* Summary row — click to expand */}
      <tr
        className="hover:bg-sand-50 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <td className="font-medium text-ocean-900">
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown  size={14} className="text-ocean-400 shrink-0" />
              : <ChevronRight size={14} className="text-ocean-400 shrink-0" />
            }
            {slip.worker?.full_name}
          </div>
        </td>
        <td className="font-mono text-sm">{Number(slip.total_hours).toFixed(2)}</td>
        <td className="font-mono text-sm">{fmt(slip.gross_pay)}</td>
        <td className="font-mono text-sm text-red-600">−{fmt(slip.nis_deduction)}</td>
        <td className="font-mono text-sm text-red-600">−{fmt(slip.health_surcharge)}</td>
        <td className="font-mono text-sm text-red-600">
          {Number(slip.other_deductions) > 0 ? `−${fmt(slip.other_deductions)}` : '—'}
        </td>
        <td className="font-mono text-sm font-bold text-emerald-700 text-right">{fmt(slip.net_pay)}</td>
      </tr>

      {/* Expanded daily breakdown */}
      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-sand-50 border-t border-b border-sand-200 px-10 py-4">
              {isLoading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : entries.length === 0 ? (
                <p className="text-sm text-ocean-400 text-center py-2">
                  No manual hours entries for this period.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ocean-400 text-xs uppercase tracking-wide border-b border-sand-200">
                      <th className="text-left py-1.5 font-medium">Date</th>
                      <th className="text-left py-1.5 font-medium">Clock in</th>
                      <th className="text-left py-1.5 font-medium">Clock out</th>
                      <th className="text-left py-1.5 font-medium">Hours</th>
                      <th className="text-left py-1.5 font-medium">Notes</th>
                      {isDraft && <th className="py-1.5 w-16" />}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => (
                      <tr key={entry.id} className="border-b border-sand-100 last:border-0">
                        <td className="py-2 font-medium text-ocean-700">{fmtDate(entry.date)}</td>
                        <td className="py-2 font-mono text-ocean-500 text-xs">{entry.clock_in  ?? '—'}</td>
                        <td className="py-2 font-mono text-ocean-500 text-xs">{entry.clock_out ?? '—'}</td>
                        <td className="py-2 font-mono font-semibold text-ocean-800">
                          {Number(entry.hours_worked).toFixed(2)}h
                        </td>
                        <td className="py-2 text-ocean-400 text-xs">{entry.notes || '—'}</td>
                        {isDraft && (
                          <td className="py-2">
                            <div
                              className="flex gap-1 justify-end"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setEditing(entry)}
                                className="p-1.5 rounded hover:bg-ocean-100 text-ocean-400 hover:text-ocean-700 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setDeleting(entry.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-ocean-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}

      {editing && (
        <EditHoursModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={data => updateMutation.mutate({ id: editing.id, data })}
          saving={updateMutation.isPending}
        />
      )}
      {deleting !== null && (
        <ConfirmDialog
          title="Delete hours entry"
          message="This removes the entry from the record. Payroll totals will update on the next recalculation."
          danger
          onConfirm={() => deleteMutation.mutate(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PayPeriodDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [confirm, setConfirm] = useState(null) // 'finalise' | 'paid'

  const { data: period, isLoading } = useQuery({
    queryKey: ['period', id],
    queryFn:  () => periodsApi.get(id).then(r => r.data),
  })

  const calcMutation = useMutation({
    mutationFn: () => periodsApi.calculate(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['period', id] }); toast.success('Payroll recalculated.') },
    onError:    () => toast.error('Calculation failed.'),
  })

  const finaliseMutation = useMutation({
    mutationFn: () => periodsApi.finalise(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['period', id] }); toast.success('Period finalised.') },
    onError:    err => toast.error(err.response?.data?.detail || 'Failed to finalise.'),
  })

  const paidMutation = useMutation({
    mutationFn: () => periodsApi.markPaid(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['period', id] }); toast.success('Marked as paid.') },
  })

  if (isLoading) return <PageLoader />
  if (!period)   return <p className="text-ocean-400 p-8">Period not found.</p>

  const payslips    = period.payslips ?? []
  const totalGross  = payslips.reduce((s, p) => s + Number(p.gross_pay), 0)
  const totalNIS    = payslips.reduce((s, p) => s + Number(p.nis_deduction), 0)
  const totalHS     = payslips.reduce((s, p) => s + Number(p.health_surcharge), 0)
  const totalNet    = payslips.reduce((s, p) => s + Number(p.net_pay), 0)
  const isDraft     = period.status === 'draft'
  const isFinalised = period.status === 'finalised'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/payroll')}
          className="p-2 rounded-xl hover:bg-sand-100 text-ocean-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="page-title capitalize">{period.period_type} Pay Period</h1>
            <StatusBadge status={period.status} />
          </div>
          <p className="text-sm text-ocean-400">{period.start_date} → {period.end_date}</p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <button
              onClick={() => calcMutation.mutate()}
              disabled={calcMutation.isPending}
              className="btn-secondary"
            >
              <Calculator size={15} /> {calcMutation.isPending ? 'Calculating…' : 'Recalculate'}
            </button>
          )}
          {isDraft && payslips.length > 0 && (
            <button onClick={() => setConfirm('finalise')} className="btn-primary">
              <Lock size={15} /> Finalise
            </button>
          )}
          {isFinalised && (
            <button onClick={() => setConfirm('paid')} className="btn-primary">
              <CheckCircle size={15} /> Mark paid
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Gross pay',        value: fmt(totalGross), color: 'text-ocean-900' },
          { label: 'NIS deductions',   value: fmt(totalNIS),   color: 'text-red-600'  },
          { label: 'Health surcharge', value: fmt(totalHS),    color: 'text-red-600'  },
          { label: 'Net pay',          value: fmt(totalNet),   color: 'text-emerald-700 text-xl' },
        ].map(c => (
          <div key={c.label} className="card text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean-400 mb-1">{c.label}</p>
            <p className={`font-mono font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Payslips table */}
      {payslips.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ocean-400 text-sm mb-3">
            No payslips yet. Click <strong>Recalculate</strong> to generate them.
          </p>
          <button
            onClick={() => calcMutation.mutate()}
            disabled={calcMutation.isPending}
            className="btn-primary mx-auto"
          >
            <Calculator size={15} /> Run payroll
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Hours</th>
                <th>Gross</th>
                <th>NIS</th>
                <th>Health S.</th>
                <th>Other deductions</th>
                <th className="text-right">Net pay</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(slip => (
                <WorkerRow
                  key={slip.id}
                  slip={slip}
                  period={period}
                  periodId={id}
                  isDraft={isDraft}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-sand-200 bg-sand-50">
                <td className="py-3 px-4 font-bold text-ocean-900">Totals</td>
                <td />
                <td className="py-3 px-4 font-mono font-bold">{fmt(totalGross)}</td>
                <td className="py-3 px-4 font-mono font-bold text-red-600">−{fmt(totalNIS)}</td>
                <td className="py-3 px-4 font-mono font-bold text-red-600">−{fmt(totalHS)}</td>
                <td />
                <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-right">{fmt(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {confirm === 'finalise' && (
        <ConfirmDialog
          title="Finalise pay period"
          message="Finalising locks the period. Workers' net pay will be fixed. You can still mark it as paid afterwards."
          onConfirm={() => { finaliseMutation.mutate(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'paid' && (
        <ConfirmDialog
          title="Mark as paid"
          message="This confirms all workers have been paid for this period."
          onConfirm={() => { paidMutation.mutate(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
