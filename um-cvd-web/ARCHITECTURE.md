# Project Architecture

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── dashboard/               # Assessment dashboard
│   ├── login/                   # Login page
│   ├── layout.tsx              # Root layout with navigation
│   └── page.tsx                # Landing page
├── components/                   # Reusable components
│   ├── layout/                  # Layout components
│   │   └── Navigation.tsx       # Main navigation
│   ├── sections/                # Page sections
│   │   ├── HeroSection.tsx     # Hero section with CTA
│   │   └── AssessmentForm.tsx  # Multi-step assessment form
│   ├── steps/                   # Form step components
│   │   ├── PatientInfoStep.tsx
│   │   ├── DemographicStep.tsx
│   │   ├── LaboratoryStep.tsx
│   │   ├── TreatmentStep.tsx
│   │   ├── ModelStep.tsx
│   │   └── SummaryStep.tsx
│   ├── CMLRiskAnalysis.tsx     # Analysis results component
│   ├── FormFields.tsx          # Reusable form fields
│   ├── Progress.tsx            # Progress indicators
│   └── Stepper.tsx             # Step navigation
├── hooks/                       # Custom React hooks
│   └── usePatientForm.ts       # Form state management
├── types/                       # TypeScript type definitions
│   └── index.ts                # All type definitions
├── utils/                       # Utility functions
│   └── validation.ts           # Form validation logic
├── constants/                   # Application constants
│   └── steps.ts                # Step definitions and titles
└── lib/                        # External library configurations
```

## 🚀 Performance Optimizations

### 1. Code Splitting & Lazy Loading
- **CMLRiskAnalysis** component is lazy-loaded to reduce initial bundle size
- Heavy analysis components only load when needed
- Suspense boundaries with loading states

### 2. React Optimizations
- **React.memo()** for preventing unnecessary re-renders
- **useCallback()** for stable function references
- Optimized form state management with custom hooks

### 3. Bundle Optimization
- Next.js Turbopack for faster builds
- Tree shaking for unused code elimination
- Optimized imports and exports

## 🏗️ Architecture Patterns

### 1. Separation of Concerns
- **Pages**: Route-level components
- **Sections**: Large UI sections
- **Components**: Reusable UI elements
- **Hooks**: Business logic and state management
- **Utils**: Pure functions and helpers
- **Types**: TypeScript definitions

### 2. State Management
- Custom `usePatientForm` hook for form state
- Local state for UI interactions
- Props drilling minimized with proper component structure

### 3. Form Handling
- Centralized validation logic
- Type-safe form state
- Error handling and user feedback
- File upload with JSON parsing

## 📱 Page Structure

### Landing Page (`/`)
- Hero section with features
- Call-to-action buttons
- Feature highlights
- Clean, marketing-focused design

### Dashboard (`/dashboard`)
- Multi-step assessment form
- Progress tracking
- File upload functionality
- Analysis results display

### Login (`/login`)
- Secure authentication form
- Password reset functionality
- Professional medical portal design

## 🔧 Development Features

### TypeScript
- Full type safety
- Interface definitions for all data structures
- Generic types for reusable components

### Styling
- Tailwind CSS for utility-first styling
- Consistent design system
- Responsive design patterns

### Navigation
- Client-side routing with Next.js
- Active state management
- Mobile-responsive navigation

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## 📊 Performance Metrics

- **Initial Load**: Optimized with code splitting
- **Form Interactions**: Smooth with memoized components
- **File Uploads**: Efficient JSON parsing
- **Navigation**: Fast client-side routing

## 🔒 Security Features

- Input validation and sanitization
- Secure file upload handling
- Type-safe data processing
- Error boundary implementation

## 🎯 Future Improvements

- [ ] Add unit tests
- [ ] Implement error boundaries
- [ ] Add loading skeletons
- [ ] Optimize images and assets
- [ ] Add PWA features
- [ ] Implement caching strategies
