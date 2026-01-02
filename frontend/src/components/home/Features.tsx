import { motion } from 'framer-motion'
import { Users, Calendar, Briefcase, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: Users,
    title: 'Employee Directory',
    description: 'Comprehensive employee database with easy search and filter capabilities. Manage all employee information in one centralized location.',
    color: 'blue',
  },
  {
    icon: Calendar,
    title: 'Attendance Tracking',
    description: 'Automated attendance monitoring with calendar views and detailed reports. Track employee time and attendance effortlessly.',
    color: 'gray',
  },
  {
    icon: Briefcase,
    title: 'Recruitment Pipeline',
    description: 'Streamline your hiring process with a visual recruitment pipeline. Manage candidates from application to onboarding.',
    color: 'gray',
  },
  {
    icon: DollarSign,
    title: 'Payroll Management',
    description: 'Efficiently manage employee salaries, track payments, and handle payroll processing with ease. Keep all financial records organized.',
    color: 'green',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
            Everything You Need to Manage HR
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Powerful features designed to simplify your human resources management
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card variant="glass" className="h-full transition-transform duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3 sm:mb-4">
                    <feature.icon className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

