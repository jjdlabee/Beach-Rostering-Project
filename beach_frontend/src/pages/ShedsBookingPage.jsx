import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast, { Toaster } from 'react-hot-toast'
import {
  Waves, Zap, Users, Car, Droplets, CheckCircle,
  ArrowLeft, CalendarDays, ExternalLink, Phone,
} from 'lucide-react'
import { publicShedsApi } from '../api/services'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return `TTD ${Number(n).toFixed(2)}` }

function calcTotal(form, p) {
  if (!p) return 0
  let total = p.shed_base_price
  if (form.wants_electricity)  total += p.electricity_price
  total += (Number(form.num_washroom_passes) || 0) * p.washroom_price_per_person
  const extra = Math.max(0, (Number(form.num_vehicles) || 0) - p.free_vehicles)
  total += extra * p.extra_vehicle_price
  return total
}

function calcBreakdown(form, p) {
  if (!p) return []
  const rows = [{ label: 'Shed rental', amount: p.shed_base_price }]
  if (form.wants_electricity)
    rows.push({ label: 'Electricity', amount: p.electricity_price })
  const passes = Number(form.num_washroom_passes) || 0
  if (passes > 0)
    rows.push({ label: `Washroom passes (×${passes})`, amount: passes * p.washroom_price_per_person })
  const extra = Math.max(0, (Number(form.num_vehicles) || 0) - p.free_vehicles)
  if (extra > 0)
    rows.push({ label: `Extra parking (×${extra} vehicle${extra > 1 ? 's' : ''})`, amount: extra * p.extra_vehicle_price })
  return rows
}

