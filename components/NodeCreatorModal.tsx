
import React, { useState } from 'react';
import { X, Check, Braces, List, Type, Hash, ToggleLeft } from 'lucide-react';

interface NodeCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: { key: string; type: 'object' | 'array' | 'primitive'; value: any }) => void;
  parentType: 'object' | 'array' | 'root';
  defaultType?: 'object' | 'array' | 'primitive';
}

const NodeCreatorModal: React.FC<NodeCreatorModalProps> = ({ isOpen, onClose, onConfirm, parentType, defaultType = 'primitive' }) => {
  const [key, setKey] = useState(parentType === 'array' ? '' : 'newKey');
  const [type, setType] = useState<'object' | 'array' | 'primitive'>(defaultType);
  const [primitiveType, setPrimitiveType] = useState<'string' | 'number' | 'boolean'>('string');
  const [val, setVal] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    let finalValue: any = null;
    if (type === 'object') finalValue = {};
    else if (type === 'array') finalValue = [];
    else {
      if (primitiveType === 'string') finalValue = val;
      else if (primitiveType === 'number') finalValue = Number(val) || 0;
      else if (primitiveType === 'boolean') finalValue = val.toLowerCase() === 'true';
    }
    onConfirm({ key: parentType === 'array' ? '' : key, type, value: finalValue });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <PlusCircle size={20} className="text-indigo-500" />
            Create New Node
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {parentType !== 'array' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Key</label>
              <input 
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-medium"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter key name..."
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setType('primitive')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${type === 'primitive' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'}`}
              >
                <Type size={20} />
                <span className="text-[10px] font-bold">Value</span>
              </button>
              <button 
                onClick={() => setType('object')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${type === 'object' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'}`}
              >
                <Braces size={20} />
                <span className="text-[10px] font-bold">Object</span>
              </button>
              <button 
                onClick={() => setType('array')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${type === 'array' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'}`}
              >
                <List size={20} />
                <span className="text-[10px] font-bold">Array</span>
              </button>
            </div>
          </div>

          {type === 'primitive' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button onClick={() => setPrimitiveType('string')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${primitiveType === 'string' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500'}`}>
                   <Type size={12} /> STRING
                </button>
                <button onClick={() => setPrimitiveType('number')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${primitiveType === 'number' ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500'}`}>
                   <Hash size={12} /> NUMBER
                </button>
                <button onClick={() => setPrimitiveType('boolean')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${primitiveType === 'boolean' ? 'bg-slate-800 text-pink-400 shadow-sm' : 'text-slate-500'}`}>
                   <ToggleLeft size={12} /> BOOL
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Initial Value</label>
                {primitiveType === 'boolean' ? (
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-medium appearance-none"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input 
                    type={primitiveType === 'number' ? 'number' : 'text'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 text-white font-medium"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={primitiveType === 'number' ? '0' : 'Value...'}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-800 text-slate-400 font-bold text-xs hover:bg-slate-800 transition-colors">
            CANCEL
          </button>
          <button onClick={handleConfirm} className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
            <Check size={16} /> CREATE NODE
          </button>
        </div>
      </div>
    </div>
  );
};

const PlusCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

export default NodeCreatorModal;
