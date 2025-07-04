import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import ToolsPage from './pages/ToolsPage';
import Navbar from './components/Navbar';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isProjectPage = location.pathname.startsWith('/project/');

  return (
    <div className="min-h-screen">
      {!isProjectPage && <Navbar />}
      <div className={isProjectPage ? 'h-screen' : 'container mx-auto px-4 py-8'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/tools" element={<ToolsPage />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
