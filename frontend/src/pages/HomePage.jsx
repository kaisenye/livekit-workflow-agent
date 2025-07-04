import React, { useState, useEffect } from 'react';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/modals/CreateProjectModal';
import { fetchProjects, subscribeToProjects, createProject } from '../lib/projectService';

function HomePage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await fetchProjects();
        if (error) throw new Error(error);
        setProjects(data || []);
      } catch (err) {
        console.error('Error loading projects:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = subscribeToProjects((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT') {
        setProjects(prev => [newRecord, ...prev]);
      } else if (eventType === 'UPDATE') {
        setProjects(prev => 
          prev.map(project => project.id === newRecord.id ? newRecord : project)
        );
      } else if (eventType === 'DELETE') {
        setProjects(prev => 
          prev.filter(project => project.id !== oldRecord.id)
        );
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCreateProject = async (projectData) => {
    try {
      const { data, error } = await createProject({
        name: projectData.name,
        description: projectData.description,
        created_at: new Date().toISOString()
      });
      
      if (error) throw new Error(error);
      
      // The real-time subscription will handle adding the project to state
      setIsCreateModalOpen(false);
      return { success: true };
    } catch (err) {
      console.error('Error creating project:', err);
      return { error: err.message };
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto p-4 border border-gray-200 rounded-md">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-gray-800">
          Projects
        </h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-neutral-700 hover:bg-neutral-800 text-white font-medium py-2 px-4 rounded flex items-center transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm">New Project</p>
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <p className="text-gray-500">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          Error: {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No projects yet</p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}

export default HomePage; 