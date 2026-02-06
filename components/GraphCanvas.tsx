
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../types';
import JsonNode from './JsonNode';
import { findNodeInTree, getAllDescendantIds } from '../utils/jsonUtils';

interface GraphCanvasProps {
  tree: TreeNode;
  onUpdateValue: (id: string, value: any) => void;
  onUpdateKey: (id: string, key: string) => void;
  onDelete: (id: string) => void;
  onPrepareAddChild: (parentId: string, type?: 'object' | 'array' | 'primitive') => void;
  onReparent: (sourceId: string, targetParentId: string) => void;
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ 
  tree, 
  onUpdateValue, 
  onUpdateKey, 
  onDelete, 
  onPrepareAddChild,
  onReparent,
  onSelectNode,
  selectedNodeId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ id: string, offsetX: number, offsetY: number } | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const [manualOffsets, setManualOffsets] = useState<Record<string, { x: number, y: number }>>({});

  useEffect(() => {
    if (selectedNodeId) {
      setSelectedNodeIds(prev => new Set(prev).add(selectedNodeId));
    } else {
      setSelectedNodeIds(new Set());
    }
  }, [selectedNodeId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const baseLayout = useMemo(() => {
    const root = d3.hierarchy(tree);
    const treeLayout = d3.tree<TreeNode>().nodeSize([300, 250]);
    const layoutRoot = treeLayout(root);
    return layoutRoot;
  }, [tree]);

  const { nodes, links } = useMemo(() => {
    const descendants = baseLayout.descendants();
    
    const nodesList = descendants.map(d => {
      const offset = manualOffsets[d.data.id] || { x: 0, y: 0 };
      return {
        ...d.data,
        x: d.x + offset.x,
        y: d.y + offset.y,
      };
    });

    const nodeMap = new Map(nodesList.map(n => [n.id, n]));

    const linksList = baseLayout.links().map(l => ({
      source: nodeMap.get(l.source.data.id)!,
      target: nodeMap.get(l.target.data.id)!,
    }));

    return { nodes: nodesList, links: linksList };
  }, [baseLayout, manualOffsets]);

  const descendantIds = useMemo(() => {
    const all = new Set<string>();
    selectedNodeIds.forEach(id => {
      const node = findNodeInTree(tree, id);
      if (node) getAllDescendantIds(node).forEach(dId => all.add(dId));
    });
    return all;
  }, [selectedNodeIds, tree]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newScale = Math.max(0.1, Math.min(3, transform.scale - e.deltaY * zoomSpeed));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const onDragNodeStart = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!selectedNodeIds.has(id)) {
      if (!e.shiftKey) {
        setSelectedNodeIds(new Set([id]));
        onSelectNode(id);
      } else {
        setSelectedNodeIds(prev => new Set(prev).add(id));
      }
    }
    setDraggingNode({ id, offsetX: e.clientX, offsetY: e.clientY });
  }, [selectedNodeIds, onSelectNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.button === 2) { // Right click
      e.preventDefault();
      setIsPanning(true);
      return;
    }

    if (e.button === 0) { // Left click
      const target = e.target as HTMLElement;
      const isBackground = target === containerRef.current || target.id === 'transform-layer' || target.tagName === 'svg';
      
      if (isBackground) {
        if (!e.shiftKey) {
          setSelectedNodeIds(new Set());
          onSelectNode(null);
        }
        
        const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
        const worldY = (e.clientY - rect.top - transform.y) / transform.scale;
        setSelectionBox({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
      }
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
      return;
    }

    if (selectionBox) {
      const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
      const worldY = (e.clientY - rect.top - transform.y) / transform.scale;
      setSelectionBox(prev => prev ? { ...prev, currentX: worldX, currentY: worldY } : null);
      
      // Real-time selection preview
      const x1 = Math.min(selectionBox.startX, worldX);
      const x2 = Math.max(selectionBox.startX, worldX);
      const y1 = Math.min(selectionBox.startY, worldY);
      const y2 = Math.max(selectionBox.startY, worldY);

      const newSelection = new Set<string>(e.shiftKey ? selectedNodeIds : []);
      nodes.forEach(node => {
        if (node.x + 220 >= x1 && node.x <= x2 && node.y + 140 >= y1 && node.y <= y2) {
          newSelection.add(node.id);
        }
      });
      setSelectedNodeIds(newSelection);
      return;
    }

    if (draggingNode) {
      const dx = (e.clientX - draggingNode.offsetX) / transform.scale;
      const dy = (e.clientY - draggingNode.offsetY) / transform.scale;
      
      const targets = selectedNodeIds.has(draggingNode.id) ? Array.from(selectedNodeIds) : [draggingNode.id];
      
      setManualOffsets(prev => {
        const next = { ...prev };
        targets.forEach(id => {
          next[id] = {
            x: (prev[id]?.x || 0) + dx,
            y: (prev[id]?.y || 0) + dy
          };
        });
        return next;
      });
      
      setDraggingNode(prev => prev ? { ...prev, offsetX: e.clientX, offsetY: e.clientY } : null);

      const worldX = (e.clientX - rect.left - transform.x) / transform.scale;
      const worldY = (e.clientY - rect.top - transform.y) / transform.scale;

      let foundHover: string | null = null;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (targets.includes(node.id) || node.type === 'primitive') continue;

        if (worldX >= node.x && worldX <= node.x + 220 &&
            worldY >= node.y && worldY <= node.y + 140) {
          foundHover = node.id;
          break;
        }
      }
      setHoveredNodeId(foundHover);
    }
  }, [draggingNode, isPanning, selectionBox, transform.scale, transform.x, transform.y, nodes, selectedNodeIds]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode && hoveredNodeId) {
      // Reparent all selected nodes if possible (or just the main one?)
      // For now, let's keep it simple: only reparent the one actually being dragged under the mouse
      onReparent(draggingNode.id, hoveredNodeId);
      setManualOffsets(prev => {
        const next = { ...prev };
        delete next[draggingNode.id];
        return next;
      });
    }
    
    if (selectionBox) {
      if (selectedNodeIds.size > 0) {
        onSelectNode(Array.from(selectedNodeIds)[selectedNodeIds.size - 1]);
      }
    }

    setIsPanning(false);
    setSelectionBox(null);
    setDraggingNode(null);
    setHoveredNodeId(null);
  }, [draggingNode, hoveredNodeId, onReparent, selectionBox, selectedNodeIds, onSelectNode]);

  useEffect(() => {
    if (dimensions.width > 0 && transform.x === 0) {
      setTransform({ x: dimensions.width / 2, y: 100, scale: 0.8 });
    }
  }, [dimensions.width]);

  return (
    <div 
      ref={containerRef}
      className={`flex-1 w-full h-full overflow-hidden relative bg-slate-950 no-scrollbar ${isPanning || draggingNode ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        id="transform-layer"
        className="absolute origin-center"
        style={{ 
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: '1px',
          height: '1px'
        }}
      >
        <svg className="absolute pointer-events-none overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
            </marker>
          </defs>
          {links.map((link) => {
            const pathGenerator = d3.linkVertical()
              .x(d => (d as any).x + 100)
              .y(d => (d as any).y + 30);
              
            const isRelatedToDrag = draggingNode && (link.source.id === draggingNode.id || link.target.id === draggingNode.id);
            const isRelatedToSelection = selectedNodeIds.has(link.source.id) || descendantIds.has(link.source.id);

            return (
              <path
                key={`${link.source.id}-${link.target.id}`}
                d={pathGenerator(link as any) || ""}
                fill="none"
                stroke={isRelatedToDrag ? "#6366f1" : (isRelatedToSelection ? "#6366f1" : "#1e293b")}
                strokeWidth={isRelatedToDrag ? "4" : (isRelatedToSelection ? "3" : "2.5")}
                strokeDasharray={isRelatedToDrag || isRelatedToSelection ? "0" : "5 5"}
                markerEnd="url(#arrowhead)"
                className="transition-colors duration-200"
              />
            );
          })}
        </svg>

        {selectionBox && (
          <div 
            className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none z-[100]"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.startX - selectionBox.currentX),
              height: Math.abs(selectionBox.startY - selectionBox.currentY),
            }}
          />
        )}

        {nodes.map(node => (
          <JsonNode 
            key={node.id} 
            node={node}
            onUpdateValue={onUpdateValue}
            onUpdateKey={onUpdateKey}
            onDelete={onDelete}
            onPrepareAddChild={onPrepareAddChild}
            onDragStart={onDragNodeStart}
            onSelect={onSelectNode}
            isSelected={selectedNodeIds.has(node.id)}
            isChildOfSelected={descendantIds.has(node.id)}
            isDraggingAnything={!!draggingNode}
            isDropTarget={hoveredNodeId === node.id}
          />
        ))}
      </div>

      <div 
        className="absolute inset-0 pointer-events-none opacity-10" 
        style={{ 
          backgroundImage: `radial-gradient(circle, #475569 1px, transparent 1px)`,
          backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`
        }}
      />

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800">
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale + 0.15) }))}
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-xl transition-colors font-bold text-slate-300"
        >
          +
        </button>
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.15) }))}
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-xl transition-colors font-bold text-slate-300"
        >
          -
        </button>
        <button 
          onClick={() => {
            setTransform({ x: dimensions.width / 2, y: 100, scale: 0.8 });
            setManualOffsets({});
          }}
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-xl transition-colors text-xs font-bold text-slate-300"
        >
          RESET
        </button>
      </div>
    </div>
  );
};

export default GraphCanvas;
