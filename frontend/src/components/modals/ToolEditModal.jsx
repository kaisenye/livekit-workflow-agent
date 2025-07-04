import React, { useState, useEffect } from 'react';
import { createTool, updateTool } from '../../lib/toolService';

function ToolEditModal({ isOpen, onClose, tool, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    method: 'GET',
    headers: '',
    body: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name || '',
        endpoint: tool.endpoint || '',
        method: tool.method || 'GET',
        headers: tool.headers ? JSON.stringify(tool.headers, null, 2) : '',
        body: tool.body ? JSON.stringify(tool.body, null, 2) : ''
      });
    } else {
      // Reset form for new tool
      setFormData({
        name: '',
        endpoint: '',
        method: 'GET',
        headers: '',
        body: ''
      });
    }
    setError(null);
  }, [tool, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse JSON fields
      let headersObj = null;
      let bodyObj = null;

      if (formData.headers.trim()) {
        try {
          headersObj = JSON.parse(formData.headers);
        } catch (err) {
          throw new Error('Invalid JSON in headers');
        }
      }

      if (formData.body.trim()) {
        try {
          bodyObj = JSON.parse(formData.body);
        } catch (err) {
          throw new Error('Invalid JSON in body');
        }
      }

      const toolData = {
        name: formData.name,
        endpoint: formData.endpoint,
        method: formData.method,
        headers: headersObj,
        body: bodyObj
      };

      let result;
      if (tool?.id) {
        // Update existing tool
        result = await updateTool(tool.id, toolData);
      } else {
        // Create new tool
        result = await createTool(toolData);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      if (onSave) {
        onSave(result.data);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving tool:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {tool ? 'Edit Tool' : 'Create New Tool'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Tool Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-neutral-800 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 bg-white transition-all duration-300"
                placeholder="Enter tool name"
              />
            </div>
            
            <div>
              <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                API Endpoint
              </label>
              <input
                type="text"
                id="endpoint"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                required
                className="w-full px-3 py-2 text-neutral-800 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 bg-white transition-all duration-300"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            
            <div>
              <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                HTTP Method
              </label>
              <select
                id="method"
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-3 py-2 text-neutral-800 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 bg-white transition-all duration-300"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="headers" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Headers (JSON)
              </label>
              <textarea
                id="headers"
                value={formData.headers}
                onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                className="w-full px-3 py-2 text-neutral-800 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 bg-white transition-all duration-300 font-mono text-sm"
                rows={3}
                placeholder={'{\n  "Content-Type": "application/json"\n}'}
              />
            </div>
            
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                Request Body (JSON)
              </label>
              <textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-2 text-neutral-800 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 bg-white transition-all duration-300 font-mono text-sm"
                rows={5}
                placeholder={'{\n  "key": "value"\n}'}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Saving...' : tool ? 'Save Changes' : 'Create Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ToolEditModal; 