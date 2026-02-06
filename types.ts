
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export interface JsonArray extends Array<JsonValue> {}

export interface TreeNode {
  id: string;
  key: string;
  value: any;
  type: 'object' | 'array' | 'primitive';
  depth: number;
  children: TreeNode[];
  parentId?: string;
  x?: number;
  y?: number;
}

export interface GraphDimensions {
  width: number;
  height: number;
}
