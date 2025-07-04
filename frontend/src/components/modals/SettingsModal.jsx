import React from 'react';

function SettingsModal({ isOpen, onClose, project }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[500px] max-w-[95vw] relative">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 text-left">Project Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-left">Project Information</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 text-left">
                  <span className="font-medium">ID:</span> {project.id}
                </p>
                <p className="text-sm text-gray-600 mt-1 text-left">
                  <span className="font-medium">Created:</span> {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-left">Danger Zone</h3>
              <div className="border border-red-200 rounded-md p-4 bg-red-50">
                <p className="text-sm text-red-600 mb-2 text-left">Once you delete a project, there is no going back. Please be certain.</p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm text-left">
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal; 