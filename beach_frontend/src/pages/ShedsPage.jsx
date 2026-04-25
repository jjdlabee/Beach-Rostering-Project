import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { shedsApi, bookingsApi } from '../api/services'
import { Modal, StatusBadge, PageLoader, Field, ConfirmDialog } from '../components/ui'
import { Warehouse, Plus, Settings, X } from 'lucide-react'

function ShedManager({ onClose }) {
  const qc = useQueryClient()
  const { data: shedsData } = useQuery({ queryKey: ['sheds'], queryFn: () => shedsApi.list().then(r => r.data) })
  const sheds = shedsData?.results ?? shedsData ?? []

  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', description: '', capacity: 1, color: '#10B981' } })
  const createMutation = useMutation({
    mutationFn: (data) => shedsApi.create(data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['sheds'] }); reset(); toast.success('Shed added.') },
  })

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {sheds.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-sand-100 bg-sand-50">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-ocean-800">{s.name}</p>
              {s.description && <p className="text-xs text-ocean-400 truncate">{s.description}</p>}
            </div>
            <span className="text-xs text-ocean-400">Cap: {s.capacity}</span>
            <span className={`text-xs font-semibold ${s.is_active ? 'text-emerald-600' : 'text-red-400'}`}>
              {s.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="border-t border-sand-100 pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ocean-500">Add shed</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className="input" {...register('name', { required: true })} placeholder="Shed A" /></Field>
          <Field label="Color"><input type="color" className="input h-[42px] p-1.5" {...register('color')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity"><input type="number" min="1" className="input" {...register('capacity')} /></Field>
          <Field label="Description"><input className="input" {...register('description')} placeholder="Optional" /></Field>
        </div>
        <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
          <Plus size={15} /> Add shed
        </button>
      </form>
      <div className="flex justify-end"><button onClick={onClose} className="btn-secondary">Done</button></div>
    </div>
  )
}

function BookingForm({ selectedDate, booking, onClose }) {
  const qc = useQueryClient()
  const { data: shedsData } = useQuery({ queryKey: ['sheds'], queryFn: () => shedsApi.list().then(r => r.data) })
  const sheds = (shedsData?.results ?? shedsData ?? []).filter(s => s.is_active)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: booking ?? {
      shed: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      start_date: selectedDate ?? format(new Date(), 'yyyy-MM-dd'),
      end_date:   selectedDate ?? format(new Date(), 'yyyy-MM-dd'),
      num_guests: 1,
      total_price: '',
      deposit_paid: '0',
      notes: '',
      status: 'pending',
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => booking ? bookingsApi.update(booking.id, data) : bookingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings-calendar'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success(booking ? 'Booking updated.' : 'Booking created.')
      onClose()
    },
    onError: (err) => {
      const msg = Object.values(err.response?.data ?? {}).flat().join(' ')
      toast.error(msg || 'Failed to save booking.')
    },
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <Field label="Shed" error={errors.shed?.message}>
        <select className="input" {...register('shed', { required: 'Required' })}>
          <option value="">Select shed…</option>
          {sheds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Customer name" error={errors.customer_name?.message}>
        <input className="input" {...register('customer_name', { required: 'Required' })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><input className="input" {...register('customer_phone')} /></Field>
        <Field label="Email"><input type="email" className="input" {...register('customer_email')} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" error={errors.start_date?.message}>
          <input type="date" className="input" {...register('start_date', { required: 'Required' })} />
        </Field>
        <Field label="End date" error={errors.end_date?.message}>
          <input type="date" className="input" {...register('end_date', { required: 'Required' })} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Guests"><input type="number" min="1" className="input" {...register('num_guests')} /></Field>
        <Field label="Total (TTD)"><input type="number" step="0.01" className="input" {...register('total_price')} /></Field>
        <Field label="Deposit (TTD)"><input type="number" step="0.01" className="input" {...register('deposit_paid')} /></Field>
      </div>
      <Field label="Status">
        <select className="input" {...register('status')}>
          {['pending','confirmed','cancelled','completed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea className="input h-20 resize-none" {...register('notes')} /></Field>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : (booking ? 'Save changes' : 'Create booking')}
        </button>
      </div>
    </form>
  )
}

function BookingDetail({ event, onEdit, onDelete, onClose }) {
  const p = event.extendedProps
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-ocean-900 text-lg">{p.shed_name}</p>
          <p className="text-ocean-500 text-sm">{event.startStr} → {event.endStr || event.startStr}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><p className="label">Customer</p><p className="text-ocean-800">{p.customer}</p></div>
        <div><p className="label">Guests</p><p className="text-ocean-800">{p.num_guests}</p></div>
        {p.phone && <div><p className="label">Phone</p><p className="text-ocean-800">{p.phone}</p></div>}
        {p.total_price && <div><p className="label">Total</p><p className="text-ocean-800 font-mono">TTD {p.total_price}</p></div>}
        {p.deposit_paid && Number(p.deposit_paid) > 0 && (
          <div><p className="label">Deposit paid</p><p className="text-ocean-800 font-mono">TTD {p.deposit_paid}</p></div>
        )}
        {p.notes && <div className="col-span-2"><p className="label">Notes</p><p className="text-ocean-800">{p.notes}</p></div>}
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onDelete} className="btn-danger text-xs">Delete</button>
        <button onClick={onEdit}   className="btn-primary text-xs">Edit</button>
      </div>
    </div>
  )
}

export default function ShedsPage() {
  const qc          = useQueryClient()
  const calendarRef = useRef(null)
  const [modal, setModal]         = useState(null) // null | 'sheds' | 'new' | { event } | { booking, edit }
  const [calRange, setCalRange]   = useState({ start: format(new Date(), 'yyyy-MM-01'), end: format(new Date(), 'yyyy-MM-28') })
  const [delTarget, setDelTarget] = useState(null)

  const { data: events, isLoading } = useQuery({
    queryKey: ['bookings-calendar', calRange.start, calRange.end],
    queryFn:  () => bookingsApi.calendar(calRange.start, calRange.end).then(r => r.data),
    enabled:  !!(calRange.start && calRange.end),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => bookingsApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['bookings-calendar'] })
      toast.success('Booking deleted.')
      setModal(null)
    },
    onError: () => toast.error('Failed to delete.'),
  })

  const handleDatesSet = (info) => {
    setCalRange({ start: format(info.start, 'yyyy-MM-dd'), end: format(info.end, 'yyyy-MM-dd') })
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sheds & Bookings</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal('sheds')} className="btn-secondary"><Settings size={15} /> Manage sheds</button>
          <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> New booking</button>
        </div>
      </div>

      <div className="card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events ?? []}
          datesSet={handleDatesSet}
          dateClick={(info) => setModal({ new: true, date: info.dateStr })}
          eventClick={(info) => setModal({ event: info.event })}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
          height="auto"
          eventDisplay="block"
        />
      </div>

      {/* Modals */}
      {modal === 'sheds' && (
        <Modal title="Manage sheds" onClose={() => setModal(null)}>
          <ShedManager onClose={() => setModal(null)} />
        </Modal>
      )}
      {(modal === 'new' || modal?.new) && (
        <Modal title="New booking" onClose={() => setModal(null)} wide>
          <BookingForm selectedDate={modal?.date} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.event && !modal?.edit && (
        <Modal title="Booking details" onClose={() => setModal(null)}>
          <BookingDetail
            event={modal.event}
            onEdit={() => setModal({ edit: true, bookingId: modal.event.id, event: modal.event })}
            onDelete={() => setDelTarget(modal.event.id)}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Edit booking" onClose={() => setModal(null)} wide>
          <BookingForm
            booking={{ id: modal.bookingId, ...modal.event?.extendedProps }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {delTarget && (
        <ConfirmDialog
          title="Delete booking"
          message="Are you sure you want to delete this booking? This cannot be undone."
          danger
          onConfirm={() => { deleteMutation.mutate(delTarget); setDelTarget(null) }}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}
