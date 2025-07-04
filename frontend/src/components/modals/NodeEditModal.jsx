import React, { useState, useEffect } from 'react';
import { fetchTools } from '../../lib/toolService';

function NodeEditModal({ isOpen, onClose, node, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    node_type: 'default',
    tool_id: null
  });
  const [tools, setTools] = useState([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);

  // Load available tools
  useEffect(() => {
    const loadTools = async () => {
      setIsLoadingTools(true);
      try {
        const { data } = await fetchTools();
        setTools(data || []);
      } catch (err) {
        console.error('Error loading tools:', err);
      } finally {
        setIsLoadingTools(false);
      }
    };

    if (isOpen && formData.node_type === 'tool') {
      loadTools();
    }
  }, [isOpen, formData.node_type]);

  useEffect(() => {
    if (node) {
      setFormData({
        title: node.data.title || '',
        prompt: node.data.prompt || '',
        node_type: node.data.node_type || 'default',
        tool_id: node.data.tool_id || null
      });
    }
  }, [node]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(node.id, formData);
    onClose();
  };

  const isStartNode = node?.data?.node_type === 'start';

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-50 text-left">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 text-left">
            {isStartNode ? 'Start Node' : 'Edit Node'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left"
              required
              disabled={isStartNode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Prompt
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
              Node Type
            </label>
            <select
              value={formData.node_type}
              onChange={(e) => setFormData({ 
                ...formData, 
                node_type: e.target.value,
                // Clear tool_id if not a tool node
                tool_id: e.target.value === 'tool' ? formData.tool_id : null
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left"
              disabled={isStartNode}
            >
              {isStartNode && <option value="start">Start</option>}
              {!isStartNode && (
                <>
                  <option value="default">Default</option>
                  <option value="tool">Tool</option>
                </>
              )}
            </select>
          </div>

          {formData.node_type === 'tool' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-gray-700 text-left">Tool Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                  Select Tool
                </label>
                {isLoadingTools ? (
                  <p className="text-sm text-gray-500">Loading tools...</p>
                ) : tools.length === 0 ? (
                  <p className="text-sm text-gray-500">No tools available. Create a tool first.</p>
                ) : (
                  <select
                    value={formData.tool_id || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      tool_id: e.target.value || null
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left"
                    required
                  >
                    <option value="">-- Select a tool --</option>
                    {tools.map(tool => (
                      <option key={tool.id} value={tool.id}>{tool.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 text-left"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NodeEditModal; 