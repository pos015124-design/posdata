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
import { useAuth } from "./contexts/AuthContext"
import HelpSystem from "./components/HelpSystem"
import UserOnboarding from "./components/UserOnboarding"

function RedirectBasedOnRole() {
  const { user, hasPermission } = useAuth();
  
  // If user is a clerk, redirect to POS if they have permission, otherwise to the first permitted page
  if (user?.role === "clerk") {
    if (hasPermission("pos")) {
      return <Navigate to="/pos" replace />;
    } else if (hasPermission("customers")) {
      return <Navigate to="/customers" replace />;
    } else if (hasPermission("inventory")) {
      return <Navigate to="/inventory" replace />;
    } else {
      // Fallback to dashboard
      return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
    }
  }
  
  // For admins, show the dashboard
  return <PermissionRoute requiredPermission="dashboard"><Dashboard /></PermissionRoute>;
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider defaultLanguage="en" storageKey="app-language">
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<RedirectBasedOnRole />} />
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