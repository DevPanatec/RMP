import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FileText, Upload, X, Check, AlertTriangle, Loader } from '../Icons';
import { extractPdfText, needsOcrFallback } from '../../lib/pdfExtractor';
import { ocrPdfWithTesseract } from '../../lib/tesseractFallback';

const TIPOS = [
  { value: 'service_manual', label: 'Manual de servicio' },
  { value: 'parts_catalog', label: 'Catálogo de partes' },
  { value: 'operator_manual', label: 'Manual del operador' },
  { value: 'brochure', label: 'Brochure / Ficha técnica' },
];

// Modal: cliente sube manual PDF.
// Pipeline: pdf.js extrae texto (gratis browser). Si insuficiente, Tesseract.js OCR.
// Después: upload PDF a Convex storage + saveDocument mutation con texto extraído.
// Convex schedule processWithClaude (Claude Sonnet 4.6 → JSON structured).
export default function ManualUploadModal({ vehicle, modelYearId, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [tipo, setTipo] = useState('service_manual');
  const [licenseConfirm, setLicenseConfirm] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | extracting | ocr | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [extractionMethod, setExtractionMethod] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState(null);

  const generateUploadUrl = useMutation(api.oemDocuments.generateUploadUrl);
  const saveDocument = useMutation(api.oemDocuments.saveDocument);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Solo PDFs por ahora');
      return;
    }
    setFile(f);
    setError(null);
    setExtractedText('');
    setStage('extracting');
    setProgress(0);

    try {
      const extracted = await extractPdfText(f, (pct) => setProgress(pct));
      setPageCount(extracted.pages);
      if (extracted.ok && !needsOcrFallback(extracted)) {
        setExtractedText(extracted.text);
        setExtractionMethod('pdfjs');
        setStage('idle');
        return;
      }
      // Fallback OCR (lazy import, slow)
      setStage('ocr');
      setProgress(0);
      const ocr = await ocrPdfWithTesseract(f, (pct) => setProgress(pct), { maxPages: 20 });
      if (ocr.ok) {
        setExtractedText(ocr.text);
        setExtractionMethod('tesseract');
        setStage('idle');
      } else {
        setError(`Extracción falló: ${ocr.error}`);
        setStage('error');
      }
    } catch (err) {
      setError(err.message ?? String(err));
      setStage('error');
    }
  };

  const handleUpload = async () => {
    if (!file || !licenseConfirm) return;
    setStage('uploading');
    setError(null);
    try {
      // 1. Generate upload URL
      const uploadUrl = await generateUploadUrl();
      // 2. POST PDF binary
      const resp = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!resp.ok) throw new Error(`Upload HTTP ${resp.status}`);
      const { storageId } = await resp.json();
      // 3. Save document
      await saveDocument({
        vehiculo_id: vehicle._id,
        model_year_id: modelYearId,
        tipo,
        storage_id: storageId,
        file_name: file.name,
        file_size: file.size,
        page_count: pageCount,
        license_declaration: licenseConfirm,
        extracted_text: extractedText.slice(0, 100000), // cap
        extraction_method: extractionMethod,
      });
      setStage('done');
      setTimeout(() => onUploaded?.(), 1500);
    } catch (err) {
      setError(err.message ?? String(err));
      setStage('error');
    }
  };

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
  const ready = file && extractedText && licenseConfirm && stage === 'idle';

  return (
    <div className="manual-upload-overlay" onClick={onClose}>
      <div className="manual-upload-modal" onClick={e => e.stopPropagation()}>
        <div className="manual-upload-header">
          <FileText size={20} />
          <h3>Subir manual OEM</h3>
          <button className="manual-upload-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="manual-upload-body">
          <p className="manual-upload-info">
            Sube el manual del fabricante de <strong>{vehicle.placa}</strong>. El sistema
            extraerá el texto en tu navegador (gratis, privado) y enviará solo el texto a
            Claude para estructurarlo.
          </p>

          <div className="form-group-v2">
            <label>Tipo de documento</label>
            <select className="select-v2" value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group-v2">
            <label>Archivo PDF</label>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
          </div>

          {stage === 'extracting' && (
            <div className="manual-upload-progress">
              <Loader size={14} className="spin" />
              <span>Extrayendo texto del PDF… {progress}%</span>
            </div>
          )}

          {stage === 'ocr' && (
            <div className="manual-upload-progress">
              <Loader size={14} className="spin" />
              <span>Texto-nativo insuficiente. Ejecutando OCR Tesseract… {progress}%</span>
            </div>
          )}

          {extractedText && stage !== 'extracting' && stage !== 'ocr' && (
            <div className="manual-upload-extracted">
              <Check size={14} />
              <span>
                Extraídas {wordCount.toLocaleString()} palabras de {pageCount} páginas
                ({extractionMethod === 'tesseract' ? 'OCR Tesseract' : 'pdf.js'})
              </span>
            </div>
          )}

          <div className="form-group-v2">
            <label className="manual-upload-license">
              <input
                type="checkbox"
                checked={licenseConfirm}
                onChange={e => setLicenseConfirm(e.target.checked)}
              />
              <span>
                Confirmo que tengo derecho a usar este documento (lo compré con el equipo o
                tengo licencia del fabricante).
              </span>
            </label>
          </div>

          {error && (
            <div className="manual-upload-error">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {stage === 'done' && (
            <div className="manual-upload-success">
              <Check size={16} /> Subido. Procesando con Claude en segundo plano…
            </div>
          )}
        </div>

        <div className="manual-upload-footer">
          <button className="fi-btn fi-btn--ghost" onClick={onClose} disabled={stage === 'uploading'}>
            Cancelar
          </button>
          <button
            className="fi-btn fi-btn--primary"
            onClick={handleUpload}
            disabled={!ready || stage === 'uploading'}
          >
            {stage === 'uploading' ? <><Loader size={14} className="spin" /> Subiendo…</> : <><Upload size={14} /> Subir</>}
          </button>
        </div>
      </div>
    </div>
  );
}
