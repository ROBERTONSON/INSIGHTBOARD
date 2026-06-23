// 21st.dev Component: FileUpload / Dropzone
import React, { useState, useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import { parseCSV } from '../lib/csvParser';
import { computeColumnProfiles } from '../lib/analysisEngine';
import { detectPII } from '../lib/piiDetector';

export function UploadZone() {
  const { state, dispatch } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > 52_428_800) {
      setError('El archivo supera el límite de 50 MB.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Solo se aceptan archivos con extensión .csv.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await parseCSV(file, state.sessionId);
      
      // Dispatch the dataset first
      dispatch({ type: 'SET_DATASET', payload: { meta: result.meta, rows: result.rows } });
      
      if (result.warnings.length > 0) {
        dispatch({ type: 'ADD_WARNINGS', payload: result.warnings });
      }

      // Compute column profiles
      const profileResult = computeColumnProfiles(result.rows, result.meta.columns);
      dispatch({ type: 'SET_COLUMN_PROFILES', payload: profileResult.profiles });
      
      if (profileResult.warnings.length > 0) {
        dispatch({ type: 'ADD_WARNINGS', payload: profileResult.warnings });
      }

      // Detect PII
      const piiWarnings = detectPII(result.rows, result.meta.columns);
      if (piiWarnings.length > 0) {
        dispatch({ type: 'ADD_WARNINGS', payload: piiWarnings });
      }

    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo CSV.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  if (state.dataset) {
    return (
      <div className="flex justify-between items-center bg-green-50 text-green-800 p-4 rounded-lg border border-green-200 mt-6 shadow-sm">
        <div>
          <p className="font-semibold">Archivo cargado: {state.dataset.meta.filename}</p>
          <p className="text-sm">{state.dataset.meta.rowCount} filas × {state.dataset.meta.columnCount} columnas</p>
        </div>
        <button 
          onClick={() => dispatch({ type: 'RESET' })}
          className="px-4 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-green-100 transition-colors"
        >
          Cargar otro archivo
        </button>
      </div>
    );
  }

  return (
    <div className="my-6">
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
      >
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Arrastra tu archivo CSV aquí</h3>
        <p className="text-sm text-gray-500 mb-6">o selecciona un archivo desde tu equipo (Máx 50 MB)</p>
        
        <label className="cursor-pointer bg-blue-600 text-white px-6 py-2.5 rounded font-medium hover:bg-blue-700 transition-colors inline-block">
          Seleccionar Archivo
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            onChange={onFileChange} 
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && (
        <div className="mt-4 p-4 text-center text-blue-800 bg-blue-50 rounded-lg border border-blue-200">
          <div className="animate-pulse flex items-center justify-center">
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
             Procesando archivo...
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-sm flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
