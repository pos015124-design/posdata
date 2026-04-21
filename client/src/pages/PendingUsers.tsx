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

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/pending-users', {
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
      const res = await fetch(`/api/auth/approve/${userId}`, {
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

  useEffect(() => {
    fetchPendingUsers();
    // eslint-disable-next-line
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Pending User Approvals</CardTitle>
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
