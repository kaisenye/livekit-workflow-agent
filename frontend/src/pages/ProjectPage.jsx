import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReactFlow, 
  Controls, 
  Background,
  MiniMap,
  applyEdgeChanges, 
  applyNodeChanges,
  addEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from '../components/flow/CustomNode';
import CustomEdge from '../components/flow/CustomEdge';
import NodeEditModal from '../components/modals/NodeEditModal';
import EdgeEditModal from '../components/modals/EdgeEditModal';
import VoiceAgent from '../components/voice/VoiceAgent';

import { 
  fetchProjectById, 
  updateProject 
} from '../lib/projectService';
import { 
  fetchNodesByProject, 
  fetchEdgesByProject, 
  saveFlow,
  subscribeToNodes,
  subscribeToEdges
} from '../lib/flowService';

const nodeTypes = {
  customNode: CustomNode
};

const edgeTypes = {
  customEdge: CustomEdge
};

function Flow() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch project data
  useEffect(() => {
    const loadProjectData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await fetchProjectById(projectId);
        if (projectError) throw new Error(projectError);
        setProject(projectData);
        
        // Fetch nodes
        const { data: nodesData, error: nodesError } = await fetchNodesByProject(projectId);
        if (nodesError) throw new Error(nodesError);
        
        // Format nodes data for ReactFlow
        const formattedNodes = (nodesData || []).map(node => ({
          id: node.id,
          type: 'customNode',
          position: { x: node.position_x, y: node.position_y },
          deletable: node.node_type !== 'start',
          data: {
            title: node.title,
            prompt: node.prompt,
            node_type: node.node_type || 'default',
            tool_id: node.tool_id || null,
            tool: node.tool
          }
        }));
        setNodes(formattedNodes);
        
        // Fetch edges
        const { data: edgesData, error: edgesError } = await fetchEdgesByProject(projectId);
        if (edgesError) throw new Error(edgesError);
        
        // Format edges data for ReactFlow
        const formattedEdges = (edgesData || []).map(edge => ({
          id: edge.id,
          source: edge.source_id,
          target: edge.target_id,
          type: 'customEdge',
          data: {
            label: edge.label,
            prompt: edge.prompt
          }
        }));
        setEdges(formattedEdges);
        
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Error loading project data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  // Subscribe to real-time updates for nodes and edges
  useEffect(() => {
    if (!projectId) return;
    
    // Subscribe to node changes
    const nodesSubscription = subscribeToNodes(projectId, async (payload) => {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        // Fetch the complete node with tool data
        const { data: nodeWithTool } = await fetchNodesByProject(projectId);
        const fullNode = nodeWithTool?.find(n => n.id === newRecord.id);
        
        const updatedNode = {
          id: newRecord.id,
          type: 'customNode',
          position: { x: newRecord.position_x, y: newRecord.position_y },
          deletable: newRecord.node_type !== 'start',
          data: {
            title: newRecord.title,
            prompt: newRecord.prompt,
            node_type: newRecord.node_type || 'default',
            tool_id: newRecord.tool_id || null,
            tool: fullNode?.tool
          }
        };
        
        setNodes(prevNodes => {
          const exists = prevNodes.some(node => node.id === updatedNode.id);
          if (exists) {
            return prevNodes.map(node => 
              node.id === updatedNode.id ? updatedNode : node
            );
          } else {
            return [...prevNodes, updatedNode];
          }
        });
      } else if (eventType === 'DELETE') {
        setNodes(prevNodes => 
          prevNodes.filter(node => node.id !== payload.old.id)
        );
      }
    });
    
    // Subscribe to edge changes
    const edgesSubscription = subscribeToEdges(projectId, (payload) => {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const updatedEdge = {
          id: newRecord.id,
          source: newRecord.source_id,
          target: newRecord.target_id,
          type: 'customEdge',
          data: {
            label: newRecord.label,
            prompt: newRecord.prompt
          }
        };
        
        setEdges(prevEdges => {
          const exists = prevEdges.some(edge => edge.id === updatedEdge.id);
          if (exists) {
            return prevEdges.map(edge => 
              edge.id === updatedEdge.id ? updatedEdge : edge
            );
          } else {
            return [...prevEdges, updatedEdge];
          }
        });
      } else if (eventType === 'DELETE') {
        setEdges(prevEdges => 
          prevEdges.filter(edge => edge.id !== payload.old.id)
        );
      }
    });
    
    // Cleanup subscriptions
    return () => {
      nodesSubscription.unsubscribe();
      edgesSubscription.unsubscribe();
    };
  }, [projectId]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      setHasUnsavedChanges(true);
    },
    [],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      setHasUnsavedChanges(true);
    },
    [],
  );

  const onConnect = useCallback(
    (params) => {
      // Create a new edge with default data
      const newEdge = {
        ...params,
        type: 'customEdge',
        data: {
          label: 'Add Condition',
          prompt: 'Describe the condition for this transition'
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
    },
    [],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsNodeModalOpen(true);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setIsEdgeModalOpen(true);
  }, []);

  const handleNodeSave = useCallback((nodeId, data) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      })
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleEdgeSave = useCallback((edgeId, formData) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: {
              ...edge.data,
              label: formData.label,
              prompt: formData.prompt
            }
          };
        }
        return edge;
      })
    );
    setHasUnsavedChanges(true);
  }, []);

  // Function to add a new node to the flow
  const handleAddNode = useCallback(() => {
    const newNodeId = `node_${Date.now()}`;
    const centerX = window.innerWidth / 2 - 75;
    const centerY = window.innerHeight / 2 - 75;
    
    // Find a position that doesn't overlap with existing nodes
    let posX = centerX;
    let posY = centerY;
    
    // Offset new nodes slightly if we already have nodes
    if (nodes.length > 0) {
      posX = centerX + Math.random() * 100 - 50;
      posY = centerY + Math.random() * 100 - 50;
    }
    
    const newNode = {
      id: newNodeId,
      type: 'customNode',
      position: { x: posX, y: posY },
      deletable: true,
      data: {
        title: 'New Node',
        prompt: 'Enter your prompt here',
        node_type: 'default'
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
    setHasUnsavedChanges(true);
    
    // Optionally, open the edit modal for the new node
    setSelectedNode(newNode);
    setIsNodeModalOpen(true);
  }, [nodes, setNodes, setSelectedNode, setIsNodeModalOpen]);

  const handleTestCall = useCallback(() => {
    setIsVoiceAgentOpen(true);
  }, []);

  const handleSave = async () => {
    if (!projectId) return;
    
    try {
      // Format nodes for storage
      const formattedNodes = nodes.map(node => ({
        id: node.id,
        project_id: projectId,
        title: node.data.title,
        prompt: node.data.prompt,
        node_type: node.data.node_type || 'default',
        tool_id: node.data.tool_id || null,
        position_x: node.position.x,
        position_y: node.position.y
      }));
      
      // Format edges for storage
      const formattedEdges = edges.map(edge => ({
        id: edge.id,
        project_id: projectId,
        source_id: edge.source,
        target_id: edge.target,
        label: edge.data?.label || '',
        prompt: edge.data?.prompt || ''
      }));
      
      // Save flow to database
      const { error } = await saveFlow(projectId, {
        nodes: formattedNodes,
        edges: formattedEdges
      });
      
      if (error) throw new Error(error);
      
      // Update project's last modified timestamp
      await updateProject(projectId, {
        updated_at: new Date().toISOString()
      });
      
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving flow:', err);
      // You could show an error message to the user here
    }
  };
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-500 p-4 rounded-md max-w-md">
          Error: {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-600 bg-gray-100 p-2 rounded-md hover:bg-gray-300 hover:text-gray-800 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">
            {project?.name || 'Flow Builder'}
            {hasUnsavedChanges && <span className="ml-2 text-sm text-gray-500">(unsaved changes)</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNode}
            className="font-medium py-1 px-4 rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Node</span>
          </button>
          <button
            onClick={handleTestCall}
            className="font-medium py-1 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Test Call</span>
          </button>
          <button 
            onClick={handleSave}
            className={`font-medium py-1 px-4 rounded ${
              hasUnsavedChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasUnsavedChanges}
          >
            Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <ReactFlow 
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <NodeEditModal
        isOpen={isNodeModalOpen}
        onClose={() => setIsNodeModalOpen(false)}
        node={selectedNode}
        onSave={handleNodeSave}
      />

      <EdgeEditModal
        isOpen={isEdgeModalOpen}
        onClose={() => setIsEdgeModalOpen(false)}
        edge={selectedEdge}
        onSave={handleEdgeSave}
      />

      <VoiceAgent 
        isOpen={isVoiceAgentOpen}
        onClose={() => setIsVoiceAgentOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}
 
export default Flow;