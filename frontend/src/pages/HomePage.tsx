import HomeNavbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import Features from '@/components/home/Features'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden max-w-full" style={{ backgroundColor: 'var(--page-background)' }}>
      <HomeNavbar />
      <main className="overflow-x-hidden max-w-full">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  )
}

