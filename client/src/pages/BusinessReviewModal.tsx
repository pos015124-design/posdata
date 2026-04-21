import React, { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Business {
  _id: string;
  name: string;
  email: string;
  category: string;
}

interface BusinessReviewModalProps {
  business: Business;
  onAction: (action: 'approve' | 'reject' | 'edit' | 'suspend', business: Business) => void;
}

const BusinessReviewModal: React.FC<BusinessReviewModalProps> = ({ business, onAction }) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'approve' | 'reject' | 'edit' | 'suspend') => {
    setLoading(true);
    await onAction(action, business);
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Business</DialogTitle>
          <DialogDescription>
            Approve, reject, edit, or suspend this business.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="font-medium text-lg">{business.name}</div>
          <div className="text-sm text-gray-600">{business.email}</div>
          <Badge variant="secondary">{business.category}</Badge>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>Reject</Button>
          <Button variant="secondary" onClick={() => handleAction('edit')} disabled={loading}>Edit</Button>
          <Button variant="outline" onClick={() => handleAction('suspend')} disabled={loading}>Suspend</Button>
          <Button onClick={() => handleAction('approve')} disabled={loading}>Approve</Button>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessReviewModal;
