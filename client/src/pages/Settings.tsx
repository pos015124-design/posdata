import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Settings as SettingsIcon, Save, Store, User, Bell } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Success',
      description: 'Settings saved successfully!',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 space-y-2">
              {[
                { id: 'general', label: 'General', icon: SettingsIcon },
                { id: 'business', label: 'Business', icon: Store },
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'notifications', label: 'Notifications', icon: Bell },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="col-span-9">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>
                {activeTab === 'general' && 'General Settings'}
                {activeTab === 'business' && 'Business Settings'}
                {activeTab === 'profile' && 'Profile Settings'}
                {activeTab === 'notifications' && 'Notification Preferences'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeTab === 'general' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input id="storeName" defaultValue="My Store" />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Input id="currency" defaultValue="USD" />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'business' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input id="businessName" defaultValue="My Business" />
                    </div>
                    <div>
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input id="taxId" defaultValue="" />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'profile' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue="John Doe" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john@example.com" />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'notifications' && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Email Notifications</Label>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Order Alerts</Label>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
