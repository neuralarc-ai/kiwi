import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

function DashboardContent() {
  const { isCollapsed, isMobile } = useSidebar()

  return (
    <div className="min-h-screen overflow-x-hidden max-w-full relative" style={{ backgroundColor: 'var(--page-background)' }}>
      <Sidebar />
      <div className={cn(
        "transition-all duration-300 overflow-x-hidden min-w-0 box-border",
        isMobile 
          ? "ml-0 w-full" // Full width on mobile, sidebar overlays
          : (isCollapsed ? "ml-20" : "ml-64")
      )}
      style={{
        width: isMobile ? '100%' : (isCollapsed ? 'calc(100% - 5rem)' : 'calc(100% - 16rem)')
      }}>
        <div className="w-full max-w-full overflow-x-hidden min-w-0 relative">
          <Navbar />
        </div>
        <main className="p-3 sm:p-4 md:p-6 overflow-x-hidden max-w-full w-full min-w-0 box-border">
          <div className="max-w-full overflow-x-hidden w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  )
}

