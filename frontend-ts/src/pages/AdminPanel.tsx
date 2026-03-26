import { useEffect, useState, useCallback } from 'react'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { userApi, roleApi, privilegeApi, subscriptionApi, enrollmentApi } from '../api'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useTranslation } from 'react-i18next'

type AnyObj = Record<string, unknown>
const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
const extractPage = (p: unknown) => { const o = p as AnyObj; const content = o?.content ?? o?.data ?? []; return { list: Array.isArray(content) ? content as AnyObj[] : [], totalPages: ((o?.totalPages ?? (o?.page as AnyObj)?.totalPages ?? 1) as number), totalElements: ((o?.totalElements ?? (o?.page as AnyObj)?.totalElements ?? 0) as number) } }

const TABS = [{ key: 'users', label: 'Users' }, { key: 'roles', label: 'Roles' }, { key: 'subscriptions', label: 'Subscriptions' }, { key: 'enrollments', label: 'Enrollments' }]

const btnPrimary = 'px-3.5 py-2 rounded-[10px] font-semibold border-none cursor-pointer text-[0.82rem] transition-all bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed'
const btnGhost = 'px-3.5 py-2 rounded-[10px] font-semibold cursor-pointer text-[0.82rem] transition-all bg-bg-deep text-text-main border border-border-medium'
const btnSm = '!px-2.5 !py-1 !text-[0.78rem]'
const btnDanger = '!bg-red-500/[0.08] !text-red-600 !border-none'
const inputCls = 'bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]'
const sectionCls = 'bg-white border border-border-medium rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
const tableCls = 'w-full border-collapse text-sm [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:border-b [&_th]:border-border-subtle [&_th]:font-bold [&_th]:text-text-muted [&_th]:text-[0.82rem] [&_th]:uppercase [&_th]:tracking-wide [&_td]:text-left [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border-subtle [&_tr:hover_td]:bg-bg-deep'

function Pagination({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  return <div className="flex items-center justify-center gap-3 mt-4"><button type="button" className={btnGhost} disabled={page === 0} onClick={onPrev}>Prev</button><span>Trang {page + 1} / {totalPages}</span><button type="button" className={btnGhost} disabled={page + 1 >= totalPages} onClick={onNext}>Next</button></div>
}

function Modal({ title, show, onClose, onSubmit, error, saving, children }: { title: string; show: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; error: string; saving: boolean; children: React.ReactNode }) {
  if (!show) return null
  return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]" onClick={onClose}><form className="bg-white border border-border-medium rounded-[18px] px-7 py-6 w-[95%] max-w-[520px] flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(ev) => ev.stopPropagation()} onSubmit={onSubmit}><h3 className="m-0 text-lg font-extrabold">{title}</h3>{error && <div className="bg-red-50 border border-red-200 rounded-[10px] p-2 text-[0.85rem] text-red-600">{error}</div>}{children}<div className="flex gap-3 justify-end"><button type="button" className={btnGhost} onClick={onClose}>Hủy</button><button type="submit" className={btnPrimary} disabled={saving}>{saving ? '...' : 'Lưu'}</button></div></form></div>
}

function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="flex flex-col gap-1 text-sm font-semibold">{text}{children}</label> }
function Badge({ status }: { status: string }) { const s = status.toLowerCase(); const cls = s === 'success' || s === 'active' ? 'bg-emerald-50 text-green-600' : s === 'error' || s === 'inactive' ? 'bg-red-50 text-red-600' : s === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'; return <span className={`inline-block px-2 py-0.5 rounded-full text-[0.72rem] font-bold ${cls}`}>{status}</span> }

/* ─── Users Tab ─── */
function UsersTab() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<AnyObj[]>([]); const [page, setPage] = useState(0); const [totalPages, setTotalPages] = useState(1); const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState<AnyObj | null>(null); const [form, setForm] = useState({ email: '', password: '', name: '', avatarUrl: '', roleCodes: '' }); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState(''); const [searchQuery, setSearchQuery] = useState('')
  const [availableRoles, setAvailableRoles] = useState<AnyObj[]>([])
  const load = useCallback(async () => { setLoading(true); try { const res = await userApi.getAll(page, 10); const p = extractPage(unwrap(res)); setUsers(p.list); setTotalPages(p.totalPages) } catch { setUsers([]) }; setLoading(false) }, [page])
  useEffect(() => { load() }, [load])
  useEffect(() => { roleApi.getAll(0, 50).then((res) => { const d = unwrap(res) as AnyObj; const list = Array.isArray(d?.content) ? d.content as AnyObj[] : Array.isArray(d) ? d as AnyObj[] : []; setAvailableRoles(list) }).catch(() => {}) }, [])
  const openCreate = () => { setEditing(null); setForm({ email: '', password: '', name: '', avatarUrl: '', roleCodes: '' }); setFormError(''); setShowModal(true) }
  const openEdit = (u: AnyObj) => { setEditing(u); const roles = ((u.roles || []) as AnyObj[]).map((r) => r.roleCode || r).join(', '); setForm({ email: (u.email || '') as string, password: '', name: (u.name || '') as string, avatarUrl: (u.avatarUrl || '') as string, roleCodes: roles }); setFormError(''); setShowModal(true) }
  const handleDelete = async (u: AnyObj) => { if (!window.confirm(t('common.confirmDeleteUser', { name: (u.name || u.email) as string }))) return; try { await userApi.delete(u.userId as string); load() } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; alert(err.response?.data?.message || t('common.errorGeneric')) } }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('')
    const trimName = form.name.trim()
    if (trimName.length < 2) { setFormError(t('admin.validationNameMin')); return }
    if (trimName.length > 100) { setFormError(t('admin.validationNameMax')); return }
    if (!editing) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError(t('admin.validationEmailInvalid')); return }
      if (form.password.length < 6) { setFormError(t('admin.validationPasswordMin')); return }
    }
    if (form.avatarUrl && !/^https?:\/\/.+/.test(form.avatarUrl.trim())) { setFormError(t('admin.validationAvatarUrl')); return }
    setSaving(true); const roleCodes = form.roleCodes.split(',').map((s) => s.trim()).filter(Boolean); try { if (editing) { await userApi.update(editing.userId as string, { name: trimName, avatarUrl: form.avatarUrl?.trim() || undefined, active: true, roleCodes: roleCodes.length ? roleCodes : [] }) } else { await userApi.create({ email: form.email.trim(), password: form.password, name: trimName, avatarUrl: form.avatarUrl?.trim() || undefined, roleCodes: roleCodes }) }; setShowModal(false); setPage(0); load() } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; message?: string }; setFormError(e.response?.data?.message || e.message || 'Lỗi') }; setSaving(false) }

  const filteredUsers = searchQuery.trim() ? users.filter((u) => ((u.name as string) || '').toLowerCase().includes(searchQuery.toLowerCase()) || ((u.email as string) || '').toLowerCase().includes(searchQuery.toLowerCase())) : users

  return <div className={sectionCls}>
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h2 className="m-0 text-xl font-bold">{t('admin.manageUsers')}</h2><button type="button" className={btnPrimary} onClick={openCreate}>{t('admin.createUser')}</button></div>
    {/* Search */}
    <div className="flex items-center gap-2 bg-bg-deep border border-border-medium rounded-xl px-3 py-2 mb-4 max-w-[400px]">
      <span className="text-text-muted text-sm">🔍</span>
      <input className="flex-1 bg-transparent border-none outline-none text-text-main text-sm" placeholder={t('admin.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      {searchQuery && <button type="button" className="bg-transparent border-none text-text-muted cursor-pointer text-sm" onClick={() => setSearchQuery('')}>✕</button>}
    </div>
    <Modal title={editing ? t('admin.editUser') : t('admin.createUserTitle')} show={showModal} onClose={() => setShowModal(false)} onSubmit={handleSubmit} error={formError} saving={saving}>
      {!editing && <Label text="Email *"><input className={inputCls} value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} required /></Label>}
      {!editing && <Label text="Password *"><input className={inputCls} type="password" value={form.password} onChange={(ev) => setForm({ ...form, password: ev.target.value })} required minLength={6} /></Label>}
      <Label text="Name *"><input className={inputCls} value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} required /></Label>
      <Label text="Avatar URL"><input className={inputCls} value={form.avatarUrl} onChange={(ev) => setForm({ ...form, avatarUrl: ev.target.value })} /></Label>
      <Label text="Role">{availableRoles.length > 0 ? <select className={inputCls} value={form.roleCodes} onChange={(ev) => setForm({ ...form, roleCodes: ev.target.value })}><option value="">-- Chọn vai trò --</option>{availableRoles.map((r) => <option key={r.roleCode as string} value={r.roleCode as string}>{(r.roleName || r.roleCode) as string}</option>)}</select> : <input className={inputCls} value={form.roleCodes} onChange={(ev) => setForm({ ...form, roleCodes: ev.target.value })} placeholder="LEARNER, INSTRUCTOR, ADMIN" />}</Label>
    </Modal>
    {loading ? <div className="p-4 text-center text-text-muted">{t('common.loading')}</div> : <><div className="overflow-x-auto"><table className={tableCls}><thead><tr><th>{t('admin.name')}</th><th>{t('admin.email')}</th><th>{t('admin.roles')}</th><th>{t('admin.status')}</th><th>{t('admin.actions')}</th></tr></thead><tbody>{filteredUsers.map((u) => { const isUserActive = !!(u.active || u.status === 'ACTIVE' || u.enabled); return <tr key={u.userId as string}><td>{u.name as string}</td><td>{u.email as string}</td><td>{((u.roles || []) as AnyObj[]).map((r) => (r.roleName || r.roleCode || r) as string).join(', ')}</td><td><Badge status={isUserActive ? 'Active' : 'Inactive'} /></td><td><div className="flex gap-1.5 flex-wrap"><button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => openEdit(u)}>{t('common.edit')}</button><button type="button" className={`${btnGhost} ${btnSm}`} style={{ color: isUserActive ? '#dc2626' : '#16a34a', borderColor: isUserActive ? '#fecaca' : '#bbf7d0' }} onClick={async () => { try { await userApi.update(u.userId as string, { active: !isUserActive }); load() } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; message?: string }; alert(e.response?.data?.message || e.message || 'Lỗi') } }}>{isUserActive ? '🔒 Khóa' : '🔓 Mở khóa'}</button><button type="button" className={`${btnGhost} ${btnSm} ${btnDanger}`} onClick={() => handleDelete(u)}>{t('common.delete')}</button></div></td></tr> })}{filteredUsers.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-text-muted">{searchQuery ? t('admin.noUsersSearch') : t('admin.noUsers')}</td></tr>}</tbody></table></div><Pagination page={page} totalPages={totalPages} onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} /></>}
  </div>
}

/* ─── Roles Tab ─── */
function RolesTab() {
  const { t } = useTranslation()
  const [roles, setRoles] = useState<AnyObj[]>([]); const [privileges, setPrivileges] = useState<AnyObj[]>([]); const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false); const [modalType, setModalType] = useState('role'); const [editing, setEditing] = useState<AnyObj | null>(null); const [form, setForm] = useState<AnyObj>({}); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState('')
  const load = useCallback(async () => { setLoading(true); try { const [rRes, pRes] = await Promise.all([roleApi.getAll(0, 50), privilegeApi.getAll(0, 50)]); const rD = unwrap(rRes) as AnyObj; const pD = unwrap(pRes) as AnyObj; setRoles(Array.isArray(rD?.content) ? rD.content as AnyObj[] : Array.isArray(rD) ? rD as AnyObj[] : []); setPrivileges(Array.isArray(pD?.content) ? pD.content as AnyObj[] : Array.isArray(pD) ? pD as AnyObj[] : []) } catch {}; setLoading(false) }, [])
  useEffect(() => { load() }, [load])
  const openRole = (r: AnyObj | null = null) => { setModalType('role'); setEditing(r); setForm(r ? { roleCode: r.roleCode, roleName: r.roleName, description: r.description || '' } : { roleCode: '', roleName: '', description: '' }); setFormError(''); setShowModal(true) }
  const openPrivilege = (p: AnyObj | null = null) => { setModalType('privilege'); setEditing(p); setForm(p ? { privilegeCode: p.privilegeCode, privilegeName: p.privilegeName, description: p.description || '' } : { privilegeCode: '', privilegeName: '', description: '' }); setFormError(''); setShowModal(true) }
  const handleDeleteRole = async (r: AnyObj) => { if (!window.confirm(t('common.confirmDeleteRole', { name: r.roleName as string }))) return; try { await roleApi.delete(r.roleCode as string); load() } catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } }).response?.data?.message || t('common.errorGeneric')) } }
  const handleDeletePrivilege = async (p: AnyObj) => { if (!window.confirm(t('common.confirmDeletePrivilege', { name: p.privilegeName as string }))) return; try { await privilegeApi.delete(p.privilegeCode as string); load() } catch (e: unknown) { alert((e as { response?: { data?: { message?: string } } }).response?.data?.message || t('common.errorGeneric')) } }
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); setFormError(''); try { if (modalType === 'role') { if (editing) await roleApi.update(editing.roleCode as string, form); else await roleApi.create(form) } else { if (editing) await privilegeApi.update(editing.privilegeCode as string, form); else await privilegeApi.create(form) }; setShowModal(false); load() } catch (err: unknown) { const er = err as { response?: { data?: { message?: string } }; message?: string }; setFormError(er.response?.data?.message || er.message || 'Lỗi') }; setSaving(false) }

  return <div className={sectionCls}>
    <Modal title={`${editing ? 'Sửa' : 'Tạo'} ${modalType === 'role' ? 'Role' : 'Privilege'}`} show={showModal} onClose={() => setShowModal(false)} onSubmit={handleSubmit} error={formError} saving={saving}>
      {modalType === 'role' ? <><Label text="Role Code *"><input className={inputCls} value={(form.roleCode || '') as string} onChange={(ev) => setForm({ ...form, roleCode: ev.target.value })} required disabled={!!editing} /></Label><Label text="Role Name *"><input className={inputCls} value={(form.roleName || '') as string} onChange={(ev) => setForm({ ...form, roleName: ev.target.value })} required /></Label><Label text="Description"><input className={inputCls} value={(form.description || '') as string} onChange={(ev) => setForm({ ...form, description: ev.target.value })} /></Label></> : <><Label text="Privilege Code *"><input className={inputCls} value={(form.privilegeCode || '') as string} onChange={(ev) => setForm({ ...form, privilegeCode: ev.target.value })} required disabled={!!editing} /></Label><Label text="Privilege Name *"><input className={inputCls} value={(form.privilegeName || '') as string} onChange={(ev) => setForm({ ...form, privilegeName: ev.target.value })} required /></Label><Label text="Description"><input className={inputCls} value={(form.description || '') as string} onChange={(ev) => setForm({ ...form, description: ev.target.value })} /></Label></>}
    </Modal>
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="m-0 text-xl font-bold">{t('admin.roles')}</h2><button type="button" className={btnPrimary} onClick={() => openRole()}>{t('admin.createRole')}</button></div>
    {loading ? <div className="p-4 text-center text-text-muted">{t('common.loading')}</div> : <div className="overflow-x-auto"><table className={tableCls}><thead><tr><th>Code</th><th>Name</th><th>Privileges</th><th>{t('admin.actions')}</th></tr></thead><tbody>{roles.map((r) => <tr key={r.roleCode as string}><td>{r.roleCode as string}</td><td>{r.roleName as string}</td><td>{((r.privileges || []) as AnyObj[]).map((p) => (p.privilegeName || p.privilegeCode) as string).join(', ') || '-'}</td><td><div className="flex gap-1.5"><button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => openRole(r)}>{t('common.edit')}</button><button type="button" className={`${btnGhost} ${btnSm} ${btnDanger}`} onClick={() => handleDeleteRole(r)}>{t('common.delete')}</button></div></td></tr>)}{roles.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-text-muted">{t('admin.noRoles')}</td></tr>}</tbody></table></div>}
    <div className="flex items-center justify-between gap-3 mb-4 mt-8"><h2 className="m-0 text-xl font-bold">Privileges</h2><button type="button" className={btnPrimary} onClick={() => openPrivilege()}>{t('admin.createPrivilege')}</button></div>
    {!loading && <div className="overflow-x-auto"><table className={tableCls}><thead><tr><th>Code</th><th>Name</th><th>Description</th><th>{t('admin.actions')}</th></tr></thead><tbody>{privileges.map((p) => <tr key={p.privilegeCode as string}><td>{p.privilegeCode as string}</td><td>{p.privilegeName as string}</td><td>{(p.description || '-') as string}</td><td><div className="flex gap-1.5"><button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => openPrivilege(p)}>{t('common.edit')}</button><button type="button" className={`${btnGhost} ${btnSm} ${btnDanger}`} onClick={() => handleDeletePrivilege(p)}>{t('common.delete')}</button></div></td></tr>)}{privileges.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-text-muted">{t('admin.noPrivileges')}</td></tr>}</tbody></table></div>}
  </div>
}

/* ─── Subscriptions Tab ─── */
function SubscriptionsTab() {
  const { t } = useTranslation()
  const [subs, setSubs] = useState<AnyObj[]>([]); const [page, setPage] = useState(0); const [totalPages, setTotalPages] = useState(1); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState({ statusPayment: '', from: '', to: '' })
  const load = useCallback(async () => { setLoading(true); try { const body: AnyObj = {}; if (filter.statusPayment) body.statusPayment = filter.statusPayment; if (filter.from) body.from = filter.from; if (filter.to) body.to = filter.to; const res = await subscriptionApi.search(body, page, 10); const p = extractPage(unwrap(res)); setSubs(p.list); setTotalPages(p.totalPages) } catch { setSubs([]) }; setLoading(false) }, [page, filter])
  useEffect(() => { load() }, [load])
  const fmtDate = (d: unknown) => d ? new Date(d as string).toLocaleDateString('vi-VN') : '-'
  const fmtPrice = (v: unknown) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v)) : '-'

  return <div className={sectionCls}>
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="m-0 text-xl font-bold">{t('admin.subscriptionsTitle')}</h2></div>
    <div className="flex gap-3 flex-wrap items-end mb-4"><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.status')}<select className={inputCls} value={filter.statusPayment} onChange={(e) => { setFilter({ ...filter, statusPayment: e.target.value }); setPage(0) }}><option value="">{t('admin.filterAll')}</option><option value="SUCCESS">SUCCESS</option><option value="PENDING">PENDING</option><option value="ERROR">ERROR</option></select></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.fromDate')}<input className={inputCls} type="date" value={filter.from} onChange={(e) => { setFilter({ ...filter, from: e.target.value }); setPage(0) }} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.toDate')}<input className={inputCls} type="date" value={filter.to} onChange={(e) => { setFilter({ ...filter, to: e.target.value }); setPage(0) }} /></label></div>
    {loading ? <div className="p-4 text-center text-text-muted">{t('common.loading')}</div> : <><div className="overflow-x-auto"><table className={tableCls}><thead><tr><th>ID</th><th>{t('admin.date')}</th><th>{t('admin.amount')}</th><th>{t('admin.status')}</th><th>PayType</th><th>Content</th></tr></thead><tbody>{subs.map((s) => <tr key={s.subcriptionId as string}><td className="text-[0.75rem]">{String(s.subcriptionId).slice(0, 8)}...</td><td>{fmtDate(s.createdAt)}</td><td>{fmtPrice(s.subcriptionPrice)}</td><td><Badge status={(s.statusPayment || '') as string} /></td><td>{(s.payType || '-') as string}</td><td className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{(s.content || s.message || '-') as string}</td></tr>)}{subs.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-text-muted">{t('admin.noSubscriptions')}</td></tr>}</tbody></table></div><Pagination page={page} totalPages={totalPages} onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} /></>}
  </div>
}

/* ─── Report Tab ─── */
const CHART_COLORS = { revenue: '#8b5cf6', success: '#22c55e', error: '#ef4444', pending: '#eab308', transactions: '#3b82f6' }
const PIE_COLORS = ['#22c55e', '#ef4444', '#eab308']
const formatVND = (v: number) => { if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`; if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`; return String(v) }
const formatFullVND = (v: number | null) => v != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '-'
const formatCompactVND = (v: unknown) => { const n = Number(v); if (!Number.isFinite(n)) return '-'; if (n >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)} triệu`; if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K VND`; return formatFullVND(n) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => { if (!active || !payload?.length) return null; return <div className="bg-white border border-border-medium rounded-xl px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"><div className="font-bold mb-1 text-text-main text-[0.88rem]">{label}</div>{payload.map((e: AnyObj, i: number) => <div key={i} className="flex items-center gap-1.5 text-[0.85rem] text-text-secondary py-px"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color as string }} /><span>{e.name as string}: </span><strong>{(e.name as string) === 'Doanh thu' ? formatFullVND(e.value as number) : String(e.value)}</strong></div>)}</div> }

function ReportTab() {
  const { t } = useTranslation()
  const [report, setReport] = useState<AnyObj | null>(null); const [loading, setLoading] = useState(false); const [filter, setFilter] = useState({ from: '', to: '' }); const [error, setError] = useState(''); const [sourceNote, setSourceNote] = useState(''); const [chartType, setChartType] = useState('area')
  const extractDateKey = (v: unknown) => { if (!v) return ''; const raw = String(v); if (raw.length >= 10 && raw[4] === '-' && raw[7] === '-') return raw.slice(0, 10); const dt = new Date(raw); if (Number.isNaN(dt.getTime())) return ''; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }

  const buildReport = async ({ from, to }: { from: string; to: string }) => {
    let page = 0; let totalPages = 1; const all: AnyObj[] = []
    while (page < totalPages) { const res = await subscriptionApi.search({ from, to }, page, 100); const p = extractPage(unwrap(res)); all.push(...p.list); totalPages = Math.max(1, p.totalPages); page++ }
    const dm = new Map<string, AnyObj>(); let tA = 0, tP = 0, tS = 0, tE = 0
    all.forEach((s) => { const dk = extractDateKey(s?.createdAt); if (!dk) return; const st = String(s?.statusPayment || '').toUpperCase(); const amt = Number(s?.subcriptionPrice || 0); if (!dm.has(dk)) dm.set(dk, { localDate: dk, totalAmount: 0, totalPayment: 0, success: 0, error: 0 }); const row = dm.get(dk)!; row.totalPayment = (row.totalPayment as number) + 1; tP++; if (st === 'SUCCESS') { const rev = Number.isFinite(amt) ? amt : 0; row.success = (row.success as number) + 1; row.totalAmount = (row.totalAmount as number) + rev; tS++; tA += rev } else if (st === 'ERROR') { row.error = (row.error as number) + 1; tE++ } })
    return { totalAmount: tA, totalPayment: tP, totalSuccess: tS, totalError: tE, totalPending: tP - tS - tE, data: [...dm.values()].sort((a, b) => String(a.localDate).localeCompare(String(b.localDate))) }
  }

  const fetchReport = async () => { if (!filter.from || !filter.to) { setError(t('admin.selectDateRange')); return }; if (new Date(filter.from) > new Date(filter.to)) { setError(t('admin.invalidDateRange')); return }; setLoading(true); setError(''); setReport(null); setSourceNote(''); try { const r = await buildReport({ from: filter.from, to: filter.to }); setReport(r); setSourceNote('Source: subscriptions/search.') } catch (e: unknown) { const err = e as { response?: { data?: { message?: string; errorCode?: string } }; message?: string }; setError(err.response?.data?.message || err.response?.data?.errorCode || err.message || t('common.error')) }; setLoading(false) }

  const chartData = ((report?.data || []) as AnyObj[]).map((d) => ({ date: d.localDate as string, 'Doanh thu': (d.totalAmount || 0) as number, 'Giao dịch': (d.totalPayment || 0) as number, 'Thành công': (d.success || 0) as number, 'Lỗi': (d.error || 0) as number }))
  const pieData = report ? [{ name: 'Thành công', value: (report.totalSuccess || 0) as number }, { name: 'Lỗi', value: (report.totalError || 0) as number }, { name: 'Đang chờ', value: (report.totalPending || 0) as number }].filter((d) => d.value > 0) : []

  return <div className={sectionCls}>
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="m-0 text-xl font-bold">{t('admin.reportTitle')}</h2></div>
    <div className="flex gap-3 flex-wrap items-end mb-4"><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.fromDate')}<input className={inputCls} type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.toDate')}<input className={inputCls} type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></label><button type="button" className={`${btnPrimary} self-end`} onClick={fetchReport} disabled={loading}>{loading ? t('admin.loadingReport') : t('admin.viewReport')}</button></div>
    {error && <div className="p-4 text-center text-red-600">{error}</div>}
    {!error && sourceNote && <div className="p-4 text-center text-text-muted text-sm">{sourceNote}</div>}
    {report && <>
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-4 max-[1100px]:grid-cols-3 max-[768px]:grid-cols-2">{[{ v: formatCompactVND(report.totalAmount), l: 'Tổng doanh thu', c: CHART_COLORS.revenue, hl: true }, { v: report.totalPayment, l: 'Tổng giao dịch', c: CHART_COLORS.transactions }, { v: report.totalSuccess, l: 'Thành công', c: CHART_COLORS.success }, { v: report.totalError, l: 'Lỗi', c: CHART_COLORS.error }, { v: report.totalPending, l: 'Đang chờ', c: CHART_COLORS.pending }].map((card) => <div key={card.l} className={`bg-white border border-border-medium rounded-[14px] px-2.5 py-3.5 text-center overflow-hidden ${card.hl ? 'bg-blue-50 border-primary-500/20' : ''}`}><div className="font-extrabold break-words leading-tight" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', color: card.c }}>{String(card.v)}</div><div className="text-[0.78rem] text-text-muted mt-1">{card.l}</div></div>)}</div>

      {chartData.length > 0 && <div className="bg-white border border-border-medium rounded-2xl p-5 mt-4"><div className="flex items-center justify-between gap-3 mb-4 flex-wrap"><h3 className="m-0 text-base font-bold">Doanh thu theo ngày</h3><div className="flex gap-1.5">{[{ key: 'area', label: 'Area' }, { key: 'bar', label: 'Bar' }, { key: 'line', label: 'Line' }].map((t) => <button key={t.key} type="button" className={`${btnSm} ${chartType === t.key ? btnPrimary : btnGhost}`} onClick={() => setChartType(t.key)}>{t.label}</button>)}</div></div>
        <ResponsiveContainer width="100%" height={320}>{chartType === 'area' ? <AreaChart data={chartData}><defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} /><stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis tickFormatter={formatVND} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip content={<CustomTooltip />} /><Legend /><Area type="monotone" dataKey="Doanh thu" stroke={CHART_COLORS.revenue} fill="url(#colorRevenue)" strokeWidth={2} /></AreaChart> : chartType === 'bar' ? <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis tickFormatter={formatVND} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="Doanh thu" fill={CHART_COLORS.revenue} radius={[6, 6, 0, 0]} /></BarChart> : <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis tickFormatter={formatVND} tick={{ fill: '#94a3b8', fontSize: 12 }} /><Tooltip content={<CustomTooltip />} /><Legend /><Line type="monotone" dataKey="Doanh thu" stroke={CHART_COLORS.revenue} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.revenue }} /></LineChart>}</ResponsiveContainer>
      </div>}

      {chartData.length > 0 && <div className="grid grid-cols-[3fr_2fr] gap-4 mt-4 max-[768px]:grid-cols-1">
        <div className="bg-white border border-border-medium rounded-2xl p-5"><h3 className="m-0 mb-4 text-base font-bold">Giao dịch theo ngày</h3><ResponsiveContainer width="100%" height={260}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" /><XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip content={<CustomTooltip />} /><Legend /><Bar dataKey="Thành công" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} /><Bar dataKey="Lỗi" fill={CHART_COLORS.error} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        {!!pieData.length && <div className="bg-white border border-border-medium rounded-2xl p-5"><h3 className="m-0 mb-4 text-base font-bold">Tỉ lệ giao dịch</h3><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none" label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>}
      </div>}

      {chartData.length > 0 && <div className="bg-white border border-border-medium rounded-2xl p-5 mt-4"><h3 className="m-0 mb-4 text-base font-bold">Chi tiết theo ngày</h3><div className="overflow-x-auto"><table className={tableCls}><thead><tr><th>Ngày</th><th>Doanh thu</th><th>Giao dịch</th><th>Thành công</th><th>Lỗi</th></tr></thead><tbody>{((report.data || []) as AnyObj[]).map((d, i) => <tr key={i}><td>{d.localDate as string}</td><td>{formatFullVND(d.totalAmount as number)}</td><td>{d.totalPayment as number}</td><td className="text-green-600">{d.success as number}</td><td className="text-red-600">{d.error as number}</td></tr>)}</tbody></table></div></div>}
    </>}
  </div>
}

/* ─── Enrollments Tab ─── */
function EnrollmentsTab() {
  const { t } = useTranslation()
  const [enrollments, setEnrollments] = useState<AnyObj[]>([]); const [page, setPage] = useState(0); const [totalPages, setTotalPages] = useState(1); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState({ keysearch: '', statusCourse: '' })
  const load = useCallback(async () => { setLoading(true); try { const body: AnyObj = {}; if (filter.keysearch) body.keysearch = filter.keysearch; if (filter.statusCourse) body.statusCourse = filter.statusCourse; const res = await enrollmentApi.search(body, page, 10); const p = extractPage(unwrap(res)); setEnrollments(p.list); setTotalPages(p.totalPages) } catch { setEnrollments([]) }; setLoading(false) }, [page, filter])
  useEffect(() => { load() }, [load])
  const handleStatusChange = async (e: AnyObj, newStatus: string) => { try { await enrollmentApi.updateStatus({ enrollmentId: e.enrollmentId as string, statusCourse: newStatus }); load() } catch (err: unknown) { alert((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Lỗi') } }
  const fmtDate = (d: unknown) => d ? new Date(d as string).toLocaleDateString('vi-VN') : '-'

  return <div className={sectionCls}>
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="m-0 text-xl font-bold">{t('admin.enrollmentsTitle')}</h2></div>
    <div className="flex gap-3 flex-wrap items-end mb-4"><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.searchLabel')}<input className={inputCls} value={filter.keysearch} onChange={(e) => setFilter({ ...filter, keysearch: e.target.value })} placeholder={t('admin.courseName') + '...'} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); load() } }} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">{t('admin.status')}<select className={inputCls} value={filter.statusCourse} onChange={(e) => { setFilter({ ...filter, statusCourse: e.target.value }); setPage(0) }}><option value="">{t('admin.filterAll')}</option><option value="NOT_STARTED">NOT_STARTED</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="COMPLETED">COMPLETED</option></select></label><button type="button" className={`${btnPrimary} self-end`} onClick={() => { setPage(0); load() }}>{t('admin.searchBtn')}</button></div>
    {loading ? <div className="p-4 text-center text-text-muted">{t('common.loading')}</div> : <><div className="overflow-x-auto"><table className={tableCls}><thead><tr><th>{t('admin.courseName')}</th><th>{t('admin.enrollDate')}</th><th>{t('admin.status')}</th><th>{t('admin.actions')}</th></tr></thead><tbody>{enrollments.map((e) => <tr key={e.enrollmentId as string}><td>{((e.courseResponse as AnyObj)?.title || '-') as string}</td><td>{fmtDate(e.enrollmentDate)}</td><td><Badge status={(e.statusCourse || '') as string} /></td><td><select className="bg-bg-deep border border-border-medium rounded-lg text-text-main px-2 py-1 text-[0.82rem] outline-none" value={(e.statusCourse || '') as string} onChange={(ev) => handleStatusChange(e, ev.target.value)}><option value="NOT_STARTED">NOT_STARTED</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="COMPLETED">COMPLETED</option></select></td></tr>)}{enrollments.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-text-muted">{t('admin.noEnrollments')}</td></tr>}</tbody></table></div><Pagination page={page} totalPages={totalPages} onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} /></>}
  </div>
}

/* ═══ MAIN ═══ */
const AdminPanel = () => {
  const [tab, setTab] = useState('users')
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col">
      <Header />
      <div className="bg-[linear-gradient(135deg,#1e1b4b_0%,#312e81_50%,#4338ca_100%)] px-6 py-8 text-white"><div className="w-full mx-auto"><div className="flex items-center gap-1.5 text-[0.82rem] mb-2 text-white/65"><a href="/" className="text-white/85 no-underline hover:underline">{t('admin.breadcrumbHome')}</a><span>/</span><span>Admin</span></div><h1 className="m-0 text-2xl font-extrabold">{t('admin.dashboardTitle')}</h1><p className="mt-1 mb-0 text-white/70 text-sm">{t('admin.dashboardDesc')}</p></div></div>
      <main className="w-full mx-auto px-6 py-6 pb-16">
        <div className="flex gap-2 mb-6 flex-wrap">{TABS.map((t) => <button key={t.key} type="button" className={`px-4 py-2 rounded-xl font-bold border cursor-pointer transition-all text-sm ${tab === t.key ? 'bg-primary-500 text-white border-primary-500 shadow-[0_4px_12px_rgba(0,86,210,0.15)]' : 'bg-white text-text-secondary border-border-medium hover:bg-bg-deep'}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>
        {tab === 'users' && <UsersTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {false && <ReportTab />}
        {tab === 'enrollments' && <EnrollmentsTab />}
      </main>
      <Footer />
    </div>
  )
}

export default AdminPanel
