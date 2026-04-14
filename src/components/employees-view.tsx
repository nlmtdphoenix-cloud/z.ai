'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  BadgeCheck,
  UserCog,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth-store';
import { authFetch } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/constants';
import type { Employee, Department, Division, Group } from '@/lib/types';
import { toast } from 'sonner';

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-amber-100 text-amber-700',
  EMPLOYEE: 'bg-emerald-100 text-emerald-700',
};

const ROLE_ICON_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-600',
  MANAGER: 'bg-amber-50 text-amber-600',
  EMPLOYEE: 'bg-emerald-50 text-emerald-600',
};

export function EmployeesView() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'view' | 'edit'>('view');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'EMPLOYEE',
    employeeId: '',
    departmentId: '',
    divisionId: '',
    groupId: '',
    isActive: true,
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Department/division/group state for cascading dropdowns
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/employees');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('社員データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await authFetch('/api/departments?includeDivisions=true&includeGroups=true');
      if (res.ok) {
        const json = await res.json();
        setDepartments(json.data || []);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [fetchEmployees, fetchDepartments]);

  // Filter divisions when department changes
  useEffect(() => {
    if (formData.departmentId) {
      const dept = departments.find(d => d.id === formData.departmentId);
      setDivisions(dept?.divisions?.filter(d => d.isActive) || []);
    } else {
      setDivisions([]);
    }
    setGroups([]);
  }, [formData.departmentId, departments]);

  // Filter groups when division changes
  useEffect(() => {
    if (formData.divisionId) {
      const div = divisions.find(d => d.id === formData.divisionId);
      setGroups(div?.groups?.filter(g => g.isActive) || []);
    } else {
      setGroups([]);
    }
  }, [formData.divisionId, divisions]);

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term) ||
      emp.employeeId?.toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term)
    );
  });

  const handleOpenAdd = () => {
    setSelectedEmployee(null);
    setFormMode('edit');
    setFormData({
      name: '',
      email: '',
      role: 'EMPLOYEE',
      employeeId: '',
      departmentId: '',
      divisionId: '',
      groupId: '',
      isActive: true,
    });
    setDivisions([]);
    setGroups([]);
    setDialogOpen(true);
  };

  const handleOpenView = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormMode('view');
    setFormData({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      employeeId: emp.employeeId || '',
      departmentId: emp.departmentId || '',
      divisionId: emp.divisionId || '',
      groupId: emp.groupId || '',
      isActive: emp.isActive,
    });

    // Pre-populate divisions and groups from nested departments data for immediate display
    if (emp.departmentId) {
      const dept = departments.find(d => d.id === emp.departmentId);
      setDivisions(dept?.divisions?.filter(d => d.isActive) || []);
      if (emp.divisionId) {
        const div = dept?.divisions?.find(d => d.id === emp.divisionId);
        setGroups(div?.groups?.filter(g => g.isActive) || []);
      } else {
        setGroups([]);
      }
    } else {
      setDivisions([]);
      setGroups([]);
    }

    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedEmployee) {
        // Update existing employee
        const res = await authFetch('/api/employees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedEmployee.id, ...formData }),
        });
        if (res.ok) {
          toast.success('社員情報を更新しました');
          setDialogOpen(false);
          fetchEmployees();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '更新に失敗しました');
        }
      } else {
        // Create new employee
        const res = await authFetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          toast.success('社員を追加しました');
          setDialogOpen(false);
          fetchEmployees();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '追加に失敗しました');
        }
      }
    } catch {
      toast.error('通信エラーが発生しました');
    }
  };

  const stats = {
    total: employees.length,
    admins: employees.filter((e) => e.role === 'ADMIN').length,
    managers: employees.filter((e) => e.role === 'MANAGER').length,
    employees: employees.filter((e) => e.role === 'EMPLOYEE').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">社員管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            社員情報の管理・追加・編集を行います
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <UserPlus className="size-4" />
          社員追加
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">全社員</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
            <p className="text-xs text-muted-foreground">管理者</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.managers}</p>
            <p className="text-xs text-muted-foreground">マネージャー</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.employees}</p>
            <p className="text-xs text-muted-foreground">一般社員</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="名前・メール・社員番号・部署で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-16">
          <Users className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-muted-foreground">社員が見つかりません</h3>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {filteredEmployees.map((emp) => (
            <div key={emp.id}>
              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
                onClick={() => handleOpenView(emp)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className={`${ROLE_ICON_COLORS[emp.role] || 'bg-gray-100'} font-medium`}>
                        {emp.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{emp.name}</p>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${ROLE_BADGE_COLORS[emp.role] || ''}`}>
                          {ROLE_LABELS[emp.role]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{emp.employeeId} · {emp.department}</p>
                      {emp.division && (
                        <p className="text-xs text-muted-foreground truncate">{emp.division}{emp.group ? ` / ${emp.group}` : ''}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formMode === 'view' ? (
                <><BadgeCheck className="size-5" />社員情報</>
              ) : (
                <><UserCog className="size-5" />{selectedEmployee ? '社員編集' : '社員追加'}</>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee ? `${selectedEmployee.name} の情報` : '新しい社員を追加します'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={formMode === 'view'}
              />
            </div>
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={formMode === 'view'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>社員番号</Label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  disabled={formMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>権限</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}
                  disabled={formMode === 'view'}
                >
                  <SelectTrigger>
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

            {/* 所属部署 (Department) - Cascading Select */}
            <div className="space-y-2">
              <Label>所属部署</Label>
              <Select
                value={formData.departmentId || ''}
                onValueChange={(v) => setFormData(prev => ({ ...prev, departmentId: v, divisionId: '', groupId: '' }))}
                disabled={formMode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="部署を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d.isActive).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 室 (Division) - Cascading Select */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>室</Label>
                <Select
                  value={formData.divisionId || ''}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, divisionId: v, groupId: '' }))}
                  disabled={formMode === 'view' || !formData.departmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="室を選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.filter(d => d.isActive).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* グループ (Group) - Cascading Select */}
              <div className="space-y-2">
                <Label>グループ</Label>
                <Select
                  value={formData.groupId || ''}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, groupId: v }))}
                  disabled={formMode === 'view' || !formData.divisionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="グループを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.filter(g => g.isActive).map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            {formMode === 'edit' ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleSave}>{selectedEmployee ? '更新' : '追加'}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setFormMode('edit'); }}>編集</Button>
                <Button onClick={() => setDialogOpen(false)}>閉じる</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
