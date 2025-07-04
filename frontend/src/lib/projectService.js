import { supabase, handleSupabaseError } from './supabase';

// Table name
const PROJECTS_TABLE = 'projects';

/**
 * Fetch all projects
 */
export const fetchProjects = async () => {
  try {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Fetch a single project by ID
 */
export const fetchProjectById = async (projectId) => {
  try {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create a new project
 */
export const createProject = async (projectData) => {
  try {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .insert([projectData])
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update an existing project
 */
export const updateProject = async (projectId, updates) => {
  try {
    const { data, error } = await supabase
      .from(PROJECTS_TABLE)
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId) => {
  try {
    const { error } = await supabase
      .from(PROJECTS_TABLE)
      .delete()
      .eq('id', projectId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Subscribe to real-time updates for all projects
 */
export const subscribeToProjects = (callback) => {
  return supabase
    .channel('public:projects')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: PROJECTS_TABLE }, 
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}; 