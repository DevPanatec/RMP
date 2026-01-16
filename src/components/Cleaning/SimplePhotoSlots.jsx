import { useState } from 'react';
import { X, Check, Upload, Image as ImageIcon } from '../Icons';

/**
 * SimplePhotoSlots - Componente simplificado para subir 1 foto por etapa
 *
 * Props:
 * - photos: { before: [], during: [], after: [] }
 * - onPhotosChange: (newPhotos) => void
 * - disabled: boolean
 * - labels: { before: string, during: string, after: string } (opcional)
 */
const SimplePhotoSlots = ({
  photos,
  onPhotosChange,
  disabled = false,
  labels = { before: 'ANTES', during: 'DURANTE', after: 'DESPUÉS' }
}) => {
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = (file, category) => {
    if (!file || photos[category].length > 0) return;

    const preview = URL.createObjectURL(file);
    const newPhoto = {
      id: Date.now() + Math.random(),
      file,
      preview,
      type: category,
      name: file.name
    };

    onPhotosChange({
      ...photos,
      [category]: [newPhoto]
    });
  };

  const removePhoto = (category) => {
    const photo = photos[category][0];
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    onPhotosChange({
      ...photos,
      [category]: []
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/') && photos[category].length === 0) {
      handlePhotoUpload(file, category);
    }
  };

  const totalPhotos = (photos.before.length > 0 ? 1 : 0) +
                      (photos.during.length > 0 ? 1 : 0) +
                      (photos.after.length > 0 ? 1 : 0);

  const isComplete = totalPhotos === 3;

  const slotConfig = [
    { key: 'before', label: labels.before, number: 1, bgColor: '#fee2e2', textColor: '#dc2626' },
    { key: 'during', label: labels.during, number: 2, bgColor: '#fef3c7', textColor: '#d97706' },
    { key: 'after', label: labels.after, number: 3, bgColor: '#dcfce7', textColor: '#16a34a' }
  ];

  return (
    <div>
      {/* Header con contador */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <ImageIcon size={20} style={{ color: 'var(--color-primary, #3D5229)' }} />
        <span style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
          Evidencia Fotográfica
        </span>
        <span style={{
          fontSize: '12px',
          background: isComplete ? '#dcfce7' : '#fef3c7',
          color: isComplete ? '#166534' : '#92400e',
          padding: '4px 10px',
          borderRadius: '12px',
          fontWeight: '600'
        }}>
          {totalPhotos}/3
        </span>
      </div>

      {/* 3 Slots en fila */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px'
      }}>
        {slotConfig.map(({ key, label, number, bgColor, textColor }) => (
          <div key={key}>
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, key)}
              onClick={() => !disabled && photos[key].length === 0 && document.getElementById(`file-${key}`).click()}
              style={{
                position: 'relative',
                aspectRatio: '1',
                border: photos[key].length > 0 ? '2px solid #22c55e' : '2px dashed #94a3b8',
                borderRadius: '12px',
                cursor: disabled || photos[key].length > 0 ? 'default' : 'pointer',
                background: photos[key].length > 0 ? '#f0fdf4' : 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}
            >
              {photos[key].length > 0 ? (
                <>
                  <img
                    src={photos[key][0].preview || photos[key][0].url}
                    alt={label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(key); }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '20px 10px 10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>{label}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: textColor }}>{number}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>{label}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clic o arrastra</span>
                </>
              )}
            </div>
            <input
              id={`file-${key}`}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], key)}
              style={{ display: 'none' }}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {/* Mensaje de éxito */}
      {isComplete && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: '#dcfce7',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={18} style={{ color: '#16a34a' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>
            Evidencia fotográfica completa
          </span>
        </div>
      )}
    </div>
  );
};

export default SimplePhotoSlots;
