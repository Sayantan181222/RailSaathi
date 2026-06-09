import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import ComplaintMapPage from './pages/ComplaintMapPage';
import SafetyPage from './pages/SafetyPage';
import DemandPage from './pages/DemandPage';
import StationPage from './pages/StationPage';
import GrievancePortalPage from './pages/GrievancePortalPage';
import LiveHeatmapPage from './pages/LiveHeatmapPage';
import RPFDashboardPage from './pages/RPFDashboardPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/complaints" element={<ComplaintMapPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/demand" element={<DemandPage />} />
          <Route path="/station" element={<StationPage />} />
          <Route path="/grievance" element={<GrievancePortalPage />} />
          <Route path="/heatmap" element={<LiveHeatmapPage />} />
          <Route path="/rpf" element={<RPFDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
