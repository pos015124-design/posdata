import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '../hooks/useToast';
import {
  Globe, Shield, Wrench, Zap, Mail, Building2,
  Save, Loader2, AlertTriangle
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';
const authH = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token') || ''}`,
  'Content-Type': 'application/json'
});

/* ── Types ── */
interface Settings {
  // General
  platformName: string;
  platformDescription: string;
  // Registration
  registrationEnabled: boolean;
  requireApproval: boolean;
  autoApprove: boolean;
  trialPeriod: number;
  // Email
  emailFromAddress: string;
  emailFromName: string;
  // Security
  passwordMinLength: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  // Maintenance
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  // Features
  featurePOS: boolean;
  featureEcommerce: boolean;
  featureInventory: boolean;
  featureAnalytics: boolean;
  featureReports: boolean;
  featureMobileApp: boolean;
}

const defaults: Settings = {
  platformName: '',
  platformDescription: '',
  registrationEnabled: true,
  requireApproval: true,
  autoApprove: false,
  trialPeriod: 30,
  emailFromAddress: '',
  emailFromName: '',
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  sessionTimeout: 24,
  maintenanceEnabled: false,
  maintenanceMessage: '',
  featurePOS: true,
  featureEcommerce: true,
  featureInventory: true,
  featureAnalytics: true,
  featureReports: true,
  featureMobileApp: false,
};

type Tab = 'general' | 'registration' | 'email' | 'security' | 'maintenance' | 'features';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general',      label: 'General',      icon: Globe },
  { id: 'registration', label: 'Registration',  icon: Building2 },
  { id: 'email',        label: 'Email',         icon: Mail },
  { id: 'security',     label: 'Security',      icon: Shield },
  { id: 'maintenance',  label: 'Maintenance',   icon: Wrench },
  { id: 'features',     label: 'Features',      icon: Zap },
];

