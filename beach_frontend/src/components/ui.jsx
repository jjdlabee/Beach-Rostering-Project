import { X } from 'lucide-react'

// ── Modal ──────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ocean-950/40 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-100">
          <h2 className="text-lg text-ocean-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-50 text-ocean-400 hover:text-ocean-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  // Generic
  active:    'bg-emerald-50 text-emerald-700',
  inactive:  'bg-sand-100 text-sand-600',
  // Pay period
  draft:     'bg-sand-100 text-sand-600',
  finalised: 'bg-ocean-50 text-ocean-700',
  paid:      'bg-emerald-50 text-emerald-700',
  // Booking
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
  completed: 'bg-ocean-50 text-ocean-700',
  // Roster
  scheduled: 'bg-ocean-50 text-ocean-700',
  absent:    'bg-red-50 text-red-600',
  swapped:   'bg-purple-50 text-purple-700',
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-sand-100 text-sand-600'
  return (
    <span className={`badge ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className="animate-spin text-ocean-500"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mb-4">
          <Icon size={24} className="text-sand-400" />
        </div>
      )}
      <p className="font-display text-lg text-ocean-800 mb-1">{title}</p>
      {description && <p className="text-sm text-ocean-400 mb-5">{description}</p>}
      {action}
    </div>
  )
}

// ── Form field wrapper ─────────────────────────────────────────────────────────
export function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-ocean-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>Confirm</button>
      </div>
    </Modal>
  )
}
