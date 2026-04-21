import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Receipt,
  UserCircle,
  Settings,
  Store,
  TrendingUp,
  Zap,
  LogOut,
  Shield,
  Building,
  Globe,
  Activity
} from "lucide-react"

export function Sidebar() {
  const location = useLocation()
  const { hasPermission, logout, user } = useAuth()
  const { t } = useLanguage()

  // Define super admin specific links
  const superAdminLinks = [
    {
      href: "/super-admin",
      label: "Platform Overview",
      icon: Shield,
      permission: "platformManagement",
      badge: "Admin",
      gradient: "from-red-500 to-pink-600"
    },
    {
      href: "/business-management",
      label: "Business Management",
      icon: Building,
      permission: "tenantManagement",
      badge: null,
      gradient: "from-purple-500 to-indigo-600"
    },
    // Platform Analytics and Platform Settings removed from sidebar
  ];

  // Define all possible links with their required permissions
  const allLinks = [
    {
      href: "/",
      label: t("nav.dashboard"),
      icon: LayoutDashboard,
      permission: "dashboard",
      badge: null,
      gradient: "from-blue-500 to-purple-600"
    },
    {
      href: "/pos",
      label: t("nav.pos"),
      icon: ShoppingCart,
      permission: "pos",
      badge: "Hot",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      href: "/inventory",
      label: t("nav.inventory"),
      icon: Package,
      permission: "inventory",
      badge: null,
      gradient: "from-orange-500 to-red-600"
    },
    {
      href: "/customers",
      label: t("nav.customers"),
      icon: UserCircle,
      permission: "customers",
      badge: null,
      gradient: "from-pink-500 to-rose-600"
    },
    {
      href: "/staff",
      label: t("nav.staff"),
      icon: Users,
      permission: "staff",
      badge: null,
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      href: "/expenses",
      label: t("nav.expenses"),
      icon: Receipt,
      permission: "settings",
      badge: null,
      gradient: "from-yellow-500 to-orange-600"
    },
    {
      href: "/reports",
      label: t("nav.reports"),
      icon: BarChart3,
      permission: "reports",
      badge: "New",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      href: "/settings",
      label: t("nav.settings"),
      icon: Settings,
      permission: "settings",
      badge: null,
      gradient: "from-gray-500 to-slate-600"
    },
  ]

  // Define the permission type
  type Permission = "dashboard" | "pos" | "inventory" | "customers" | "staff" | "reports" | "settings" | "platformManagement" | "tenantManagement" | "systemSettings";

  // Combine super admin links with regular links based on user role
  // Always show Dashboard (/) as the first link, even for super admins
  let availableLinks = allLinks;
  if (user?.role === 'super_admin') {
    // Move Business Management to appear under Reports
    const businessManagementLink = superAdminLinks.find(link => link.href === '/business-management');
    const reportsIdx = allLinks.findIndex(link => link.href === '/reports');
    availableLinks = [
      ...allLinks.slice(0, reportsIdx + 1),
      ...(businessManagementLink ? [businessManagementLink] : []),
      ...allLinks.slice(reportsIdx + 1)
    ];
  }

  // Filter links based on user permissions
  const links = availableLinks.filter(link => {
    return hasPermission(link.permission as Permission);
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-card/95 backdrop-blur-md border-r border-border/50 shadow-modern animate-slide-up">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient">Dukani</h1>
            <p className="text-xs text-muted-foreground">Retail System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
          <div className="h-10 w-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-modern p-4">
        <nav className="space-y-2">
          {links.map(({ href, label, icon: Icon, badge, gradient }) => {
            const isActive = location.pathname === href
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary-foreground/20"
                    : `bg-gradient-to-r ${gradient} text-white group-hover:scale-110`
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                    {badge}
                  </span>
                )}
                {isActive && (
                  <div className="h-2 w-2 bg-primary-foreground rounded-full animate-pulse"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Quick Stats */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Today's Sales</span>
          </div>
          <p className="text-2xl font-bold text-primary">$2,847</p>
          <p className="text-xs text-muted-foreground">+12% from yesterday</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}