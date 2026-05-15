import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '../hooks/useToast';

/**
 * Flat view of the platform settings fields we expose in this form.
 * These map to the nested PlatformSettings model as follows:
 *   platformName            → platformName
 *   supportEmail            → email.fromEmail
 *   allowNewSignups         → businessRegistration.enabled
 */
interface PlatformSettingsData {
  platformName: string;
  /** Maps to email.fromEmail in the DB model */
  supportEmail: string;
  /** Maps to businessRegistration.enabled in the DB model */
  allowNewSignups: boolean;
}

const defaultSettings: PlatformSettingsData = {
  platformName: '',
  supportEmail: '',
  allowNewSignups: true,
};

/** Shape of the raw API response: { success: true, data: <PlatformSettings doc> } */
interface ApiResponse {
  success: boolean;
  data: {
    platformName?: string;
    email?: { fromEmail?: string };
    businessRegistration?: { enabled?: boolean };
  };
}

const BASE = import.meta.env.VITE_API_URL || '';

const PlatformSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    setLoading(true);
    fetch(`${BASE}/api/platform/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        // Map nested model fields to our flat form shape
        setSettings({
          platformName: json.data?.platformName ?? '',
          supportEmail: json.data?.email?.fromEmail ?? '',
          allowNewSignups: json.data?.businessRegistration?.enabled ?? true,
        });
      })
      .catch((err) => {
        console.error('Failed to load platform settings:', err);
        toast({ title: 'Failed to load settings', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    setSaving(true);
    try {
      // Map flat form fields back to the nested model structure the backend expects
      const payload = {
        platformName: settings.platformName,
        email: { fromEmail: settings.supportEmail },
        businessRegistration: { enabled: settings.allowNewSignups },
      };
      const res = await fetch(`${BASE}/api/platform/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }
      toast({ title: 'Settings saved successfully', variant: 'default' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to save platform settings:', message);
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Platform Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure platform-wide settings and preferences</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Platform Name
              </label>
              <Input
                name="platformName"
                value={settings.platformName}
                onChange={handleChange}
                disabled={loading}
                placeholder="E-Shop — BHABY GROUP LTD"
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Support Email
              </label>
              <Input
                name="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={handleChange}
                disabled={loading}
                placeholder="info@bhabygroup.co.tz"
                required
                className="h-11"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-900">Allow New Signups</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When off, new seller registrations are blocked
                </p>
              </div>
              <Switch
                checked={settings.allowNewSignups}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, allowNewSignups: checked }))
                }
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || saving}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformSettings;
