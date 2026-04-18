import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import apiClient from './api/client';
import AppLayout from './components/Layout';
import SuppliersPage from './pages/SuppliersPage';
import CatalogPage from './pages/CatalogPage';
import PricelistsPage from './pages/PricelistsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import EstimateDetailPage from './pages/EstimateDetailPage';

function App() {
  useEffect(() => {
    // Получаем CSRF-токен напрямую из ответа и ставим в заголовки Axios
    apiClient.get('/csrf/')
      .then((response) => {
        if (response.data.csrftoken) {
          apiClient.defaults.headers.common['X-CSRFToken'] = response.data.csrftoken;
        }
      })
      .catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/suppliers" replace />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/pricelists" element={<PricelistsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/estimates/:id" element={<EstimateDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
