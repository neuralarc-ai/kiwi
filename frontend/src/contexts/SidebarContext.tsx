import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  isMobile: boolean
  isMobileOpen: boolean
  toggleSidebar: () => void
  closeMobileSidebar: () => void
  openMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false) // Close mobile sidebar on desktop
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(prev => !prev)
    } else {
      setIsCollapsed(prev => !prev)
    }
  }

  const closeMobileSidebar = () => {
    setIsMobileOpen(false)
  }

  const openMobileSidebar = () => {
    setIsMobileOpen(true)
  }

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      isMobile, 
      isMobileOpen,
      toggleSidebar, 
      closeMobileSidebar,
      openMobileSidebar
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

