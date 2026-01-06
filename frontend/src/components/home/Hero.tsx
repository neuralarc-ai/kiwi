import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Briefcase, DollarSign, Shield } from 'lucide-react'
import RoyalBrandTitle from './RoyalBrandTitle'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-[hsl(var(--palette-light-blue))] overflow-hidden">
      {/* Background decoration - Soft Aqua Blue */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--palette-light-blue)) 0%, hsl(var(--palette-light-blue) / 0.5) 100%)',
          }}
        ></div>
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--palette-light-blue) / 0.5) 0%, hsl(var(--palette-light-blue)) 100%)',
          }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          <div className="mb-12 flex justify-center">
            <RoyalBrandTitle 
              size="xl" 
              showSubtitle={true} 
              variant="hero"
              className="relative"
            />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 mb-8 sm:mb-10 max-w-3xl mx-auto px-4"
          >
            Streamline your human resources operations with our comprehensive,
            user-friendly HR management platform. Manage employees, track attendance,
            and boost productivity all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/login">
              <Button size="lg" className="group">
                Get Started
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline">
                Sign Up Free
              </Button>
            </Link>
          </motion.div>

          {/* Feature Icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto px-4"
          >
            {[
              { icon: Users, label: 'Employee Management' },
              { icon: Briefcase, label: 'Recruitment' },
              { icon: DollarSign, label: 'Payroll Management' },
              { icon: Shield, label: 'Secure & Reliable' },
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-2 sm:mb-3" style={{ background: 'hsl(var(--palette-yellow) / 0.2)', border: '1px solid hsl(var(--palette-yellow) / 0.3)' }}>
                  <feature.icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: 'hsl(var(--palette-yellow))' }} />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 text-center break-words">
                  {feature.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

