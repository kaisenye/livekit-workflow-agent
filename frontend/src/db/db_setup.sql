-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tools table
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers JSONB,
  body JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nodes table
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY, -- Using client-generated IDs for compatibility with ReactFlow
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT,
  node_type TEXT NOT NULL DEFAULT 'default', -- 'start', 'default', or 'tool'
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Edges table
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY, -- Using client-generated IDs for compatibility with ReactFlow
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  label TEXT,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nodes_project_id ON nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_edges_project_id ON edges(project_id);
CREATE INDEX IF NOT EXISTS idx_nodes_tool_id ON nodes(tool_id);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- Create a trigger to ensure a start node is created for each project
CREATE OR REPLACE FUNCTION create_start_node_for_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nodes (
    id, 
    project_id, 
    title, 
    prompt, 
    node_type, 
    position_x, 
    position_y
  ) VALUES (
    'start_' || NEW.id,
    NEW.id,
    'Start',
    'This is the starting point of your flow',
    'start',
    50,
    50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_start_node_after_project_insert
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_start_node_for_project();

-- Create a trigger to prevent deletion of start nodes
CREATE OR REPLACE FUNCTION prevent_start_node_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.node_type = 'start' THEN
    RAISE EXCEPTION 'Cannot delete start node';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_start_node_deletion
BEFORE DELETE ON nodes
FOR EACH ROW
EXECUTE FUNCTION prevent_start_node_deletion();

-- Create a stored procedure for saving the entire flow (transaction)
CREATE OR REPLACE FUNCTION save_flow(
  p_project_id UUID,
  p_nodes JSONB,
  p_edges JSONB
) RETURNS VOID AS $$
DECLARE
  has_start_node BOOLEAN := FALSE;
BEGIN
  -- Check if nodes include a start node
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_nodes) WHERE (value->>'node_type') = 'start'
  ) INTO has_start_node;
  
  IF NOT has_start_node THEN
    RAISE EXCEPTION 'Flow must include a start node';
  END IF;

  -- Delete existing nodes except start node
  DELETE FROM nodes WHERE project_id = p_project_id AND node_type != 'start';
  DELETE FROM edges WHERE project_id = p_project_id;
  
  -- Insert or update nodes
  INSERT INTO nodes (
    id, 
    project_id, 
    title, 
    prompt, 
    node_type,
    tool_id,
    position_x, 
    position_y, 
    created_at, 
    updated_at
  )
  SELECT 
    (jsonb_array_elements(p_nodes)->>'id')::TEXT,
    (jsonb_array_elements(p_nodes)->>'project_id')::UUID,
    (jsonb_array_elements(p_nodes)->>'title')::TEXT,
    (jsonb_array_elements(p_nodes)->>'prompt')::TEXT,
    (jsonb_array_elements(p_nodes)->>'node_type')::TEXT,
    (jsonb_array_elements(p_nodes)->>'tool_id')::UUID,
    (jsonb_array_elements(p_nodes)->>'position_x')::FLOAT,
    (jsonb_array_elements(p_nodes)->>'position_y')::FLOAT,
    NOW(),
    NOW()
  ON CONFLICT (id) 
  DO UPDATE SET
    title = EXCLUDED.title,
    prompt = EXCLUDED.prompt,
    node_type = EXCLUDED.node_type,
    tool_id = EXCLUDED.tool_id,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    updated_at = NOW();
  
  -- Insert new edges
  INSERT INTO edges (id, project_id, source_id, target_id, label, prompt, created_at, updated_at)
  SELECT 
    (jsonb_array_elements(p_edges)->>'id')::TEXT,
    (jsonb_array_elements(p_edges)->>'project_id')::UUID,
    (jsonb_array_elements(p_edges)->>'source_id')::TEXT,
    (jsonb_array_elements(p_edges)->>'target_id')::TEXT,
    (jsonb_array_elements(p_edges)->>'label')::TEXT,
    (jsonb_array_elements(p_edges)->>'prompt')::TEXT,
    NOW(),
    NOW();
    
  -- Update project's updated_at timestamp
  UPDATE projects SET updated_at = NOW() WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
-- For now, allowing all operations (in a real app, you'd restrict to authenticated users)
CREATE POLICY projects_policy ON projects FOR ALL USING (true);
CREATE POLICY nodes_policy ON nodes FOR ALL USING (true);
CREATE POLICY edges_policy ON edges FOR ALL USING (true);
CREATE POLICY tools_policy ON tools FOR ALL USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE edges;
ALTER PUBLICATION supabase_realtime ADD TABLE tools; 