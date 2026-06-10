import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Operational Screens
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoadTechDashboardPage from './pages/RoadTechDashboardPage';
import WarehouseDashboardPage from './pages/WarehouseDashboardPage';
import AssetsPage from './pages/AssetsPage';
import StockPage from './pages/StockPage';
import ScannerPage from './pages/ScannerPage';
import AdminRoutingPage from './pages/AdminRoutingPage';
import UserAdminPage from './pages/UserAdminPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Access point */}
          <Route path="/login" element={<LoginPage />} />

          {/* Secure ERP workspace routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard: All staff */}
            <Route index element={<DashboardPage />} />

            {/* Road tech dashboard */}
            <Route 
              path="road-tech" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'road_technician']}>
                  <RoadTechDashboardPage />
                </ProtectedRoute>
              } 
            />

            {/* Warehouse tasks board */}
            <Route 
              path="warehouse" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'warehouse_staff']}>
                  <WarehouseDashboardPage />
                </ProtectedRoute>
              } 
            />

            {/* Shared assets directory */}
            <Route path="assets" element={<AssetsPage />} />

            {/* Dynamic stock levels inventory */}
            <Route path="stock" element={<StockPage />} />

            {/* Code simulator diagnostic scanner */}
            <Route path="scanner" element={<ScannerPage />} />

            {/* Logistics Scheduler and Router */}
            <Route 
              path="logistics-router" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminRoutingPage />
                </ProtectedRoute>
              } 
            />

            {/* Administrative role mapped credentials directories */}
            <Route 
              path="user-admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserAdminPage />
                </ProtectedRoute>
              } 
            />

            {/* Fallback to default route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
