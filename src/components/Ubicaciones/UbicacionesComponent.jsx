import { useState, useMemo, memo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useFumigation } from '../../context/FumigationContext';
import { useCleaning } from '../../context/CleaningContext';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Edit, Trash2, MapPin, Sparkles, Bug, Camera, Search,
} from '../Icons';
import UbicacionModal from './UbicacionModal';
import { ConfirmDialog, SortableHeader } from '../UI';
import useInputDebounce from '../../hooks/useInputDebounce';
import useSortableData from '../../hooks/useSortableData';
import './UbicacionesComponent.css';

const UbicacionPhoto = memo(({ storageId, alt }) => {
  const url = useQuery(
    api.files.getUrl,
    storageId ? { storageId } : 'skip'
  );
  if (!url) {
    return (
      <div className="ubic-list-photo ubic-list-photo--empty">
        <Camera size={20} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className="ubic-list-photo">
      <img src={url} alt={alt || 'Foto'} loading="lazy" />
    </div>
  );
});

const UbicacionesComponent = ({ forceTipo = null, hideHeader = false }) => {
  const { user } = useAuth();
  const { currentProjectId } = useProject();
  const { lugares: lugaresFum, addLugar, updateLugar, deleteLugar } = useFumigation();
  const { lugares: salas, addSala, updateSala, deleteSala } = useCleaning();

  const [activeTipo, setActiveTipo] = useState(forceTipo || 'lugar');
  const [search, setSearch] = useState('');
  const debouncedSearch = useInputDebounce(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const items = activeTipo === 'lugar' ? lugaresFum : salas;
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.nombre || '').toLowerCase().includes(q) ||
      (it.descripcion || '').toLowerCase().includes(q)
    );
  }, [items, debouncedSearch]);

  const { sortedData: sortedItems, sortKey, sortDir, requestSort } = useSortableData(filtered, 'nombre');

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    const proyecto_id = currentProjectId || user?.proyecto_id;
    if (!proyecto_id) {
      alert('Necesitas seleccionar un proyecto antes de crear una ubicación.');
      return;
    }

    try {
      if (editing) {
        const id = editing._id || editing.id;
        if (activeTipo === 'lugar') {
          await updateLugar(id, payload);
        } else {
          await updateSala(id, payload);
        }
      } else {
        const data = { ...payload, proyecto_id };
        if (activeTipo === 'lugar') {
          await addLugar(data);
        } else {
          await addSala(data);
        }
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      console.error('Error guardando ubicación:', err);
      alert('No se pudo guardar la ubicación: ' + err.message);
    }
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const id = itemToDelete._id || itemToDelete.id;
      if (activeTipo === 'lugar') {
        await deleteLugar(id);
      } else {
        await deleteSala(id);
      }
    } catch (err) {
      console.error('Error eliminando ubicación:', err);
    } finally {
      setItemToDelete(null);
    }
  };

  const tipoLabel = activeTipo === 'lugar' ? 'lugar de fumigación' : 'sala de limpieza';
  const tipoLabelPlural = activeTipo === 'lugar' ? 'lugares de fumigación' : 'salas de limpieza';

  return (
    <div className="ubic-component">
      {!hideHeader && (
        <div className="ubic-header">
          <div className="ubic-header-left">
            <MapPin strokeWidth={1.5} size={26} className="ubic-header-icon" />
            <div>
              <h2>Ubicaciones</h2>
              <p>Crea y gestiona lugares de fumigación y salas de limpieza con foto y GPS.</p>
            </div>
          </div>
          <button className="btn-add-ubic" onClick={openNew}>
            <Plus size={18} />
            Nueva Ubicación
          </button>
        </div>
      )}

      <div className="ubic-toolbar">
        {forceTipo ? (
          <div className="ubic-toolbar-title">
            {forceTipo === 'lugar' ? <Bug size={16} /> : <Sparkles size={16} />}
            <span>{`${tipoLabelPlural.charAt(0).toUpperCase()}${tipoLabelPlural.slice(1)}`}</span>
            <span className="ubic-tab-badge">{items.length}</span>
            <button className="btn-add-ubic btn-add-ubic--inline" onClick={openNew}>
              <Plus size={16} />
              Nueva
            </button>
          </div>
        ) : (
          <div className="ubic-tipo-tabs">
            <button
              className={`ubic-tipo-tab ${activeTipo === 'lugar' ? 'ubic-tipo-tab--active' : ''}`}
              onClick={() => setActiveTipo('lugar')}
            >
              <Bug size={16} />
              <span>Fumigación</span>
              <span className="ubic-tab-badge">{lugaresFum.length}</span>
            </button>
            <button
              className={`ubic-tipo-tab ${activeTipo === 'sala' ? 'ubic-tipo-tab--active' : ''}`}
              onClick={() => setActiveTipo('sala')}
            >
              <Sparkles size={16} />
              <span>Limpieza</span>
              <span className="ubic-tab-badge">{salas.length}</span>
            </button>
          </div>
        )}

        <div className="ubic-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={`Buscar ${tipoLabel}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ubic-empty">
          {activeTipo === 'lugar' ? <Bug size={48} /> : <Sparkles size={48} />}
          <h4>
            {search
              ? 'No hay resultados'
              : activeTipo === 'lugar'
                ? 'No hay lugares de fumigación'
                : 'No hay salas de limpieza'}
          </h4>
          <p>
            {search
              ? 'Probá con otro término.'
              : 'Hacé click en "Nueva Ubicación" para crear la primera.'}
          </p>
        </div>
      ) : (
        <div className="ubic-table-wrap">
          <table className="ubic-table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>Foto</th>
                <SortableHeader column="nombre" label="Nombre" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader column="descripcion" label="Descripción" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader column="latitud" label="Coordenadas" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item._id || item.id}>
                  <td>
                    <UbicacionPhoto storageId={item.foto_storage_id} alt={item.nombre} />
                  </td>
                  <td className="ubic-cell-name">{item.nombre}</td>
                  <td className="ubic-cell-desc">{item.descripcion || <span className="ubic-cell-muted">—</span>}</td>
                  <td className="ubic-cell-coords">
                    {typeof item.latitud === 'number' && typeof item.longitud === 'number' ? (
                      <span>
                        <MapPin size={12} />
                        {item.latitud.toFixed(4)}, {item.longitud.toFixed(4)}
                      </span>
                    ) : (
                      <span className="ubic-cell-muted">Sin coords</span>
                    )}
                  </td>
                  <td>
                    <div className="ubic-row-actions">
                      <button
                        className="ubic-action-btn ubic-action-edit"
                        onClick={() => openEdit(item)}
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="ubic-action-btn ubic-action-delete"
                        onClick={() => handleDelete(item)}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UbicacionModal
        isOpen={modalOpen}
        tipo={activeTipo}
        item={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      {itemToDelete && (
        <ConfirmDialog
          open
          destructive
          title={`¿Eliminar ${activeTipo === 'lugar' ? 'lugar' : 'sala'}?`}
          message={`Vas a desactivar "${itemToDelete.nombre || ''}". Se podrá reactivar después; no se borra permanentemente.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteItem}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};

export default UbicacionesComponent;
