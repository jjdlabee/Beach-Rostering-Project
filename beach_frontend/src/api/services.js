import api, { publicApi } from './client'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (credentials) => api.post('/auth/token/', credentials),
  refresh: (refresh)     => api.post('/auth/token/refresh/', { refresh }),
}

// ── Workers ───────────────────────────────────────────────────────────────────
export const workersApi = {
  list:   (params) => api.get('/workers/', { params }),
  get:    (id)     => api.get(`/workers/${id}/`),
  create: (data)   => api.post('/workers/', data),
  update: (id, data) => api.patch(`/workers/${id}/`, data),
  delete: (id)     => api.delete(`/workers/${id}/`),
}

// ── Payroll ───────────────────────────────────────────────────────────────────
export const hoursApi = {
  list:   (params) => api.get('/payroll/hours/', { params }),
  create: (data)   => api.post('/payroll/hours/', data),
  update: (id, data) => api.patch(`/payroll/hours/${id}/`, data),
  delete: (id)     => api.delete(`/payroll/hours/${id}/`),
}

export const periodsApi = {
  list:      (params) => api.get('/payroll/periods/', { params }),
  get:       (id)     => api.get(`/payroll/periods/${id}/`),
  create:    (data)   => api.post('/payroll/periods/', data),
  update:    (id, data) => api.patch(`/payroll/periods/${id}/`, data),
  calculate: (id)     => api.post(`/payroll/periods/${id}/calculate/`),
  finalise:  (id)     => api.post(`/payroll/periods/${id}/finalise/`),
  markPaid:  (id)     => api.post(`/payroll/periods/${id}/mark-paid/`),
}

export const slipsApi = {
  list:        (params) => api.get('/payroll/slips/', { params }),
  recalculate: (id)     => api.post(`/payroll/slips/${id}/recalculate/`),
}

// ── Roster ────────────────────────────────────────────────────────────────────
export const shiftsApi = {
  list:   ()       => api.get('/roster/shifts/'),
  create: (data)   => api.post('/roster/shifts/', data),
  update: (id, data) => api.patch(`/roster/shifts/${id}/`, data),
  delete: (id)     => api.delete(`/roster/shifts/${id}/`),
}

export const rosterApi = {
  list:   (params) => api.get('/roster/entries/', { params }),
  week:   (start)  => api.get('/roster/entries/week/', { params: { start } }),
  create: (data)   => api.post('/roster/entries/', data),
  update: (id, data) => api.patch(`/roster/entries/${id}/`, data),
  delete: (id)     => api.delete(`/roster/entries/${id}/`),
}

// ── Public shed booking (no auth) ─────────────────────────────────────────────
export const publicShedsApi = {
  pricing:      ()           => publicApi.get('/pricing/'),
  sheds:        ()           => publicApi.get('/sheds/'),
  availability: (id, date)   => publicApi.get(`/sheds/${id}/availability/`, { params: { date } }),
  book:         (data)       => publicApi.post('/bookings/', data),
}

// ── Sheds ─────────────────────────────────────────────────────────────────────
export const shedsApi = {
  list:         ()                => api.get('/sheds/sheds/'),
  create:       (data)            => api.post('/sheds/sheds/', data),
  update:       (id, data)        => api.patch(`/sheds/sheds/${id}/`, data),
  availability: (id, start, end)  => api.get(`/sheds/sheds/${id}/availability/`, { params: { start, end } }),
}

export const bookingsApi = {
  list:     (params)      => api.get('/sheds/bookings/', { params }),
  get:      (id)          => api.get(`/sheds/bookings/${id}/`),
  create:   (data)        => api.post('/sheds/bookings/', data),
  update:   (id, data)    => api.patch(`/sheds/bookings/${id}/`, data),
  delete:   (id)          => api.delete(`/sheds/bookings/${id}/`),
  calendar: (start, end)  => api.get('/sheds/bookings/calendar/', { params: { start, end } }),
}
