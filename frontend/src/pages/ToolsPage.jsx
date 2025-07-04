import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTools, deleteTool, subscribeToTools } from '../lib/toolService';
import ToolEditModal from '../components/modals/ToolEditModal';

function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  // Fetch tools on component mount
  useEffect(() => {
    const loadTools = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await fetchTools();
        if (error) throw new Error(error);
        setTools(data || []);
      } catch (err) {
        console.error('Error loading tools:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTools();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = subscribeToTools((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT') {
        setTools(prev => [newRecord, ...prev]);
      } else if (eventType === 'UPDATE') {
        setTools(prev => 
          prev.map(tool => tool.id === newRecord.id ? newRecord : tool)
        );
      } else if (eventType === 'DELETE') {
        setTools(prev => 
          prev.filter(tool => tool.id !== oldRecord.id)
        );
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleEditTool = (tool) => {
    setSelectedTool(tool);
    setIsCreateModalOpen(true);
  };

  const handleDeleteTool = async (toolId) => {
    if (!window.confirm('Are you sure you want to delete this tool?')) return;
    
    try {
      const { error } = await deleteTool(toolId);
      if (error) throw new Error(error);
    } catch (err) {
      console.error('Error deleting tool:', err);
      alert(`Failed to delete tool: ${err.message}`);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto p-4 border border-gray-200 rounded-lg text-left">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 text-left">
          Tools
        </h1>
        <div className="flex gap-2">
          <Link 
            to="/"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
          >
            Back to Projects
          </Link>
          <button 
            onClick={() => {
              setSelectedTool(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded flex items-center transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">New Tool</span>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-start py-20">
          <p className="text-gray-500 text-left">Loading tools...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-md text-left">
          Error: {error}
        </div>
      ) : tools.length === 0 ? (
        <div className="text-left py-20">
          <p className="text-gray-500 mb-4">No tools yet</p>
          <button 
            onClick={() => {
              setSelectedTool(null);
              setIsCreateModalOpen(true);
            }}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Create your first tool
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {tools.map(tool => (
            <div 
              key={tool.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 p-4 border border-gray-200 text-left"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 text-left">{tool.name}</h3>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded text-left">
                      {tool.method}
                    </span>
                    <span className="text-gray-600 text-sm text-left">{tool.endpoint}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditTool(tool)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Edit Tool"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTool(tool.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete Tool"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 text-left">Headers:</h4>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto text-left">
                  {tool.headers ? JSON.stringify(tool.headers, null, 2) : 'None'}
                </pre>
                
                <h4 className="text-sm font-medium text-gray-700 mt-3 mb-2 text-left">Body:</h4>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto text-left">
                  {tool.body ? JSON.stringify(tool.body, null, 2) : 'None'}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      <ToolEditModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tool={selectedTool}
      />
    </div>
  );
}

export default ToolsPage; 