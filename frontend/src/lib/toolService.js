import { supabase, handleSupabaseError } from './supabase';

// Table name
const TOOLS_TABLE = 'tools';

/**
 * Fetch all tools
 */
export const fetchTools = async () => {
  try {
    const { data, error } = await supabase
      .from(TOOLS_TABLE)
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Fetch a single tool by ID
 */
export const fetchToolById = async (toolId) => {
  try {
    const { data, error } = await supabase
      .from(TOOLS_TABLE)
      .select('*')
      .eq('id', toolId)
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create a new tool
 */
export const createTool = async (toolData) => {
  try {
    const { data, error } = await supabase
      .from(TOOLS_TABLE)
      .insert([toolData])
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update an existing tool
 */
export const updateTool = async (toolId, updates) => {
  try {
    const { data, error } = await supabase
      .from(TOOLS_TABLE)
      .update(updates)
      .eq('id', toolId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete a tool
 */
export const deleteTool = async (toolId) => {
  try {
    const { error } = await supabase
      .from(TOOLS_TABLE)
      .delete()
      .eq('id', toolId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Subscribe to real-time updates for tools
 */
export const subscribeToTools = (callback) => {
  return supabase
    .channel('public:tools')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: TOOLS_TABLE }, 
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}; 