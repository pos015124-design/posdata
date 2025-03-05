import { LogOut } from "lucide-react"
import { Button } from "./ui/button"
import { ThemeToggle } from "./ui/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useIsMobile } from "@/hooks/useMobile"

export function Header() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  
  const handleLogout = () => {
    logout()
    navigate("/login")
  }
  
  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
        <div className="text-lg sm:text-xl font-bold truncate">Home</div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "icon"}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
