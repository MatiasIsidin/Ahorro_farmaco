import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { useEffect } from 'react';
import { trackPageView } from './lib/analytics';
import { SkeletonDashboard } from './components/LoadingSkeleton';
import { Loader } from 'lucide-react';

// Layout (no lazy — siempre visible)
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';

// ── Lazy pages — code splitting por ruta ─────────────────────
const Welcome        = lazy(() => import('./pages/Welcome'));
const Onboarding     = lazy(() => import('./pages/Onboarding'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Compare        = lazy(() => import('./pages/Compare'));
const Cart           = lazy(() => import('./pages/Cart'));
const Family         = lazy(() => import('./pages/Family'));
const Savings        = lazy(() => import('./pages/Savings'));
const AddMedication  = lazy(() => import('./pages/AddMedication'));
const Medications    = lazy(() => import('./pages/Medications'));
const Alerts         = lazy(() => import('./pages/Alerts'));
const Recipes        = lazy(() => import('./pages/Recipes'));
const Settings       = lazy(() => import('./pages/Settings'));
const Profile        = lazy(() => import('./pages/Profile'));
const Reports        = lazy(() => import('./pages/Reports'));
const Premium        = lazy(() => import('./pages/Premium'));
const MedicationDetail = lazy(() => import('./pages/MedicationDetail'));

// ── Fallback de carga por página ─────────────────────────────
function PageLoader() {
  return (
    <div style={{ padding: '2rem' }}>
      <SkeletonDashboard />
    </div>
  );
}

// ── Analytics: track page views ──────────────────────────────
function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

// ── Layout Wrapper ───────────────────────────────────────────
const AppLayout = ({ children }) => {
  const { state } = useApp();
  return (
    <div className="app-layout">
      {state.user && <Sidebar />}
      <main className="app-main">
        {state.user && <Topbar />}
        <div className="app-content">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </div>
        {state.user && <BottomNav />}
      </main>
    </div>
  );
};

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const { state } = useApp();

  if (state.isLoadingAuth) {
    return (
      <div className="app-loading-screen">
        <Loader size={48} className="text-primary animate-spin mb-4" />
        <h2>Autenticando...</h2>
      </div>
    );
  }

  if (state.user && state.isLoadingData) {
    return (
      <div className="app-loading-screen">
        <Loader size={48} className="text-primary animate-spin mb-4" />
        <h2>Cargando tus datos médicos...</h2>
      </div>
    );
  }

  const isAuthenticated = !!state.user;
  // BUG 2 FIX: solo evaluar needsOnboarding cuando la carga de datos terminó.
  // Durante isLoadingData, profiles=[] y isOnboarded podría ser false aunque
  // el usuario tenga perfiles en Supabase — lo que causaba el redirect falso.
  const needsOnboarding = isAuthenticated && !state.isLoadingData && !state.isOnboarded;

  return (
    <Router>
      <PageTracker />
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              {!isAuthenticated
                ? <Welcome />
                : <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} replace />}
            </Suspense>
          }
        />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <Suspense fallback={<PageLoader />}>
              {isAuthenticated && needsOnboarding
                ? <Onboarding />
                : <Navigate to={!isAuthenticated ? '/' : '/dashboard'} replace />}
            </Suspense>
          }
        />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <AppLayout>
            {isAuthenticated && !needsOnboarding ? <Dashboard /> : <Navigate to="/" replace />}
          </AppLayout>
        } />

        <Route path="/family"          element={<AppLayout>{isAuthenticated ? <Family />          : <Navigate to="/" />}</AppLayout>} />
        <Route path="/medications"     element={<AppLayout>{isAuthenticated ? <Medications />     : <Navigate to="/" />}</AppLayout>} />
        <Route path="/medications/add" element={<AppLayout>{isAuthenticated ? <AddMedication />  : <Navigate to="/" />}</AppLayout>} />
        <Route path="/medication/:id"  element={<AppLayout>{isAuthenticated ? <MedicationDetail />: <Navigate to="/" />}</AppLayout>} />
        <Route path="/compare"         element={<AppLayout>{isAuthenticated ? <Compare />         : <Navigate to="/" />}</AppLayout>} />
        <Route path="/cart"            element={<AppLayout>{isAuthenticated ? <Cart />            : <Navigate to="/" />}</AppLayout>} />
        <Route path="/alerts"          element={<AppLayout>{isAuthenticated ? <Alerts />          : <Navigate to="/" />}</AppLayout>} />
        <Route path="/savings"         element={<AppLayout>{isAuthenticated ? <Savings />         : <Navigate to="/" />}</AppLayout>} />
        <Route path="/recipes"         element={<AppLayout>{isAuthenticated ? <Recipes />         : <Navigate to="/" />}</AppLayout>} />
        <Route path="/reports"         element={<AppLayout>{isAuthenticated ? <Reports />         : <Navigate to="/" />}</AppLayout>} />
        <Route path="/settings"        element={<AppLayout>{isAuthenticated ? <Settings />        : <Navigate to="/" />}</AppLayout>} />
        <Route path="/premium"         element={<AppLayout>{isAuthenticated ? <Premium />         : <Navigate to="/" />}</AppLayout>} />
        <Route path="/profile"         element={<AppLayout>{isAuthenticated ? <Profile />         : <Navigate to="/" />}</AppLayout>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
