/**
 * Lazy wrappers para reportPdfGenerator.
 * pdfmake pesa ~1MB; este wrapper hace dynamic import solo cuando se llama una función,
 * sacando pdfmake del bundle inicial.
 *
 * Uso: igual que antes, solo cambiar el path del import.
 *   import { generateRecoleccionPDFComplete } from '../../utils/lazyPdf';
 */

let modulePromise = null;

const getModule = () => {
  if (!modulePromise) {
    modulePromise = import('./reportPdfGenerator');
  }
  return modulePromise;
};

export const generateRecoleccionPDFComplete = async (...args) => {
  const m = await getModule();
  return m.generateRecoleccionPDFComplete(...args);
};

export const generateLimpiezaPDFComplete = async (...args) => {
  const m = await getModule();
  return m.generateLimpiezaPDFComplete(...args);
};

export const generateFumigacionPDFComplete = async (...args) => {
  const m = await getModule();
  return m.generateFumigacionPDFComplete(...args);
};

export const generateMantenimientoPDFComplete = async (...args) => {
  const m = await getModule();
  return m.generateMantenimientoPDFComplete(...args);
};

export const generateCombinedPDFComplete = async (...args) => {
  const m = await getModule();
  return m.generateCombinedPDFComplete(...args);
};

export const generateRecoleccionPDF = async (...args) => {
  const m = await getModule();
  return m.generateRecoleccionPDF(...args);
};

export const generateFumigacionPDF = async (...args) => {
  const m = await getModule();
  return m.generateFumigacionPDF(...args);
};

export const generateLimpiezaPDF = async (...args) => {
  const m = await getModule();
  return m.generateLimpiezaPDF(...args);
};

export const generateMantenimientoPDF = async (...args) => {
  const m = await getModule();
  return m.generateMantenimientoPDF(...args);
};

export const generateCombinedPDF = async (...args) => {
  const m = await getModule();
  return m.generateCombinedPDF(...args);
};

export const generateSingleRouteReportPDF = async (...args) => {
  const m = await getModule();
  return m.generateSingleRouteReportPDF(...args);
};
