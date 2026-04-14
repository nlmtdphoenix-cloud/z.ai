'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Layers,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth-store';
import { authFetch } from '@/lib/api';
import { toast } from 'sonner';

// ─── Local Types ───────────────────────────────────────────────────────────

interface Dept {
  id: string;
  name: string;
  code: string;
  order: number;
  isActive: boolean;
  divisions?: Div[];
  managers?: MgrRecord[];
  _count?: { employees: number; divisions: number };
}

interface Div {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  departmentId: string;
  department?: { id: string; name: string };
  groups?: Grp[];
  _count?: { employees: number };
}

interface Grp {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  divisionId: string;
  division?: { id: string; name: string };
}

interface MgrRecord {
  id: string;
  departmentId: string;
  userId: string;
  user: { id: string; name: string; email: string; employeeId: string };
}

interface ManagerUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── Component ─────────────────────────────────────────────────────────────

export function OrganizationView() {
  const { user } = useAuthStore();

  // ── Core data ──
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [divisions, setDivisions] = useState<Div[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Department detail state ──
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [deptManagers, setDeptManagers] = useState<Record<string, MgrRecord[]>>({});
  const [deptDivisions, setDeptDivisions] = useState<Record<string, Div[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  // ── Department CRUD ──
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [deptFormMode, setDeptFormMode] = useState<'create' | 'edit'>('create');
  const [editingDept, setEditingDept] = useState<Dept | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [deptSaving, setDeptSaving] = useState(false);

  // ── Division CRUD ──
  const [showDivDialog, setShowDivDialog] = useState(false);
  const [divFormMode, setDivFormMode] = useState<'create' | 'edit'>('create');
  const [editingDiv, setEditingDiv] = useState<Div | null>(null);
  const [divForm, setDivForm] = useState({ name: '', departmentId: '', order: 0 });
  const [divSaving, setDivSaving] = useState(false);

  // ── Group CRUD ──
  const [showGrpDialog, setShowGrpDialog] = useState(false);
  const [grpFormMode, setGrpFormMode] = useState<'create' | 'edit'>('create');
  const [editingGrp, setEditingGrp] = useState<Grp | null>(null);
  const [grpForm, setGrpForm] = useState({ name: '', divisionId: '', order: 0 });
  const [grpSaving, setGrpSaving] = useState(false);

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'department' | 'division' | 'group';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Manager assignment ──
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [managerDeptId, setManagerDeptId] = useState('');
  const [managerUsers, setManagerUsers] = useState<ManagerUser[]>([]);
  const [selectedManagerUserId, setSelectedManagerUserId] = useState('');
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);
  const [removeManagerTarget, setRemoveManagerTarget] = useState<{
    deptId: string;
    userId: string;
    userName: string;
  } | null>(null);
  const [removingManager, setRemovingManager] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch all data
  // ──────────────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        '/api/departments?includeDivisions=true&includeGroups=true&activeOnly=false'
      );
      if (res.ok) {
        const json = await res.json();
        const data: Dept[] = Array.isArray(json.data) ? json.data : [];
        setDepartments(data);
      }
    } catch {
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDivisions = useCallback(async () => {
    try {
      const res = await authFetch('/api/departments/divisions');
      if (res.ok) {
        const json = await res.json();
        const data: Div[] = Array.isArray(json.data) ? json.data : [];
        setDivisions(data);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await authFetch('/api/departments/groups');
      if (res.ok) {
        const json = await res.json();
        const data: Grp[] = Array.isArray(json.data) ? json.data : [];
        setGroups(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchDivisions();
    fetchGroups();
  }, [fetchAll, fetchDivisions, fetchGroups]);

  // ──────────────────────────────────────────────────────────────────────────
  // Department expand/collapse & detail loading
  // ──────────────────────────────────────────────────────────────────────────

  const toggleDeptExpand = async (deptId: string) => {
    const next = new Set(expandedDepts);
    if (next.has(deptId)) {
      next.delete(deptId);
      setExpandedDepts(next);
    } else {
      next.add(deptId);
      setExpandedDepts(next);
      if (!deptDivisions[deptId] && !detailLoading[deptId]) {
        await loadDeptDetails(deptId);
      }
    }
  };

  const loadDeptDetails = async (deptId: string) => {
    setDetailLoading((prev) => ({ ...prev, [deptId]: true }));
    try {
      const [divsRes, mgrsRes] = await Promise.all([
        authFetch(`/api/departments/divisions?departmentId=${deptId}`),
        authFetch(`/api/departments/managers?departmentId=${deptId}`),
      ]);
      if (divsRes.ok) {
        const json = await divsRes.json();
        setDeptDivisions((prev) => ({
          ...prev,
          [deptId]: Array.isArray(json.data) ? json.data : [],
        }));
      }
      if (mgrsRes.ok) {
        const json = await mgrsRes.json();
        setDeptManagers((prev) => ({
          ...prev,
          [deptId]: Array.isArray(json.data) ? json.data : [],
        }));
      }
    } catch {
      toast.error('詳細の取得に失敗しました');
    } finally {
      setDetailLoading((prev) => ({ ...prev, [deptId]: false }));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Department CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptFormMode('create');
    setDeptForm({ name: '', code: '' });
    setShowDeptDialog(true);
  };

  const openEditDept = (dept: Dept) => {
    setEditingDept(dept);
    setDeptFormMode('edit');
    setDeptForm({ name: dept.name, code: dept.code });
    setShowDeptDialog(true);
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim()) {
      toast.error('部署名を入力してください');
      return;
    }
    setDeptSaving(true);
    try {
      if (deptFormMode === 'create') {
        const res = await authFetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: deptForm.name.trim(), code: deptForm.code.trim() }),
        });
        if (res.ok) {
          toast.success('部署を追加しました');
          setShowDeptDialog(false);
          fetchAll();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '追加に失敗しました');
        }
      } else if (editingDept) {
        const res = await authFetch(`/api/departments/${editingDept.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deptForm.name.trim(),
            code: deptForm.code.trim(),
            isActive: editingDept.isActive,
          }),
        });
        if (res.ok) {
          toast.success('部署を更新しました');
          setShowDeptDialog(false);
          fetchAll();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '更新に失敗しました');
        }
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setDeptSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Division CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const openCreateDiv = (departmentId?: string) => {
    setEditingDiv(null);
    setDivFormMode('create');
    setDivForm({ name: '', departmentId: departmentId || '', order: 0 });
    setShowDivDialog(true);
  };

  const openEditDiv = (div: Div) => {
    setEditingDiv(div);
    setDivFormMode('edit');
    setDivForm({ name: div.name, departmentId: div.departmentId, order: div.order });
    setShowDivDialog(true);
  };

  const handleSaveDiv = async () => {
    if (!divForm.name.trim()) {
      toast.error('室名を入力してください');
      return;
    }
    if (divFormMode === 'create' && !divForm.departmentId) {
      toast.error('部署を選択してください');
      return;
    }
    setDivSaving(true);
    try {
      if (divFormMode === 'create') {
        const res = await authFetch('/api/departments/divisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: divForm.name.trim(),
            departmentId: divForm.departmentId,
            order: divForm.order,
          }),
        });
        if (res.ok) {
          toast.success('室を追加しました');
          setShowDivDialog(false);
          fetchAll();
          fetchDivisions();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '追加に失敗しました');
        }
      } else if (editingDiv) {
        const res = await authFetch(`/api/departments/divisions/${editingDiv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: divForm.name.trim(),
            order: divForm.order,
            isActive: editingDiv.isActive,
          }),
        });
        if (res.ok) {
          toast.success('室を更新しました');
          setShowDivDialog(false);
          fetchAll();
          fetchDivisions();
          // Refresh expanded dept detail
          if (deptDivisions[editingDiv.departmentId]) {
            loadDeptDetails(editingDiv.departmentId);
          }
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '更新に失敗しました');
        }
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setDivSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Group CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const openCreateGrp = (divisionId?: string) => {
    setEditingGrp(null);
    setGrpFormMode('create');
    setGrpForm({ name: '', divisionId: divisionId || '', order: 0 });
    setShowGrpDialog(true);
  };

  const openEditGrp = (grp: Grp) => {
    setEditingGrp(grp);
    setGrpFormMode('edit');
    setGrpForm({ name: grp.name, divisionId: grp.divisionId, order: grp.order });
    setShowGrpDialog(true);
  };

  const handleSaveGrp = async () => {
    if (!grpForm.name.trim()) {
      toast.error('グループ名を入力してください');
      return;
    }
    if (grpFormMode === 'create' && !grpForm.divisionId) {
      toast.error('室を選択してください');
      return;
    }
    setGrpSaving(true);
    try {
      if (grpFormMode === 'create') {
        const res = await authFetch('/api/departments/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: grpForm.name.trim(),
            divisionId: grpForm.divisionId,
            order: grpForm.order,
          }),
        });
        if (res.ok) {
          toast.success('グループを追加しました');
          setShowGrpDialog(false);
          fetchAll();
          fetchGroups();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '追加に失敗しました');
        }
      } else if (editingGrp) {
        const res = await authFetch(`/api/departments/groups/${editingGrp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: grpForm.name.trim(),
            order: grpForm.order,
            isActive: editingGrp.isActive,
          }),
        });
        if (res.ok) {
          toast.success('グループを更新しました');
          setShowGrpDialog(false);
          fetchAll();
          fetchGroups();
        } else {
          const json = await res.json().catch(() => ({}));
          toast.error(json.error || '更新に失敗しました');
        }
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setGrpSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Delete (shared)
  // ──────────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let url = '';
      if (deleteTarget.type === 'department') url = `/api/departments/${deleteTarget.id}`;
      else if (deleteTarget.type === 'division') url = `/api/departments/divisions/${deleteTarget.id}`;
      else url = `/api/departments/groups/${deleteTarget.id}`;

      const res = await authFetch(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success('削除しました');
        setDeleteTarget(null);
        fetchAll();
        fetchDivisions();
        fetchGroups();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '削除に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setDeleting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Manager assignment
  // ──────────────────────────────────────────────────────────────────────────

  const openManagerDialog = async (deptId: string) => {
    setManagerDeptId(deptId);
    setSelectedManagerUserId('');
    setManagerUsers([]);
    setShowManagerDialog(true);
    setManagerLoading(true);

    try {
      const res = await authFetch('/api/employees');
      if (res.ok) {
        const json = await res.json();
        const allEmps: Array<{
          id: string;
          name: string;
          email: string;
          employeeId?: string;
          role: string;
        }> = Array.isArray(json.data) ? json.data : [];
        // Filter to MANAGER role only
        const managers: ManagerUser[] = allEmps
          .filter((e) => e.role === 'MANAGER')
          .map((e) => ({
            id: e.id,
            name: e.name,
            email: e.email,
            employeeId: e.employeeId || '',
          }));
        setManagerUsers(managers);
      }
    } catch {
      toast.error('マネージャー一覧の取得に失敗しました');
    } finally {
      setManagerLoading(false);
    }
  };

  const handleAddManager = async () => {
    if (!selectedManagerUserId) {
      toast.error('マネージャーを選択してください');
      return;
    }
    setManagerSaving(true);
    try {
      const res = await authFetch('/api/departments/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: managerDeptId, userId: selectedManagerUserId }),
      });
      if (res.ok) {
        toast.success('マネージャーを追加しました');
        setShowManagerDialog(false);
        await loadDeptDetails(managerDeptId);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '追加に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setManagerSaving(false);
    }
  };

  const handleRemoveManager = async () => {
    if (!removeManagerTarget) return;
    setRemovingManager(true);
    try {
      const res = await authFetch('/api/departments/managers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: removeManagerTarget.deptId,
          userId: removeManagerTarget.userId,
        }),
      });
      if (res.ok) {
        toast.success('マネージャーを削除しました');
        setRemoveManagerTarget(null);
        await loadDeptDetails(removeManagerTarget.deptId);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || '削除に失敗しました');
      }
    } catch {
      toast.error('通信エラーが発生しました');
    } finally {
      setRemovingManager(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────────────

  const stats = {
    totalDepts: departments.length,
    activeDepts: departments.filter((d) => d.isActive).length,
    totalDivs: divisions.filter((d) => d.isActive).length,
    totalGrps: groups.filter((g) => g.isActive).length,
    totalEmployees: departments.reduce((sum, d) => sum + (d._count?.employees || 0), 0),
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Guard: Admin only
  // ──────────────────────────────────────────────────────────────────────────

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">アクセス権限がありません</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Loading
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Divisions grouped by department
  // ──────────────────────────────────────────────────────────────────────────

  const divisionsByDept = departments
    .map((dept) => ({
      dept,
      divs: divisions.filter((d) => d.departmentId === dept.id),
    }))
    .filter((g) => g.divs.length > 0);

  // ──────────────────────────────────────────────────────────────────────────
  // Groups grouped by division
  // ──────────────────────────────────────────────────────────────────────────

  const groupsByDiv = divisions
    .map((div) => ({
      div,
      grps: groups.filter((g) => g.divisionId === div.id),
    }))
    .filter((g) => g.grps.length > 0);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">組織管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            部署・室・グループの管理とマネージャーの割り当てを行います
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalDepts}</p>
            <p className="text-xs text-muted-foreground">全部署</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.activeDepts}</p>
            <p className="text-xs text-muted-foreground">有効部署</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.totalDivs}</p>
            <p className="text-xs text-muted-foreground">室数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{stats.totalGrps}</p>
            <p className="text-xs text-muted-foreground">グループ数</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalEmployees}</p>
            <p className="text-xs text-muted-foreground">社員数</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="size-4" />
            部署管理
          </TabsTrigger>
          <TabsTrigger value="divisions" className="gap-1.5">
            <Layers className="size-4" />
            室管理
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Users className="size-4" />
            グループ管理
          </TabsTrigger>
        </TabsList>

        {/* ─────────── Department Tab ─────────── */}
        <TabsContent value="departments">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreateDept}>
                <Plus className="size-4" />
                部署追加
              </Button>
            </div>

            {departments.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="size-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-muted-foreground">部署がありません</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  「部署追加」ボタンから新しい部署を作成してください
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {departments.map((dept) => {
                  const isExpanded = expandedDepts.has(dept.id);
                  const divs = deptDivisions[dept.id] || [];
                  const managers = deptManagers[dept.id] || [];
                  const isLoading = detailLoading[dept.id] === true;

                  return (
                    <Card
                      key={dept.id}
                      className={cn(
                        'transition-all',
                        isExpanded && 'ring-1 ring-emerald-500/20 shadow-sm',
                        !dept.isActive && 'opacity-60'
                      )}
                    >
                      {/* ── Department Card Header ── */}
                      <div
                        className="w-full text-left cursor-pointer"
                        onClick={() => toggleDeptExpand(dept.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDeptExpand(dept.id); } }}
                        tabIndex={0}
                        role="button"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Expand icon */}
                            <div className="mt-0.5 shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="size-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Icon */}
                            <div
                              className={cn(
                                'shrink-0 flex items-center justify-center size-10 rounded-lg',
                                dept.isActive
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-gray-100 text-gray-400'
                              )}
                            >
                              <Building2 className="size-5" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base">{dept.name}</h3>
                                {dept.code && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 font-mono"
                                  >
                                    {dept.code}
                                  </Badge>
                                )}
                                {!dept.isActive && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0"
                                  >
                                    無効
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Users className="size-3" />
                                  {dept._count?.employees ?? 0}名
                                </span>
                                <span className="flex items-center gap-1">
                                  <Layers className="size-3" />
                                  {dept._count?.divisions ?? divs.length}室
                                </span>
                                {managers.length > 0 && (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <Users className="size-3" />
                                    {managers.map((m) => m.user.name).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div
                              className="shrink-0 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => openEditDept(dept)}
                              >
                                <Pencil className="size-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 hover:text-red-600"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'department',
                                    id: dept.id,
                                    name: dept.name,
                                  })
                                }
                              >
                                <Trash2 className="size-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>

                      {/* ── Expanded Content ── */}
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="ml-8 space-y-4">
                              <Separator />

                              {/* Managers Section */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Users className="size-3.5" />
                                    マネージャー
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => openManagerDialog(dept.id)}
                                  >
                                    <Plus className="size-3" />
                                    追加
                                  </Button>
                                </div>
                                {managers.length === 0 ? (
                                  <p className="text-xs text-muted-foreground/60 py-2 pl-1">
                                    マネージャーが割り当てられていません
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {managers.map((mgr) => (
                                      <div
                                        key={mgr.id}
                                        className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5"
                                      >
                                        <Users className="size-3 text-amber-600" />
                                        <span className="text-xs font-medium text-amber-800">
                                          {mgr.user.name}
                                        </span>
                                        {mgr.user.employeeId && (
                                          <span className="text-[10px] text-amber-600">
                                            ({mgr.user.employeeId})
                                          </span>
                                        )}
                                        <button
                                          className="ml-1 text-amber-400 hover:text-red-500 transition-colors"
                                          onClick={() =>
                                            setRemoveManagerTarget({
                                              deptId: dept.id,
                                              userId: mgr.userId,
                                              userName: mgr.user.name,
                                            })
                                          }
                                        >
                                          <Trash2 className="size-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <Separator />

                              {/* Divisions Section */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Layers className="size-3.5" />
                                    室 ({divs.length})
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => openCreateDiv(dept.id)}
                                  >
                                    <Plus className="size-3" />
                                    室追加
                                  </Button>
                                </div>

                                {divs.length === 0 ? (
                                  <p className="text-xs text-muted-foreground/60 py-2 pl-1">
                                    室がありません
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {divs.map((div) => (
                                      <div
                                        key={div.id}
                                        className={cn(
                                          'flex items-center justify-between px-3 py-2 rounded-md border transition-colors',
                                          div.isActive
                                            ? 'bg-white border-gray-200 hover:border-primary/20'
                                            : 'bg-gray-50 border-gray-200 opacity-60'
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Layers className="size-3.5 text-muted-foreground shrink-0" />
                                          <span className="text-sm font-medium truncate">
                                            {div.name}
                                          </span>
                                          {div._count && (
                                            <span className="text-[10px] text-muted-foreground">
                                              {div._count.employees}名
                                            </span>
                                          )}
                                          {!div.isActive && (
                                            <Badge
                                              variant="secondary"
                                              className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0"
                                            >
                                              無効
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            onClick={() => openEditDiv(div)}
                                          >
                                            <Pencil className="size-3 text-muted-foreground" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-7 hover:text-red-600"
                                            onClick={() =>
                                              setDeleteTarget({
                                                type: 'division',
                                                id: div.id,
                                                name: div.name,
                                              })
                                            }
                                          >
                                            <Trash2 className="size-3 text-muted-foreground" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────── Division Tab ─────────── */}
        <TabsContent value="divisions">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCreateDiv()}>
                <Plus className="size-4" />
                室追加
              </Button>
            </div>

            {divisionsByDept.length === 0 ? (
              <div className="text-center py-16">
                <Layers className="size-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-muted-foreground">室がありません</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  「室追加」ボタンから新しい室を作成してください
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {divisionsByDept.map(({ dept, divs }) => (
                  <div key={dept.id}>
                    <CardHeader className="pb-2 pt-0 px-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="size-4 text-emerald-600" />
                        {dept.name}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {divs.length}室
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {divs.map((div) => (
                        <Card
                          key={div.id}
                          className={cn(
                            'hover:shadow-md transition-all hover:border-primary/20',
                            !div.isActive && 'opacity-60'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Layers className="size-4 text-amber-600 shrink-0" />
                                  <h4 className="font-semibold text-sm truncate">{div.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                    {dept.code}
                                  </Badge>
                                  {div._count && <span>{div._count.employees}名</span>}
                                  {!div.isActive && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0"
                                    >
                                      無効
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => openEditDiv(div)}
                                >
                                  <Pencil className="size-3 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 hover:text-red-600"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'division',
                                      id: div.id,
                                      name: div.name,
                                    })
                                  }
                                >
                                  <Trash2 className="size-3 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────── Group Tab ─────────── */}
        <TabsContent value="groups">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCreateGrp()}>
                <Plus className="size-4" />
                グループ追加
              </Button>
            </div>

            {groupsByDiv.length === 0 ? (
              <div className="text-center py-16">
                <Users className="size-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-muted-foreground">グループがありません</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  「グループ追加」ボタンから新しいグループを作成してください
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {groupsByDiv.map(({ div, grps }) => (
                  <div key={div.id}>
                    <CardHeader className="pb-2 pt-0 px-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="size-4 text-amber-600" />
                        {div.name}
                        <span className="text-muted-foreground font-normal text-sm">
                          / {div.department?.name || ''}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {grps.length}グループ
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {grps.map((grp) => (
                        <Card
                          key={grp.id}
                          className={cn(
                            'hover:shadow-md transition-all hover:border-primary/20',
                            !grp.isActive && 'opacity-60'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Users className="size-4 text-violet-600 shrink-0" />
                                  <h4 className="font-semibold text-sm truncate">{grp.name}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {div.department?.name || ''} / {div.name}
                                </p>
                                {!grp.isActive && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 mt-1"
                                  >
                                    無効
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => openEditGrp(grp)}
                                >
                                  <Pencil className="size-3 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 hover:text-red-600"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'group',
                                      id: grp.id,
                                      name: grp.name,
                                    })
                                  }
                                >
                                  <Trash2 className="size-3 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Department Dialog */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              {deptFormMode === 'create' ? '部署追加' : '部署編集'}
            </DialogTitle>
            <DialogDescription>
              {deptFormMode === 'create'
                ? '新しい部署を作成します'
                : `${editingDept?.name} の情報を編集します`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>部署名</Label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例：営業部"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>部署コード</Label>
              <Input
                value={deptForm.code}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="例：SALES"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeptDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveDept} disabled={deptSaving || !deptForm.name.trim()}>
              {deptSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {deptFormMode === 'create' ? '追加' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Division Dialog */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <Dialog open={showDivDialog} onOpenChange={setShowDivDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5" />
              {divFormMode === 'create' ? '室追加' : '室編集'}
            </DialogTitle>
            <DialogDescription>
              {divFormMode === 'create'
                ? '新しい室を作成します'
                : `${editingDiv?.name} の情報を編集します`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>所属部署</Label>
              <Select
                value={divForm.departmentId}
                onValueChange={(v) => setDivForm((prev) => ({ ...prev, departmentId: v }))}
                disabled={divFormMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="部署を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {departments
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>室名</Label>
              <Input
                value={divForm.name}
                onChange={(e) => setDivForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例：第一営業室"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>表示順</Label>
              <Input
                type="number"
                value={divForm.order}
                onChange={(e) =>
                  setDivForm((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDivDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveDiv} disabled={divSaving || !divForm.name.trim()}>
              {divSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {divFormMode === 'create' ? '追加' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Group Dialog */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <Dialog open={showGrpDialog} onOpenChange={setShowGrpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" />
              {grpFormMode === 'create' ? 'グループ追加' : 'グループ編集'}
            </DialogTitle>
            <DialogDescription>
              {grpFormMode === 'create'
                ? '新しいグループを作成します'
                : `${editingGrp?.name} の情報を編集します`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>所属室</Label>
              <Select
                value={grpForm.divisionId}
                onValueChange={(v) => setGrpForm((prev) => ({ ...prev, divisionId: v }))}
                disabled={grpFormMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="室を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {divisions
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}（{d.department?.name || ''}）
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>グループ名</Label>
              <Input
                value={grpForm.name}
                onChange={(e) => setGrpForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例：Aチーム"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>表示順</Label>
              <Input
                type="number"
                value={grpForm.order}
                onChange={(e) =>
                  setGrpForm((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrpDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveGrp} disabled={grpSaving || !grpForm.name.trim()}>
              {grpSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {grpFormMode === 'create' ? '追加' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Delete Confirmation */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}
              」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Manager Assignment Dialog */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <Dialog open={showManagerDialog} onOpenChange={setShowManagerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" />
              マネージャー追加
            </DialogTitle>
            <DialogDescription>
              部署にマネージャーを割り当てます
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {managerLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : managerUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                マネージャー権限を持つ社員がいません
              </p>
            ) : (
              <div className="space-y-2">
                <Label>マネージャーを選択</Label>
                <Select
                  value={selectedManagerUserId}
                  onValueChange={setSelectedManagerUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="マネージャーを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managerUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{u.name}</span>
                          {u.employeeId && (
                            <span className="text-muted-foreground text-xs">({u.employeeId})</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManagerDialog(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddManager}
              disabled={managerSaving || !selectedManagerUserId || managerLoading}
            >
              {managerSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Remove Manager Confirmation */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <AlertDialog
        open={!!removeManagerTarget}
        onOpenChange={() => setRemoveManagerTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>マネージャー削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              「{removeManagerTarget?.userName}
              」をマネージャーから削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingManager}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveManager}
              disabled={removingManager}
              className="bg-red-600 hover:bg-red-700"
            >
              {removingManager ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
