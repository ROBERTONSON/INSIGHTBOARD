import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture an HTMLElement and return an HTMLCanvasElement
 */
async function captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 2, // Mayor resolución
    useCORS: true, 
    logging: false,
    backgroundColor: '#ffffff'
  });
}

export async function exportToPNG(element: HTMLElement, filename = 'insightboard-report.png'): Promise<void> {
  try {
    const canvas = await captureElement(element);
    const dataUrl = canvas.toDataURL('image/png');
    
    // Disparar descarga
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exportando PNG:', error);
    throw new Error('No se pudo generar la imagen PNG del reporte.');
  }
}

export async function exportToPDF(element: HTMLElement, filename = 'insightboard-report.pdf'): Promise<void> {
  try {
    const canvas = await captureElement(element);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    // Calcular altura para mantener la proporción de aspecto
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error exportando PDF:', error);
    throw new Error('No se pudo generar el documento PDF del reporte.');
  }
}
