import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { ThemeToggle } from "../ui/theme-toggle"
import { LanguageToggle } from "../ui/language-toggle"
import { Button } from "../ui/button"
import { LogOut, Menu } from "lucide-react"
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 right-0 z-50 w-full md:w-[calc(100%-256px)] border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>
          <div className="text-xl font-bold truncate">{t("system.title")}</div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <Button
              variant="ghost"
              size={isMobile ? "sm" : "icon"}
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 md:ml-64">
          <div className="px-2 sm:px-4 md:px-6 py-20">
            <Outlet />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}