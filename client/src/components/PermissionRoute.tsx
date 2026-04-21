import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type PermissionRouteProps = {
  children: React.ReactNode;
  requiredPermission: 'dashboard' | 'pos' | 'inventory' | 'customers' | 'staff' | 'reports' | 'settings' | 'platformManagement' | 'tenantManagement' | 'systemSettings';
};

export function PermissionRoute({ children, requiredPermission }: PermissionRouteProps) {
  const { isAuthenticated, user, hasPermission } = useAuth();
  const location = useLocation();

  // Check if user has the required permission

  // First check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Then check if user has the required permission
  if (!hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}