import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "./components/ui/table";
import { useState } from "react";

function PlatformSettings() {
  const [tab, setTab] = useState("general");
  return (
    <div style={{maxWidth: 900, margin: "40px auto", padding: 24}}>
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <h2 className="text-lg font-semibold mb-2">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Platform Name</label>
                  <Input placeholder="Dukani Multi-Vendor" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Support Email</label>
                  <Input placeholder="support@dukani.com" />
                </div>
                <div>
                  <Button variant="default">Save Changes</Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="branding">
              <h2 className="text-lg font-semibold mb-2">Branding</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Logo</label>
                  <Input type="file" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Primary Color</label>
                  <Input type="color" defaultValue="#3b82f6" />
                </div>
                <div>
                  <Button variant="default">Save Branding</Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="integrations">
              <h2 className="text-lg font-semibold mb-2">Integrations</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Gateway</label>
                  <Input placeholder="e.g. Stripe, PayPal" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Analytics Service</label>
                  <Input placeholder="e.g. Google Analytics" />
                </div>
                <div>
                  <Button variant="default">Save Integrations</Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="security">
              <h2 className="text-lg font-semibold mb-2">Security</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Password Policy</label>
                  <Input placeholder="e.g. Minimum 8 characters, 1 symbol" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">2FA Required</label>
                  <Input type="checkbox" />
                </div>
                <div>
                  <Button variant="default">Save Security Settings</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformAnalytics() {
  // Example analytics data
  const analytics = [
    { metric: "Total Vendors", value: 42 },
    { metric: "Total Sales", value: "$120,000" },
    { metric: "Active Users", value: 350 },
    { metric: "Transactions (30d)", value: 2100 },
    { metric: "Top Category", value: "Groceries" },
  ];
  return (
    <div style={{maxWidth: 900, margin: "40px auto", padding: 24}}>
      <Card>
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.metric}</TableCell>
                  <TableCell>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-8">
            <Button variant="outline">Export Analytics</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { DashboardLayout } from "./components/layouts/DashboardLayout"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { PermissionRoute } from "./components/PermissionRoute"
import { POS } from "./pages/POS"
import { Dashboard } from "./pages/Dashboard"
import { Inventory } from "./pages/Inventory"
import { Staff } from "./pages/Staff"
import { Reports } from "./pages/Reports"
import { Expenses } from "./pages/Expenses"
import { Customers } from "./pages/Customers"
import { Settings } from "./pages/Settings"
import Unauthorized from "./pages/Unauthorized"
import LandingPage from "./pages/LandingPage"
import BusinessRegistration from "./pages/BusinessRegistration"
import SuperAdminDashboard from "./pages/SuperAdminDashboard"
import BusinessManagement from "./pages/BusinessManagement"
import BusinessDashboard from "./pages/BusinessDashboard"
import { useAuth } from "./contexts/AuthContext"
<<<<<<< HEAD
import WaitingApproval from "./pages/WaitingApproval"
=======
import HelpSystem from "./components/HelpSystem"
import UserOnboarding from "./components/UserOnboarding"
>>>>>>> 77ffa9ad4df0a8406dc926a295435109c208a8f0

function RedirectBasedOnRole() {
  const { user, hasPermission, logout } = useAuth();

  // Super admin goes to business dashboard
  if (user?.role === "super_admin") {
    return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
  }

  // Business admin goes to business dashboard
  // If user is not approved, show waiting screen (allow login, block access)
  if (user && user.isApproved === false) {
    return <WaitingApproval onLogout={logout} />;
  }

  if (user?.role === "super_admin") {
    return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
  }

  if (user?.role === "business_admin") {
    return <PermissionRoute requiredPermission="dashboard"><BusinessDashboard /></PermissionRoute>;
  }

  // If user is a clerk/staff, redirect to POS if they have permission, otherwise to the first permitted page
  if (user?.role === "clerk" || user?.role === "staff") {
    if (hasPermission("pos")) {
      return <PermissionRoute requiredPermission="pos"><POS /></PermissionRoute>;
    }
    // Fallback to dashboard
    return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
  }

  return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
  // For legacy admin role, show the regular dashboard
  return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider defaultLanguage="en" storageKey="app-language">
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/business-register" element={<BusinessRegistration />} />

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Dashboard Routes */}
              <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<RedirectBasedOnRole />} />

                {/* Super Admin Routes */}
                <Route path="super-admin" element={
                  <PermissionRoute requiredPermission="platformManagement">
                    <SuperAdminDashboard />
                  </PermissionRoute>
                } />
                <Route path="business-management" element={
                  <PermissionRoute requiredPermission="tenantManagement">
                    <BusinessManagement />
                  </PermissionRoute>
                } />

                {/* Business Admin Routes */}
                <Route path="business-dashboard" element={
                  <PermissionRoute requiredPermission="dashboard">
                    <BusinessDashboard />
                  </PermissionRoute>
                } />
                <Route path="pos" element={
                  <PermissionRoute requiredPermission="pos">
                    <POS />
                  </PermissionRoute>
                } />
                <Route path="inventory" element={
                  <PermissionRoute requiredPermission="inventory">
                    <Inventory />
                  </PermissionRoute>
                } />
                <Route path="staff" element={
                  <PermissionRoute requiredPermission="staff">
                    <Staff />
                  </PermissionRoute>
                } />
                <Route path="reports" element={
                  <PermissionRoute requiredPermission="reports">
                    <Reports />
                  </PermissionRoute>
                } />
                <Route path="expenses" element={
                  <PermissionRoute requiredPermission="settings">
                    <Expenses />
                  </PermissionRoute>
                } />

                {/* Platform routes (stubs) */}
                <Route path="platform-settings" element={<PlatformSettings />} />
                <Route path="platform-analytics" element={<PlatformAnalytics />} />
                <Route path="customers" element={
                  <PermissionRoute requiredPermission="customers">
                    <Customers />
                  </PermissionRoute>
                } />
                <Route path="settings" element={
                  <PermissionRoute requiredPermission="settings">
                    <Settings />
                  </PermissionRoute>
                } />
              </Route>
            </Routes>
            <Toaster />
            <HelpSystem />
            <UserOnboarding />
          </Router>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App