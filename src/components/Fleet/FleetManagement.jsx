import { useState } from 'react';
import { useSupabaseFleet } from '../../context/SupabaseFleetContext';
import { Truck, Plus, History, X } from '../Icons';
import './FleetManagement.css';

const FleetManagement = () => {
  const { vehicles, addVehicle, getVehicleHistory } = useSupabaseFleet();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'recoleccion', 'fumigacion'

  const [formData, setFormData] = useState({
    nombre: '',
    placa: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    tipoServicio: 'recoleccion'
  });

  // Filtrar vehículos por tipo
  const filteredVehicles = vehicles.filter(v => {
    if (filterType === 'all') return true;
    return v.tipo_servicio === filterType;
  });

  // Contadores
  const recoleccionCount = vehicles.filter(v => v.tipo_servicio === 'recoleccion').length;
  const fumigacionCount = vehicles.filter(v => v.tipo_servicio === 'fumigacion').length;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    
    try {
      await addVehicle(formData);
      setShowAddModal(false);
      setFormData({
        nombre: '',
        placa: '',
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        tipoServicio: 'recoleccion'
      });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Error al agregar vehículo');
    }
  };

  const handleShowHistory = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const history = await getVehicleHistory(vehicle.id);
      setVehicleHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
      alert('Error al cargar historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedVehicle(null);
    setVehicleHistory([]);
  };

  return (
    <div className="fleet-management">
      <div className="fleet-header">
        <div>
          <h2>Gestión de Flota</h2>
          <div className="fleet-stats">
            <span className="stat-badge">Total: {vehicles.length}</span>
            <span className="stat-badge stat-recoleccion">🚛 Recolección: {recoleccionCount}</span>
            <span className="stat-badge stat-fumigacion">🦟 Fumigación: {fumigacionCount}</span>
          </div>
        </div>
        <button className="btn-add-vehicle" onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          Agregar Vehículo
        </button>
      </div>

      <div className="fleet-filters">
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          Todos ({vehicles.length})
        </button>
        <button
          className={`filter-btn filter-recoleccion ${filterType === 'recoleccion' ? 'active' : ''}`}
          onClick={() => setFilterType('recoleccion')}
        >
          🚛 Recolección ({recoleccionCount})
        </button>
        <button
          className={`filter-btn filter-fumigacion ${filterType === 'fumigacion' ? 'active' : ''}`}
          onClick={() => setFilterType('fumigacion')}
        >
          🦟 Fumigación ({fumigacionCount})
        </button>
      </div>

      <div className="vehicles-grid">
        {filteredVehicles.map(vehicle => (
          <div key={vehicle.id} className="vehicle-card">
            <div className="vehicle-icon">
              <Truck size={32} />
            </div>
            <div className="vehicle-info">
              <h3>{vehicle.nombre || vehicle.placa}</h3>
              <p className="vehicle-placa">{vehicle.placa}</p>
              <div className="vehicle-badges">
                <span className={`vehicle-type-badge type-${vehicle.tipo_servicio || vehicle.tipoServicio}`}>
                  {vehicle.tipo_servicio === 'recoleccion' || vehicle.tipoServicio === 'recoleccion' ? '🚛 Recolección' : '🦟 Fumigación'}
                </span>
                <span className={`vehicle-status status-${vehicle.estado.toLowerCase().replace(' ', '-')}`}>
                  {vehicle.estado}
                </span>
              </div>
            </div>
            <button 
              className="btn-history"
              onClick={() => handleShowHistory(vehicle)}
              title="Ver historial"
            >
              <History size={20} />
            </button>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agregar Vehículo</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddVehicle} className="vehicle-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Camión Recolector 1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Placa</label>
                <input
                  type="text"
                  name="placa"
                  value={formData.placa}
                  onChange={handleInputChange}
                  placeholder="Ej: ABC-123"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marca</label>
                  <input
                    type="text"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    placeholder="Ej: Ford"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    value={formData.modelo}
                    onChange={handleInputChange}
                    placeholder="Ej: F-350"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Año</label>
                  <input
                    type="number"
                    name="año"
                    value={formData.año}
                    onChange={handleInputChange}
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo de Servicio</label>
                  <select
                    name="tipoServicio"
                    value={formData.tipoServicio}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="recoleccion">Recolección</option>
                    <option value="fumigacion">Fumigación</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay" onClick={closeHistoryModal}>
          <div className="modal-content modal-history" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Historial - {selectedVehicle?.nombre || selectedVehicle?.placa}</h2>
              <button className="btn-close" onClick={closeHistoryModal}>
                <X size={24} />
              </button>
            </div>
            
            <div className="history-content">
              {loadingHistory ? (
                <p className="loading-text">Cargando historial...</p>
              ) : vehicleHistory.length === 0 ? (
                <p className="empty-text">No hay registros en el historial</p>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Conductor</th>
                      <th>Ruta</th>
                      <th>Horario</th>
                      <th>Kilometraje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleHistory.map((entry, index) => (
                      <tr key={index}>
                        <td>{new Date(entry.fecha).toLocaleDateString()}</td>
                        <td>{entry.conductor_nombre || 'N/A'}</td>
                        <td>{entry.ruta_nombre || 'N/A'}</td>
                        <td>
                          {entry.hora_inicio} - {entry.hora_fin || 'En curso'}
                        </td>
                        <td>{entry.kilometraje || 0} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
