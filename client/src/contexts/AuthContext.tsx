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
  register: (email: string, password: string, name?: string) => Promise<void>;
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

      // Check if user is approved
      if (response.user.role !== 'admin' && response.user.isApproved === false) {
        throw new Error("Your account is pending approval. Please contact an administrator.");
      }

      localStorage.setItem("accessToken", response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem("refreshToken", response.refreshToken);
      }
      
      console.log("Login successful, user data:", response.user);
      console.log("User permissions:", response.user.permissions);
      
      localStorage.setItem("user", JSON.stringify(response.user));
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error) {
      handleAuthError(error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await apiRegister(email, password, name);
      console.log("Register response:", response);
      
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
        console.log("Not refreshing user data - not authenticated");
        return;
      }
      
      console.log("Refreshing user data from server");
      const response = await getCurrentUser();
      
      if (response?.user) {
        console.log("User data refreshed:", response.user);
        console.log("Permissions:", response.user.permissions);
        
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
      console.log(`Permission check for ${permission}: No user, returning false`);
      return false;
    }
    
    // Check the specific permission for all users, including admins
    const hasPermission = user.permissions?.[permission] || false;
    console.log(`Permission check for ${permission}: User has permission: ${hasPermission}`, user.permissions);
    return hasPermission;
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