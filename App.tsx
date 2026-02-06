
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Code, Share2, Github, Settings, LayoutGrid, FileJson, AlertCircle, RotateCcw, RotateCw } from 'lucide-react';
import GraphCanvas from './components/GraphCanvas';
import NodeCreatorModal from './components/NodeCreatorModal';
import { transformJsonToTree, transformTreeToJson, updateNodeValue, updateNodeKey, deleteNode, findNodeInTree, generateId, reparentNode, getNodePath } from './utils/jsonUtils';
import { TreeNode } from './types';

const KofiIcon = ({ size = 20 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.724c-.304 0-.551.247-.551.551V19.93c0 .304.247.551.551.551h15.244c4.322 0 4.881-4.225 4.881-4.225s.612-4.148 2.016-5.461c.421-.397 1.055-.453 1.055-1.847zm-5.698 3.597c.05 3.395-2.617 3.65-2.617 3.65H2.433V6.612h14.122s2.583.153 2.617 3.65c.036 3.738-1.558 3.618-1.127 5.618.318 1.481 1.062 1.956 1.062 1.956s-2.924-.044-2.126-5.291zm.992-6.611c-.042-3.344-2.636-3.411-2.636-3.411H4.661s2.583.153 2.617 3.65c.036 3.738-1.558 3.618-1.127 5.618.318 1.481 1.062 1.956 1.062 1.956s-2.023-.044-1.225-5.291z"/>
  </svg>
);

const DEFAULT_JSON = {
  project: "NodeFlow JSON Editor",
  status: "Beta v1.2",
  instructions: "Click to edit keys or values. Drag nodes to rearrange. Drop a node onto an object or array to reparent it.",
  isActive: true,
  settings: {
    darkMode: true,
    autoLayout: "Hierarchical",
    zoom: 0.8
  },
  members: [
    { id: 1, name: "Admin", active: true },
    { id: 2, name: "Editor", active: false }
  ]
};

interface HistoryState {
  past: TreeNode[];
  present: TreeNode;
  future: TreeNode[];
}

interface NodeCreatorState {
  isOpen: boolean;
  parentId: string;
  parentType: 'object' | 'array' | 'root';
  suggestedType?: 'object' | 'array' | 'primitive';
}

export default function App() {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: transformJsonToTree(DEFAULT_JSON),
    future: []
  }));
  
  const [jsonText, setJsonText] = useState(JSON.stringify(DEFAULT_JSON, null, 2));
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeCreator, setNodeCreator] = useState<NodeCreatorState>({
    isOpen: false,
    parentId: '',
    parentType: 'object'
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const data = transformTreeToJson(history.present);
      setJsonText(JSON.stringify(data, null, 2));
      setError(null);
    } catch (e) {
      setError("Sync error: Failed to generate JSON from node graph.");
    }
  }, [history.present]);

  useEffect(() => {
    if (selectedNodeId && textareaRef.current) {
      const path = getNodePath(history.present, selectedNodeId);
      if (!path) return;

      const actualPath = path.slice(1);
      if (actualPath.length === 0) {
        textareaRef.current.setSelectionRange(0, jsonText.length);
        textareaRef.current.focus();
        return;
      }

      let currentIndex = 0;
      let rangeStart = -1;
      let rangeEnd = -1;

      for (let i = 0; i < actualPath.length; i++) {
        const key = actualPath[i];
        const isLast = i === actualPath.length - 1;
        const cleanKey = key.startsWith('[') && key.endsWith(']') ? null : key;
        
        if (cleanKey) {
            const searchPattern = `"${cleanKey}":`;
            const foundIndex = jsonText.indexOf(searchPattern, currentIndex);
            if (foundIndex !== -1) {
                currentIndex = foundIndex + searchPattern.length;
                if (isLast) {
                    rangeStart = foundIndex;
                    let valueStart = jsonText.indexOf(':', foundIndex) + 1;
                    while (jsonText[valueStart] === ' ' || jsonText[valueStart] === '\n') valueStart++;
                    
                    const char = jsonText[valueStart];
                    if (char === '{' || char === '[') {
                        const openChar = char;
                        const closeChar = char === '{' ? '}' : ']';
                        let depth = 0;
                        for (let j = valueStart; j < jsonText.length; j++) {
                          if (jsonText[j] === openChar) depth++;
                          if (jsonText[j] === closeChar) {
                            depth--;
                            if (depth === 0) {
                              rangeEnd = j + 1;
                              break;
                            }
                          }
                        }
                    } else {
                        const nextComma = jsonText.indexOf(',', valueStart);
                        const nextNewLine = jsonText.indexOf('\n', valueStart);
                        rangeEnd = Math.min(
                          nextComma !== -1 ? nextComma : jsonText.length, 
                          nextNewLine !== -1 ? nextNewLine : jsonText.length
                        );
                    }
                }
            } else {
                break;
            }
        }
      }

      if (rangeStart !== -1 && rangeEnd !== -1) {
        textareaRef.current.setSelectionRange(rangeStart, rangeEnd);
        textareaRef.current.focus();
        
        const fullTextBefore = jsonText.substring(0, rangeStart);
        const linesBefore = fullTextBefore.split('\n').length;
        textareaRef.current.scrollTop = (linesBefore - 10) * 18;
      }
    }
  }, [selectedNodeId, jsonText, history.present]);

  const pushToHistory = useCallback((newTree: TreeNode) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present].slice(-50),
      present: newTree,
      future: []
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      return {
        past: [...prev.past, prev.present],
        present: prev.future[0],
        future: prev.future.slice(1)
      };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && isZ && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((isMod && isZ && e.shiftKey) || (isMod && isY)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleRawChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      pushToHistory(transformJsonToTree(parsed));
      setError(null);
    } catch (e: any) {
      setError(`JSON Error: ${e.message}`);
    }
  };

  const onUpdateValue = (id: string, value: any) => pushToHistory(updateNodeValue(history.present, id, value));
  const onUpdateKey = (id: string, key: string) => pushToHistory(updateNodeKey(history.present, id, key));
  const onDelete = (id: string) => {
    const result = deleteNode(history.present, id);
    if (result) pushToHistory(result);
  };

  const onPrepareAddChild = (parentId: string, type?: 'object' | 'array' | 'primitive') => {
    const parent = findNodeInTree(history.present, parentId);
    if (!parent) return;
    setNodeCreator({
      isOpen: true,
      parentId,
      parentType: parent.type as any,
      suggestedType: type
    });
  };

  const onAddChild = (config: { key: string; type: 'object' | 'array' | 'primitive'; value: any }) => {
    const addChildRecursively = (root: TreeNode): TreeNode => {
      if (root.id === nodeCreator.parentId) {
        const newNode: TreeNode = {
          id: generateId(),
          key: root.type === 'array' ? `[${root.children.length}]` : config.key,
          value: config.type === 'primitive' ? config.value : undefined,
          type: config.type,
          depth: root.depth + 1,
          parentId: root.id,
          children: config.type === 'object' || config.type === 'array' ? [] : []
        };
        return {
          ...root,
          children: [...root.children, newNode]
        };
      }
      return {
        ...root,
        children: root.children.map(addChildRecursively)
      };
    };

    pushToHistory(addChildRecursively(history.present));
  };

  const onReparent = (sourceId: string, targetParentId: string) => {
    pushToHistory(reparentNode(history.present, sourceId, targetParentId));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <aside className="w-80 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              <FileJson className="text-white" size={20} />
            </div>
            <h1 className="font-black text-xl tracking-tighter text-white">NodeFlow</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">UI JSON Graph Editor</p>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-900/40 flex items-center justify-between border-b border-slate-800/50">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live JSON Source</span>
          </div>

          <div className="flex-1 relative overflow-hidden group">
            <textarea
              ref={textareaRef}
              className={`w-full h-full p-6 code-font text-[11px] bg-slate-950/80 text-emerald-400/90 outline-none resize-none transition-all focus:bg-slate-950 leading-relaxed selection:bg-indigo-500 selection:text-white ${error ? 'border-l-4 border-red-500' : ''}`}
              value={jsonText}
              onChange={(e) => handleRawChange(e.target.value)}
              spellCheck={false}
            />
            {error && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-500/90 backdrop-blur text-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-2xl">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          <footer className="p-6 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="https://github.com/marcusdavidalo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-white transition-colors"
                title="GitHub Profile"
              >
                <Github size={18} />
              </a>
              <a 
                href="https://ko-fi.com/marcusdavidalo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-indigo-400 transition-colors"
                title="Support on Ko-fi"
              >
                <KofiIcon size={18} />
              </a>
            </div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              © 2024 MARCDAVID
            </div>
          </footer>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-8">
            <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <button onClick={() => setShowRaw(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${!showRaw ? 'bg-slate-800 shadow-xl text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutGrid size={14} /> GRAPH
              </button>
              <button onClick={() => setShowRaw(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${showRaw ? 'bg-slate-800 shadow-xl text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                <Code size={14} /> RAW
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button disabled={history.past.length === 0} onClick={undo} className="p-2 hover:bg-slate-800 disabled:opacity-20 rounded-lg text-slate-400 transition-all hover:text-white">
                <RotateCcw size={16} />
              </button>
              <button disabled={history.future.length === 0} onClick={redo} className="p-2 hover:bg-slate-800 disabled:opacity-20 rounded-lg text-slate-400 transition-all hover:text-white">
                <RotateCw size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 relative bg-slate-950">
          {!showRaw && (
            <GraphCanvas 
              tree={history.present} 
              onUpdateValue={onUpdateValue}
              onUpdateKey={onUpdateKey}
              onDelete={onDelete}
              onPrepareAddChild={onPrepareAddChild}
              onReparent={onReparent}
              onSelectNode={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
            />
          )}
          {showRaw && (
             <div className="absolute inset-0 p-10 overflow-auto">
               <pre className="code-font text-emerald-400/80 whitespace-pre-wrap">{jsonText}</pre>
             </div>
          )}
        </div>

        <NodeCreatorModal 
          isOpen={nodeCreator.isOpen}
          onClose={() => setNodeCreator(prev => ({ ...prev, isOpen: false }))}
          onConfirm={onAddChild}
          parentType={nodeCreator.parentType}
          defaultType={nodeCreator.suggestedType}
        />
      </main>
    </div>
  );
}
