import HomeNavbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import Features from '@/components/home/Features'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden max-w-full">
      <HomeNavbar />
      <main className="overflow-x-hidden max-w-full">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  )
}

