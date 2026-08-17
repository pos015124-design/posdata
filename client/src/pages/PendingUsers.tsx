import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircle, XCircle, Trash2, UserCheck, UserX,
  Search, RefreshCw, Shield, AlertTriangle, FileCheck, MoreHorizontal, Calendar
} from 'lucide-react';
import ConfirmDialog, { type ConfirmDialogProps } from '../components/ConfirmDialog';

interface ManagedUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isApproved: boolean;
  isActive: boolean;
  isSuspended?: boolean;
  suspendedReason?: string;
  createdAt?: string;
  termsAccepted?: boolean;
}

const BASE = import.meta.env.VITE_API_URL || '';

// Only include Content-Type when sending a body — avoids header stripping on bodyless DELETE
const authH = (withBody = false) => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  ...(withBody ? { 'Content-Type': 'application/json' } : {})
});

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-700',
    business_admin: 'bg-blue-100 text-blue-700',
    staff: 'bg-gray-100 text-gray-700',
    customer: 'bg-green-100 text-green-700'
  };
  return map[role] || 'bg-gray-100 text-gray-600';
};

// Full name first (never truncate — the whole point of the two-line layout),
// falling back to the email prefix when the account has no name.
const displayName = (u: ManagedUser) => {
  const first = (u.firstName || '').trim();
  const last = (u.lastName || '').trim();
  if (first || last) return `${first} ${last}`.trim();
  return u.email.split('@')[0] || u.email;
};

const statusOf = (u: ManagedUser) =>
  u.isSuspended
    ? { label: 'Suspended', cls: 'bg-red-100 text-red-700' }
    : !u.isApproved
      ? { label: 'Pending approval', cls: 'bg-amber-100 text-amber-700' }
      : { label: 'Active', cls: 'bg-green-100 text-green-700' };

