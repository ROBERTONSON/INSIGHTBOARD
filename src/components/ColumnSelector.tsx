// 21st.dev Component: Badge & Tabs
import { useState, useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { runAnalysis } from '../lib/analysisEngine';
import type { AnalysisInput } from '../types/index';

export function ColumnSelector() {
  const { state, dispatch } = useSession();
  const [temporalColumn, setTemporalColumn] = useState<string>('');
  const [outlierMethod, setOutlierMethod] = useState<'iqr' | 'zscore'>('iqr');

  const { columnProfiles, selectedColumns, dataset } = state;

  const handleToggle = (columnName: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnName)) {
      newSelected.delete(columnName);
    } else {
      newSelected.add(columnName);
    }
    dispatch({ type: 'SET_SELECTED_COLUMNS', payload: newSelected });
  };

  const handleToggleAll = () => {
    if (selectedColumns.size === columnProfiles.length) {
      dispatch({ type: 'SET_SELECTED_COLUMNS', payload: new Set() });
    } else {
      dispatch({ type: 'SET_SELECTED_COLUMNS', payload: new Set(columnProfiles.map(p => p.name)) });
    }
  };

  const selectedDateColumns = useMemo(() => {
    return columnProfiles
      .filter(p => p.detectedType === 'date' && selectedColumns.has(p.name))
      .map(p => p.name);
  }, [columnProfiles, selectedColumns]);

  // Si hay una sola columna de fecha seleccionada, la usamos por defecto
  // Si hay más de una, el usuario debe seleccionar explícitamente
  const effectiveTemporalColumn = selectedDateColumns.length === 1 
    ? selectedDateColumns[0] 
    : temporalColumn;

  const canRunAnalysis = selectedColumns.size > 0 && 
    (selectedDateColumns.length <= 1 || (selectedDateColumns.length > 1 && temporalColumn !== ''));

  const handleRunAnalysis = () => {
    if (!dataset || !canRunAnalysis) return;

    const input: AnalysisInput = {
      rows: dataset.rows,
      selectedColumns: Array.from(selectedColumns),
      columnProfiles,
      outlierMethod,
      temporalColumn: selectedDateColumns.length > 0 ? effectiveTemporalColumn : undefined,
    };

    const result = runAnalysis(input);
    
    dispatch({ type: 'SET_ANALYSIS_RESULT', payload: result });
    if (result.warnings.length > 0) {
      dispatch({ type: 'ADD_WARNINGS', payload: result.warnings });
    }
  };

  if (!dataset || columnProfiles.length === 0) {
    return null;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Selección de Columnas</h2>
        <button 
          onClick={handleToggleAll}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {selectedColumns.size === columnProfiles.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {columnProfiles.map((profile) => (
          <label 
            key={profile.name} 
            className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
          >
            <input 
              type="checkbox" 
              checked={selectedColumns.has(profile.name)}
              onChange={() => handleToggle(profile.name)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm truncate flex-grow" title={profile.name}>{profile.name}</span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 ml-auto">
              {profile.detectedType}
            </span>
          </label>
        ))}
      </div>

      {selectedDateColumns.length > 1 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            Múltiples columnas de fecha seleccionadas. Por favor elige el eje temporal para el análisis de tendencias:
          </p>
          <select 
            value={temporalColumn} 
            onChange={(e) => setTemporalColumn(e.target.value)}
            className="border border-gray-300 rounded text-sm p-2 w-full md:w-1/3"
          >
            <option value="" disabled>-- Selecciona una columna --</option>
            {selectedDateColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between border-t pt-4">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <label className="text-sm text-gray-700 flex items-center space-x-2">
            <span>Método Outliers:</span>
            <select 
              value={outlierMethod} 
              onChange={(e) => setOutlierMethod(e.target.value as 'iqr' | 'zscore')}
              className="border border-gray-300 rounded text-sm p-1"
            >
              <option value="iqr">Rango Intercuartílico (IQR)</option>
              <option value="zscore">Z-Score</option>
            </select>
          </label>
        </div>
        
        <button
          onClick={handleRunAnalysis}
          disabled={!canRunAnalysis}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Ejecutar Análisis
        </button>
      </div>
    </div>
  );
}
