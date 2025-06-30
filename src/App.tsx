import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MemoryMonitoringDashboard from './components/MemoryMonitoringDashboard';
import SimplifiedTradingDashboard from './components/SimplifiedTradingDashboard';
import SystemHealthDebugPanel from './components/SystemHealthDebugPanel';
import Navbar from './components/Navbar';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<SimplifiedTradingDashboard />} />
            <Route path="/memory" element={<MemoryMonitoringDashboard />} />
            <Route path="/health" element={<SystemHealthDebugPanel />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
