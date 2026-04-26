import { createContext, useContext, useState, ReactNode } from "react";
import { login as apiLogin, register as apiRegister, getCurrentUser } from "@/api/auth";

type Permissions = {
  dashboard: boolean;
  pos: boolean;
  inventory: boolean;
  customers: boolean;
  staff: boolean;
  reports: boolean;
  settings: boolean;
};

type User = {
  email: string;
  role: string;
  isApproved?: boolean;
  permissions?: Permissions;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, businessName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: keyof Permissions) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("accessToken");
  });

  const [user, setUser] = useState<User | null>(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  });

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password);
      
      if (!response?.accessToken || !response?.user) {
        throw new Error("Invalid response from server");
      }


      localStorage.setItem("accessToken", response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      

      
      localStorage.setItem("user", JSON.stringify(response.user));
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error) {
      handleAuthError(error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string, businessName?: string) => {
    try {
      const response = await apiRegister(email, password, name, businessName);

      
      // For registration, we don't expect an access token because new users need approval
      // We just return the success message to the user
      if (!response.success) {
        throw new Error("Registration failed");
      }
      
      // Don't set the user or authentication state since the user needs approval
      return response;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleAuthError = (error: unknown) => {
    console.error("Auth error:", error);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  // Function to refresh user data from the server
  const refreshUser = async () => {
    try {
      if (!isAuthenticated) {
  
        return;
      }
      
      const response = await getCurrentUser();
      
      if (response?.user) {
        
        // Store the updated user data
        localStorage.setItem("user", JSON.stringify(response.user));
        setUser(response.user);
        
        // Force a re-render by updating the state
        setIsAuthenticated(true);
      } else {
        console.warn("No user data returned from server during refresh");
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      // Don't log out the user on refresh errors
    }
  };

  // Function to check if user has a specific permission
  const hasPermission = (permission: keyof Permissions): boolean => {
    if (!user) {
      return false;
    }
    
    // Admin and super_admin have all permissions by default
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true;
    }
    
    // Check the specific permission for other users
    const hasPerm = user.permissions?.[permission];
    
    // If permissions object exists, return the value, otherwise false
    return hasPerm === true;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      register,
      logout,
      refreshUser,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}