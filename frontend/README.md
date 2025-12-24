# KIWI - HR Management System

A high-end, Dribbble-level HR Management System UI built with modern technologies and premium design principles.

## 🎨 Design Features

- **Glassmorphism**: Smooth glass effects with backdrop blur
- **Neumorphism**: Soft shadows and depth
- **Modern SaaS Dashboard**: Professional, clean interface
- **Premium Typography**: Beautiful Inter font family
- **Micro-animations**: Smooth transitions powered by Framer Motion
- **Gradient Accents**: Pastel gradients throughout
- **Animated Skeleton Loaders**: Beautiful loading states
- **Theme Switcher**: Light/Dark mode with smooth transitions

## 🚀 Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **ShadCN UI** components (custom implementation)
- **Framer Motion** for animations
- **Lucide React** for icons
- **React Router** for navigation
- **Vite** for build tooling

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Base UI components (Button, Card, Input, etc.)
│   ├── layout/          # Layout components (Sidebar, Navbar)
│   ├── NotificationCenter.tsx
│   └── ThemeSwitcher.tsx
├── contexts/
│   └── ThemeContext.tsx # Theme management
├── layouts/
│   └── DashboardLayout.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardHome.tsx
│   ├── EmployeeDirectory.tsx
│   ├── AttendanceTracking.tsx
│   ├── RecruitmentPage.tsx
│   ├── PerformanceReview.tsx
│   └── SettingsPage.tsx
├── lib/
│   └── utils.ts         # Utility functions
├── App.tsx
├── main.tsx
└── index.css
```

## 🎯 Pages & Features

### 1. **Login Page**
- Full-screen gradient background
- Glassmorphism card design
- Animated background elements
- Smooth entrance animations

### 2. **Dashboard Home**
- Stats cards with gradient icons
- Chart placeholders with skeleton loaders
- Recent activity feed
- Hover effects and micro-animations

### 3. **Employee Directory**
- Search and filter functionality (UI only)
- Employee card grid
- Pagination controls
- Responsive layout

### 4. **Attendance Tracking**
- Calendar view with skeleton
- Attendance stats cards
- Recent records list
- Status indicators

### 5. **Recruitment Page**
- Pipeline visualization (Kanban-style)
- Job postings grid
- Candidate list
- Search and filters

### 6. **Performance Review**
- Performance metrics dashboard
- Chart placeholders
- Department performance bars
- Top performers list

### 7. **Settings Page**
- Profile management
- Notification preferences
- Theme customization
- Security settings

### 8. **Layout Components**
- **Sidebar**: Collapsible navigation with active state indicators
- **Navbar**: Search, notifications, theme switcher
- **Notification Center**: Dropdown with skeleton notifications

## 🎨 Design Principles

- **No Dummy Data**: All pages use skeleton loaders and placeholders
- **Consistent Spacing**: 6-unit grid system
- **Color Palette**: Purple/Pink gradients with dark theme support
- **Animations**: Subtle, purposeful micro-interactions
- **Accessibility**: Semantic HTML and proper contrast ratios

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 Notes

- This is a **UI-only** implementation
- No backend integration
- No API calls
- All data is represented with skeleton loaders
- Ready for backend integration

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme.

### Animations
Modify Framer Motion animations in individual components.

### Theme
Theme variables are defined in `src/index.css` under `:root` and `.light` selectors.

## 📄 License

This project is created for demonstration purposes.

