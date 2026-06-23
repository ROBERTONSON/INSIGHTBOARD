# Implementation Plan: InsightBoard

## Overview

Pipeline de datos unidireccional construido en React 18 + TypeScript. Las tareas siguen el orden del flujo: Session_Manager → CSV_Parser/Pretty_Printer → PII_Detector → Analysis_Engine → Report_Renderer → ExportManager → UI de integración.

## Tasks

- [x] 1. Configurar estructura del proyecto e interfaces base
  - Inicializar proyecto con Vite + React 18 + TypeScript
  - Instalar dependencias: `papaparse`, `recharts`, `d3`, `simple-statistics`, `jspdf`, `html2canvas`, `tailwindcss`, `vitest`, `@testing-library/react`, `fast-check`
  - Crear los tipos e interfaces TypeScript en `src/types/index.ts`: `DatasetMeta`, `ColumnProfile`, `DescriptiveStats`, `AnalysisResult`, `CorrelationMatrix`, `OutlierEntry`, `Distribution`, `Trend`, `Warning`, `AnalysisError`
  - Crear la interfaz `ParseResult` en `src/types/index.ts`
  - Configurar Tailwind CSS y Vitest
  - _Requirements: 1.4, 2.2, 4.1, 5.1, 6.1_

- [x] 2. Implementar Session_Manager
  - [x] 2.1 Crear `src/context/SessionContext.tsx` con `SessionState`, `SessionProvider` y `useSession` hook
    - Inicializar `sessionId` con `crypto.randomUUID()` al montar el provider
    - Usar `useReducer` para gestionar el estado; nunca `localStorage`/`sessionStorage` para datos del dataset
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 2.2 Escribir property test para unicidad de sessionIds
    - **Property 17: Unicidad de sessionIds**
    - **Validates: Requirements 12.1**

- [x] 3. Implementar CSV_Parser y Pretty_Printer
  - [x] 3.1 Crear `src/lib/csvParser.ts` con la función `parseCSV(file, sessionId): Promise<ParseResult>`
    - Validar tamaño ≤ 50 MB y extensión `.csv` antes de parsear
    - Usar PapaParse para parsear; post-procesar headers duplicados añadiendo sufijo `_2`, `_3`, etc.
    - Registrar `Warning` de tipo `"duplicate_header"` por cada header renombrado
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 3.2 Crear `src/lib/prettyPrinter.ts` con la función `printCSV(rows, headers): string`
    - Usar la misma lógica de escape que PapaParse (comillas dobles para campos con coma, salto de línea o comilla)
    - _Requirements: 1.5_

  - [ ]* 3.3 Escribir property test para validación de tamaño de archivo
    - **Property 1: Validación de tamaño de archivo**
    - **Validates: Requirements 1.2**

  - [ ]* 3.4 Escribir property test para validación de extensión de archivo
    - **Property 2: Validación de extensión de archivo**
    - **Validates: Requirements 1.3**

  - [ ]* 3.5 Escribir property test de round-trip CSV
    - **Property 3: Round-trip CSV parse/print**
    - **Validates: Requirements 1.5**

  - [ ]* 3.6 Escribir property test de renombrado de headers duplicados
    - **Property 4: Renombrado de headers duplicados**
    - **Validates: Requirements 1.6**

- [x] 4. Checkpoint — Asegurar que todos los tests pasan
  - Ejecutar `vitest --run` y confirmar que no hay fallos. Consultar al usuario si hay dudas.

- [x] 5. Implementar PII_Detector
  - [x] 5.1 Crear `src/lib/piiDetector.ts` con `detectPII(rows, headers): Warning[]`
    - Implementar patrones regex: email, teléfono, RUT chileno, DNI español
    - Marcar columna como PII si al menos un valor coincide con algún patrón
    - _Requirements: 9.1, 9.2_

  - [ ]* 5.2 Escribir property test de correctitud de detección PII
    - **Property 15: Correctitud de detección PII**
    - **Validates: Requirements 9.1, 9.2**

