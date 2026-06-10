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
import AssetDetailPage from './pages/AssetDetailPage';
import StockPage from './pages/StockPage';
import ScannerPage from './pages/ScannerPage';
import AdminRoutingPage from './pages/AdminRoutingPage';
import IntegrityPage from './pages/IntegrityPage';
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
                <ProtectedRoute allowedRoles={['road_technician']}>
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
            <Route path="assets/:id" element={<AssetDetailPage />} />

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

            {/* Direct Logistics Routing Alias */}
            <Route 
              path="routing" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminRoutingPage />
                </ProtectedRoute>
              } 
            />

            {/* Live Data Integrity Compliance Check */}
            <Route 
              path="integrity" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <IntegrityPage />
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
