import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ViewAllPendingProps {
  businesses: Array<{
    _id: string;
    name: string;
    email: string;
    category: string;
    createdAt: string;
  }>;
  onReview: (business: any) => void;
}

const ViewAllPending: React.FC<ViewAllPendingProps> = ({ businesses, onReview }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Pending Businesses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {businesses.length ? (
            businesses.map((business) => (
              <div key={business._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{business.name}</p>
                  <p className="text-sm text-gray-600">{business.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onReview(business)}>
                  Review
                </Button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No pending businesses</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ViewAllPending;
