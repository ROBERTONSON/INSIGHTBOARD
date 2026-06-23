
import { SessionProvider } from './context/SessionContext';
import { UploadZone } from './components/UploadZone';
import { DataPreview } from './components/DataPreview';
import { ColumnSelector } from './components/ColumnSelector';
import { ReportRenderer } from './components/ReportRenderer';

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <h1 className="text-2xl font-bold text-blue-700 flex items-center">
            <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            InsightBoard
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4 border border-gray-200">
          <p className="text-gray-600 text-lg">
            Sube tu archivo CSV para generar un análisis exploratorio automatizado con visualizaciones, 
            estadísticas descriptivas y detección de anomalías.
          </p>
        </div>

        <UploadZone />
        <DataPreview />
        <ColumnSelector />
        <ReportRenderer />
      </main>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
