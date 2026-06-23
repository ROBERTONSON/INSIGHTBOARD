# Requirements Document

## Introduction

InsightBoard es una plataforma web 100% client-side que permite a cualquier usuario subir un archivo CSV, seleccionar columnas de interés, y recibir automáticamente un reporte visual con estadísticas descriptivas, correlaciones, detección de outliers, distribuciones de frecuencias y tendencias temporales. No requiere backend: todo el procesamiento ocurre en el navegador del usuario, garantizando privacidad y aislamiento de sesiones.

## Glossary

- **InsightBoard**: El sistema web descrito en este documento.
- **CSV_Parser**: Componente responsable de leer y parsear archivos CSV en el navegador.
- **Pretty_Printer**: Componente que convierte una estructura CSV parseada de vuelta a texto CSV válido.
- **Analysis_Engine**: Componente que ejecuta todos los cálculos estadísticos y de detección.
- **Report_Renderer**: Componente que genera el dashboard visual con gráficos y resumen textual.
- **Session_Manager**: Componente que aísla los datos de cada pestaña/sesión de usuario.
- **PII_Detector**: Componente que detecta datos de identificación personal en columnas.
- **DatasetMeta**: Objeto JSON con campos `filename`, `rowCount`, `columnCount`, `columns[]`, `uploadedAt`, `sessionId`.
- **ColumnProfile**: Objeto JSON con campos `name`, `detectedType`, `nullCount`, `nullPercent`, `uniqueCount`, `stats{}`.
- **AnalysisResult**: Objeto JSON con campos `correlationMatrix`, `outliers[]`, `distributions[]`, `trends[]`, `warnings[]`.
- **Warning**: Objeto JSON con campos `type` (`"pii"` | `"high_nulls"` | `"duplicate_header"` | `"insufficient_data"`), `column`, `message`.
- **IQR**: Rango intercuartílico, método estadístico para detección de outliers.
- **Z-score**: Puntuación estándar, método alternativo para detección de outliers.
- **Columna numérica**: Columna cuyo tipo detectado es `numeric`.
- **Columna categórica**: Columna cuyo tipo detectado es `text` o `boolean`.
- **Columna temporal**: Columna cuyo tipo detectado es `date`.

---

## Requirements

### Requirement 1: Upload de Archivo CSV

**User Story:** Como usuario, quiero subir un archivo CSV mediante drag & drop o selección de archivo, para que InsightBoard pueda procesarlo y analizarlo.

#### Acceptance Criteria

1. THE InsightBoard SHALL proveer una zona de carga que acepte archivos mediante drag & drop y mediante selección manual de archivo.
2. WHEN el usuario suelta o selecciona un archivo cuyo tamaño supera 50MB, THE InsightBoard SHALL rechazar el archivo y mostrar un mensaje de error indicando el límite de tamaño.
3. WHEN el usuario suelta o selecciona un archivo cuya extensión no es `.csv`, THE InsightBoard SHALL rechazar el archivo y mostrar un mensaje indicando que solo se aceptan archivos CSV.
4. WHEN el usuario carga un archivo CSV válido, THE CSV_Parser SHALL parsear el archivo completamente en el navegador sin enviar datos a ningún servidor.
5. FOR ALL archivos CSV válidos, parsear el archivo a estructura interna y luego imprimirlo de vuelta a texto CSV con THE Pretty_Printer SHALL producir un CSV equivalente al original (round-trip property).
6. IF el archivo CSV contiene headers duplicados, THEN THE CSV_Parser SHALL renombrar automáticamente cada header duplicado añadiendo un sufijo numérico incremental (ej. `columna`, `columna_2`, `columna_3`) y SHALL registrar un Warning de tipo `"duplicate_header"` por cada header renombrado.

---

### Requirement 2: Preview y Detección de Tipos

**User Story:** Como usuario, quiero ver una vista previa del archivo cargado con los tipos de datos detectados por columna, para que pueda entender la estructura de mis datos antes de analizarlos.

#### Acceptance Criteria