- [x] 6. Implementar Analysis_Engine — Detección de tipos y métricas base
  - [x] 6.1 Crear `src/lib/analysisEngine.ts` con `detectTypes(rows, headers)` siguiendo la precedencia: boolean → date → numeric → text
    - Implementar la lógica de precedencia de tipos definida en el diseño
    - _Requirements: 2.2_

  - [x] 6.2 Implementar `computeColumnProfiles(rows, headers)` que calcule `nullCount`, `nullPercent` y `uniqueCount` por columna, y registre `Warning` de tipo `"high_nulls"` si `nullPercent > 80`
    - _Requirements: 2.3, 2.4_

  - [ ]* 6.3 Escribir property test de detección de tipos exhaustiva
    - **Property 5: Detección de tipos es exhaustiva**
    - **Validates: Requirements 2.2**

  - [ ]* 6.4 Escribir property test de invariantes de métricas nulas
    - **Property 6: Invariantes de métricas nulas**
    - **Validates: Requirements 2.3**

  - [ ]* 6.5 Escribir property test de warning high_nulls
    - **Property 7: Warning de high_nulls**
    - **Validates: Requirements 2.4**

- [x] 7. Implementar Analysis_Engine — Estadísticas descriptivas y correlación
  - [x] 7.1 Implementar `computeDescriptiveStats(values): DescriptiveStats` usando `simple-statistics`
    - Calcular media, mediana, stdDev, min, max, p25, p75
    - Devolver `stdDev = null` si la columna tiene menos de 2 valores no nulos y registrar `Warning` de tipo `"insufficient_data"`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Implementar `computeCorrelationMatrix(columns): CorrelationMatrix | null`
    - Omitir par y registrar `Warning "insufficient_data"` si hay menos de 30 filas válidas comunes
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 7.3 Escribir property test de invariantes de estadísticas descriptivas
    - **Property 10: Invariantes de estadísticas descriptivas**
    - **Validates: Requirements 4.1**

  - [ ]* 7.4 Escribir property test de invariantes estructurales de la matriz de correlación de Pearson
    - **Property 11: Invariantes estructurales de la matriz de correlación de Pearson**
    - **Validates: Requirements 5.1**

- [x] 8. Implementar Analysis_Engine — Outliers, distribuciones y tendencias
  - [x] 8.1 Implementar `detectOutliersIQR(values)` y `detectOutliersZScore(values)`, retornando `OutlierEntry[]`
    - IQR: fuera de `[Q1 - 1.5×IQR, Q3 + 1.5×IQR]`; Z-score: `|z| > 3`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.2 Implementar `computeDistributions(rows, columns): Distribution[]` con frecuencias absolutas y relativas
    - _Requirements: 7.1, 7.2_

  - [x] 8.3 Implementar `computeTrends(rows, dateCol, numericCols): Trend[]` con regresión lineal simple
    - Determinar `direction` según signo de pendiente: `> 0.001 → ascending`, `< -0.001 → descending`, resto `stable`
    - _Requirements: 8.1, 8.2_

  - [ ]* 8.4 Escribir property test de validez de outliers detectados
    - **Property 12: Validez de outliers detectados**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 8.5 Escribir property test de invariante de suma de distribuciones
    - **Property 13: Invariante de suma de distribuciones**
    - **Validates: Requirements 7.1**

  - [ ]* 8.6 Escribir property test de consistencia de dirección de tendencia con pendiente
    - **Property 14: Consistencia de dirección de tendencia con pendiente**
    - **Validates: Requirements 8.1**

- [x] 9. Ensamblar `runAnalysis` y cubrir requisito de columnas seleccionadas
  - [x] 9.1 Crear la función pública `runAnalysis(input: AnalysisInput): AnalysisResult` en `src/lib/analysisEngine.ts` que orqueste todas las sub-funciones usando solo las columnas en `selectedColumns`
    - _Requirements: 3.2, 3.3_

  - [ ]* 9.2 Escribir property test de columnas seleccionadas
    - **Property 9: El análisis solo incluye columnas seleccionadas**
    - **Validates: Requirements 3.3**

