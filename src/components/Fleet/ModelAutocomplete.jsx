import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Autocomplete fuzzy contra KB de modelos.
// Props:
//   value: string actual
//   onChange: (text) => void (texto libre)
//   onSelectModel: (modelDoc) => void (cuando usuario elige sugerencia del KB)
//   makeFilterId: Id<"makes"> opcional para filtrar por marca
//   placeholder
export default function ModelAutocomplete({
  value,
  onChange,
  onSelectModel,
  makeFilterId,
  placeholder = 'ej: Granite, M30, FH16',
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Solo consulta cuando hay 2+ caracteres
  const suggestions = useQuery(
    api.models.search,
    value && value.length >= 2
      ? { query: value, make_id: makeFilterId ?? undefined, limit: 8 }
      : 'skip',
  );

  // Cerrar al click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSelect = (model) => {
    onChange(model.nombre);
    onSelectModel?.(model);
    setOpen(false);
  };

  return (
    <div className="model-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="model-autocomplete__input"
        autoComplete="off"
      />
      {open && Array.isArray(suggestions) && suggestions.length > 0 && (
        <ul className="model-autocomplete__dropdown">
          {suggestions.map((m) => (
            <li
              key={m._id}
              className="model-autocomplete__item"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(m);
              }}
            >
              <span className="model-autocomplete__name">{m.nombre}</span>
              <span className="model-autocomplete__meta">
                {m.equipment_class}
                {m.validated && ' · ✓ validado'}
                {m.visibility === 'global' && ' · global'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && value && value.length >= 2 && Array.isArray(suggestions) && suggestions.length === 0 && (
        <div className="model-autocomplete__empty">
          Modelo no encontrado en KB — se creará nuevo
        </div>
      )}
    </div>
  );
}
