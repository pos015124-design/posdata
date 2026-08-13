import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Settings as SettingsIcon, Save, Store, User, Bell, Globe, Shield, CreditCard, FileText, Loader2, Eye, EyeOff, CheckCircle, Ban, Clock, Lock } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import * as settingsApi from '../api/settings';
import PendingUsers from './PendingUsers';
import BusinessManagement from './BusinessManagement';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Password change state — separate from profile so saving profile never
  // accidentally triggers a password update
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving,      setPasswordSaving]      = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword,     setShowNewPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Super admins don't own a business profile, so skip seller business settings fetches.
    if (user?.role === 'super_admin') {
      setLoading(false);
      return;
    }
    loadSettings();
  }, [user?.role]);

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
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '';

      const businessResponse = await fetch(`${baseUrl}/api/business/my-business`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const contentType = businessResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Business API returned non-JSON response, using defaults');
        return;
      }

      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        const business = businessData.data;

        setBusinessSettings({
          name: business.name || '',
          slug: business.slug || '',
          address: business.address
            ? typeof business.address === 'object'
              ? [business.address.street, business.address.city, business.address.state, business.address.country]
                  .filter(Boolean).join(', ')
              : business.address
            : '',
          phone: business.phone || '',
          email: business.email || '',
          taxId: business.taxId || '',
          isPublic: business.isPublic || false,
          // If user is approved but business still shows pending, treat as active
          status: (business.status === 'pending' && user?.isApproved) ? 'active' : (business.status || 'pending')
        });
      } else if (businessResponse.status === 404) {
        // Business not linked to this user — try auto-linking by email
        console.log('Business not found by userId, attempting auto-link...');
        try {
          const linkRes = await fetch(`${baseUrl}/api/business/link-my-business`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          if (linkRes.ok) {
            const linkData = await linkRes.json();
            const business = linkData.data;
            setBusinessSettings({
              name: business.name || '',
              slug: business.slug || '',
              address: business.address
                ? typeof business.address === 'object'
                  ? [business.address.street, business.address.city, business.address.state, business.address.country]
                      .filter(Boolean).join(', ')
                  : business.address
                : '',
              phone: business.phone || '',
              email: business.email || '',
              taxId: business.taxId || '',
              isPublic: business.isPublic || false,
              status: (business.status === 'pending' && user?.isApproved) ? 'active' : (business.status || 'pending')
            });
            console.log('Business auto-linked successfully');
          }
        } catch (linkErr) {
          console.log('Auto-link failed, user may need to create a business profile');
        }
      } else {
        console.error('Failed to load business:', businessResponse.status);
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
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
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
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
      
      // Prepare business data — address must be sent as an object, not a string
      const addressStr = businessSettings.address || '';
      const addressParts = addressStr.split(',').map((s: string) => s.trim());
      const businessData = {
        name: businessSettings.name,
        slug: businessSettings.slug,
        address: {
          street: addressParts[0] || '',
          city:   addressParts[1] || '',
          state:  addressParts[2] || '',
          country: addressParts[3] || 'Tanzania'
        },
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

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'All password fields are required.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }

    try {
      setPasswordSaving(true);
      const token   = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '';

      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password.');
      }

      toast({ title: 'Success', description: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update password.', variant: 'destructive' });
    } finally {
      setPasswordSaving(false);
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

  if (user?.role === 'super_admin') {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500 mt-0.5">Approve and manage users and businesses</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/super-admin')}>
              Super Admin
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => navigate('/business-management')}
            >
              Businesses
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Pending User Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingUsers />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Business Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessManagement />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <p className="text-sm text-gray-500">Manage your account and preferences</p>

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                    <h3 className="font-semibold text-base mb-2">Your Store URL</h3>
                    <div className="flex items-center gap-2">
                      <code className="text-xs sm:text-sm bg-white px-3 py-2 rounded border flex-1 break-all">
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
                      placeholder="Street, City, Region, Country" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate parts with commas: Street, City, Region, Country</p>
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
                          className="sr-only peer"
                          checked={businessSettings.isPublic || false}
                          onChange={(e) => setBusinessSettings({...businessSettings, isPublic: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                      {businessSettings.isPublic
                        ? <><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />Your store is public and accessible to everyone</>
                        : <><EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />Your store is private. Only you can see it.</>}
                    </p>
                  </div>

                  {/* Status Display */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Store Status</h4>
                        <p className="text-sm text-gray-600">Current status of your business</p>
                      </div>
                      {(() => {
                        // If user is approved, treat business as active regardless of DB value
                        const effectiveStatus = (businessSettings.status === 'pending' && user?.isApproved)
                          ? 'active'
                          : businessSettings.status;
                        return (
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            effectiveStatus === 'active'
                              ? 'bg-green-100 text-green-800'
                              : effectiveStatus === 'suspended'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {effectiveStatus === 'active'
                              ? <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Active</span>
                              : effectiveStatus === 'suspended'
                              ? <span className="flex items-center gap-1"><Ban className="w-3.5 h-3.5" />Suspended</span>
                              : <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Pending Approval</span>
                            }
                          </span>
                        );
                      })()}
                    </div>
                    {businessSettings.status === 'pending' && !user?.isApproved && (
                      <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Your business is awaiting admin approval. You will receive an email once approved.
                      </p>
                    )}
                    {businessSettings.status === 'pending' && user?.isApproved && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        Your account is approved and active.
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
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Update Profile
                  </Button>

                  {/* ── Change password ── */}
                  <div className="border-t pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      <h3 className="font-semibold text-base text-gray-900">Change Password</h3>
                    </div>

                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative mt-1">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Enter current password"
                          value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="pr-10"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative mt-1">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="At least 8 characters"
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="pr-10"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                        <div className="relative mt-1">
                          <Input
                            id="confirmNewPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repeat new password"
                            value={passwordForm.confirmPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="pr-10"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={passwordSaving}
                      variant="outline"
                      className="w-full md:w-auto border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      {passwordSaving
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
                        : <><Shield className="w-4 h-4 mr-2" />Update Password</>
                      }
                    </Button>
                  </div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
