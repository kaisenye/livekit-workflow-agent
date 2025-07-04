import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SettingsModal from './modals/SettingsModal';

function ProjectCard({ project }) {
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="p-4 border-b relative">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 truncate">{project.name}</h3>
            <button 
              onClick={copyToClipboard}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center"
              title="Copy project ID"
            >
              <span className="mr-1">{project.id.substring(0, 8)}...</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          {copied && (
            <div className="absolute top-0 right-0 mt-1 mr-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              Copied!
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4 h-12 overflow-hidden text-left">
            {project.description}
          </p>
          <div className="flex justify-end items-center gap-2">
            <Link 
              to={`/project/${project.id}`}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-1.5 px-2 rounded transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
            <button 
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-1.5 px-2 rounded transition-colors flex items-center"
              onClick={() => setIsSettingsOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={project}
      />
    </>
  );
}

export default ProjectCard; 