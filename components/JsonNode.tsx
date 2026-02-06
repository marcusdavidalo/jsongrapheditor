
import React, { useState, memo, useCallback } from 'react';
import { TreeNode } from '../types';
import { Trash2, Type, Braces, List, Anchor, Plus } from 'lucide-react';

interface JsonNodeProps {
  node: TreeNode;
  onUpdateValue: (id: string, value: any) => void;
  onUpdateKey: (id: string, key: string) => void;
  onDelete: (id: string) => void;
  onPrepareAddChild: (parentId: string, type?: 'object' | 'array' | 'primitive') => void;
  onDragStart?: (e: React.MouseEvent, id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  isChildOfSelected?: boolean;
  isDraggingAnything?: boolean;
  isDropTarget?: boolean;
}

type Edge = 'top' | 'bottom' | 'left' | 'right' | null;

const JsonNode: React.FC<JsonNodeProps> = memo(({ 
  node, 
  onUpdateValue, 
  onUpdateKey, 
  onDelete, 
  onPrepareAddChild,
  onDragStart,
  onSelect,
  isSelected,
  isChildOfSelected,
  isDraggingAnything,
  isDropTarget
}) => {
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [tempKey, setTempKey] = useState(node.key);
  const [tempValue, setTempValue] = useState(node.value === null ? 'null' : String(node.value));
  const [nearestEdge, setNearestEdge] = useState<Edge>(null);

  const handleKeyBlur = () => {
    if (tempKey.trim() !== "" && tempKey !== node.key) {
      onUpdateKey(node.id, tempKey);
    }
    setIsEditingKey(false);
  };

  const handleValueBlur = () => {
    let parsedValue: any = tempValue;
    if (tempValue.toLowerCase() === 'true') parsedValue = true;
    else if (tempValue.toLowerCase() === 'false') parsedValue = false;
    else if (tempValue === 'null') parsedValue = null;
    else if (!isNaN(Number(tempValue)) && tempValue.trim() !== '') parsedValue = Number(tempValue);
    
    onUpdateValue(node.id, parsedValue);
    setIsEditingValue(false);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingAnything) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const distTop = y;
    const distBottom = rect.height - y;
    const distLeft = x;
    const distRight = rect.width - x;

    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

    if (minDist === distTop) setNearestEdge('top');
    else if (minDist === distBottom) setNearestEdge('bottom');
    else if (minDist === distLeft) setNearestEdge('left');
    else if (minDist === distRight) setNearestEdge('right');
  }, [isDraggingAnything]);

  const getTypeColor = () => {
    if (isDropTarget) return 'border-yellow-400 bg-yellow-950/60 ring-4 ring-yellow-400/20 scale-105 z-50';
    if (isSelected) return 'border-indigo-500 bg-indigo-900/60 ring-4 ring-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.4)] z-40';
    if (isChildOfSelected) return 'border-indigo-500/40 bg-indigo-950/30 text-indigo-100 z-30 shadow-lg';
    
    if (node.type === 'object') return 'border-blue-500/50 bg-blue-950/40 text-blue-200';
    if (node.type === 'array') return 'border-purple-500/50 bg-purple-950/40 text-purple-200';
    if (typeof node.value === 'string') return 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200';
    if (typeof node.value === 'number') return 'border-orange-500/50 bg-orange-950/40 text-orange-200';
    if (typeof node.value === 'boolean') return 'border-pink-500/50 bg-pink-950/40 text-pink-200';
    return 'border-slate-700 bg-slate-900 text-slate-300';
  };

