import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/useToast';

interface PendingUser {
  _id: string;
  email: string;
  role: string;
  isApproved: boolean;
}

const PendingUsers: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const baseUrl = import.meta.env.VITE_API_URL || '';

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/auth/pending-users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      setPendingUsers(data.users || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load pending users.' });
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/auth/approve/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'User Approved', description: data.message });
        fetchPendingUsers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.message || 'Failed to approve user.' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve user.' });
    }
  };

  const approveAllUsers = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/auth/approve-all-pending`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Pending Users Approved', description: data.message });
        fetchPendingUsers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.message || 'Failed to approve pending users.' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve pending users.' });
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    // eslint-disable-next-line
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Pending User Approvals</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={approveAllUsers}
            disabled={loading || pendingUsers.length === 0}
          >
            Approve All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No pending users.</TableCell>
              </TableRow>
            ) : (
              pendingUsers.map(user => (
                <TableRow key={user._id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.isApproved ? 'Approved' : 'Pending'}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => approveUser(user._id)}>
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PendingUsers;
