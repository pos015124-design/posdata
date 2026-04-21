import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WaitingApproval: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <AlertCircle className="mx-auto text-yellow-500 w-12 h-12 mb-2" />
          <CardTitle>Your account is pending approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Your registration was successful, but an administrator must approve your account before you can access the system.
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Please wait for approval. You will receive an email or notification once your account is activated.
          </p>
          {onLogout && (
            <Button variant="outline" onClick={onLogout}>
              Log out
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingApproval;
