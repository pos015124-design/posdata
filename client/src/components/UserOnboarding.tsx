import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  path: string;
  completed: boolean;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your profile information and set up your business details',
    action: 'Go to Settings',
    path: '/settings',
    completed: false
  },
  {
    id: 'inventory',
    title: 'Add Your First Product',
    description: 'Set up your inventory by adding products with prices and stock levels',
    action: 'Add Product',
    path: '/inventory',
    completed: false
  },
  {
    id: 'customers',
    title: 'Add Customers',
    description: 'Create customer profiles to track sales and manage relationships',
    action: 'Add Customer',
    path: '/customers',
    completed: false
  },
  {
    id: 'first-sale',
    title: 'Make Your First Sale',
    description: 'Process your first sale using the Point of Sale system',
    action: 'Go to POS',
    path: '/pos',
    completed: false
  },
  {
    id: 'reports',
    title: 'Review Reports',
    description: 'Check your sales reports and business analytics',
    action: 'View Reports',
    path: '/reports',
    completed: false
  }
];

export const UserOnboarding = () => {
  useAuth();
  const [currentSteps, setCurrentSteps] = useState<OnboardingStep[]>(onboardingSteps);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);


  // Check if user has completed onboarding
  useEffect(() => {
    const completedSteps = JSON.parse(localStorage.getItem('onboarding-completed-steps') || '[]');
    const updatedSteps = onboardingSteps.map(step => ({
      ...step,
      completed: completedSteps.includes(step.id)
    }));
    setCurrentSteps(updatedSteps);
  }, []);

  // Calculate completion percentage
  const completedCount = currentSteps.filter(step => step.completed).length;
  const completionPercentage = (completedCount / currentSteps.length) * 100;

  // Mark step as completed
  const markStepComplete = (stepId: string) => {
    const updatedSteps = currentSteps.map(step =>
      step.id === stepId ? { ...step, completed: true } : step
    );
    setCurrentSteps(updatedSteps);
    
    // Save to localStorage
    const completedSteps = updatedSteps
      .filter(step => step.completed)
      .map(step => step.id);
    localStorage.setItem('onboarding-completed-steps', JSON.stringify(completedSteps));
  };

  // Reset onboarding
  const resetOnboarding = () => {
    const resetSteps = onboardingSteps.map(step => ({ ...step, completed: false }));
    setCurrentSteps(resetSteps);
    localStorage.removeItem('onboarding-completed-steps');
  };

  // Get next incomplete step
  const nextIncompleteStep = currentSteps.find(step => !step.completed);

  return (
    <>
      {/* Onboarding Banner - Show if not all steps completed */}
      {completedCount < currentSteps.length && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-blue-50 border-b border-blue-200 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium">Getting Started</h3>
                  <Badge variant="secondary" className="text-xs">
                    {completedCount}/{currentSteps.length} completed
                  </Badge>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </div>
            {nextIncompleteStep && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowOnboarding(true)}
              >
                Continue Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Welcome to Dukani System</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Setup Checklist</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetOnboarding}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {completedCount} of {currentSteps.length} tasks completed
              </p>
            </div>

            <div className="space-y-3">
              {currentSteps.map((step, index) => (
                <Card 
                  key={step.id}
                  className={`transition-colors ${
                    step.completed ? 'bg-green-50 border-green-200' : 'hover:bg-muted/50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 ${
                        step.completed ? 'text-green-600' : 'text-muted-foreground'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                            <span className="text-xs">{index + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${step.completed ? 'text-green-800' : ''}`}>
                          {step.title}
                        </h4>
                        <p className={`text-sm ${step.completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {step.description}
                        </p>
                      </div>
                      <Button
                        variant={step.completed ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => {
                          if (!step.completed) {
                            markStepComplete(step.id);
                          }
                        }}
                      >
                        {step.completed ? 'Completed' : step.action}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {completedCount === currentSteps.length ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">Congratulations!</h3>
                <p className="text-muted-foreground">
                  You've completed all setup tasks. Your Dukani system is ready to use.
                </p>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowOnboarding(false)}
                >
                  Close
                </Button>
                {nextIncompleteStep && (
                  <Button 
                    onClick={() => {
                      markStepComplete(nextIncompleteStep.id);
                      if (completedCount + 1 >= currentSteps.length) {
                        setShowOnboarding(false);
                      }
                    }}
                  >
                    Mark Current Step Complete
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserOnboarding;