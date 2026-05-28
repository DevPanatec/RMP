// PDF text extractor browser-side. Usa pdfjs-dist.
// 70% de OEM brochures son texto-nativo — no requieren OCR.
// Si extracción < threshold palabras → caller debe escalar a Tesseract fallback.

import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extrae texto-nativo de PDF.
 * @param {File|ArrayBuffer} input File del input o ArrayBuffer ya leído.
 * @param {(pct: number) => void} onProgress 0-100.
 * @returns {Promise<{ ok: boolean, text: string, pages: number, page_texts: string[], error?: string }>}
 */
export async function extractPdfText(input, onProgress) {
  try {
    const data = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: true }).promise;
    const pageCount = pdf.numPages;
    const pageTexts = [];
    let totalText = '';

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(it => it.str).join(' ');
      pageTexts.push(pageText);
      totalText += pageText + '\n\n';
      if (onProgress) onProgress(Math.round((i / pageCount) * 100));
    }

    return {
      ok: true,
      text: totalText.trim(),
      pages: pageCount,
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

/**
 * Detecta si extracción es suficiente o se necesita OCR fallback.
 * Threshold: <50 palabras totales o <10 palabras/página promedio.
 */
export function needsOcrFallback(extraction) {
  if (!extraction.ok) return true;
  const wordCount = extraction.text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) return true;
  const avgPerPage = wordCount / Math.max(1, extraction.pages);
  return avgPerPage < 10;
}