  const isDisabled = isDraggingAnything;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'primitive' && node.parentId) {
      onPrepareAddChild(node.parentId, 'primitive');
    } else {
      onPrepareAddChild(node.id, 'primitive');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    onSelect?.(node.id);
  };

  const getQuickAddStyles = () => {
    if (!nearestEdge) return {};
    const base = "absolute flex items-center justify-center transition-all duration-200 scale-100 hover:scale-110 z-[60]";
    switch (nearestEdge) {
      case 'top': return { className: `${base} -top-8 left-1/2 -translate-x-1/2`, caretClass: "border-b-indigo-500" };
      case 'bottom': return { className: `${base} -bottom-8 left-1/2 -translate-x-1/2`, caretClass: "border-t-indigo-500" };
      case 'left': return { className: `${base} -left-8 top-1/2 -translate-y-1/2`, caretClass: "border-r-indigo-500" };
      case 'right': return { className: `${base} -right-8 top-1/2 -translate-y-1/2`, caretClass: "border-l-indigo-500" };
      default: return {};
    }
  };

  const quickAddInfo = getQuickAddStyles();

  return (
    <div 
      style={{ 
        transform: `translate(${node.x}px, ${node.y}px)`,
        willChange: 'transform',
        zIndex: isDropTarget ? 50 : (isSelected ? 40 : (isChildOfSelected ? 30 : 10))
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setNearestEdge(null)}
      onClick={handleClick}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input')) return;
        if (!isEditingKey && !isEditingValue) onDragStart?.(e, node.id);
      }}
      className={`absolute p-4 rounded-xl border-2 shadow-xl backdrop-blur-md transition-[border-color,background-color,box-shadow,ring] duration-200 min-w-[200px] group node-animate select-none ${getTypeColor()} ${isDisabled ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {nearestEdge && !isDisabled && (
        <div className={quickAddInfo.className}>
          <button 
            onClick={handleQuickAdd}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-500 border border-white/20"
          >
            <Plus size={16} />
          </button>
          <div className={`absolute w-0 h-0 border-4 border-transparent ${quickAddInfo.caretClass} pointer-events-none`} 
            style={{ 
              top: nearestEdge === 'bottom' ? '-4px' : 'auto',
              bottom: nearestEdge === 'top' ? '-4px' : 'auto',
              left: nearestEdge === 'right' ? '-4px' : 'auto',
              right: nearestEdge === 'left' ? '-4px' : 'auto',
            }}
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1 overflow-hidden flex-1 mr-2">
          {isEditingKey ? (
            <input
              autoFocus
              className="text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-100 outline-none w-full"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              onBlur={handleKeyBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleKeyBlur()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className="text-xs font-bold truncate cursor-text hover:text-white flex items-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); if (!isDisabled) setIsEditingKey(true); }}
            >
              {node.key}
              <Anchor size={10} className="text-white/20" />
            </span>
          )}
          <span className="text-[10px] w-fit px-1.5 py-0.5 bg-white/10 text-white/60 rounded font-medium uppercase tracking-tighter">
            {node.type === 'primitive' ? typeof node.value : node.type}
          </span>
        </div>
        
        {!isDisabled && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {node.type === 'primitive' ? (
        <div className="mt-1">
          {isEditingValue ? (
            <input
              autoFocus
              className="text-sm font-medium px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-emerald-400 outline-none w-full code-font"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleValueBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleValueBlur()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div 
              className="text-sm font-medium cursor-text truncate code-font bg-black/20 hover:bg-black/40 px-3 py-2 rounded-lg transition-colors border border-white/5"
              onClick={(e) => { e.stopPropagation(); if (!isDisabled) setIsEditingValue(true); }}
            >
              {JSON.stringify(node.value)}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
           <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center justify-between">
              <span>{node.children.length} {node.children.length === 1 ? 'member' : 'members'}</span>
           </div>
           
           <div className={`flex gap-1 pt-2 border-t border-white/5 transition-opacity ${isDisabled ? 'opacity-20' : 'opacity-40 group-hover:opacity-100'}`}>
              <button 
                disabled={isDisabled}
                onClick={(e) => { e.stopPropagation(); onPrepareAddChild(node.id, 'primitive'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:cursor-not-allowed"
                title="Add Property"
              >
                <Type size={12} />
                <span className="text-[10px] font-bold">VAL</span>
              </button>
              <button 
                disabled={isDisabled}
                onClick={(e) => { e.stopPropagation(); onPrepareAddChild(node.id, 'object'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:cursor-not-allowed"
                title="Add Object"
              >
                <Braces size={12} />
                <span className="text-[10px] font-bold">OBJ</span>
              </button>
              <button 
                disabled={isDisabled}
                onClick={(e) => { e.stopPropagation(); onPrepareAddChild(node.id, 'array'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:cursor-not-allowed"
                title="Add Array"
              >
                <List size={12} />
                <span className="text-[10px] font-bold">ARR</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
});

export default JsonNode;
