import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, ShieldCheck, ShieldOff, Smartphone, KeyRound } from 'lucide-react';

/**
 * Two-factor authentication (TOTP) manager shown on the Settings page for
 * admin and super admin accounts. Handles the full lifecycle:
 *   status → setup (QR + secret) → enable (code + password) → disable (password).
 *
 * Enabling/disabling deliberately signs the user out: the server invalidates
 * existing sessions, so the next login enforces (or stops enforcing) 2FA.
 */
export default function TwoFactorSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Setup state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  // Disable state
  const [disablePassword, setDisablePassword] = useState('');

  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const refreshStatus = async () => {
    try {
      const res = await getTwoFactorStatus();
      setEnabled(res.twoFactorEnabled);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load 2FA status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetup = async () => {
    setBusy(true);
    try {
      const res = await setupTwoFactor();
      setQrCode(res.qrCode);
      setSecret(res.secret);
      toast({
        title: 'Scan the QR code',
        description: 'Add this account to your authenticator app (Google Authenticator, Authy, etc.).',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start 2FA setup.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await enableTwoFactor(code.trim(), password);
      toast({
        title: 'Two-factor authentication enabled',
        description: 'You will be signed out. Next time you log in you will need your authenticator code.',
      });
      logout();
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enable 2FA.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await disableTwoFactor(disablePassword);
      toast({
        title: 'Two-factor authentication disabled',
        description: 'You will be signed out.',
      });
      logout();
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable 2FA.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Enabled state ──────────────────────────────────────────────────────────
  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <ShieldCheck className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Two-factor authentication is enabled</p>
            <p className="text-sm text-green-700">
              Every sign-in requires a 6-digit code from your authenticator app in addition to your password.
            </p>
          </div>
        </div>

        <form onSubmit={handleDisable} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">Current password</Label>
            <Input
              id="disable-2fa-password"
              type="password"
              placeholder="••••••••"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            disabled={busy}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldOff className="w-4 h-4 mr-2" />}
            Disable Two-Factor Authentication
          </Button>
        </form>
      </div>
    );
  }

  // ── Disabled state ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <ShieldCheck className="w-6 h-6 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-800">Two-factor authentication is disabled</p>
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account. Once enabled, sign-in requires a
            6-digit code from your authenticator app.
          </p>
        </div>
      </div>

      {!qrCode ? (
        <Button
          onClick={handleSetup}
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
          Enable Two-Factor Authentication
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-3 shrink-0">
              <img src={qrCode} alt="QR code for authenticator app" className="w-44 h-44" />
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-800">1. Scan the QR code</p>
              <p>Open your authenticator app and scan the QR code to add this account.</p>
              <p className="font-medium text-gray-800 pt-1">Can't scan it?</p>
              <p>Manually enter this secret key in your app:</p>
              <code className="block bg-gray-100 border border-gray-200 rounded px-3 py-2 font-mono text-xs break-all select-all">
                {secret}
              </code>
            </div>
          </div>

          <form onSubmit={handleEnable} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="2fa-code">6-digit code from your app</Label>
              <Input
                id="2fa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="h-11 tracking-[0.3em] font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="2fa-password">Current password</Label>
              <Input
                id="2fa-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={busy || code.length !== 6 || !password}
              className="bg-green-600 hover:bg-green-700"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Confirm & Enable
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
