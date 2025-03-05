import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-secondary">
      <Header />
      <div className="flex flex-1 pt-14 sm:pt-16">
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 w-full">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
