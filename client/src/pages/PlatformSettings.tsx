import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '../hooks/useToast';

interface PlatformSettingsData {
  platformName: string;
  allowNewSignups: boolean;
  supportEmail: string;
}

const defaultSettings: PlatformSettingsData = {
  platformName: '',
  allowNewSignups: true,
  supportEmail: '',
};

const PlatformSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch('/api/platform/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => toast({ title: 'Failed to load settings', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Settings saved', variant: 'default' });
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Settings</CardTitle>
        <CardDescription>Configure platform-wide settings and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          <div>
            <label className="block mb-1 font-medium">Platform Name</label>
            <Input
              name="platformName"
              value={settings.platformName}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Support Email</label>
            <Input
              name="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Allow New Signups</span>
            <Switch
              name="allowNewSignups"
              checked={settings.allowNewSignups}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, allowNewSignups: checked }))}
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || saving} className="w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PlatformSettings;
