import { supabase, handleSupabaseError } from './supabase';

// Table names
const NODES_TABLE = 'nodes';
const EDGES_TABLE = 'edges';
const TOOLS_TABLE = 'tools';

/**
 * Fetch all nodes for a project
 */
export const fetchNodesByProject = async (projectId) => {
  try {
    const { data, error } = await supabase
      .from(NODES_TABLE)
      .select(`
        *,
        tool:tools(*)
      `)
      .eq('project_id', projectId);
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Fetch all edges for a project
 */
export const fetchEdgesByProject = async (projectId) => {
  try {
    const { data, error } = await supabase
      .from(EDGES_TABLE)
      .select('*')
      .eq('project_id', projectId);
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create a new node
 */
export const createNode = async (nodeData) => {
  try {
    const { data, error } = await supabase
      .from(NODES_TABLE)
      .insert([nodeData])
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create a new edge
 */
export const createEdge = async (edgeData) => {
  try {
    const { data, error } = await supabase
      .from(EDGES_TABLE)
      .insert([edgeData])
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update a node
 */
export const updateNode = async (nodeId, updates) => {
  try {
    // Don't allow changing node_type of start nodes
    if (updates.node_type && await isStartNode(nodeId)) {
      delete updates.node_type;
    }
    
    const { data, error } = await supabase
      .from(NODES_TABLE)
      .update(updates)
      .eq('id', nodeId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Check if a node is a start node
 */
const isStartNode = async (nodeId) => {
  try {
    const { data, error } = await supabase
      .from(NODES_TABLE)
      .select('node_type')
      .eq('id', nodeId)
      .single();
      
    if (error) throw error;
    return data.node_type === 'start';
  } catch (error) {
    console.error('Error checking node type:', error);
    return false;
  }
};

/**
 * Update an edge
 */
export const updateEdge = async (edgeId, updates) => {
  try {
    const { data, error } = await supabase
      .from(EDGES_TABLE)
      .update(updates)
      .eq('id', edgeId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete a node
 */
export const deleteNode = async (nodeId) => {
  try {
    // Check if it's a start node
    if (await isStartNode(nodeId)) {
      return { error: 'Cannot delete start node' };
    }
    
    const { error } = await supabase
      .from(NODES_TABLE)
      .delete()
      .eq('id', nodeId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete an edge
 */
export const deleteEdge = async (edgeId) => {
  try {
    const { error } = await supabase
      .from(EDGES_TABLE)
      .delete()
      .eq('id', edgeId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Save the entire flow (nodes and edges) for a project
 * This will replace all existing nodes and edges
 */
export const saveFlow = async (projectId, { nodes, edges }) => {
  try {
    // Ensure there's a start node
    const hasStartNode = nodes.some(node => node.node_type === 'start');
    if (!hasStartNode) {
      return { error: 'Flow must include a start node' };
    }
    
    // Start a transaction
    const { error: transactionError } = await supabase.rpc('save_flow', {
      p_project_id: projectId,
      p_nodes: nodes,
      p_edges: edges
    });
    
    if (transactionError) throw transactionError;
    return { success: true };
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Subscribe to real-time updates for nodes in a project
 */
export const subscribeToNodes = (projectId, callback) => {
  return supabase
    .channel(`public:nodes:project_id=eq.${projectId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: NODES_TABLE, filter: `project_id=eq.${projectId}` }, 
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};

/**
 * Subscribe to real-time updates for edges in a project
 */
export const subscribeToEdges = (projectId, callback) => {
  return supabase
    .channel(`public:edges:project_id=eq.${projectId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: EDGES_TABLE, filter: `project_id=eq.${projectId}` }, 
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}; 