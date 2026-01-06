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
      const isMobileView = window.innerWidth < 1024 // lg breakpoint
      setIsMobile(isMobileView)
      if (!isMobileView) {
        setIsMobileOpen(false) // Close mobile sidebar on desktop
      }
    }

    // Check immediately on mount
    checkMobile()
    
    // Also check after a short delay to ensure proper detection
    const timeoutId = setTimeout(checkMobile, 100)
    
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(timeoutId)
    }
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

