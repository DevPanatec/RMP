import { useState } from 'react';
import './ReportModal.css';

const ReportModal = ({ isOpen, onClose, onSubmit, currentStop }) => {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Media');
  const [photos, setPhotos] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reportType || !description) return;

    const report = {
      type: reportType,
      description,
      severity,
      stop: currentStop,
      timestamp: new Date().toISOString(),
      status: 'Abierto',
      photos: photos
    };

    onSubmit(report);
    
    // Reset form
    setReportType('');
    setDescription('');
    setSeverity('Media');
    setPhotos([]);
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newPhoto = {
            id: Date.now() + Math.random(),
            file: file,
            dataUrl: event.target.result,
            name: file.name,
            size: file.size
          };
          setPhotos(prev => [...prev, newPhoto]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const handleClose = () => {
    setReportType('');
    setDescription('');
    setSeverity('Media');
    setPhotos([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content report-modal">
        <div className="modal-header">
          <h2>⚠️ Reportar Problema</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-group">
            <label htmlFor="reportType">Tipo de Problema:</label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Seleccionar tipo...</option>
              <option value="Externo">🌍 Externo</option>
              <option value="Interno">🚛 Interno</option>
            </select>
          </div>

          {reportType === 'Externo' && (
            <div className="form-help">
              <p>📝 Problemas externos incluyen:</p>
              <ul>
                <li>• Obstrucciones en la vía</li>
                <li>• Grupos de personas que impiden el acceso</li>
                <li>• Situaciones de seguridad</li>
                <li>• Problemas con residentes</li>
              </ul>
            </div>
          )}

          {reportType === 'Interno' && (
            <div className="form-help">
              <p>📝 Problemas internos incluyen:</p>
              <ul>
                <li>• Fallas mecánicas del camión</li>
                <li>• Problemas de combustible</li>
                <li>• Equipos dañados</li>
                <li>• Problemas operativos</li>
              </ul>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="severity">Severidad:</label>
            <select
              id="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="form-select"
            >
              <option value="Baja">🟢 Baja</option>
              <option value="Media">🟡 Media</option>
              <option value="Alta">🔴 Alta</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción del Problema:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Describe detalladamente el problema encontrado..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Parada Actual:</label>
            <div className="current-stop-info">
              📍 {currentStop || 'No especificada'}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="photos">Adjuntar Fotos (opcional):</label>
            <input
              type="file"
              id="photos"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="form-file-input"
            />
            <div className="file-help">
              📸 Puedes seleccionar múltiples fotos (JPG, PNG, etc.)
            </div>
            
            {photos.length > 0 && (
              <div className="photos-preview">
                <h4>Fotos adjuntas:</h4>
                <div className="photos-grid">
                  {photos.map(photo => (
                    <div key={photo.id} className="photo-item">
                      <img src={photo.dataUrl} alt="Preview" className="photo-preview" />
                      <div className="photo-info">
                        <span className="photo-name">{photo.name}</span>
                        <span className="photo-size">{(photo.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={() => removePhoto(photo.id)}
                        title="Eliminar foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={handleClose}>
              ❌ Cancelar
            </button>
            <button type="submit" className="btn btn--danger">
              ⚠️ Enviar Reporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;