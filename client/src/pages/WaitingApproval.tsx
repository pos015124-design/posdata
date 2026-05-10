/**
 * WaitingApproval — Seller onboarding status page
 * Shows a clear progress timeline: Registered → Under Review → Approved → Active
 * Shown automatically when an approved=false seller tries to access the dashboard.
 * Auto-polls /api/auth/me every 15 seconds — redirects to dashboard the moment
 * the admin approves the account.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, Circle, Mail, Phone, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const BASE = import.meta.env.VITE_API_URL || '';

interface Step {
  id: number;
  label: string;
  description: string;
  icon: React.ElementType;
  status: 'done' | 'active' | 'pending';
}

const WaitingApproval: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { refreshUser, user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Check approval status by fetching fresh user data from the server
  const checkStatus = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user?.isApproved) {
          // Update auth context — PrivateRoute will immediately redirect to dashboard
          localStorage.setItem('user', JSON.stringify(data.user));
          await refreshUser();
          // No need to do anything else — PrivateRoute re-renders and routes to /dashboard
        }
      }
      setLastChecked(new Date());
    } catch {
      // silent fail — don't disrupt the UI
    } finally {
      if (!silent) setChecking(false);
    }
  }, [refreshUser]);

  // Auto-poll every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => checkStatus(true), 15_000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleRefresh = () => checkStatus(false);

  const steps: Step[] = [
    {
      id: 1,
      label: 'Account Created',
      description: 'Your seller account and business profile have been created successfully.',
      icon: CheckCircle,
      status: 'done'
    },
    {
      id: 2,
      label: 'Under Review',
      description: 'BHABY GROUP LTD is reviewing your application. This usually takes less than 24 hours.',
      icon: Clock,
      status: 'active'
    },
    {
      id: 3,
      label: 'Account Approved',
      description: 'You will receive an email notification once your account is approved.',
      icon: Circle,
      status: 'pending'
    },
    {
      id: 4,
      label: 'Start Selling',
      description: 'Add products, set up your store, and start receiving orders.',
      icon: ShoppingBag,
      status: 'pending'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <img
              src="/eshoplogo.jpeg"
              alt="E-Shop Bhaby Group"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Application Under Review</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your seller account is being reviewed. We'll notify you by email once it's approved.
          </p>
        </div>

        {/* Progress timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-5">Application Progress</h2>
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isLast = idx === steps.length - 1;
              return (
                <div key={step.id} className="flex gap-4">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      step.status === 'done'   ? 'bg-green-100 text-green-600' :
                      step.status === 'active' ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-100' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {step.status === 'done' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : step.status === 'active' ? (
                        <Clock className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${
                        step.status === 'done' ? 'bg-green-200' : 'bg-gray-100'
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 flex-1 ${isLast ? 'pb-0' : ''}`}>
                    <p className={`font-semibold text-sm ${
                      step.status === 'done'   ? 'text-green-700' :
                      step.status === 'active' ? 'text-blue-700' :
                      'text-gray-400'
                    }`}>
                      {step.label}
                      {step.status === 'active' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Current
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${
                      step.status === 'pending' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-amber-900 text-sm mb-3">What happens next?</h3>
          <ul className="space-y-2 text-xs text-amber-800">
            <li className="flex items-start gap-2">
              <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>You'll receive an <strong>email notification</strong> at your registered address once approved.</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Review typically takes <strong>less than 24 hours</strong> on business days.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShoppingBag className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Once approved, log back in to access your <strong>seller dashboard</strong> and start adding products.</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Questions? Contact us at <strong>bhabygroup.co.tz</strong></span>
            </li>
          </ul>
        </div>

        {/* Fee reminder */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-xs text-blue-800">
          <p className="font-bold mb-1">📋 Fee reminder</p>
          <p>Upon approval, a one-time registration fee of <strong>TZS 300,000</strong> will be due within 7 days. Payment instructions will be in your approval email.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleRefresh}
            disabled={checking}
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check Status'}
          </Button>
          {onLogout && (
            <Button
              variant="ghost"
              className="flex-1 gap-2 text-gray-500 hover:text-gray-700"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
              Log out
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Last checked: {lastChecked.toLocaleTimeString()} · Auto-checks every 15 seconds
        </p>
      </div>
    </div>
  );
};

export default WaitingApproval;
