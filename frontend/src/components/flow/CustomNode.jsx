import { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
 
const handleStyle = { left: 10 };
 
function CustomNode({ data, isConnectable, deletable }) {
  // Get the node type with default fallback
  const nodeType = data.node_type || 'default';
  const tool = data.tool;
  const isDeletable = deletable !== false; // Default to true if not specified

  // Define styles based on node type
  const getNodeStyles = () => {
    switch (nodeType) {
      case 'start':
        return {
          container: 'border-green-400 bg-green-50',
          title: 'text-green-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          )
        };
      case 'tool':
        return {
          container: 'border-purple-400 bg-purple-50',
          title: 'text-purple-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        };
      default:
        return {
          container: 'border-gray-300 bg-white',
          title: 'text-gray-800',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )
        };
    }
  };

  const styles = getNodeStyles();
 
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className={`flex flex-col w-64 h-auto min-h-24 gap-2 items-start border p-4 rounded-md hover:shadow-md cursor-pointer transition-all duration-200 ${styles.container}`}>
        <div className="flex justify-between w-full">
          <label className={`text-base font-semibold select-none ${styles.title}`}>
            {data.title}
            {!isDeletable && (
              <span className="ml-2 text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                Required
              </span>
            )}
          </label>
          <div className="flex-shrink-0">
            {styles.icon}
          </div>
        </div>
        <p 
          className="text-xs text-gray-500 text-left select-none pointer-events-none" 
        >
          {data.prompt?.length > 50 ? data.prompt.substring(0, 50) + '...' : data.prompt}
        </p>
        
        {nodeType === 'tool' && tool && (
          <div className="mt-2 p-2 bg-purple-100 rounded w-full">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-medium text-purple-700">{tool.name}</span>
            </div>
            <div className="text-xs text-purple-600 mt-1">
              <span className="inline-block px-1.5 py-0.5 bg-purple-200 rounded text-purple-800 mr-1">{tool.method}</span>
              <span className="text-purple-700 truncate block">{tool.endpoint}</span>
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} id="a" isConnectable={isConnectable} />
    </>
  );
}

export default CustomNode;