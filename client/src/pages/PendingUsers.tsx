import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircle, XCircle, Trash2, UserCheck, UserX,
  Search, RefreshCw, Shield, Clock, AlertTriangle
} from 'lucide-react';

interface ManagedUser {
  _id: string;
  email: string;
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

const PendingUsers: React.FC<{ onMutate?: () => void }> = ({ onMutate }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
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

  const fixBusiness = async (id: string, email: string) => {
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
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    try {
      const d = await api(`/api/auth/users/${id}`, 'DELETE');
      toast({ title: d.success ? 'User deleted' : 'Error', description: d.message || d.success ? 'User deleted' : 'Failed', variant: d.success ? 'default' : 'destructive' });
      if (d.success) { fetchUsers(); onMutate?.(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase());
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

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mt-3">
          {(['all', 'pending', 'active', 'suspended'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
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
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u._id} className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-colors ${u.isSuspended ? 'bg-red-50 border-red-200' : !u.isApproved ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${u.isSuspended ? 'bg-red-500' : !u.isApproved ? 'bg-amber-500' : 'bg-green-500'}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(u.role)}`}>{u.role.replace('_', ' ')}</span>
                    {u.isSuspended && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />Suspended</span>}
                    {!u.isApproved && !u.isSuspended && <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Clock className="w-3 h-3" />Pending approval</span>}
                    {u.isApproved && !u.isSuspended && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</span>}
                    {u.termsAccepted && <span className="text-xs text-gray-400">T&C ✓</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!u.isApproved && !u.isSuspended && (
                    <Button size="sm" onClick={() => approve(u._id)}
                      className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1 text-xs px-2">
                      <UserCheck className="w-3.5 h-3.5" />Approve
                    </Button>
                  )}
                  {u.isSuspended && (
                    <Button size="sm" onClick={() => activate(u._id)}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs px-2">
                      <UserCheck className="w-3.5 h-3.5" />Activate
                    </Button>
                  )}
                  {u.isApproved && !u.isSuspended && u.role !== 'super_admin' && (
                    <Button size="sm" variant="outline" onClick={() => setSuspendTarget(u._id)}
                      className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50 gap-1 text-xs px-2">
                      <UserX className="w-3.5 h-3.5" />Suspend
                    </Button>
                  )}
                  {u.role !== 'super_admin' && (
                    <Button size="sm" variant="ghost" onClick={() => deleteUser(u._id, u.email)}
                      className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 px-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {/* Fix Business — for approved sellers who have no business profile */}
                  {u.isApproved && u.role === 'business_admin' && !u.isSuspended && (
                    <Button size="sm" variant="outline"
                      onClick={() => fixBusiness(u._id, u.email)}
                      className="h-8 border-purple-300 text-purple-700 hover:bg-purple-50 gap-1 text-xs px-2"
                      title="Create or link missing business profile">
                      <Shield className="w-3.5 h-3.5" />Fix Store
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingUsers;
