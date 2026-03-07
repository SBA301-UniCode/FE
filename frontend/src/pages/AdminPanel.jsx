import { useEffect, useState, useCallback } from 'react'
import Header from '../components/layout/Header'
import { userApi, roleApi, privilegeApi, subscriptionApi, enrollmentApi } from '../api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import './AdminPanel.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const extractPage = (payload) => {
  const content = payload?.content ?? payload?.data ?? []
  return {
    list: Array.isArray(content) ? content : [],
    totalPages: payload?.totalPages ?? payload?.page?.totalPages ?? 1,
    totalElements: payload?.totalElements ?? payload?.page?.totalElements ?? 0,
  }
}

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'report', label: 'Report' },
  { key: 'enrollments', label: 'Enrollments' },
]

const AdminPanel = () => {
  const [tab, setTab] = useState('users')

  return (
    <div className="admin-panel">
      <Header />
      <main className="admin-panel-main">
        <h1>Admin Panel</h1>
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`admin-tab${tab === t.key ? ' admin-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'users' && <UsersTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'report' && <ReportTab />}
        {tab === 'enrollments' && <EnrollmentsTab />}
      </main>
    </div>
  )
}

/* ─── Users Tab ─── */
function UsersTab() {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '', avatarUrl: '', roleCodes: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userApi.getAll(page, 10)
      const p = extractPage(unwrap(res))
      setUsers(p.list)
      setTotalPages(p.totalPages)
    } catch { setUsers([]) }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', password: '', name: '', avatarUrl: '', roleCodes: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    const roles = (u.roles || []).map((r) => r.roleCode || r).join(', ')
    setForm({ email: u.email || '', password: '', name: u.name || '', avatarUrl: u.avatarUrl || '', roleCodes: roles })
    setFormError('')
    setShowModal(true)
  }

  const handleDelete = async (u) => {
    if (!window.confirm(`Xóa user "${u.name || u.email}"?`)) return
    try { await userApi.delete(u.userId); load() } catch (e) { alert(e.response?.data?.message || 'Lỗi') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const roleCodes = form.roleCodes.split(',').map((s) => s.trim()).filter(Boolean)
    try {
      if (editing) {
        await userApi.update(editing.userId, { name: form.name, avatarUrl: form.avatarUrl || undefined, isActive: true, roleCodes: roleCodes.length ? new Set(roleCodes) : undefined })
      } else {
        await userApi.create({ email: form.email, password: form.password, name: form.name, avatarUrl: form.avatarUrl || undefined, roleCodes: new Set(roleCodes) })
      }
      setShowModal(false)
      load()
    } catch (err) { setFormError(err.response?.data?.message || err.message) }
    setSaving(false)
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Quản lý Users</h2>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>+ Tạo User</button>
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="admin-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
            <h3>{editing ? 'Sửa User' : 'Tạo User'}</h3>
            {formError && <div className="admin-form-error">{formError}</div>}
            {!editing && <label>Email * <input value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} required /></label>}
            {!editing && <label>Password * <input type="password" value={form.password} onChange={(ev) => setForm({ ...form, password: ev.target.value })} required minLength={6} /></label>}
            <label>Name * <input value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} required /></label>
            <label>Avatar URL <input value={form.avatarUrl} onChange={(ev) => setForm({ ...form, avatarUrl: ev.target.value })} /></label>
            <label>Roles (comma-separated, e.g. ADMIN, INSTRUCTOR, LEARNER) <input value={form.roleCodes} onChange={(ev) => setForm({ ...form, roleCodes: ev.target.value })} /></label>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>{saving ? '...' : editing ? 'Cập nhật' : 'Tạo'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="admin-loading">Đang tải...</div> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Roles</th><th>Active</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{(u.roles || []).map((r) => r.roleName || r.roleCode || r).join(', ')}</td>
                    <td><span className={`admin-badge ${u.active || u.isActive ? 'admin-badge-active' : 'admin-badge-inactive'}`}>{u.active || u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="admin-actions-cell">
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={() => openEdit(u)}>Sửa</button>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDelete(u)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="admin-empty">Không có user</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button type="button" className="admin-btn admin-btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
            <span>Trang {page + 1} / {totalPages}</span>
            <button type="button" className="admin-btn admin-btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Roles Tab ─── */
function RolesTab() {
  const [roles, setRoles] = useState([])
  const [privileges, setPrivileges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('role')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, pRes] = await Promise.all([roleApi.getAll(0, 50), privilegeApi.getAll(0, 50)])
      const rData = unwrap(rRes)
      const pData = unwrap(pRes)
      setRoles(Array.isArray(rData?.content) ? rData.content : Array.isArray(rData) ? rData : [])
      setPrivileges(Array.isArray(pData?.content) ? pData.content : Array.isArray(pData) ? pData : [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openRole = (r = null) => {
    setModalType('role')
    setEditing(r)
    setForm(r ? { roleCode: r.roleCode, roleName: r.roleName, description: r.description || '' } : { roleCode: '', roleName: '', description: '' })
    setFormError('')
    setShowModal(true)
  }

  const openPrivilege = (p = null) => {
    setModalType('privilege')
    setEditing(p)
    setForm(p ? { privilegeCode: p.privilegeCode, privilegeName: p.privilegeName, description: p.description || '' } : { privilegeCode: '', privilegeName: '', description: '' })
    setFormError('')
    setShowModal(true)
  }

  const handleDeleteRole = async (r) => {
    if (!window.confirm(`Xóa role "${r.roleName}"?`)) return
    try { await roleApi.delete(r.roleCode); load() } catch (e) { alert(e.response?.data?.message || 'Lỗi') }
  }

  const handleDeletePrivilege = async (p) => {
    if (!window.confirm(`Xóa privilege "${p.privilegeName}"?`)) return
    try { await privilegeApi.delete(p.privilegeCode); load() } catch (e) { alert(e.response?.data?.message || 'Lỗi') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (modalType === 'role') {
        if (editing) await roleApi.update(editing.roleCode, form)
        else await roleApi.create(form)
      } else {
        if (editing) await privilegeApi.update(editing.privilegeCode, form)
        else await privilegeApi.create(form)
      }
      setShowModal(false)
      load()
    } catch (err) { setFormError(err.response?.data?.message || err.message) }
    setSaving(false)
  }

  return (
    <div className="admin-section">
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="admin-modal" onClick={(ev) => ev.stopPropagation()} onSubmit={handleSubmit}>
            <h3>{editing ? 'Sửa' : 'Tạo'} {modalType === 'role' ? 'Role' : 'Privilege'}</h3>
            {formError && <div className="admin-form-error">{formError}</div>}
            {modalType === 'role' ? (
              <>
                <label>Role Code * <input value={form.roleCode} onChange={(ev) => setForm({ ...form, roleCode: ev.target.value })} required disabled={!!editing} /></label>
                <label>Role Name * <input value={form.roleName} onChange={(ev) => setForm({ ...form, roleName: ev.target.value })} required /></label>
                <label>Description <input value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} /></label>
              </>
            ) : (
              <>
                <label>Privilege Code * <input value={form.privilegeCode} onChange={(ev) => setForm({ ...form, privilegeCode: ev.target.value })} required disabled={!!editing} /></label>
                <label>Privilege Name * <input value={form.privilegeName} onChange={(ev) => setForm({ ...form, privilegeName: ev.target.value })} required /></label>
                <label>Description <input value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} /></label>
              </>
            )}
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>{saving ? '...' : editing ? 'Cập nhật' : 'Tạo'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-section-header">
        <h2>Roles</h2>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => openRole()}>+ Tạo Role</button>
      </div>
      {loading ? <div className="admin-loading">Đang tải...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Name</th><th>Privileges</th><th>Actions</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.roleCode}>
                  <td>{r.roleCode}</td>
                  <td>{r.roleName}</td>
                  <td>{(r.privileges || []).map((p) => p.privilegeName || p.privilegeCode).join(', ') || '-'}</td>
                  <td>
                    <div className="admin-actions-cell">
                      <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={() => openRole(r)}>Sửa</button>
                      <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDeleteRole(r)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={4} className="admin-empty">Không có role</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-section-header" style={{ marginTop: '2rem' }}>
        <h2>Privileges</h2>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => openPrivilege()}>+ Tạo Privilege</button>
      </div>
      {!loading && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {privileges.map((p) => (
                <tr key={p.privilegeCode}>
                  <td>{p.privilegeCode}</td>
                  <td>{p.privilegeName}</td>
                  <td>{p.description || '-'}</td>
                  <td>
                    <div className="admin-actions-cell">
                      <button type="button" className="admin-btn admin-btn-sm admin-btn-ghost" onClick={() => openPrivilege(p)}>Sửa</button>
                      <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => handleDeletePrivilege(p)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
              {privileges.length === 0 && <tr><td colSpan={4} className="admin-empty">Không có privilege</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Subscriptions Tab ─── */
function SubscriptionsTab() {
  const [subs, setSubs] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ statusPayment: '', from: '', to: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body = {}
      if (filter.statusPayment) body.statusPayment = filter.statusPayment
      if (filter.from) body.from = filter.from
      if (filter.to) body.to = filter.to
      const res = await subscriptionApi.search(body, page, 10)
      const p = extractPage(unwrap(res))
      setSubs(p.list)
      setTotalPages(p.totalPages)
    } catch { setSubs([]) }
    setLoading(false)
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-'
  const formatPrice = (v) => {
    if (v == null) return '-'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header"><h2>Subscriptions</h2></div>
      <div className="admin-filter-row">
        <label>
          Status
          <select value={filter.statusPayment} onChange={(e) => { setFilter({ ...filter, statusPayment: e.target.value }); setPage(0) }}>
            <option value="">Tất cả</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </label>
        <label>Từ ngày <input type="date" value={filter.from} onChange={(e) => { setFilter({ ...filter, from: e.target.value }); setPage(0) }} /></label>
        <label>Đến ngày <input type="date" value={filter.to} onChange={(e) => { setFilter({ ...filter, to: e.target.value }); setPage(0) }} /></label>
      </div>
      {loading ? <div className="admin-loading">Đang tải...</div> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Ngày</th><th>Giá</th><th>Status</th><th>PayType</th><th>Content</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.subcriptionId}>
                    <td style={{ fontSize: '0.75rem' }}>{String(s.subcriptionId).slice(0, 8)}...</td>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>{formatPrice(s.subcriptionPrice)}</td>
                    <td><span className={`admin-badge admin-badge-${(s.statusPayment || '').toLowerCase()}`}>{s.statusPayment}</span></td>
                    <td>{s.payType || '-'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.content || s.message || '-'}</td>
                  </tr>
                ))}
                {subs.length === 0 && <tr><td colSpan={6} className="admin-empty">Không có subscription</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button type="button" className="admin-btn admin-btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
            <span>Trang {page + 1} / {totalPages}</span>
            <button type="button" className="admin-btn admin-btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Report Tab ─── */
const CHART_COLORS = {
  revenue: '#8b5cf6',
  revenueFill: 'rgba(139, 92, 246, 0.15)',
  success: '#22c55e',
  error: '#ef4444',
  pending: '#eab308',
  transactions: '#3b82f6',
}

const PIE_COLORS = ['#22c55e', '#ef4444', '#eab308']

const formatVND = (v) => {
  if (v == null) return '-'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

const formatFullVND = (v) =>
  v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '-'

const formatCompactVND = (v) => {
  if (v == null) return '-'
  const n = Number(v)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} triệu`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K VND`
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="admin-chart-tooltip">
      <div className="admin-chart-tooltip-label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="admin-chart-tooltip-row">
          <span className="admin-chart-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}: </span>
          <strong>{entry.name === 'Doanh thu' ? formatFullVND(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  )
}

function ReportTab() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ from: '', to: '' })
  const [error, setError] = useState('')
  const [chartType, setChartType] = useState('area')

  const fetchReport = async () => {
    if (!filter.from || !filter.to) { setError('Vui lòng chọn khoảng thời gian'); return }
    setLoading(true)
    setError('')
    try {
      const res = await subscriptionApi.report({ from: filter.from, to: filter.to })
      setReport(unwrap(res))
    } catch (e) { setError(e.response?.data?.message || e.message) }
    setLoading(false)
  }

  const chartData = (report?.data || []).map((d) => ({
    date: d.localDate,
    'Doanh thu': d.totalAmount || 0,
    'Giao dịch': d.totalPayment || 0,
    'Thành công': d.success || 0,
    'Lỗi': d.error || 0,
  }))

  const pieData = report ? [
    { name: 'Thành công', value: report.totalSuccess || 0 },
    { name: 'Lỗi', value: report.totalError || 0 },
    { name: 'Đang chờ', value: report.totalPending || 0 },
  ].filter((d) => d.value > 0) : []

  return (
    <div className="admin-section">
      <div className="admin-section-header"><h2>Báo cáo doanh thu</h2></div>
      <div className="admin-filter-row">
        <label>Từ ngày <input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></label>
        <label>Đến ngày <input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></label>
        <button type="button" className="admin-btn admin-btn-primary" onClick={fetchReport} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? 'Đang tải...' : 'Xem báo cáo'}
        </button>
      </div>
      {error && <div className="admin-error">{error}</div>}

      {report && (
        <>
          {/* Summary cards */}
          <div className="admin-report-cards">
            <div className="admin-report-card admin-report-card--highlight" title={formatFullVND(report.totalAmount)}>
              <div className="admin-report-card-value" style={{ color: CHART_COLORS.revenue }}>{formatCompactVND(report.totalAmount)}</div>
              <div className="admin-report-card-label">Tổng doanh thu</div>
            </div>
            <div className="admin-report-card">
              <div className="admin-report-card-value" style={{ color: CHART_COLORS.transactions }}>{report.totalPayment}</div>
              <div className="admin-report-card-label">Tổng giao dịch</div>
            </div>
            <div className="admin-report-card">
              <div className="admin-report-card-value" style={{ color: CHART_COLORS.success }}>{report.totalSuccess}</div>
              <div className="admin-report-card-label">Thành công</div>
            </div>
            <div className="admin-report-card">
              <div className="admin-report-card-value" style={{ color: CHART_COLORS.error }}>{report.totalError}</div>
              <div className="admin-report-card-label">Lỗi</div>
            </div>
            <div className="admin-report-card">
              <div className="admin-report-card-value" style={{ color: CHART_COLORS.pending }}>{report.totalPending}</div>
              <div className="admin-report-card-label">Đang chờ</div>
            </div>
          </div>

          {/* Main revenue chart + chart type selector inline */}
          {chartData.length > 0 && (
            <div className="admin-chart-card">
              <div className="admin-chart-card-header">
                <h3>Doanh thu theo ngày</h3>
                <div className="admin-chart-type-btns">
                  {[
                    { key: 'area', label: 'Area' },
                    { key: 'bar', label: 'Bar' },
                    { key: 'line', label: 'Line' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={`admin-btn admin-btn-sm ${chartType === t.key ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                      onClick={() => setChartType(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tickFormatter={formatVND} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="Doanh thu" stroke={CHART_COLORS.revenue} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tickFormatter={formatVND} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#fff' }} />
                    <Bar dataKey="Doanh thu" fill={CHART_COLORS.revenue} radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tickFormatter={formatVND} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#fff' }} />
                    <Line type="monotone" dataKey="Doanh thu" stroke={CHART_COLORS.revenue} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.revenue }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Transactions bar + Pie side by side */}
          {chartData.length > 0 && (
            <div className="admin-chart-row">
              <div className="admin-chart-card admin-chart-card--in-row">
                <h3>Giao dịch theo ngày</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#fff' }} />
                    <Bar dataKey="Thành công" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lỗi" fill={CHART_COLORS.error} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {pieData.length > 0 && (
                <div className="admin-chart-card admin-chart-card--in-row">
                  <h3>Tỉ lệ giao dịch</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        dataKey="value"
                        stroke="none"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Data table */}
          {chartData.length > 0 && (
            <div className="admin-chart-card">
              <h3>Chi tiết theo ngày</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Ngày</th><th>Doanh thu</th><th>Giao dịch</th><th>Thành công</th><th>Lỗi</th></tr></thead>
                  <tbody>
                    {(report.data || []).map((d, i) => (
                      <tr key={i}>
                        <td>{d.localDate}</td>
                        <td>{formatFullVND(d.totalAmount)}</td>
                        <td>{d.totalPayment}</td>
                        <td style={{ color: CHART_COLORS.success }}>{d.success}</td>
                        <td style={{ color: CHART_COLORS.error }}>{d.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Enrollments Tab ─── */
function EnrollmentsTab() {
  const [enrollments, setEnrollments] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ keysearch: '', statusCourse: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const body = {}
      if (filter.keysearch) body.keysearch = filter.keysearch
      if (filter.statusCourse) body.statusCourse = filter.statusCourse
      const res = await enrollmentApi.search(body, page, 10)
      const p = extractPage(unwrap(res))
      setEnrollments(p.list)
      setTotalPages(p.totalPages)
    } catch { setEnrollments([]) }
    setLoading(false)
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (enrollment, newStatus) => {
    try {
      await enrollmentApi.updateStatus({ enrollmentId: enrollment.enrollmentId, statusCourse: newStatus })
      load()
    } catch (e) { alert(e.response?.data?.message || 'Lỗi') }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-'

  return (
    <div className="admin-section">
      <div className="admin-section-header"><h2>Enrollments</h2></div>
      <div className="admin-filter-row">
        <label>
          Tìm kiếm
          <input
            value={filter.keysearch}
            onChange={(e) => setFilter({ ...filter, keysearch: e.target.value })}
            placeholder="Tên khóa học, mô tả..."
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); load() } }}
          />
        </label>
        <label>
          Status
          <select value={filter.statusCourse} onChange={(e) => { setFilter({ ...filter, statusCourse: e.target.value }); setPage(0) }}>
            <option value="">Tất cả</option>
            <option value="NOT_STARTED">NOT_STARTED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </label>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => { setPage(0); load() }} style={{ alignSelf: 'flex-end' }}>Tìm</button>
      </div>
      {loading ? <div className="admin-loading">Đang tải...</div> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Khóa học</th><th>Ngày đăng ký</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.enrollmentId}>
                    <td>{e.courseResponse?.title || '-'}</td>
                    <td>{formatDate(e.enrollmentDate)}</td>
                    <td><span className={`admin-badge admin-badge-${(e.statusCourse || '').toLowerCase().replace('_', '-')}`}>{e.statusCourse}</span></td>
                    <td>
                      <select
                        value={e.statusCourse}
                        onChange={(ev) => handleStatusChange(e, ev.target.value)}
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#fff', padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                      >
                        <option value="NOT_STARTED">NOT_STARTED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {enrollments.length === 0 && <tr><td colSpan={4} className="admin-empty">Không có enrollment</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button type="button" className="admin-btn admin-btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
            <span>Trang {page + 1} / {totalPages}</span>
            <button type="button" className="admin-btn admin-btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminPanel
