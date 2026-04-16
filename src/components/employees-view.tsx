'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, UserPlus, BadgeCheck, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authFetch } from '@/lib/api';
import { ROLE_LABELS, GRADE_SHORT_LABELS, GRADE_OPTIONS } from '@/lib/constants';
import type { Employee, Department, Division, Group } from '@/lib/types';
import { toast } from 'sonner';

const ROLE_STYLES: Record<string, { bg: string; border: string; text: string; avatarBg: string; avatarText: string }> = {
  ADMIN:    { bg: 'oklch(0.940 0.08 27)',  border: 'oklch(0.82 0.14 27)',  text: 'oklch(0.44 0.18 27)',  avatarBg: 'oklch(0.50 0.21 27)', avatarText: 'oklch(0.992 0.004 80)' },
  MANAGER:  { bg: 'oklch(0.945 0.06 240)', border: 'oklch(0.82 0.10 240)', text: 'oklch(0.40 0.14 240)', avatarBg: 'oklch(0.42 0.16 240)', avatarText: 'oklch(0.992 0.004 80)' },
  EMPLOYEE: { bg: 'oklch(0.950 0.010 78)', border: 'oklch(0.860 0.018 75)', text: 'oklch(0.45 0.020 58)', avatarBg: 'oklch(0.18 0.018 52)', avatarText: 'oklch(0.992 0.004 80)' },
};

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'oklch(0.960 0.014 78)',
  border: '1px solid oklch(0.870 0.020 75)',
  color: 'oklch(0.22 0.018 52)',
  borderRadius: '0.375rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'var(--font-dm-sans)',
};

const inputDisabled: React.CSSProperties = { ...inputBase, opacity: 0.65, cursor: 'default', background: 'oklch(0.975 0.008 78)' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: 'oklch(0.55 0.020 60)', letterSpacing: '0.07em', marginBottom: '0.375rem' };

export function EmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'view' | 'edit'>('view');
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'EMPLOYEE', grade: '', clientSide: '',
    employeeId: '', departmentId: '', divisionId: '', groupId: '', isActive: true,
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/employees');
      if (res.ok) {
        const json = await res.json();
        setEmployees(Array.isArray(json.data || json) ? (json.data || json) : []);
      }
    } catch { toast.error('社員データの取得に失敗しました'); }
    finally { setLoading(false); }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await authFetch('/api/departments?includeDivisions=true&includeGroups=true');
      if (res.ok) { const json = await res.json(); setDepartments(json.data || []); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEmployees(); fetchDepartments(); }, [fetchEmployees, fetchDepartments]);

  useEffect(() => {
    if (formData.departmentId) {
      const dept = departments.find(d => d.id === formData.departmentId);
      setDivisions(dept?.divisions?.filter(d => d.isActive) || []);
    } else { setDivisions([]); }
    setGroups([]);
  }, [formData.departmentId, departments]);

  useEffect(() => {
    if (formData.divisionId) {
      const div = divisions.find(d => d.id === formData.divisionId);
      setGroups(div?.groups?.filter(g => g.isActive) || []);
    } else { setGroups([]); }
  }, [formData.divisionId, divisions]);

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return emp.name?.toLowerCase().includes(t) || emp.email?.toLowerCase().includes(t) ||
      emp.employeeId?.toLowerCase().includes(t) || (emp.department || '').toLowerCase().includes(t);
  });

  const EMP_PAGE_SIZE = 12;
  const empTotalPages = Math.max(1, Math.ceil(filteredEmployees.length / EMP_PAGE_SIZE));
  const pagedEmployees = filteredEmployees.slice((empPage - 1) * EMP_PAGE_SIZE, empPage * EMP_PAGE_SIZE);

  const handleOpenAdd = () => {
    setSelectedEmployee(null); setFormMode('edit');
    setFormData({ name: '', email: '', role: 'EMPLOYEE', grade: '', clientSide: '', employeeId: '', departmentId: '', divisionId: '', groupId: '', isActive: true });
    setDivisions([]); setGroups([]); setDialogOpen(true);
  };

  const handleOpenView = (emp: Employee) => {
    setSelectedEmployee(emp); setFormMode('view');
    setFormData({ name: emp.name, email: emp.email, role: emp.role, grade: emp.grade || '', clientSide: emp.clientSide || '', employeeId: emp.employeeId || '', departmentId: emp.departmentId || '', divisionId: emp.divisionId || '', groupId: emp.groupId || '', isActive: emp.isActive });
    if (emp.departmentId) {
      const dept = departments.find(d => d.id === emp.departmentId);
      setDivisions(dept?.divisions?.filter(d => d.isActive) || []);
      if (emp.divisionId) {
        const div = dept?.divisions?.find(d => d.id === emp.divisionId);
        setGroups(div?.groups?.filter(g => g.isActive) || []);
      } else { setGroups([]); }
    } else { setDivisions([]); setGroups([]); }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const method = selectedEmployee ? 'PUT' : 'POST';
      const body = selectedEmployee ? { id: selectedEmployee.id, ...formData } : formData;
      const res = await authFetch('/api/employees', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(selectedEmployee ? '社員情報を更新しました' : '社員を追加しました');
        setDialogOpen(false); fetchEmployees();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || (selectedEmployee ? '更新に失敗しました' : '追加に失敗しました'));
      }
    } catch { toast.error('通信エラーが発生しました'); }
  };

  const stats = {
    total: employees.length,
    admins: employees.filter(e => e.role === 'ADMIN').length,
    managers: employees.filter(e => e.role === 'MANAGER').length,
    employees: employees.filter(e => e.role === 'EMPLOYEE').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'oklch(0.85 0.015 75)', borderTopColor: 'oklch(0.50 0.21 27)' }} />
          <span className="text-xs" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>読み込み中</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs mb-1" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-dm-mono)', letterSpacing: '0.12em' }}>EMPLOYEES</p>
          <h1 className="text-3xl font-light" style={{ fontFamily: 'var(--font-noto-serif-jp)', color: 'oklch(0.18 0.018 52)' }}>社員管理</h1>
        </div>
        <button onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-all"
          style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.992 0.004 80)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}>
          <UserPlus className="w-4 h-4" />社員追加
        </button>
      </div>

      <div className="ink-line" />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '全社員',       value: stats.total,     color: 'oklch(0.18 0.018 52)' },
          { label: '管理者',       value: stats.admins,    color: 'oklch(0.50 0.21 27)'  },
          { label: 'マネージャー', value: stats.managers,  color: 'oklch(0.40 0.14 240)' },
          { label: '一般社員',     value: stats.employees, color: 'oklch(0.40 0.020 58)'  },
        ].map((s) => (
          <div key={s.label} className="rounded px-5 py-4 text-center"
            style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}>
            <p className="text-3xl font-light mb-1"
              style={{ color: s.color, fontFamily: 'var(--font-dm-mono)' }}>{s.value}</p>
            <p className="text-xs" style={{ color: 'oklch(0.65 0.018 65)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.70 0.018 65)' }} />
        <input type="text" placeholder="名前・メール・社員番号・部署で検索..."
          value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setEmpPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded text-sm outline-none"
          style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.22 0.018 52)' }}
        />
      </div>

      {/* Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Users className="w-10 h-10" style={{ color: 'oklch(0.85 0.015 75)' }} />
          <p className="text-sm" style={{ color: 'oklch(0.65 0.018 65)', fontFamily: 'var(--font-noto-serif-jp)' }}>
            社員が見つかりません
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {pagedEmployees.map((emp) => {
            const rs = ROLE_STYLES[emp.role] || ROLE_STYLES.EMPLOYEE;
            return (
              <div key={emp.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded cursor-pointer transition-all group"
                style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.870 0.020 75)' }}
                onClick={() => handleOpenView(emp)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'oklch(0.78 0.022 72)'; e.currentTarget.style.background = 'oklch(0.982 0.006 80)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'oklch(0.870 0.020 75)'; e.currentTarget.style.background = 'oklch(0.992 0.004 80)'; }}>

                {/* Avatar */}
                <div className="flex items-center justify-center w-10 h-10 rounded shrink-0 text-sm font-bold"
                  style={{ background: rs.avatarBg, color: rs.avatarText, fontFamily: 'var(--font-noto-serif-jp)' }}>
                  {emp.name?.charAt(0) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.18 0.018 52)', fontFamily: 'var(--font-noto-serif-jp)' }}>
                      {emp.name}
                    </span>
                    {emp.grade && (
                      <span className="hanko text-[9px]">{GRADE_SHORT_LABELS[emp.grade] || emp.grade}</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0 rounded"
                      style={{ background: rs.bg, border: `1px solid ${rs.border}`, color: rs.text, fontFamily: 'var(--font-dm-mono)' }}>
                      {ROLE_LABELS[emp.role]}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5"
                    style={{ color: 'oklch(0.62 0.018 65)', fontFamily: 'var(--font-dm-mono)' }}>
                    {emp.employeeId} · {emp.department}
                  </p>
                  {emp.division && (
                    <p className="text-xs truncate" style={{ color: 'oklch(0.70 0.018 65)' }}>
                      {emp.division}{emp.group ? ` / ${emp.group}` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {empTotalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs" style={{ color: 'oklch(0.65 0.018 65)' }}>
            {filteredEmployees.length}名中 {(empPage - 1) * EMP_PAGE_SIZE + 1}–{Math.min(empPage * EMP_PAGE_SIZE, filteredEmployees.length)}名
          </p>
          <div className="flex items-center gap-1">
            <button disabled={empPage === 1} onClick={() => setEmpPage((p) => p - 1)}
              className="px-3 py-1 text-xs rounded border disabled:opacity-40 hover:bg-muted transition-colors"
              style={{ borderColor: 'oklch(0.870 0.020 75)' }}>前へ</button>
            {Array.from({ length: empTotalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setEmpPage(p)}
                className="w-7 h-7 text-xs rounded border transition-colors"
                style={{
                  borderColor: 'oklch(0.870 0.020 75)',
                  background: p === empPage ? 'oklch(0.50 0.21 27)' : 'transparent',
                  color: p === empPage ? 'white' : 'inherit',
                }}>{p}</button>
            ))}
            <button disabled={empPage === empTotalPages} onClick={() => setEmpPage((p) => p + 1)}
              className="px-3 py-1 text-xs rounded border disabled:opacity-40 hover:bg-muted transition-colors"
              style={{ borderColor: 'oklch(0.870 0.020 75)' }}>次へ</button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" style={{ background: 'oklch(0.992 0.004 80)', border: '1px solid oklch(0.860 0.018 75)' }}>
          {/* Vermillion top stripe */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg" style={{ background: 'oklch(0.50 0.21 27)' }} />

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 mt-1"
              style={{ fontFamily: 'var(--font-noto-serif-jp)', fontSize: '1.3rem', fontWeight: 300, color: 'oklch(0.18 0.018 52)' }}>
              {formMode === 'view'
                ? <><BadgeCheck className="w-5 h-5" style={{ color: 'oklch(0.50 0.21 27)' }} />社員情報</>
                : <><UserCog className="w-5 h-5" style={{ color: 'oklch(0.50 0.21 27)' }} />{selectedEmployee ? '社員編集' : '社員追加'}</>}
            </DialogTitle>
            <DialogDescription style={{ color: 'oklch(0.60 0.020 62)' }}>
              {selectedEmployee ? `${selectedEmployee.name} の情報` : '新しい社員を追加します'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1 mt-1">
            <div>
              <label style={labelStyle}>名前</label>
              <input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                disabled={formMode === 'view'} style={formMode === 'view' ? inputDisabled : inputBase} />
            </div>
            <div>
              <label style={labelStyle}>メールアドレス</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                disabled={formMode === 'view'} style={formMode === 'view' ? inputDisabled : inputBase} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>社員番号</label>
                <input value={formData.employeeId} onChange={(e) => setFormData(p => ({ ...p, employeeId: e.target.value }))}
                  disabled={formMode === 'view'} style={formMode === 'view' ? inputDisabled : inputBase} />
              </div>
              <div>
                <label style={labelStyle}>権限</label>
                <Select value={formData.role} onValueChange={(v) => setFormData(p => ({ ...p, role: v }))} disabled={formMode === 'view'}>
                  <SelectTrigger style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.30 0.018 55)', height: '2.25rem' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">管理者</SelectItem>
                    <SelectItem value="MANAGER">マネージャー</SelectItem>
                    <SelectItem value="EMPLOYEE">一般社員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>グレード</label>
                <Select value={formData.grade || '__none__'} onValueChange={(v) => setFormData(p => ({ ...p, grade: v === '__none__' ? '' : v }))} disabled={formMode === 'view'}>
                  <SelectTrigger style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.30 0.018 55)', height: '2.25rem' }}>
                    <SelectValue placeholder="グレード..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value || '__none__'} value={opt.value || '__none__'}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={labelStyle}>クライアント側</label>
                <input placeholder="例: TMC側" value={formData.clientSide} onChange={(e) => setFormData(p => ({ ...p, clientSide: e.target.value }))}
                  disabled={formMode === 'view'} style={formMode === 'view' ? inputDisabled : inputBase} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>所属部署</label>
              <Select value={formData.departmentId || ''} onValueChange={(v) => setFormData(p => ({ ...p, departmentId: v, divisionId: '', groupId: '' }))} disabled={formMode === 'view'}>
                <SelectTrigger style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.30 0.018 55)', height: '2.25rem' }}>
                  <SelectValue placeholder="部署を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d.isActive).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>室</label>
                <Select value={formData.divisionId || ''} onValueChange={(v) => setFormData(p => ({ ...p, divisionId: v, groupId: '' }))} disabled={formMode === 'view' || !formData.departmentId}>
                  <SelectTrigger style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.30 0.018 55)', height: '2.25rem' }}>
                    <SelectValue placeholder="室を選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.filter(d => d.isActive).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.isVirtual ? '（直属）' : d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={labelStyle}>グループ</label>
                <Select value={formData.groupId || ''} onValueChange={(v) => setFormData(p => ({ ...p, groupId: v }))} disabled={formMode === 'view' || !formData.divisionId}>
                  <SelectTrigger style={{ background: 'oklch(0.960 0.014 78)', border: '1px solid oklch(0.870 0.020 75)', color: 'oklch(0.30 0.018 55)', height: '2.25rem' }}>
                    <SelectValue placeholder="グループを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.filter(g => g.isActive).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid oklch(0.880 0.018 75)' }}>
            {formMode === 'edit' ? (
              <>
                <button onClick={() => setDialogOpen(false)}
                  className="flex-1 py-2.5 rounded text-sm transition-all"
                  style={{ background: 'oklch(0.955 0.012 78)', color: 'oklch(0.50 0.020 60)', border: '1px solid oklch(0.870 0.020 75)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.920 0.016 78)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.955 0.012 78)'; }}>
                  キャンセル
                </button>
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded text-sm font-medium transition-all"
                  style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.992 0.004 80)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}>
                  {selectedEmployee ? '更新' : '追加'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setFormMode('edit')}
                  className="flex-1 py-2.5 rounded text-sm transition-all"
                  style={{ background: 'oklch(0.955 0.012 78)', color: 'oklch(0.42 0.020 58)', border: '1px solid oklch(0.870 0.020 75)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.920 0.016 78)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.955 0.012 78)'; }}>
                  編集
                </button>
                <button onClick={() => setDialogOpen(false)}
                  className="flex-1 py-2.5 rounded text-sm font-medium transition-all"
                  style={{ background: 'oklch(0.18 0.018 52)', color: 'oklch(0.992 0.004 80)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.50 0.21 27)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'oklch(0.18 0.018 52)'; }}>
                  閉じる
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