// ── Pricing grid (static display) ─────────────────────────────────────────────
function PricingGrid({ pricing }) {
  const items = [
    {
      icon: <Waves size={22} />,
      title: 'Shed Rental',
      price: pricing ? fmt(pricing.shed_base_price) : '—',
      details: ['Capacity: 25 persons or less', 'Water for cooking available', 'Bring a container to transport water'],
      color: 'from-ocean-700 to-ocean-600',
    },
    {
      icon: <Zap size={22} />,
      title: 'Electricity',
      price: pricing ? fmt(pricing.electricity_price) : '—',
      details: ['Optional add-on', 'Bring your own extension cord'],
      color: 'from-amber-600 to-amber-500',
    },
    {
      icon: <Users size={22} />,
      title: 'Washroom / Change Room',
      price: pricing ? `${fmt(pricing.washroom_price_per_person)} / person` : '—',
      details: ['Day pass per person', 'Includes bathroom & change room access'],
      color: 'from-teal-700 to-teal-600',
    },
    {
      icon: <Car size={22} />,
      title: 'Parking',
      price: pricing ? `${pricing.free_vehicles} free` : '—',
      details: [
        `First ${pricing?.free_vehicles ?? 5} vehicles included`,
        pricing ? `${fmt(pricing.extra_vehicle_price)} per additional vehicle` : '',
      ].filter(Boolean),
      color: 'from-emerald-700 to-emerald-600',
    },
    {
      icon: <Droplets size={22} />,
      title: 'Water',
      price: 'Included',
      details: ['Available for cooking', 'Bring a container to carry water'],
      color: 'from-blue-700 to-blue-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {items.map(item => (
        <div key={item.title} className={`rounded-2xl bg-gradient-to-br ${item.color} p-5 text-white`}>
          <div className="mb-3 opacity-90">{item.icon}</div>
          <p className="font-semibold text-sm mb-1">{item.title}</p>
          <p className="text-lg font-bold mb-3">{item.price}</p>
          <ul className="space-y-1">
            {item.details.map(d => (
              <li key={d} className="text-xs opacity-80 flex gap-1.5 items-start">
                <span className="mt-0.5 shrink-0">•</span>{d}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ── Shed card ─────────────────────────────────────────────────────────────────
function ShedCard({ shed, onBook }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: shed.color }} />
        <h3 className="text-white font-semibold text-lg">{shed.name}</h3>
      </div>
      {shed.description && (
        <p className="text-ocean-200 text-sm">{shed.description}</p>
      )}
      <p className="text-ocean-300 text-sm flex items-center gap-1.5">
        <Users size={14} /> Up to {shed.capacity} persons
      </p>
      <button
        onClick={() => onBook(shed)}
        className="mt-auto w-full py-2.5 rounded-xl bg-sand-400 hover:bg-sand-300 text-ocean-950 font-semibold text-sm transition-colors"
      >
        Book Now
      </button>
    </div>
  )
}

// ── Booking form ──────────────────────────────────────────────────────────────
function BookingForm({ shed, pricing, onBack, onSuccess }) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    start_date:           today,
    num_guests:           1,
    wants_electricity:    false,
    num_washroom_passes:  0,
    num_vehicles:         1,
    customer_name:        '',
    customer_email:       '',
    customer_phone:       '',
    notes:                '',
  })

  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const setVal = k => e => set(k)(e.target.type === 'checkbox' ? e.target.checked : e.target.value)

  // Check availability when date changes
  const { data: avail, isLoading: checkingAvail } = useQuery({
    queryKey: ['avail', shed.id, form.start_date],
    queryFn:  () => publicShedsApi.availability(shed.id, form.start_date).then(r => r.data),
    enabled:  !!form.start_date,
  })

  const mutation = useMutation({
    mutationFn: data => publicShedsApi.book(data),
    onSuccess: res => onSuccess(res.data),
    onError: err => {
      const msg = Object.values(err.response?.data ?? {}).flat().join(' ')
      toast.error(msg || 'Booking failed. Please try again.')
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (avail && !avail.available) {
      toast.error('This shed is not available on that date.')
      return
    }
    mutation.mutate({
      shed:                shed.id,
      start_date:          form.start_date,
      end_date:            form.start_date,
      num_guests:          Number(form.num_guests),
      wants_electricity:   form.wants_electricity,
      num_washroom_passes: Number(form.num_washroom_passes),
      num_vehicles:        Number(form.num_vehicles),
      customer_name:       form.customer_name,
      customer_email:      form.customer_email,
      customer_phone:      form.customer_phone,
      notes:               form.notes,
    })
  }

  const breakdown = calcBreakdown(form, pricing)
  const total     = calcTotal(form, pricing)

  const isAvailable   = avail?.available ?? true
  const canSubmit     = isAvailable && form.customer_name && form.start_date && !mutation.isPending

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Top bar */}
      <div className="bg-ocean-950 px-6 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-ocean-300 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <Waves size={20} className="text-sand-300" />
        <span className="text-sand-100 font-semibold">Beach Facility Bookings</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-ocean-900 mb-1">Book {shed.name}</h2>
        <p className="text-ocean-400 text-sm mb-8">Fill in the details below and review your total before confirming.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="bg-white rounded-2xl border border-sand-200 p-6 space-y-4">
            <h3 className="font-semibold text-ocean-800 flex items-center gap-2">
              <CalendarDays size={16} /> Date
            </h3>
            <div>
              <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">
                Booking date
              </label>
              <input
                type="date" min={today}
                value={form.start_date} onChange={setVal('start_date')}
                className="w-full sm:w-64 border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                required
              />
              {form.start_date && (
                <p className={`mt-2 text-sm font-medium flex items-center gap-1.5 ${isAvailable ? 'text-emerald-600' : 'text-red-500'}`}>
                  {checkingAvail
                    ? <span className="text-ocean-400">Checking availability…</span>
                    : isAvailable
                      ? <><CheckCircle size={14} /> Available</>
                      : '✗ Not available — please choose another date'
                  }
                </p>
              )}
            </div>
          </div>

          {/* Guests & add-ons */}
          <div className="bg-white rounded-2xl border border-sand-200 p-6 space-y-5">
            <h3 className="font-semibold text-ocean-800 flex items-center gap-2">
              <Users size={16} /> Guests & Add-ons
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">
                  Number of guests
                </label>
                <input
                  type="number" min="1" max={shed.capacity}
                  value={form.num_guests} onChange={setVal('num_guests')}
                  className="w-full border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">
                  Washroom passes
                  <span className="ml-1 normal-case text-ocean-400 font-normal">({pricing ? fmt(pricing.washroom_price_per_person) : '$7.00'} each)</span>
                </label>
                <input
                  type="number" min="0" max={form.num_guests}
                  value={form.num_washroom_passes} onChange={setVal('num_washroom_passes')}
                  className="w-full border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox" checked={form.wants_electricity} onChange={setVal('wants_electricity')}
                className="w-4 h-4 accent-ocean-600 rounded"
              />
              <div>
                <p className="text-sm font-medium text-ocean-800">
                  Add electricity — {pricing ? fmt(pricing.electricity_price) : 'TTD 50.00'}
                </p>
                <p className="text-xs text-ocean-400">You must bring your own extension cord.</p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">
                Number of vehicles
                <span className="ml-1 normal-case text-ocean-400 font-normal">
                  ({pricing?.free_vehicles ?? 5} free, {pricing ? fmt(pricing.extra_vehicle_price) : '$10.00'} each after)
                </span>
              </label>
              <input
                type="number" min="0"
                value={form.num_vehicles} onChange={setVal('num_vehicles')}
                className="w-full sm:w-48 border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
              />
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-white rounded-2xl border border-sand-200 p-6 space-y-4">
            <h3 className="font-semibold text-ocean-800 flex items-center gap-2">
              <Phone size={16} /> Your details
            </h3>
            <div>
              <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">Full name *</label>
              <input
                type="text" value={form.customer_name} onChange={setVal('customer_name')}
                className="w-full border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                placeholder="Jane Smith" required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">Phone</label>
                <input
                  type="tel" value={form.customer_phone} onChange={setVal('customer_phone')}
                  className="w-full border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                  placeholder="+1 (868) 555-0100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">Email</label>
                <input
                  type="email" value={form.customer_email} onChange={setVal('customer_email')}
                  className="w-full border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ocean-500 uppercase tracking-wide mb-1">Notes (optional)</label>
              <textarea
                value={form.notes} onChange={setVal('notes')} rows={3}
                className="w-full border border-sand-200 rounded-xl px-3 py-2 text-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-400 resize-none"
                placeholder="Any special requests or questions…"
              />
            </div>
          </div>

          {/* Price summary */}
          <div className="bg-ocean-950 rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-sand-200 mb-4">Price summary</h3>
            <div className="space-y-2 mb-4">
              {breakdown.map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-ocean-300">{row.label}</span>
                  <span className="font-mono text-ocean-100">{fmt(row.amount)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-ocean-700 pt-4 flex justify-between items-center">
              <span className="font-bold text-sand-200">Total</span>
              <span className="font-mono font-bold text-xl text-sand-300">{fmt(total)}</span>
            </div>
          </div>

          {!isAvailable && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              This shed is already booked on that date. Please pick a different date to continue.
            </p>
          )}

          <button
            type="submit" disabled={!canSubmit}
            className="w-full py-4 rounded-2xl bg-sand-400 hover:bg-sand-300 disabled:opacity-40 disabled:cursor-not-allowed text-ocean-950 font-bold text-lg transition-colors"
          >
            {mutation.isPending ? 'Submitting…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Confirmation screen ───────────────────────────────────────────────────────
function ConfirmationScreen({ booking, pricing, onReset }) {
  const paymentUrl = pricing?.payment_url

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      <div className="bg-ocean-950 px-6 py-4 flex items-center gap-3">
        <Waves size={20} className="text-sand-300" />
        <span className="text-sand-100 font-semibold">Beach Facility Bookings</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-ocean-900 mb-1">Booking Received!</h2>
          <p className="text-ocean-400 text-sm mb-6">
            We'll confirm your booking shortly. Please complete payment to secure your date.
          </p>

          {/* Booking summary */}
          <div className="bg-sand-50 rounded-2xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-ocean-400">Reference</span>
              <span className="font-mono font-bold text-ocean-800">#{booking.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ocean-400">Date</span>
              <span className="font-medium text-ocean-800">{booking.start_date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ocean-400">Name</span>
              <span className="font-medium text-ocean-800">{booking.customer_name}</span>
            </div>
            <div className="border-t border-sand-200 pt-3 flex justify-between">
              <span className="font-bold text-ocean-800">Total due</span>
              <span className="font-mono font-bold text-ocean-900 text-lg">{fmt(booking.total_price)}</span>
            </div>
          </div>

          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-ocean-600 hover:bg-ocean-500 text-white font-bold text-base transition-colors mb-3"
            >
              Pay Now <ExternalLink size={16} />
            </a>
          ) : (
            <div className="bg-ocean-50 border border-ocean-200 rounded-2xl p-4 text-sm text-ocean-700 text-left mb-4">
              <p className="font-semibold mb-1">To complete your booking:</p>
              <p>Please contact us to arrange payment of <strong>{fmt(booking.total_price)}</strong>, quoting reference <strong>#{booking.id}</strong>.</p>
            </div>
          )}

          <button
            onClick={onReset}
            className="w-full py-3 rounded-2xl border border-sand-200 text-ocean-600 font-medium text-sm hover:bg-sand-50 transition-colors"
          >
            Make another booking
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ShedsBookingPage() {
  const [view,         setView]         = useState('browse')  // 'browse' | 'book' | 'confirm'
  const [selectedShed, setSelectedShed] = useState(null)
  const [confirmed,    setConfirmed]    = useState(null)

  const { data: pricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn:  () => publicShedsApi.pricing().then(r => r.data),
  })

  const { data: shedsData, isLoading } = useQuery({
    queryKey: ['public-sheds'],
    queryFn:  () => publicShedsApi.sheds().then(r => r.data),
  })
  const sheds = shedsData?.results ?? shedsData ?? []

  function handleBook(shed) {
    setSelectedShed(shed)
    setView('book')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSuccess(booking) {
    setConfirmed(booking)
    setView('confirm')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleReset() {
    setConfirmed(null)
    setSelectedShed(null)
    setView('browse')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (view === 'confirm')
    return <ConfirmationScreen booking={confirmed} pricing={pricing} onReset={handleReset} />

  if (view === 'book')
    return (
      <BookingForm
        shed={selectedShed}
        pricing={pricing}
        onBack={() => setView('browse')}
        onSuccess={handleSuccess}
      />
    )

  // ── Browse view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-950 via-ocean-900 to-ocean-800">
      <Toaster position="top-center" />

      {/* Nav */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <Waves size={22} className="text-sand-300" />
        <span className="text-sand-100 font-semibold text-lg">Beach Facility Bookings</span>
      </header>

      {/* Hero */}
      <div className="px-6 py-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
          Book a Beach Shed
        </h1>
        <p className="text-ocean-300 text-lg max-w-xl mx-auto">
          Spend a perfect day at the beach. Choose your shed, pick your add-ons, and pay securely online.
        </p>
      </div>

      {/* Pricing */}
      <div className="max-w-6xl mx-auto px-6 pb-14">
        <h2 className="text-sand-300 font-semibold uppercase tracking-widest text-xs mb-5">
          What's included &amp; pricing
        </h2>
        <PricingGrid pricing={pricing} />
      </div>

      {/* Sheds */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-sand-300 font-semibold uppercase tracking-widest text-xs mb-5">
          Available sheds
        </h2>
        {isLoading ? (
          <p className="text-ocean-400 text-sm">Loading sheds…</p>
        ) : sheds.length === 0 ? (
          <p className="text-ocean-400 text-sm">No sheds available at this time. Please check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sheds.map(shed => (
              <ShedCard key={shed.id} shed={shed} onBook={handleBook} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
