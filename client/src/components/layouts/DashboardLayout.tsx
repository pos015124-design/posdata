import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { ThemeToggle } from "../ui/theme-toggle"
import { LanguageToggle } from "../ui/language-toggle"
import { Button } from "../ui/button"
import { LogOut, Menu, Bell } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useNavigate } from "react-router-dom"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Footer } from "../Footer"
import { useIsMobile } from "@/hooks/useMobile"

export function DashboardLayout() {
  const { logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-primary/5">
      {/* Enhanced Header */}
      <header className="fixed top-0 right-0 z-50 w-full md:w-[calc(100%-256px)] border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Mobile Menu */}
          <div className="flex items-center gap-4 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-primary/10" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-0">
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold text-gradient truncate">
              {t("system.title")}
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-primary">Live</span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-primary/10 transition-colors"
            >
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-xs text-destructive-foreground font-bold">3</span>
              </div>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Button>

            <LanguageToggle />
            <ThemeToggle />

            <Button
              variant="ghost"
              size={isMobile ? "sm" : "icon"}
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
              {isMobile && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 pt-16 min-h-screen">
          <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced Footer */}
      <footer className="md:ml-64 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <Footer />
      </footer>
    </div>
  )
}