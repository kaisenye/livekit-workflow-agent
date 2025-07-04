import React, { useState, useEffect } from 'react';

function EdgeEditModal({ isOpen, onClose, edge, onSave }) {
  const [formData, setFormData] = useState({
    label: '',
    prompt: ''
  });

  useEffect(() => {
    if (edge) {
      setFormData({
        label: edge.data?.label || '',
        prompt: edge.data?.prompt || ''
      });
    }
  }, [edge]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(edge.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-50 text-left">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 text-left">Edit Connection</h2>
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
              Label
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left"
              placeholder="Connection label"
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
              placeholder="Edge prompt"
            />
          </div>

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

export default EdgeEditModal; 