import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="max-w-screen-xl mx-auto">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-black">
          Conduit
        </Link>
        <div className="flex items-center space-x-4">
          <Link 
            to="/" 
            className={`text-gray-700 hover:text-gray-900 ${location.pathname === '/' ? 'font-medium' : ''}`}
          >
            Projects
          </Link>
          <Link 
            to="/tools" 
            className={`text-gray-700 hover:text-gray-900 ${location.pathname === '/tools' ? 'font-medium' : ''}`}
          >
            Tools
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 