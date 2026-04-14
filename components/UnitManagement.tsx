import React, { useState, useEffect } from 'react';
import { Unit } from '../types';
import { fetchUnits, createUnit, updateUnit, deleteUnit } from '../services/dataService';
import { Trash2, Edit2, Check, X, Plus, Building } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const UnitManagement = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUnitName, setNewUnitName] = useState('');
  
  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadUnits = async () => {
    setLoading(true);
    const data = await fetchUnits();
    setUnits(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    
    await createUnit(newUnitName.trim());
    setNewUnitName('');
    loadUnits();
  };

  const startEditing = (unit: Unit) => {
    setEditingId(unit.id);
    setEditValue(unit.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    
    await updateUnit(id, editValue.trim());
    setEditingId(null);
    loadUnits();
  };

  const handleDelete = async (id: string) => {
    await deleteUnit(id);
    loadUnits();
  };

  if (loading) return <div className="text-gray-500 text-center py-8">Loading units...</div>;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
           <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Unit / Division Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define the departments available in the booking dropdown.
          </p>
        </div>
      </div>

      {/* Add New Unit Form */}
      <form onSubmit={handleAddUnit} className="flex gap-2 mb-8 items-end max-w-lg">
        <div className="flex-grow">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">New Unit Name</label>
          <input 
            type="text" 
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            placeholder="e.g. Research & Development"
            className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500"
          />
        </div>
        <Button type="submit" icon={<Plus className="w-4 h-4" />}>
          Add
        </Button>
      </form>

      {/* Units List */}
      <div className="border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-full">Unit Name</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right min-w-[140px]">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {units.length === 0 ? (
                    <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 italic">No units defined.</td>
                    </tr>
                ) : (
                    units.map(unit => (
                        <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-3">
                                {editingId === unit.id ? (
                                    <input 
                                        type="text"
                                        value={editValue}
                                        autoFocus
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') saveEdit(unit.id);
                                            if(e.key === 'Escape') cancelEditing();
                                        }}
                                        className="w-full border border-indigo-300 dark:border-indigo-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                ) : (
                                    <span className="text-gray-900 dark:text-gray-200 font-medium">{unit.name}</span>
                                )}
                            </td>
                            <td className="px-6 py-3 text-right">
                                {editingId === unit.id ? (
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => saveEdit(unit.id)}
                                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                            title="Save"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={cancelEditing}
                                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => startEditing(unit)}
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(unit.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UnitManagement;
