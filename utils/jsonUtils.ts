
import { TreeNode, JsonValue } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const transformJsonToTree = (
  data: JsonValue, 
  key: string = 'root', 
  depth: number = 0, 
  parentId?: string
): TreeNode => {
  const id = generateId();
  const type = Array.isArray(data) ? 'array' : (typeof data === 'object' && data !== null) ? 'object' : 'primitive';
  
  const node: TreeNode = {
    id,
    key,
    value: type === 'primitive' ? data : undefined,
    type,
    depth,
    parentId,
    children: []
  };

  if (type === 'object') {
    node.children = Object.entries(data as any).map(([k, v]) => transformJsonToTree(v as JsonValue, k, depth + 1, id));
  } else if (type === 'array') {
    node.children = (data as any[]).map((v, i) => transformJsonToTree(v, `[${i}]`, depth + 1, id));
  }

  return node;
};

export const transformTreeToJson = (node: TreeNode): any => {
  if (node.type === 'primitive') {
    return node.value;
  }
  
  if (node.type === 'array') {
    return node.children.map(child => transformTreeToJson(child));
  }
  
  const obj: any = {};
  node.children.forEach(child => {
    obj[child.key] = transformTreeToJson(child);
  });
  return obj;
};

export const updateNodeValue = (root: TreeNode, targetId: string, newValue: any): TreeNode => {
  if (root.id === targetId) {
    return { ...root, value: newValue };
  }
  return {
    ...root,
    children: root.children.map(child => updateNodeValue(child, targetId, newValue))
  };
};

export const updateNodeKey = (root: TreeNode, targetId: string, newKey: string): TreeNode => {
  if (root.id === targetId) {
    return { ...root, key: newKey };
  }
  return {
    ...root,
    children: root.children.map(child => updateNodeKey(child, targetId, newKey))
  };
};

export const deleteNode = (root: TreeNode, targetId: string): TreeNode | null => {
  if (root.id === targetId) return null;
  const newChildren = root.children
    .map(child => deleteNode(child, targetId))
    .filter((child): child is TreeNode => child !== null);
  return { ...root, children: newChildren };
};

export const addChildNode = (root: TreeNode, targetId: string, type: 'object' | 'array' | 'primitive'): TreeNode => {
  if (root.id === targetId) {
    const newKey = root.type === 'array' ? `[${root.children.length}]` : `newKey_${root.children.length}`;
    const defaultValue = type === 'object' ? {} : type === 'array' ? [] : "";
    const newNode = transformJsonToTree(defaultValue, newKey, root.depth + 1, root.id);
    return {
      ...root,
      children: [...root.children, newNode]
    };
  }
  return {
    ...root,
    children: root.children.map(child => addChildNode(child, targetId, type))
  };
};

export const findNodeInTree = (root: TreeNode, id: string): TreeNode | null => {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
};

export const getAllDescendantIds = (node: TreeNode): string[] => {
  let ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.id);
    ids = ids.concat(getAllDescendantIds(child));
  }
  return ids;
};

export const getNodePath = (root: TreeNode, targetId: string, currentPath: string[] = []): string[] | null => {
  if (root.id === targetId) return [...currentPath, root.key];
  for (const child of root.children) {
    const res = getNodePath(child, targetId, [...currentPath, root.key]);
    if (res) return res;
  }
  return null;
};

export const reparentNode = (root: TreeNode, sourceId: string, targetParentId: string): TreeNode => {
  if (sourceId === root.id) return root;
  
  const sourceNode = findNodeInTree(root, sourceId);
  if (!sourceNode) return root;

  const treeWithoutSource = deleteNode(root, sourceId);
  if (!treeWithoutSource) return root;

  const addToNewParent = (node: TreeNode): TreeNode => {
    if (node.id === targetParentId) {
      if (node.type === 'primitive') return node;
      
      const updatedSource = { 
        ...sourceNode, 
        parentId: targetParentId,
        depth: node.depth + 1,
        key: node.type === 'array' ? `[${node.children.length}]` : sourceNode.key
      };
      
      return {
        ...node,
        children: [...node.children, updatedSource]
      };
    }
    return {
      ...node,
      children: node.children.map(addToNewParent)
    };
  };

  return addToNewParent(treeWithoutSource);
};