1. WHEN el archivo CSV es parseado exitosamente, THE InsightBoard SHALL mostrar las primeras 10 filas del dataset en una tabla de vista previa.
2. WHEN el archivo CSV es parseado exitosamente, THE Analysis_Engine SHALL detectar automáticamente el tipo de cada columna clasificándolo como uno de: `numeric`, `text`, `date`, o `boolean`.
3. THE Analysis_Engine SHALL calcular por cada columna: el `nullCount` (cantidad de celdas vacías o nulas), el `nullPercent` (porcentaje respecto al total de filas) y el `uniqueCount` (cantidad de valores únicos).
4. WHEN una columna tiene un `nullPercent` mayor al 80%, THE InsightBoard SHALL marcar esa columna con un indicador de advertencia visible y SHALL registrar un Warning de tipo `"high_nulls"` para esa columna.
5. THE InsightBoard SHALL mostrar para cada columna en la vista previa: su nombre, tipo detectado, `nullPercent` y `uniqueCount` como indicadores de calidad de datos.

---

### Requirement 3: Selector de Columnas

**User Story:** Como usuario, quiero seleccionar cuáles columnas incluir en el análisis, para que el reporte se enfoque solo en los datos que me interesan.

#### Acceptance Criteria

1. WHEN la vista previa es presentada, THE InsightBoard SHALL mostrar un selector que permita al usuario activar o desactivar cada columna individualmente para incluirla o excluirla del análisis.
2. THE InsightBoard SHALL requerir que el usuario tenga al menos una columna seleccionada antes de permitir ejecutar el análisis.
3. WHEN el usuario inicia el análisis con columnas seleccionadas, THE Analysis_Engine SHALL procesar únicamente las columnas marcadas como activas.

---

### Requirement 4: Estadísticas Descriptivas

**User Story:** Como analista, quiero obtener estadísticas descriptivas por cada columna numérica seleccionada, para que pueda comprender la distribución y características de mis datos.

#### Acceptance Criteria

1. WHEN el análisis es ejecutado, THE Analysis_Engine SHALL calcular para cada columna numérica seleccionada: media, mediana, desviación estándar, valor mínimo, valor máximo, percentil 25 y percentil 75.
2. THE Analysis_Engine SHALL almacenar los resultados en el campo `stats{}` del objeto ColumnProfile correspondiente.
3. WHEN una columna numérica seleccionada tiene menos de 2 valores no nulos, THE Analysis_Engine SHALL omitir el cálculo de desviación estándar para esa columna y SHALL registrar un Warning de tipo `"insufficient_data"`.

---

### Requirement 5: Matriz de Correlación

**User Story:** Como analista, quiero ver la correlación entre columnas numéricas seleccionadas, para que pueda identificar relaciones entre variables.

#### Acceptance Criteria

1. WHEN el análisis es ejecutado con dos o más columnas numéricas seleccionadas, THE Analysis_Engine SHALL calcular la matriz de correlación de Pearson entre todas las columnas numéricas seleccionadas.
2. WHEN el par de columnas numéricas a correlacionar tiene menos de 30 filas con valores válidos (no nulos) en ambas columnas simultáneamente, THE Analysis_Engine SHALL omitir el cálculo de correlación para ese par y SHALL registrar un Warning de tipo `"insufficient_data"` indicando las columnas afectadas.
3. THE Analysis_Engine SHALL almacenar la matriz resultante en el campo `correlationMatrix` del objeto AnalysisResult.

---

### Requirement 6: Detección de Outliers

**User Story:** Como analista, quiero detectar valores atípicos en columnas numéricas, para que pueda identificar anomalías en mis datos.

#### Acceptance Criteria

1. WHEN el análisis es ejecutado, THE Analysis_Engine SHALL detectar outliers en cada columna numérica seleccionada usando el método IQR (valores fuera del rango [Q1 - 1.5×IQR, Q3 + 1.5×IQR]).
2. WHERE el usuario haya seleccionado el método Z-score, THE Analysis_Engine SHALL detectar outliers usando Z-score en lugar de IQR (valores con |z| > 3).
3. THE Analysis_Engine SHALL almacenar los outliers detectados en el campo `outliers[]` del objeto AnalysisResult, incluyendo el índice de fila, el nombre de columna y el valor.

---

### Requirement 7: Distribución de Frecuencias para Columnas Categóricas

**User Story:** Como analista, quiero ver la distribución de valores para columnas categóricas, para que pueda entender la frecuencia de cada categoría.

#### Acceptance Criteria

1. WHEN el análisis es ejecutado con columnas categóricas o booleanas seleccionadas, THE Analysis_Engine SHALL calcular la frecuencia absoluta y relativa de cada valor único en cada columna categórica o booleana seleccionada.
2. THE Analysis_Engine SHALL almacenar los resultados en el campo `distributions[]` del objeto AnalysisResult.

---

### Requirement 8: Detección de Tendencia Temporal