- [x] 10. Checkpoint — Asegurar que todos los tests pasan
  - Ejecutar `vitest --run` y confirmar que no hay fallos. Consultar al usuario si hay dudas.

- [x] 11. Implementar componentes de UI — Carga y preview
  - [x] 11.1 Crear `src/components/UploadZone.tsx` con soporte drag & drop y selección de archivo
    - Mostrar error si tamaño > 50 MB o extensión no es `.csv`
    - Conectar al `SessionContext` para disparar `parseCSV` y almacenar resultado
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 11.2 Crear `src/components/DataPreview.tsx` que muestre las primeras 10 filas y los `ColumnProfile` de cada columna
    - Mostrar nombre, tipo detectado, `nullPercent`, `uniqueCount` e indicador visual si `nullPercent > 80`
    - Mostrar alertas PII de forma visible antes de que el usuario inicie el análisis
    - _Requirements: 2.1, 2.4, 2.5, 9.3_

  - [ ]* 11.3 Escribir property test de renderizado completo de ColumnProfile
    - **Property 8: Renderizado completo de ColumnProfile**
    - **Validates: Requirements 2.5**

- [x] 12. Implementar componente ColumnSelector
  - [x] 12.1 Crear `src/components/ColumnSelector.tsx` con toggles por columna
    - Deshabilitar el botón de análisis si no hay ninguna columna seleccionada
    - Si hay múltiples columnas `date` seleccionadas, solicitar al usuario que elija el eje temporal antes de ejecutar
    - _Requirements: 3.1, 3.2, 8.3_

- [x] 13. Implementar Report_Renderer y gráficos
  - [x] 13.1 Crear `src/components/ReportRenderer.tsx` con la lógica de renderizado condicional de gráficos
    - Histograma y Box Plot (Recharts) por cada columna `numeric`
    - Barras horizontales de frecuencia (Recharts) por cada columna `text`/`boolean`
    - Línea temporal (Recharts) por cada columna `numeric` si hay columna `date`
    - _Requirements: 10.1_

  - [x] 13.2 Crear `src/components/CorrelationHeatmap.tsx` usando D3 (solo si ≥ 2 columnas numéricas)
    - _Requirements: 10.1_

  - [x] 13.3 Implementar sección de resumen textual de hallazgos y bloque de warnings visibles dentro del dashboard
    - _Requirements: 10.2, 10.3_

  - [ ]* 13.4 Escribir property test de completitud del dashboard generado
    - **Property 16: Completitud del dashboard generado**
    - **Validates: Requirements 10.2, 10.3**

- [x] 14. Implementar ExportManager
  - [x] 14.1 Crear `src/lib/exportManager.ts` con `exportToPDF(ref)` y `exportToPNG(ref)` usando `html2canvas` + `jsPDF`
    - Capturar errores de `html2canvas`/`jsPDF` y mostrar un toast de error no bloqueante; nunca enviar datos a un servidor
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 14.2 Agregar botones de exportación PDF y PNG en `ReportRenderer.tsx` conectados a `ExportManager`
    - _Requirements: 11.1, 11.2_

- [x] 15. Integración final y ensamblado de App
  - [x] 15.1 Crear `src/App.tsx` que envuelva toda la aplicación en `SessionProvider` y orqueste el flujo: `UploadZone → DataPreview → ColumnSelector → ReportRenderer`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 15.2 Escribir tests de integración del flujo completo upload → análisis → render
    - Verificar flujo end-to-end con un CSV de fixture usando React Testing Library
    - _Requirements: 1.4, 3.3, 10.1_

- [x] 16. Checkpoint final — Asegurar que todos los tests pasan
  - Ejecutar `vitest --run` y confirmar que no hay fallos. Consultar al usuario si hay dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los property tests usan fast-check con mínimo 100 iteraciones (`fc.configureGlobal({ numRuns: 100 })`)
- Los checkpoints validan el progreso incremental
- `Analysis_Engine` es pura (sin efectos secundarios); retorna `Result<T, AnalysisError>` en lugar de lanzar excepciones
