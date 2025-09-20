import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import DatasetDetail from './pages/DatasetDetail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function App() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/catalog" replace /> : <Login />
      } />

      <Route element={
        isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
      }>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/dataset/:id" element={<DatasetDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;