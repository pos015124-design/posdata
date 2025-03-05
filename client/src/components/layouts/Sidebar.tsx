import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Receipt,
  UserCircle,
  Settings,
} from "lucide-react"

export function Sidebar() {
  const location = useLocation()
  const { hasPermission } = useAuth()
  const { t } = useLanguage()

  // Define all possible links with their required permissions
  const allLinks = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard, permission: "dashboard" },
    { href: "/pos", label: t("nav.pos"), icon: ShoppingCart, permission: "pos" },
    { href: "/inventory", label: t("nav.inventory"), icon: Package, permission: "inventory" },
    { href: "/customers", label: t("nav.customers"), icon: UserCircle, permission: "customers" },
    { href: "/staff", label: t("nav.staff"), icon: Users, permission: "staff" },
    { href: "/expenses", label: t("nav.expenses"), icon: Receipt, permission: "settings" },
    { href: "/reports", label: t("nav.reports"), icon: BarChart3, permission: "reports" },
    { href: "/settings", label: t("nav.settings"), icon: Settings, permission: "settings" },
  ]

  // Define the permission type
  type Permission = "dashboard" | "pos" | "inventory" | "customers" | "staff" | "reports" | "settings";
  
  // Filter links based on user permissions
  const links = allLinks.filter(link => {
    return hasPermission(link.permission as Permission);
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-14 md:h-16 items-center border-b px-4 md:px-6">
        <h1 className="text-base md:text-lg font-bold">{t("nav.menu")}</h1>
      </div>
      <div className="flex flex-col p-3 md:p-4 overflow-y-auto">
        <nav className="space-y-1 md:space-y-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors hover:bg-accent",
                location.pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}