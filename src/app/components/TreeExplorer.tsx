'use client'
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown,  Trash2, Plus, Edit2, Undo } from 'lucide-react';

// Types
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];

const DEFAULT_DATA: JsonObject = {
  auto: {
    driver_types: {
      auto: true,
      img_url: '',
      is_active: true,
      is_open_for_signup: true,
      name: {
        bn: '',
        en: ''
      },
      verify_otp_for_signup: false
    }
  }
};

export default function TreeExplorer() {
  const [data, setData] = useState<JsonObject>(DEFAULT_DATA);
  const [selectedPath, setSelectedPath] = useState<string[]>(['auto', 'driver_types']);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'auto', 'auto.driver_types', 'auto.driver_types.name']));
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [newNodeName, setNewNodeName] = useState<string>('');
  const [newNodeValue, setNewNodeValue] = useState<string>('');
  const [renameValue, setRenameValue] = useState<string>('');
  const [actionToDelete, setActionToDelete] = useState<string[] | null>(null);
  const [actionToAdd, setActionToAdd] = useState<string[] | null>(null);
  const [actionToRename, setActionToRename] = useState<string[] | null>(null);
  const [history, setHistory] = useState<JsonObject[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('treeData');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch {
        console.error('Failed to load saved data');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('treeData', JSON.stringify(data));
  }, [data]);

  const saveToHistory = (newData: JsonObject): void => {
    setHistory(prev => [...prev.slice(-9), data]);
    setData(newData);
  };

  const undo = (): void => {
    if (history.length > 0) {
      const previous = history[history.length - 1];
      setData(previous);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const getValueAtPath = (obj: JsonObject, path: string[]): JsonValue => {
    return path.reduce((acc: unknown, key) => (typeof acc === 'object' && acc !== null ? (acc as Record<string, unknown>)[key] : undefined), obj) as JsonValue;
  };

  const setValueAtPath = (obj: JsonObject, path: string[], value: JsonValue): JsonObject => {
    if (path.length === 0) return value as JsonObject;
    const [first, ...rest] = path;
    return {
      ...obj,
      [first]: setValueAtPath((obj[first] as JsonObject) || {}, rest, value)
    };
  };

  const deleteAtPath = (obj: JsonObject, path: string[]): JsonObject => {
    if (path.length === 1) {
      const rest = { ...obj };
      delete rest[path[0]];
      return rest;
    }
    const [first, ...rest] = path;
    return {
      ...obj,
      [first]: deleteAtPath(obj[first] as JsonObject, rest)
    };
  };

  const toggleExpand = (path: string[]): void => {
    const key = path.join('.');
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectNode = (path: string[]): void => {
    setSelectedPath(path);
  };

  const handleImport = (): void => {
    try {
      const parsed = JSON.parse(importText);
      saveToHistory(parsed);
      setShowImportModal(false);
      setImportText('');
      setError('');
      setSelectedPath([]);
    } catch {
      setError('Invalid JSON format');
    }
  };

  const deleteNode = (): void => {
    if (!actionToDelete || actionToDelete.length === 0) return;
    const newData = deleteAtPath(data, actionToDelete);
    saveToHistory(newData);
    setShowDeleteModal(false);
    setActionToDelete(null);
    if (JSON.stringify(selectedPath).startsWith(JSON.stringify(actionToDelete))) {
      setSelectedPath([]);
    }
  };

  const addNode = (): void => {
    if (!newNodeName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    const targetPath = actionToAdd || [];
    const currentValue = (getValueAtPath(data, targetPath) as JsonObject) || {};
    
    let parsedValue: JsonValue;
    try {
      parsedValue = newNodeValue ? JSON.parse(newNodeValue) : {};
    } catch {
      parsedValue = newNodeValue;
    }

    const newValue: JsonObject = {
      ...currentValue,
      [newNodeName]: parsedValue
    };

    const newData = setValueAtPath(data, targetPath, newValue);
    saveToHistory(newData);
    setShowAddModal(false);
    setNewNodeName('');
    setNewNodeValue('');
    setActionToAdd(null);
    setError('');
  };

  const renameNode = (): void => {
    if (!renameValue.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (!actionToRename || actionToRename.length === 0) return;

    const parentPath = actionToRename.slice(0, -1);
    const oldKey = actionToRename[actionToRename.length - 1];
    const parent = getValueAtPath(data, parentPath) as JsonObject;
    
    const { [oldKey]: value, ...rest } = parent;
    const newParent: JsonObject = {
      ...rest,
      [renameValue]: value
    };

    const newData = setValueAtPath(data, parentPath, newParent);
    saveToHistory(newData);
    setShowRenameModal(false);
    setRenameValue('');
    setActionToRename(null);
    setError('');
  };

  const renderTree = (obj: JsonObject, path: string[] = []): React.ReactNode => {
    if (obj === null || typeof obj !== 'object') {
      return null;
    }

    return Object.keys(obj).map((key) => {
      const value = obj[key];
      const currentPath = [...path, key];
      const pathKey = currentPath.join('.');
      const isExpanded = expandedNodes.has(pathKey);
      const isSelected = JSON.stringify(selectedPath) === JSON.stringify(currentPath);
      const hasChildren = value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as JsonObject).length > 0;
      const isRoot = path.length === 0;

      return (
        <div key={key}>
          <div
            className={`flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-100 group ${
              isSelected ? 'bg-blue-50' : ''
            }`}
            onClick={() => selectNode(currentPath)}
          >
            <div className="flex items-center gap-1 flex-1">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(currentPath);
                  }}
                  className="p-0"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-600" />
                  )}
                </button>
              ) : (
                <div className="w-3.5" />
              )}
              <span className="text-sm text-gray-800">{key}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionToAdd(currentPath);
                    setShowAddModal(true);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Add"
                >
                  <Plus size={12} className="text-gray-600" />
                </button>
              )}
              {!isRoot && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionToRename(currentPath);
                      setRenameValue(key);
                      setShowRenameModal(true);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Rename"
                  >
                    <Edit2 size={12} className="text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionToDelete(currentPath);
                      setShowDeleteModal(true);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <Trash2 size={12} className="text-red-600" />
                  </button>
                </>
              )}
            </div>
          </div>
          {hasChildren && isExpanded && (
            <div className="ml-6 border-l border-gray-300">
              {renderTree(value as JsonObject, currentPath)}
            </div>
          )}
        </div>
      );
    });
  };

  const selectedValue = selectedPath.length > 0 ? getValueAtPath(data, selectedPath) : data;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm">Tree</span>
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
              title="Import JSON"
            >
              Import
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto py-2">
          {renderTree(data)}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            {selectedPath.map((segment, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-gray-400">&gt;</span>}
                <span className="text-gray-700 font-medium">{segment}</span>
              </React.Fragment>
            ))}
            {selectedPath.length === 0 && (
              <span className="text-gray-700 font-medium">root</span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <pre className="text-sm text-gray-800 font-mono leading-relaxed">
              {JSON.stringify(selectedValue || data, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Import JSON</h2>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-64 bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your JSON here..."
            />
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-800">{actionToDelete?.[actionToDelete.length - 1]}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={deleteNode}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setActionToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Property</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Name</label>
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., new_property"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Value (JSON or string)</label>
              <textarea
                value={newNodeValue}
                onChange={(e) => setNewNodeValue(e.target.value)}
                className="w-full h-24 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='e.g., {} or "value" or true'
              />
            </div>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button
                onClick={addNode}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewNodeName('');
                  setNewNodeValue('');
                  setActionToAdd(null);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Rename Property</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Name</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            <div className="flex gap-3">
              <button
                onClick={renameNode}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameValue('');
                  setActionToRename(null);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}