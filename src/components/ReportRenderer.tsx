import { useRef, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { exportToPNG, exportToPDF } from '../lib/exportManager';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';

export function ReportRenderer() {
  const { state } = useSession();
  const { analysisResult, warnings, dataset, columnProfiles } = state;
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!analysisResult || !dataset) return null;

  const profilesMap = new Map(columnProfiles.map(p => [p.name, p]));

  const renderCategoricalChart = (dist: any) => {
    return (
      <div key={`dist-${dist.column}`} className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <h3 className="font-semibold text-lg mb-4 text-center">Frecuencias: {dist.column}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dist.frequencies.slice(0, 15)} layout="vertical" margin={{ left: 50, right: 20, top: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis dataKey="value" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{fill: '#f5f5f5'}} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Frecuencia" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderNumericCharts = (colName: string) => {
    const profile = profilesMap.get(colName);
    const stats = profile?.stats;
    if (!stats) return null;

    const values = dataset.rows
      .map(r => parseFloat(r[colName]))
      .filter(n => !isNaN(n) && isFinite(n));
    
    const bins = 10;
    const min = stats.min;
    const max = stats.max;
    const range = max - min;
    const binSize = range === 0 ? 1 : range / bins;
    
    const histData = Array.from({ length: bins }, (_, i) => ({
      bin: `${(min + i * binSize).toFixed(1)} - ${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0
    }));

    values.forEach(v => {
      let idx = Math.floor((v - min) / binSize);
      if (idx === bins) idx--; 
      if (idx >= 0 && idx < bins) histData[idx].count++;
    });

    return (
      <div key={`num-${colName}`} className="bg-white p-6 rounded-lg shadow border border-gray-200 col-span-1 md:col-span-2">
        <h3 className="font-bold text-xl mb-6 text-center text-gray-800">Distribución: {colName}</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64">
            <h4 className="text-sm font-semibold text-center text-gray-500 mb-4">Histograma</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bin" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{fill: '#f5f5f5'}} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Frecuencia" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 flex flex-col items-center justify-center">
            <h4 className="text-sm font-semibold text-center text-gray-500 mb-4">Box Plot (Estadísticas)</h4>
            <svg width="220" height="180" className="bg-gray-50 rounded-lg border border-gray-200 p-2">
               {(() => {
                 const pad = 30;
                 const w = 180;
                 const h = 120;
                 const scale = (val: number) => {
                   if (range === 0) return pad + h/2;
                   return pad + h - ((val - min) / range) * h;
                 };
                 const q1Y = scale(stats.p25);
                 const q3Y = scale(stats.p75);
                 const medY = scale(stats.median);
                 const minY = scale(stats.min);
                 const maxY = scale(stats.max);

                 return (
                   <g transform="translate(20, 0)">
                     <line x1={w/2} y1={minY} x2={w/2} y2={maxY} stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 4" />
                     <line x1={w/2 - 20} y1={minY} x2={w/2 + 20} y2={minY} stroke="#4b5563" strokeWidth="2" />
                     <line x1={w/2 - 20} y1={maxY} x2={w/2 + 20} y2={maxY} stroke="#4b5563" strokeWidth="2" />
                     <rect x={w/2 - 30} y={q3Y} width="60" height={Math.max(1, q1Y - q3Y)} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="2" rx="2" />
                     <line x1={w/2 - 30} y1={medY} x2={w/2 + 30} y2={medY} stroke="#1d4ed8" strokeWidth="3" />
                     <text x={w/2 + 45} y={maxY} fontSize="11" fill="#4b5563" alignmentBaseline="middle">Máx</text>
                     <text x={w/2 + 45} y={q3Y} fontSize="11" fill="#4b5563" alignmentBaseline="middle">Q3</text>
                     <text x={w/2 + 45} y={medY} fontSize="11" fill="#1d4ed8" fontWeight="bold" alignmentBaseline="middle">Med</text>
                     <text x={w/2 + 45} y={q1Y} fontSize="11" fill="#4b5563" alignmentBaseline="middle">Q1</text>
                     <text x={w/2 + 45} y={minY} fontSize="11" fill="#4b5563" alignmentBaseline="middle">Mín</text>
                   </g>
                 )
               })()}
            </svg>
            <div className="mt-4 text-xs text-gray-600 grid grid-cols-3 gap-x-4">
              <span className="bg-gray-100 px-2 py-1 rounded">Media: <strong className="text-gray-800">{stats.mean.toFixed(2)}</strong></span>
              <span className="bg-gray-100 px-2 py-1 rounded">Mediana: <strong className="text-gray-800">{stats.median.toFixed(2)}</strong></span>
              <span className="bg-gray-100 px-2 py-1 rounded">Desv: <strong className="text-gray-800">{stats.stdDev?.toFixed(2) ?? 'N/A'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrendCharts = () => {
    return analysisResult.trends.map(trend => {
      const trendData = dataset.rows
        .map(r => ({
          date: r[trend.temporalColumn],
          timestamp: Date.parse(r[trend.temporalColumn]),
          value: parseFloat(r[trend.column])
        }))
        .filter(d => !isNaN(d.timestamp) && !isNaN(d.value) && isFinite(d.value))
        .sort((a, b) => a.timestamp - b.timestamp);

      return (
        <div key={`trend-${trend.column}`} className="bg-white p-4 rounded-lg shadow border border-gray-200">
           <h3 className="font-semibold text-lg mb-2 text-center">Evolución: {trend.column}</h3>
           <p className="text-sm text-center text-gray-500 mb-4">
             Tendencia: <span className="font-bold capitalize text-purple-600">{trend.direction}</span> (R² = {trend.rSquared.toFixed(2)})
           </p>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                 <YAxis tick={{ fontSize: 11 }} />
                 <Tooltip />
                 <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name={trend.column} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      );
    });
  };

  const handleExportPNG = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      await exportToPNG(reportRef.current);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      await exportToPDF(reportRef.current);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-end items-center space-x-4 mb-4">
        {isExporting && <span className="text-gray-500 text-sm animate-pulse">Generando reporte...</span>}
        <button 
          onClick={handleExportPNG} 
          disabled={isExporting}
          className="bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded shadow-sm text-sm border border-gray-300 disabled:opacity-50 transition-colors"
        >
          Exportar a PNG
        </button>
        <button 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm disabled:opacity-50 transition-colors"
        >
          Exportar a PDF
        </button>
      </div>

      <div id="insightboard-report" ref={reportRef} className="space-y-8 pb-16 bg-gray-50 rounded-lg p-2 md:p-6">
        {/* Resumen y Warnings */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Resumen del Análisis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
           <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-center shadow-sm">
             <div className="text-4xl font-black mb-1">{dataset.meta.rowCount}</div>
             <div className="text-xs font-semibold uppercase tracking-wide">Filas Totales</div>
           </div>
           <div className="p-4 bg-green-50 border border-green-100 text-green-800 rounded-lg text-center shadow-sm">
             <div className="text-4xl font-black mb-1">{dataset.meta.columnCount}</div>
             <div className="text-xs font-semibold uppercase tracking-wide">Columnas Totales</div>
           </div>
           <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-lg text-center shadow-sm">
             <div className="text-4xl font-black mb-1">{analysisResult.outliers.length}</div>
             <div className="text-xs font-semibold uppercase tracking-wide">Atípicos Detectados</div>
           </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-lg mt-6">
            <h3 className="text-base font-bold text-yellow-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Advertencias y Observaciones
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-sm text-yellow-900">
              {warnings.map((w, idx) => (
                <li key={idx}><strong>[{w.column}]</strong>: {w.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Gráficos Numéricos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {Array.from(profilesMap.values())
           .filter(p => p.detectedType === 'numeric' && state.selectedColumns.has(p.name))
           .map(p => renderNumericCharts(p.name))}
      </div>

      {/* Gráficos Categóricos */}
      {analysisResult.distributions.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mt-10 mb-6 text-gray-800 border-b pb-2">Distribuciones Categóricas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {analysisResult.distributions.map(renderCategoricalChart)}
          </div>
        </>
      )}

      {/* Gráficos de Tendencia Temporal */}
      {analysisResult.trends.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mt-10 mb-6 text-gray-800 border-b pb-2">Análisis de Tendencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderTrendCharts()}
          </div>
        </>
      )}

      {/* Mapa de Correlación */}
      {analysisResult.correlationMatrix && (
        <div className="bg-white p-8 rounded-lg shadow border border-gray-200 mt-8">
          <h2 className="text-2xl font-bold mb-2 text-center text-gray-800">Matriz de Correlación (Pearson)</h2>
          <p className="text-sm text-gray-500 text-center mb-8 max-w-2xl mx-auto">
            Visualización de la relación lineal entre las variables numéricas. Valores cercanos a 1 (azul) indican correlación positiva fuerte, mientras que valores cercanos a -1 (rojo) indican correlación negativa fuerte.
          </p>
          <CorrelationHeatmap matrix={analysisResult.correlationMatrix} />
        </div>
      )}
      </div>
    </div>
  );
}
