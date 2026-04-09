# Retail Agentic AI — Frontend

A production-grade React + Vite frontend application with dark theme and advanced features for retail analytics.

## 🚀 Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🏗️ Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Wizard/
│   │   │   ├── StepUpload.tsx       # CSV drag-drop upload
│   │   │   ├── StepPreview.tsx      # Data preview + segment selection
│   │   │   ├── StepSelectModels.tsx # Model selection
│   │   │   ├── StepExecute.tsx      # Execution with skeleton loaders
│   │   │   └── StepResults.tsx      # Results dashboard
│   │   ├── Dashboard/
│   │   │   ├── KPICard.tsx          # KPI metric cards
│   │   │   ├── MetricsChart.tsx     # Recharts wrapper (line/bar/area)
│   │   │   ├── SegmentComparison.tsx # Old vs new segments chart
│   │   │   └── UrgencyMatrix.tsx    # Inventory urgency matrix
│   │   ├── Common/
│   │   │   ├── Navbar.tsx           # Top navigation
│   │   │   ├── Sidebar.tsx          # Left sidebar
│   │   │   ├── SkeletonCard.tsx     # Loading skeleton components
│   │   │   └── Button.tsx           # Reusable button component
│   ├── pages/
│   │   ├── Home.tsx                 # Landing page
│   │   ├── Wizard.tsx               # Multi-step wizard page
│   │   └── Dashboard.tsx            # Live dashboard page
│   ├── hooks/
│   │   ├── useWizard.ts             # Wizard navigation hook
│   │   └── useDataProcessing.ts    # Model execution hook
│   ├── store/
│   │   └── wizardStore.ts           # Zustand global state
│   ├── utils/
│   │   ├── csvParser.ts             # PapaParse CSV utilities
│   │   └── chartUtils.ts           # Chart helpers + mock data
│   ├── App.tsx                      # Root component with router
│   └── main.tsx                     # Entry point
```

## 🎨 Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 + Vite | Fast modern frontend |
| TypeScript | Type safety |
| TailwindCSS v4 | Dark theme styling |
| Framer Motion | Animations & transitions |
| Recharts | Data visualizations |
| React Router v6 | SPA routing |
| Zustand | Global state management |
| PapaParse | CSV parsing |
| Lucide React | Icons |

## 🌙 Design System

- **Dark Navy base**: `#0a0e1a`
- **Glassmorphism panels**: `bg-white/5 backdrop-blur-12px`
- **Accent colors**: Purple (`#a855f7`), Cyan (`#06b6d4`), Orange (`#f97316`)
- **Skeleton loaders**: Pulse animations while data renders

## 📊 Features

### Multi-Step Wizard
1. **Upload**: CSV drag-drop with validation
2. **Preview**: Data table + customer segment selection (old vs new RFM segments)
3. **Select Models**: Choose from 5 AI models
4. **Execute**: Real-time progress with skeleton loaders
5. **Results**: Tabbed dashboard with all visualizations

### Live Dashboard
- KPI cards (Revenue, Fill Rate, Inventory Turns, Active Customers, AOV, Stockout)
- Demand forecast area chart (12-month)
- Revenue segment comparison (old vs new segments)
- Inventory reorder urgency matrix
- Pricing intelligence charts

### AI Models
- 📈 **Pricing Intelligence** — Dynamic pricing optimization
- 👥 **Customer Churn** — RFM segmentation + churn scoring  
- 📊 **Demand Forecasting** — Prophet-based time series
- 🛒 **Market Basket Analysis** — Association rules
- 📦 **Inventory Reorder** — ABC classification + safety stock
