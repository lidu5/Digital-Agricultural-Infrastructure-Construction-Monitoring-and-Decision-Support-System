# DIPCMT-DSS Frontend

Digital Agricultural Infrastructure Construction Monitoring and Decision Support System - Frontend Application

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS 4
- **Routing**: React Router DOM
- **Charts**: Recharts
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Input.jsx
│   │   └── Table.jsx
│   └── Layout.jsx       # Main layout with navigation
├── pages/
│   ├── Login.jsx        # Authentication page
│   ├── Dashboard.jsx    # Main dashboard with KPIs
│   ├── Projects.jsx     # Project list with filters
│   ├── ProjectDetail.jsx # Detailed project view
│   ├── ProjectMapPage.jsx # Map view of projects
│   ├── Contracts.jsx    # Contract list
│   ├── ContractDetail.jsx # Detailed contract view
│   ├── Monitoring.jsx   # Progress, issues, documents
│   ├── Alerts.jsx       # System alerts
│   └── Admin.jsx        # Administration module
├── api.js               # Axios instance with auth interceptor
├── App.jsx              # Main app with routing
└── main.jsx             # Entry point
```

## Features

### 1. Dashboard
- KPI cards (Total Projects, On Track, Delayed, Critical)
- Project status distribution (Pie chart)
- Average progress metrics (Bar chart)
- Recent alerts feed

### 2. Projects Module
- **List View**: Filterable table with search, region, and status filters
- **Map View**: Interactive Leaflet map with color-coded project markers
- **Detail View**: 
  - Project information and location
  - Beneficiary data
  - Progress tracking with trend charts
  - Construction milestones timeline
  - Issues and problems log
  - Document repository

### 3. Contracts Module
- Contract list with status filtering
- **Detail View**:
  - Contract information (contractor, consultant, dates)
  - Payment summary with progress bars
  - Variation Orders (VOs)
  - Extensions of Time (EoTs)
  - Interim Payment Certificates (IPCs)
  - Claims management

### 4. Monitoring Module
- **Progress Records**: Recent progress entries with visual indicators
- **Issues**: Problem tracking with status workflow
- **Documents**: Project document repository

### 5. Alerts Module
- Severity-based filtering (Critical, High, Medium, Low)
- Status filtering (Open, Acknowledged, Resolved)
- Alert cards with project and contract references

### 6. Admin Module
- Placeholder for user management
- Organization management
- Lookup table management
- System settings

## Running the Application

### Development
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## API Integration

The frontend expects the backend API to be running at `http://localhost:8000/api`.

### Authentication
- Uses Token-based authentication
- Token stored in localStorage
- Axios interceptor automatically adds `Authorization: Token <token>` header

### Expected API Endpoints

#### Auth
- `POST /auth/token/` - Login

#### Projects
- `GET /projects/projects/` - List projects
- `GET /projects/projects/:id/` - Project detail
- `GET /projects/milestones/?project=:id` - Project milestones

#### Geography
- `GET /geography/regions/` - List regions

#### Contracts
- `GET /contracts/contracts/` - List contracts
- `GET /contracts/contracts/:id/` - Contract detail
- `GET /contracts/variation-orders/?contract=:id` - Variation orders
- `GET /contracts/extensions-of-time/?contract=:id` - Extensions of time
- `GET /contracts/ipcs/?contract=:id` - Payment certificates
- `GET /contracts/claims/?contract=:id` - Claims

#### Monitoring
- `GET /monitoring/progress-records/` - Progress records
- `GET /monitoring/progress-records/?project=:id` - Project progress
- `GET /monitoring/issues/` - Issues
- `GET /monitoring/issues/?project=:id` - Project issues
- `GET /monitoring/documents/` - Documents
- `GET /monitoring/documents/?project=:id` - Project documents
- `GET /monitoring/alerts/` - Alerts

## Map Integration

The map component supports two coordinate formats:
1. **PostGIS format**: `gps_location.coordinates` (GeoJSON)
2. **Legacy format**: `latitude` and `longitude` fields

Projects with GPS coordinates are displayed as color-coded markers based on status:
- **Green**: On Track
- **Yellow**: Delayed
- **Red**: Critical
- **Blue**: Completed

## Role-Based Access

The system supports three user roles:
- **Regional Bureau Manager**: Region-scoped access
- **National Viewer**: Read-only across all regions
- **System Administrator**: Full access

(Note: Role-based filtering is handled by the backend API)

## UI Components

All UI components follow a consistent design system:

- **Button**: Primary, Secondary, Outline, Danger, Ghost variants
- **Card**: Container with Header, Content, and Title subcomponents
- **Badge**: Status indicators with Success, Warning, Danger, Info variants
- **Input/Select**: Form inputs with label and error support
- **Table**: Responsive table with Header, Body, Row, Head, Cell components

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ support required
- Leaflet map requires WebGL support

## Notes

- The old `ProjectMap.jsx` component can be removed as it's replaced by `ProjectMapPage.jsx`
- All dates are formatted using browser's locale
- Currency is formatted as Ethiopian Birr (ETB)
- Progress bars are capped at 100% for display purposes