const PendingUsers: React.FC<{ onMutate?: () => void }> = ({ onMutate }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogProps | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/users`, { headers: authH() });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load users.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const api = async (path: string, method = 'PUT', body?: object) => {
    const hasBody = body !== undefined;
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: authH(hasBody),
      body: hasBody ? JSON.stringify(body) : undefined
    });
    if (!res.ok && res.status === 401) {
      throw new Error('Unauthorized — please log out and log back in');
    }
    return res.json();
  };

  const approve = async (id: string) => {
    try {
      const d = await api(`/api/auth/approve/${id}`);
      toast({ title: d.success ? 'User approved' : 'Error', description: d.message, variant: d.success ? 'default' : 'destructive' });
      if (d.success) { fetchUsers(); onMutate?.(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const approveAll = async () => {
    try {
      const d = await api('/api/auth/approve-all-pending');
      toast({ title: d.success ? 'All users approved' : 'Error', description: d.message, variant: d.success ? 'default' : 'destructive' });
      if (d.success) { fetchUsers(); onMutate?.(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const activate = async (id: string) => {
    try {
      const d = await api(`/api/auth/activate/${id}`);
      toast({ title: d.success ? 'User activated' : 'Error', description: d.message, variant: d.success ? 'default' : 'destructive' });
      if (d.success) { fetchUsers(); onMutate?.(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const fixBusiness = async (id: string, _email: string) => {
    try {
      const d = await api(`/api/auth/fix-business/${id}`, 'PUT');
      toast({ title: d.success ? 'Business fixed' : 'Error', description: d.message, variant: d.success ? 'default' : 'destructive' });
      if (d.success) { fetchUsers(); onMutate?.(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const suspend = async (id: string) => {
    try {
      const d = await api(`/api/auth/suspend/${id}`, 'PUT', { reason: suspendReason || 'Suspended by admin' });
      toast({ title: d.success ? 'User suspended' : 'Error', description: d.message, variant: d.success ? 'default' : 'destructive' });
      if (d.success) { fetchUsers(); setSuspendTarget(null); setSuspendReason(''); onMutate?.(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const deleteUser = async (id: string, email: string) => {
    setMenuFor(null);
    setConfirmDialog({
      title: 'Delete user',
      description: `Permanently delete ${email}? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const d = await api(`/api/auth/users/${id}`, 'DELETE');
          toast({ title: d.success ? 'User deleted' : 'Error', description: d.message || d.success ? 'User deleted' : 'Failed', variant: d.success ? 'default' : 'destructive' });
          if (d.success) { fetchUsers(); onMutate?.(); }
        } catch (e: any) {
          toast({ title: 'Error', description: e.message, variant: 'destructive' });
        }
      },
      onClose: () => setConfirmDialog(null),
    });
  };

  const filtered = users.filter(u => {
    const haystack = `${u.email} ${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const matchSearch = haystack.includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'pending' ? !u.isApproved :
      filter === 'suspended' ? u.isSuspended :
      u.isApproved && !u.isSuspended;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: users.length,
    pending: users.filter(u => !u.isApproved).length,
    active: users.filter(u => u.isApproved && !u.isSuspended).length,
    suspended: users.filter(u => u.isSuspended).length
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />User Management
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={approveAll} disabled={loading || counts.pending === 0}
              className="bg-green-600 hover:bg-green-700 text-white gap-1">
              <CheckCircle className="w-4 h-4" />Approve All Pending ({counts.pending})
            </Button>
          </div>
        </div>

        {/* Filter tabs — single horizontal scroll container, no uneven wrapping */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mb-1" role="tablist" aria-label="Filter users">
          {(['all', 'pending', 'active', 'suspended'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </CardHeader>

      <CardContent>
        {/* Suspend reason modal */}
        {suspendTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />Suspend User
              </h3>
              <Input placeholder="Reason (optional)" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSuspendTarget(null); setSuspendReason(''); }}>Cancel</Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => suspend(suspendTarget)}>Suspend</Button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No users match this filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(u => {
              const status = statusOf(u);
              return (
                <div key={u._id} className={`rounded-xl border overflow-hidden ${u.isSuspended ? 'bg-red-50/60 border-red-200' : !u.isApproved ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-100'}`}>
                  {/* Header: name + status */}
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 break-words leading-snug">{displayName(u)}</p>
                      <p className="text-xs text-gray-500 break-all mt-0.5 leading-relaxed">{u.email}</p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Body: role + meta */}
                  <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleBadge(u.role)}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                    {u.termsAccepted && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <FileCheck className="w-3 h-3" />Terms accepted
                      </span>
                    )}
                    {u.createdAt && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />Joined {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {u.isSuspended && u.suspendedReason && (
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" />{u.suspendedReason}
                      </span>
                    )}
                  </div>

                  {/* Footer: actions */}
                  <div className="px-4 py-2.5 bg-gray-50/80 border-t flex items-center justify-end gap-1.5 flex-wrap">
                    {!u.isApproved && !u.isSuspended && (
                      <Button size="sm" onClick={() => approve(u._id)}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1 text-xs px-3">
                        <UserCheck className="w-3.5 h-3.5" />Approve
                      </Button>
                    )}
                    {u.isSuspended && (
                      <Button size="sm" onClick={() => activate(u._id)}
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs px-3">
                        <UserCheck className="w-3.5 h-3.5" />Activate
                      </Button>
                    )}
                    {u.isApproved && !u.isSuspended && u.role !== 'super_admin' && (
                      <Button size="sm" variant="outline" onClick={() => setSuspendTarget(u._id)}
                        className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50 gap-1 text-xs px-3">
                        <UserX className="w-3.5 h-3.5" />Suspend
                      </Button>
                    )}
                    {/* Overflow actions — "..." context menu keeps the card footer tidy */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuFor(menuFor === u._id ? null : u._id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                        aria-label={`More actions for ${displayName(u)}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuFor === u._id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                          <div className="absolute right-0 bottom-full mb-1 z-50 bg-white rounded-xl shadow-xl border py-1 w-48">
                            {u.isApproved && u.role === 'business_admin' && !u.isSuspended && (
                              <button
                                onClick={() => { setMenuFor(null); fixBusiness(u._id, u.email); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50"
                                title="Create or link missing business profile"
                              >
                                <Shield className="w-3.5 h-3.5" />Fix Store
                              </button>
                            )}
                            {u.role !== 'super_admin' && (
                              <button
                                onClick={() => deleteUser(u._id, u.email)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />Delete user
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Confirm delete dialog */}
    {confirmDialog && <ConfirmDialog {...confirmDialog} />}
    </>
  );
};

export default PendingUsers;