/* ── Helper components ── */
function FieldRow({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-gray-700">{label}</Label>
      {hint && <p className="text-xs text-gray-400 -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }: {
  label: string; hint?: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/* ── Main component ── */
const PlatformSettings: React.FC = () => {
  const [s, setS]           = useState<Settings>(defaults);
  const [activeTab, setTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const { toast } = useToast();

  /* Load */
  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/platform/settings`, { headers: authH() })
      .then(r => r.json())
      .then(j => {
        const d = j.data || {};
        setS({
          platformName:        d.platformName        ?? '',
          platformDescription: d.platformDescription ?? '',
          registrationEnabled: d.businessRegistration?.enabled      ?? true,
          requireApproval:     d.businessRegistration?.requireApproval ?? true,
          autoApprove:         d.businessRegistration?.autoApprove   ?? false,
          trialPeriod:         d.businessRegistration?.trialPeriod   ?? 30,
          emailFromAddress:    d.email?.fromEmail  ?? '',
          emailFromName:       d.email?.fromName   ?? '',
          passwordMinLength:   d.security?.passwordMinLength  ?? 8,
          maxLoginAttempts:    d.security?.maxLoginAttempts   ?? 5,
          lockoutDuration:     d.security?.lockoutDuration    ?? 30,
          sessionTimeout:      d.security?.sessionTimeout     ?? 24,
          maintenanceEnabled:  d.maintenance?.enabled  ?? false,
          maintenanceMessage:  d.maintenance?.message  ?? '',
          featurePOS:          d.features?.pos        ?? true,
          featureEcommerce:    d.features?.ecommerce   ?? true,
          featureInventory:    d.features?.inventory   ?? true,
          featureAnalytics:    d.features?.analytics   ?? true,
          featureReports:      d.features?.reports     ?? true,
          featureMobileApp:    d.features?.mobileApp   ?? false,
        });
      })
      .catch(() => toast({ title: 'Failed to load settings', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Save — only sends the fields relevant to the active tab */
  const save = async () => {
    setSaving(true);
    try {
      // Build a partial payload scoped to the active tab so unrelated sections
      // are not overwritten on every save
      const payloads: Record<Tab, object> = {
        general: {
          platformName:        s.platformName,
          platformDescription: s.platformDescription,
        },
        registration: {
          businessRegistration: {
            enabled:         s.registrationEnabled,
            requireApproval: s.requireApproval,
            autoApprove:     s.autoApprove,
            trialPeriod:     s.trialPeriod,
          },
        },
        email: {
          email: {
            fromEmail: s.emailFromAddress,
            fromName:  s.emailFromName,
          },
        },
        security: {
          security: {
            passwordMinLength: s.passwordMinLength,
            maxLoginAttempts:  s.maxLoginAttempts,
            lockoutDuration:   s.lockoutDuration,
            sessionTimeout:    s.sessionTimeout,
          },
        },
        maintenance: {
          maintenance: {
            enabled: s.maintenanceEnabled,
            message: s.maintenanceMessage,
          },
        },
        features: {
          features: {
            pos:       s.featurePOS,
            ecommerce: s.featureEcommerce,
            inventory: s.featureInventory,
            analytics: s.featureAnalytics,
            reports:   s.featureReports,
            mobileApp: s.featureMobileApp,
          },
        },
      };

      const res = await fetch(`${BASE}/api/platform/settings`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify(payloads[activeTab]),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      toast({ title: 'Settings saved' });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setS(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            {(() => { const t = tabs.find(x => x.id === activeTab)!; const Icon = t.icon; return <><Icon className="w-4 h-4 text-blue-600" />{t.label}</> })()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── General ── */}
          {activeTab === 'general' && (
            <>
              <FieldRow label="Platform Name" hint="Displayed in emails and the browser tab">
                <Input value={s.platformName} onChange={e => set('platformName', e.target.value)}
                  placeholder="E-Shop — BHABY GROUP LTD" className="h-11" />
              </FieldRow>
              <FieldRow label="Platform Description" hint="Used in meta tags and onboarding copy">
                <Input value={s.platformDescription} onChange={e => set('platformDescription', e.target.value)}
                  placeholder="Multi-vendor marketplace and seller dashboard" className="h-11" />
              </FieldRow>
            </>
          )}

          {/* ── Registration ── */}
          {activeTab === 'registration' && (
            <>
              <ToggleRow label="Allow New Registrations"
                hint="When off, the registration page returns an error to new applicants"
                checked={s.registrationEnabled} onChange={v => set('registrationEnabled', v)} />
              <ToggleRow label="Require Admin Approval"
                hint="New sellers must be manually approved before accessing the dashboard"
                checked={s.requireApproval} onChange={v => set('requireApproval', v)} />
              <ToggleRow label="Auto-Approve New Sellers"
                hint="Automatically approves registrations without manual review. Overrides Require Approval."
                checked={s.autoApprove} onChange={v => set('autoApprove', v)} />
              <FieldRow label="Trial Period (days)"
                hint="Number of days a new seller can use the platform before billing begins">
                <Input type="number" min={0} max={365} value={s.trialPeriod}
                  onChange={e => set('trialPeriod', parseInt(e.target.value) || 0)}
                  className="h-11 w-32" />
              </FieldRow>
            </>
          )}

          {/* ── Email ── */}
          {activeTab === 'email' && (
            <>
              <FieldRow label="From Email Address" hint="The address all system emails are sent from">
                <Input type="email" value={s.emailFromAddress}
                  onChange={e => set('emailFromAddress', e.target.value)}
                  placeholder="noreply@bhabygroup.co.tz" className="h-11" />
              </FieldRow>
              <FieldRow label="From Name" hint="The display name shown in email clients">
                <Input value={s.emailFromName} onChange={e => set('emailFromName', e.target.value)}
                  placeholder="E-Shop — BHABY GROUP LTD" className="h-11" />
              </FieldRow>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                <p className="font-semibold mb-1">SMTP credentials are managed via environment variables</p>
                <p className="text-xs text-blue-600">
                  Host, port, username, and API key are set in the server <code>.env</code> file
                  as <code>EMAIL_HOST</code>, <code>EMAIL_PORT</code>, <code>EMAIL_USER</code>,
                  and <code>EMAIL_PASS</code>. Changes there require a server restart.
                </p>
              </div>
            </>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <>
              <FieldRow label="Minimum Password Length"
                hint="Applies to all new passwords and password changes">
                <Input type="number" min={6} max={32} value={s.passwordMinLength}
                  onChange={e => set('passwordMinLength', parseInt(e.target.value) || 8)}
                  className="h-11 w-32" />
              </FieldRow>
              <FieldRow label="Max Login Attempts"
                hint="Account is locked after this many consecutive failed logins">
                <Input type="number" min={1} max={20} value={s.maxLoginAttempts}
                  onChange={e => set('maxLoginAttempts', parseInt(e.target.value) || 5)}
                  className="h-11 w-32" />
              </FieldRow>
              <FieldRow label="Lockout Duration (minutes)"
                hint="How long an account stays locked after exceeding failed attempts">
                <Input type="number" min={1} max={1440} value={s.lockoutDuration}
                  onChange={e => set('lockoutDuration', parseInt(e.target.value) || 30)}
                  className="h-11 w-32" />
              </FieldRow>
              <FieldRow label="Session Timeout (hours)"
                hint="Access tokens expire after this many hours, requiring re-login">
                <Input type="number" min={1} max={168} value={s.sessionTimeout}
                  onChange={e => set('sessionTimeout', parseInt(e.target.value) || 24)}
                  className="h-11 w-32" />
              </FieldRow>
            </>
          )}

          {/* ── Maintenance ── */}
          {activeTab === 'maintenance' && (
            <>
              <ToggleRow label="Maintenance Mode"
                hint="Displays a maintenance notice to all non-admin visitors"
                checked={s.maintenanceEnabled} onChange={v => set('maintenanceEnabled', v)} />
              {s.maintenanceEnabled && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium">
                    Maintenance mode is active. The platform is not accessible to regular users.
                  </p>
                </div>
              )}
              <FieldRow label="Maintenance Message"
                hint="Shown to users when maintenance mode is on">
                <Input value={s.maintenanceMessage}
                  onChange={e => set('maintenanceMessage', e.target.value)}
                  placeholder="System is under maintenance. Please try again later."
                  className="h-11" />
              </FieldRow>
            </>
          )}

          {/* ── Features ── */}
          {activeTab === 'features' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 pb-1">
                Disable features to hide them from all seller dashboards platform-wide.
              </p>
              <ToggleRow label="POS Terminal"
                hint="Point-of-sale screen for in-person sales"
                checked={s.featurePOS} onChange={v => set('featurePOS', v)} />
              <ToggleRow label="E-commerce / Storefront"
                hint="Public marketplace and online ordering"
                checked={s.featureEcommerce} onChange={v => set('featureEcommerce', v)} />
              <ToggleRow label="Inventory Management"
                hint="Product and stock management for sellers"
                checked={s.featureInventory} onChange={v => set('featureInventory', v)} />
              <ToggleRow label="Analytics"
                hint="Sales analytics and business insights"
                checked={s.featureAnalytics} onChange={v => set('featureAnalytics', v)} />
              <ToggleRow label="Reports"
                hint="Profit, loss, and export reports"
                checked={s.featureReports} onChange={v => set('featureReports', v)} />
              <ToggleRow label="Mobile App"
                hint="Enable mobile app specific features and prompts"
                checked={s.featureMobileApp} onChange={v => set('featureMobileApp', v)} />
            </div>
          )}

          {/* Save button */}
          <div className="pt-2 border-t border-gray-100">
            <Button onClick={save} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 h-11 px-6 font-semibold">
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                : <><Save className="w-4 h-4 mr-2" />Save {tabs.find(t => t.id === activeTab)?.label}</>
              }
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformSettings;
