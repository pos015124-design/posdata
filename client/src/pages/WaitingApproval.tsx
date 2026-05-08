/**
 * WaitingApproval — Seller onboarding status page
 * Shows a clear progress tracker: Registered → Under Review → Approved → Active
 * Shown to any business_admin whose isApproved is still false.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, Clock, UserCheck, Store, Mail,
  RefreshCw, LogOut, ShoppingBag, Phone, Building2
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';

interface Step {
  id: number;
  label: string;
  description: string;
  icon: React.ElementType;
  status: 'done' | 'active' | 'pending';
}

const WaitingApproval: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [billingInfo, setBillingInfo] = useState<any>(null);

  // Fetch billing info (PBZ account) to show in the fee notice
  useEffect(() => {
    fetch(`${BASE}/api/billing/info`)
      .then(r => r.json())
      .then(d => { if (d.success) setBillingInfo(d.data); })
      .catch(() => {});
  }, []);

  // Poll approval status every 30s — if approved, page will reload via AuthContext
  useEffect(() => {
    const check = async () => {
      setChecking(true);
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const res = await fetch(`${BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.user?.isApproved) {
          // Approved — update localStorage and reload so App.tsx re-evaluates
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.isApproved = true;
            localStorage.setItem('user', JSON.stringify(u));
          }
          window.location.reload();
        }
        setLastChecked(new Date());
      } catch { /* ignore */ }
      finally { setChecking(false); }
    };

    check(); // immediate check on mount
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);

  const steps: Step[] = [
    {
      id: 1,
      label: 'Account Created',
      description: 'Your seller account and store profile have been created successfully.',
      icon: UserCheck,
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
      description: 'You will receive an email notification as soon as your account is approved.',
      icon: CheckCircle,
      status: 'pending'
    },
    {
      id: 4,
      label: 'Start Selling',
      description: 'Add products, publish your store, and start receiving orders from customers.',
      icon: Store,
      status: 'pending'
    }
  ];

  const stepColor = (status: Step['status']) => {
    if (status === 'done')    return 'bg-green-500 text-white border-green-500';
    if (status === 'active')  return 'bg-blue-600 text-white border-blue-600 animate-pulse';
    return 'bg-white text-gray-300 border-gray-200';
  };

  const lineColor = (status: Step['status']) =>
    status === 'done' ? 'bg-green-400' : 'bg-gray-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Gradient top bar */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">BHABY GROUP LTD</p>
                <h1 className="text-xl font-extrabold leading-tight">E-Shop Seller Portal</h1>
              </div>
            </div>
            <p className="text-white/80 text-sm mt-1">
              Your application is being reviewed. We'll notify you by email once approved.
            </p>
          </div>

          {/* Progress steps */}
          <div className="px-8 py-8">
            <div className="relative">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isLast = idx === steps.length - 1;
                return (
                  <div key={step.id} className="flex gap-4">
                    {/* Icon + connector line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${stepColor(step.status)}`}>
                        {step.status === 'done'
                          ? <CheckCircle className="w-5 h-5" />
                          : <Icon className="w-5 h-5" />
                        }
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[32px] ${lineColor(step.status)}`} />
                      )}
                    </div>

                    {/* Text */}
                    <div className={`pb-6 flex-1 ${isLast ? '' : ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`font-bold text-sm ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                          {step.label}
                        </p>
                        {step.status === 'active' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            Current
                          </span>
                        )}
                        {step.status === 'done' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            Done
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fee notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" />Registration Fee — Action Required
          </h3>
          <p className="text-sm text-amber-800 mb-3">
            To activate your account, a one-time registration fee of{' '}
            <strong>TZS 300,000</strong> is required. Please transfer to:
          </p>
          <div className="bg-white rounded-xl p-4 space-y-2 text-sm border border-amber-100">
            {[
              ['Bank', billingInfo?.bankName || "People's Bank of Zanzibar (PBZ)"],
              ['Account Name', billingInfo?.accountName || 'BHABY GROUP LTD'],
              ['Account Number', billingInfo?.accountNumber || '0952509001'],
              ['Reference', 'Your registered email address'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold font-mono text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-3">
            After payment, send proof to{' '}
            <a href="mailto:admin@bhabygroup.co.tz" className="font-semibold underline">
              admin@bhabygroup.co.tz
            </a>
            {' '}for faster processing.
          </p>
        </div>

        {/* What to prepare */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />While you wait — prepare your store
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              'Take clear photos of your products (good lighting, plain background)',
              'Write accurate product descriptions and set competitive prices',
              'Decide on your delivery areas and estimated delivery times',
              'Prepare your M-Pesa / Tigo Pesa number for receiving payments',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11"
            disabled={checking}
            onClick={() => {
              setChecking(true);
              const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
              fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(d => {
                  if (d.user?.isApproved) {
                    const stored = localStorage.getItem('user');
                    if (stored) { const u = JSON.parse(stored); u.isApproved = true; localStorage.setItem('user', JSON.stringify(u)); }
                    window.location.reload();
                  } else {
                    setLastChecked(new Date());
                  }
                })
                .catch(() => {})
                .finally(() => setChecking(false));
            }}
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check Status'}
          </Button>

          <a href="mailto:admin@bhabygroup.co.tz?subject=Seller Account Approval Request" className="flex-1">
            <Button variant="outline" className="w-full gap-2 h-11">
              <Mail className="w-4 h-4" />Contact Support
            </Button>
          </a>

          {onLogout && (
            <Button variant="ghost" onClick={onLogout} className="gap-2 h-11 text-gray-500 hover:text-red-600">
              <LogOut className="w-4 h-4" />Sign out
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Last checked: {lastChecked.toLocaleTimeString()} · Auto-checks every 30 seconds
        </p>
      </div>
    </div>
  );
};

export default WaitingApproval;
