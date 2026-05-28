// Tesseract.js OCR fallback browser-side.
// Lazy-loaded (~10MB WASM) — solo cuando pdf.js extracción es insuficiente.
// Corre en CPU del cliente, ~5-15s por página.

/**
 * Convierte una página de PDF a imagen y aplica OCR.
 * Devuelve texto extraído por OCR.
 *
 * @param {File|ArrayBuffer} pdfInput PDF original.
 * @param {(pct: number, page: number) => void} onProgress
 * @param {{ langs?: string, maxPages?: number }} options
 * @returns {Promise<{ ok: boolean, text: string, pages: number, page_texts: string[], error?: string }>}
 */
export async function ocrPdfWithTesseract(pdfInput, onProgress, options = {}) {
  try {
    // Lazy import Tesseract para no bloatar bundle inicial
    const { createWorker } = await import('tesseract.js');
    const pdfjsLib = await import('pdfjs-dist');

    const data = pdfInput instanceof ArrayBuffer ? pdfInput : await pdfInput.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const langs = options.langs ?? 'eng+spa';
    const maxPages = Math.min(pdf.numPages, options.maxPages ?? 30); // cap para no colgar navegador

    const worker = await createWorker(langs);
    const pageTexts = [];

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const { data: ocrData } = await worker.recognize(dataUrl);
      pageTexts.push(ocrData.text);
      if (onProgress) onProgress(Math.round((i / maxPages) * 100), i);
    }

    await worker.terminate();

    return {
      ok: true,
      text: pageTexts.join('\n\n').trim(),
      pages: maxPages,
      page_texts: pageTexts,
    };
  } catch (err) {
    return {
      ok: false,
      text: '',
      pages: 0,
      page_texts: [],
      error: err.message ?? String(err),
    };
  }
}
