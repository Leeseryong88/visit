import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

// Pages
import { LandingPage } from './pages/LandingPage';
import { VisitorHome } from './pages/VisitorHome';
import { VisitorForm } from './pages/VisitorForm';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminPurposes } from './pages/AdminPurposes';
import { AdminLogs } from './pages/AdminLogs';
import { AdminQRCodes } from './pages/AdminQRCodes';
import { AdminSubscription } from './pages/AdminSubscription';
import { SuperAdmin } from './pages/SuperAdmin';

// Components
import { AdminLayout } from './components/AdminLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ user, children }: { user: User | null, children: React.ReactNode }) => {
  if (!user) return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Visitor Routes (Multi-tenant) */}
        <Route path="/s/:adminId" element={<VisitorHome />} />
        <Route path="/s/:adminId/visit/:purposeId" element={<VisitorForm />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={user ? <Navigate to="/admin" replace /> : <AdminLogin />} />
        
        <Route path="/admin" element={<ProtectedRoute user={user}><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin/purposes" element={<ProtectedRoute user={user}><ErrorBoundary><AdminPurposes /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute user={user}><ErrorBoundary><AdminLogs /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin/qrcodes" element={<ProtectedRoute user={user}><ErrorBoundary><AdminQRCodes /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin/subscription" element={<ProtectedRoute user={user}><ErrorBoundary><AdminSubscription /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin/super" element={
          user?.email === 'kidcap1001@gmail.com' ? (
            <ProtectedRoute user={user}><ErrorBoundary><SuperAdmin /></ErrorBoundary></ProtectedRoute>
          ) : (
            <Navigate to="/admin" replace />
          )
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
