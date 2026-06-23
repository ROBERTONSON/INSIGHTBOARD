# 📊 InsightBoard

InsightBoard es una aplicación web local que permite a los usuarios realizar **análisis exploratorio de datos (EDA) automatizado** de forma segura, rápida e interactiva, directamente en el navegador y sin enviar datos a la nube.

## 🚀 Características Principales

- **Carga de Datos Locales:** Sube archivos `.csv` de forma segura. Todo se procesa en la memoria de tu navegador sin enviar nada a servidores externos.
- **Análisis de Tipos y Anomalías:** Detección automática de variables (numéricas, categóricas, fechas, booleanas) y valores atípicos usando métodos estadísticos (Z-Score, Rango Intercuartílico).
- **Alerta de Datos Sensibles (PII):** Detección temprana de correos electrónicos, teléfonos y tarjetas de crédito para proteger la privacidad.
- **Visualización Interactiva:** Generación automática de histogramas, box plots (diagramas de caja), gráficos de barras de frecuencia y gráficos de evolución temporal.
- **Matriz de Correlación:** Mapa de calor (heatmap) para explorar las correlaciones de Pearson entre variables numéricas de un vistazo.
- **Exportación Fácil:** Guarda tu reporte completo en formato PNG o PDF con un solo clic para presentarlo.

## 🛠️ Tecnologías Utilizadas

- **Core:** React 18, TypeScript, Vite
- **Estilos:** Tailwind CSS, Lucide React (Íconos)
- **Visualización de Datos:** Recharts, D3.js
- **Procesamiento de Datos:** PapaParse (CSV), Simple-Statistics (Estadísticas Matemáticas)
- **Exportación:** html2canvas, jsPDF
- **Testing:** Vitest, Fast-Check (Property-based testing)

## 💻 Desarrollo Local

Sigue estos pasos para levantar la aplicación en tu propio entorno de desarrollo:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/ROBERTONSON/INSIGHTBOARD.git
   cd INSIGHTBOARD
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Levantar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   La aplicación estará disponible típicamente en `http://localhost:5173`.

## 📦 Despliegue (Vercel)

Este proyecto está optimizado para ser desplegado fácilmente en [Vercel](https://vercel.com/):

1. Inicia sesión en Vercel y vincula tu cuenta de GitHub.
2. Importa el repositorio `INSIGHTBOARD`.
3. Vercel detectará automáticamente que es un proyecto basado en **Vite**.
4. Presiona **Deploy** y en segundos tendrás tu aplicación en vivo.

## 📝 Documentación del Proyecto

Las especificaciones técnicas, diseño de arquitectura y listado de requerimientos se encuentran en la carpeta oculta `.kiro/specs/insightboard/` en la raíz de este proyecto.