**User Story:** Como analista, quiero detectar tendencias en el tiempo cuando mis datos incluyen una columna de fechas, para que pueda identificar patrones temporales.

#### Acceptance Criteria

1. WHEN el análisis es ejecutado y al menos una columna de tipo `date` está seleccionada, THE Analysis_Engine SHALL detectar la tendencia temporal para cada columna numérica seleccionada respecto a la columna temporal, calculando la dirección (ascendente, descendente o estable) mediante regresión lineal.
2. THE Analysis_Engine SHALL almacenar los resultados de tendencia en el campo `trends[]` del objeto AnalysisResult.
3. WHEN hay múltiples columnas de tipo `date` seleccionadas, THE InsightBoard SHALL solicitar al usuario que indique cuál columna usar como eje temporal antes de ejecutar el análisis.

---

### Requirement 9: Detección de PII

**User Story:** Como usuario responsable, quiero que InsightBoard detecte y me alerte sobre columnas que podrían contener datos personales sensibles, para que pueda tomar decisiones informadas sobre el análisis.

#### Acceptance Criteria

1. WHEN el archivo CSV es parseado, THE PII_Detector SHALL inspeccionar los valores de cada columna para detectar patrones de: direcciones de email, números de teléfono, y documentos de identidad (RUT/DNI en formato estándar).
2. WHEN una columna contiene al menos un valor que coincide con un patrón PII, THE PII_Detector SHALL registrar un Warning de tipo `"pii"` para esa columna indicando el tipo de dato sensible detectado.
3. THE InsightBoard SHALL mostrar las alertas PII de manera visible antes de que el usuario inicie el análisis, permitiendo que el usuario decida si continúa.

---

### Requirement 10: Dashboard Visual

**User Story:** Como usuario, quiero ver un reporte visual con gráficos generados automáticamente, para que pueda interpretar los resultados del análisis de forma intuitiva.

#### Acceptance Criteria

1. WHEN el análisis es completado, THE Report_Renderer SHALL generar dinámicamente un dashboard que incluya los siguientes gráficos según los tipos de columnas seleccionadas:
   - Histograma por cada columna numérica
   - Heatmap de la matriz de correlación (solo si hay 2 o más columnas numéricas)
   - Box plot por cada columna numérica (mostrando outliers detectados)
   - Barras horizontales de frecuencia por cada columna categórica o booleana
   - Gráfico de línea de tendencia temporal por cada columna numérica respecto al eje temporal (solo si hay columna de tipo `date`)
2. THE Report_Renderer SHALL generar un resumen en texto con los hallazgos principales del análisis, incluyendo las correlaciones más fuertes, los outliers detectados y las advertencias registradas.
3. WHEN el dashboard es presentado, THE InsightBoard SHALL mostrar todas las advertencias (Warnings) del AnalysisResult de forma visible dentro del reporte.

---

### Requirement 11: Exportación del Reporte

**User Story:** Como usuario, quiero exportar el reporte generado, para que pueda compartirlo o archivarlo fuera de la plataforma.

#### Acceptance Criteria

1. WHEN el dashboard es presentado, THE InsightBoard SHALL proveer un botón de exportación que permita al usuario descargar el reporte como archivo PDF.
2. WHERE el usuario prefiera exportar como imagen, THE InsightBoard SHALL proveer una opción adicional para descargar el dashboard como imagen PNG.
3. WHEN el usuario activa la exportación, THE InsightBoard SHALL generar el archivo de exportación completamente en el navegador sin enviar datos a ningún servidor.

---

### Requirement 12: Aislamiento de Sesiones

**User Story:** Como usuario, quiero que mis datos estén completamente aislados de otros usuarios simultáneos, para que nadie más pueda acceder a mi información.

#### Acceptance Criteria

1. THE Session_Manager SHALL asignar un `sessionId` único a cada instancia de pestaña/ventana del navegador al momento de cargar la aplicación.
2. WHILE una sesión está activa, THE Session_Manager SHALL almacenar todos los datos del dataset y los resultados del análisis exclusivamente en el contexto de memoria de esa sesión (sin uso de almacenamiento compartido entre pestañas).
3. THE InsightBoard SHALL operar sin servidor backend, garantizando que los datos del usuario no abandonen el navegador en ningún momento del flujo.
4. WHEN una sesión es cerrada o la pestaña es cerrada, THE Session_Manager SHALL liberar todos los datos asociados a esa sesión de la memoria del navegador.
