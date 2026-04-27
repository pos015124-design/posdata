import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Settings as SettingsIcon, Save, Store, User, Bell, Globe, Shield, CreditCard, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import * as settingsApi from '../api/settings';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [generalSettings, setGeneralSettings] = useState({
    storeName: '',
    currency: 'TZS',
    timezone: 'Africa/Dar_es_Salaam',
    language: 'en'
  });

  const [businessSettings, setBusinessSettings] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    isPublic: false,
    status: 'pending'
  });

  const [profileSettings, setProfileSettings] = useState({
    fullName: '',
    email: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderAlerts: true,
    lowStockAlerts: true,
    dailyReports: false
  });

  const [taxSettings, setTaxSettings] = useState({
    defaultTaxRate: '18',
    taxIncluded: false,
    enableTax: true
  });

  const [paymentSettings, setPaymentSettings] = useState({
    acceptCash: true,
    acceptCard: true,
    acceptMobile: true,
    acceptCredit: false,
    defaultPaymentMethod: 'cash'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileSettings({
        fullName: user.email?.split('@')[0] || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load business settings from business API
      const token = localStorage.getItem('token');
      const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/business/my-business`;
      
      const businessResponse = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check if response is JSON
      const contentType = businessResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Business API returned non-JSON response, using defaults');
        return; // Use defaults
      }
      
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        const business = businessData.data;
        
        setBusinessSettings({
          name: business.name || '',
          slug: business.slug || '',
          address: business.address || '',
          phone: business.phone || '',
          email: business.email || '',
          taxId: business.taxId || '',
          isPublic: business.isPublic || false,
          status: business.status || 'pending'
        });
      } else if (businessResponse.status === 404) {
        // Business doesn't exist yet - that's okay, user can create one
        console.log('No business found, user can create one');
      } else {
        console.error('Failed to load business:', businessResponse.status);
      }
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setSaving(true);
      toast({
        title: 'Success',
        description: 'General settings saved successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    try {
      setSaving(true);
      
      // Get current user's business
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '';
      
      // First, try to get existing business
      const getResponse = await fetch(`${baseUrl}/api/business/my-business`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let businessId: string | null = null;
      
      if (getResponse.ok) {
        const getData = await getResponse.json();
        businessId = getData.data._id;
      }
      
      // Prepare business data
      const businessData = {
        name: businessSettings.name,
        slug: businessSettings.slug,
        address: businessSettings.address,
        phone: businessSettings.phone,
        email: businessSettings.email,
        isPublic: businessSettings.isPublic,
        // Don't send status - only admin can change it
      };
      
      let response;
      
      if (businessId) {
        // Update existing business
        response = await fetch(`${baseUrl}/api/business/${businessId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(businessData)
        });
      } else {
        // Create new business
        response = await fetch(`${baseUrl}/api/business/my-business`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(businessData)
        });
      }
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: 'Business settings saved successfully!',
        });
        // Reload to get updated data
        loadSettings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save business settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      toast({
        title: 'Success',
        description: 'Notification preferences saved!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTax = async () => {
    try {
      setSaving(true);
      await settingsApi.updateTaxSettings(taxSettings);
      toast({
        title: 'Success',
        description: 'Tax settings saved successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save tax settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    try {
      setSaving(true);
      await settingsApi.updatePaymentSettings(paymentSettings);
      toast({
        title: 'Success',
        description: 'Payment settings saved successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save payment settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'business', label: 'Business', icon: Store },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'tax', label: 'Tax', icon: FileText },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Mobile Tab Selector */}
      <div className="md:hidden">
        <Button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          {tabs.find(t => t.id === activeTab)?.label || 'Settings'}
        </Button>
        
        {showMobileMenu && (
          <Card className="mt-2 border-0 shadow-lg">
            <CardContent className="p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowMobileMenu(false);
                  }}
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
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden md:block md:col-span-3 lg:col-span-2">
          <Card className="border-0 shadow-lg sticky top-6">
            <CardContent className="p-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm ${
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
        <div className="md:col-span-9 lg:col-span-10">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl md:text-2xl">
                {activeTab === 'general' && 'General Settings'}
                {activeTab === 'business' && 'Business Settings'}
                {activeTab === 'profile' && 'Profile Settings'}
                {activeTab === 'tax' && 'Tax Settings'}
                {activeTab === 'payment' && 'Payment Settings'}
                {activeTab === 'notifications' && 'Notification Preferences'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input 
                      id="storeName" 
                      value={generalSettings.storeName}
                      onChange={(e) => setGeneralSettings({...generalSettings, storeName: e.target.value})}
                      placeholder="Enter store name" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={generalSettings.currency}
                        onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TZS">TZS - Tanzanian Shilling</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="language">Language</Label>
                      <select
                        id="language"
                        value={generalSettings.language}
                        onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="sw">Swahili</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveGeneral}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="space-y-6">
                  {/* Store URL Preview */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-lg mb-2">Your Store URL</h3>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-white px-3 py-2 rounded border flex-1">
                        {window.location.origin}/store/{businessSettings.slug || 'your-slug'}
                      </code>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      This is the public URL where customers can browse your products
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input 
                        id="businessName" 
                        value={businessSettings.name}
                        onChange={(e) => setBusinessSettings({...businessSettings, name: e.target.value})}
                        placeholder="Enter business name" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug">Store Slug * (URL-friendly)</Label>
                      <Input 
                        id="slug" 
                        value={businessSettings.slug || ''}
                        onChange={(e) => {
                          // Auto-format slug: lowercase, hyphens instead of spaces
                          const slug = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          setBusinessSettings({...businessSettings, slug: slug});
                        }}
                        placeholder="my-store" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Used in your store URL. Only letters, numbers, and hyphens.</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings({...businessSettings, address: e.target.value})}
                      placeholder="Business address" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        value={businessSettings.phone}
                        onChange={(e) => setBusinessSettings({...businessSettings, phone: e.target.value})}
                        placeholder="+255 XXX XXX XXX" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessEmail">Email</Label>
                      <Input 
                        id="businessEmail" 
                        type="email"
                        value={businessSettings.email}
                        onChange={(e) => setBusinessSettings({...businessSettings, email: e.target.value})}
                        placeholder="business@example.com" 
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="taxId">Tax ID / TIN Number</Label>
                    <Input 
                      id="taxId" 
                      value={businessSettings.taxId}
                      onChange={(e) => setBusinessSettings({...businessSettings, taxId: e.target.value})}
                      placeholder="Enter tax identification number" 
                    />
                  </div>

                  {/* Public Store Toggle */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Public Store</h4>
                        <p className="text-sm text-gray-600">Make your store visible to everyone</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr0-peer"
                          checked={businessSettings.isPublic || false}
                          onChange={(e) => setBusinessSettings({...businessSettings, isPublic: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {businessSettings.isPublic 
                        ? '✅ Your store is public and accessible to everyone'
                        : '⚠️ Your store is private. Only you can see it.'}
                    </p>
                  </div>

                  {/* Status Display */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Store Status</h4>
                        <p className="text-sm text-gray-600">Current status of your business</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        businessSettings.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : businessSettings.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {businessSettings.status === 'active' ? '✅ Active' : 
                         businessSettings.status === 'pending' ? '⏳ Pending Approval' : 
                         businessSettings.status || 'Inactive'}
                      </span>
                    </div>
                    {businessSettings.status === 'pending' && (
                      <p className="text-xs text-yellow-600 mt-2">
                        ⏳ Your business is awaiting admin approval
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleSaveBusiness}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {profileSettings.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{profileSettings.fullName || 'User'}</p>
                        <p className="text-sm text-gray-600">{profileSettings.email}</p>
                        <p className="text-xs text-blue-600 capitalize">{user?.role || 'user'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={profileSettings.fullName}
                      onChange={(e) => setProfileSettings({...profileSettings, fullName: e.target.value})}
                      placeholder="Enter your full name" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                      placeholder="your@email.com" 
                    />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Change Password
                    </Label>
                    <p className="text-sm text-gray-600 mt-2">Password change functionality will be available soon.</p>
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Update Profile
                  </Button>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base">Enable Tax</Label>
                      <p className="text-sm text-gray-600">Turn tax calculations on or off</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={taxSettings.enableTax}
                      onChange={(e) => setTaxSettings({...taxSettings, enableTax: e.target.checked})}
                      className="w-5 h-5" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input 
                      id="taxRate" 
                      type="number"
                      value={taxSettings.defaultTaxRate}
                      onChange={(e) => setTaxSettings({...taxSettings, defaultTaxRate: e.target.value})}
                      placeholder="18" 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base">Tax Included in Prices</Label>
                      <p className="text-sm text-gray-600">Prices already include tax</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={taxSettings.taxIncluded}
                      onChange={(e) => setTaxSettings({...taxSettings, taxIncluded: e.target.checked})}
                      className="w-5 h-5" 
                    />
                  </div>
                  <Button
                    onClick={handleSaveTax}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Tax Settings
                  </Button>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Accepted Payment Methods</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="text-sm">Cash</Label>
                        <input 
                          type="checkbox" 
                          checked={paymentSettings.acceptCash}
                          onChange={(e) => setPaymentSettings({...paymentSettings, acceptCash: e.target.checked})}
                          className="w-5 h-5" 
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="text-sm">Card</Label>
                        <input 
                          type="checkbox" 
                          checked={paymentSettings.acceptCard}
                          onChange={(e) => setPaymentSettings({...paymentSettings, acceptCard: e.target.checked})}
                          className="w-5 h-5" 
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="text-sm">Mobile Money</Label>
                        <input 
                          type="checkbox" 
                          checked={paymentSettings.acceptMobile}
                          onChange={(e) => setPaymentSettings({...paymentSettings, acceptMobile: e.target.checked})}
                          className="w-5 h-5" 
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="text-sm">Credit</Label>
                        <input 
                          type="checkbox" 
                          checked={paymentSettings.acceptCredit}
                          onChange={(e) => setPaymentSettings({...paymentSettings, acceptCredit: e.target.checked})}
                          className="w-5 h-5" 
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="defaultPayment">Default Payment Method</Label>
                    <select
                      id="defaultPayment"
                      value={paymentSettings.defaultPaymentMethod}
                      onChange={(e) => setPaymentSettings({...paymentSettings, defaultPaymentMethod: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile Money</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleSavePayment}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Payment Settings
                  </Button>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                      { key: 'orderAlerts', label: 'Order Alerts', desc: 'Get notified for new orders' },
                      { key: 'lowStockAlerts', label: 'Low Stock Alerts', desc: 'Alert when products are low' },
                      { key: 'dailyReports', label: 'Daily Reports', desc: 'Receive daily sales reports' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="text-base">{item.label}</Label>
                          <p className="text-sm text-gray-600">{item.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings, 
                            [item.key]: e.target.checked
                          })}
                          className="w-5 h-5" 
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Preferences
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
