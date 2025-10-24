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
  const [filterType, setFilterType] = useState('all'); // 'all', 'recoleccion', 'fumigacion', 'limpieza'
  const [filterVehicleType, setFilterVehicleType] = useState('all'); // 'all', 'bus', 'barredora', 'pickup', 'cisterna', 'camion_carga', 'fumigadora'

  const [formData, setFormData] = useState({
    nombre: '',
    placa: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    tipoServicio: 'limpieza',
    tipoVehiculo: 'bus'
  });

  // Filtrar vehículos por tipo de servicio y tipo de vehículo
  const filteredVehicles = vehicles.filter(v => {
    const serviceMatch = filterType === 'all' || v.tipo_servicio === filterType;
    const vehicleTypeMatch = filterVehicleType === 'all' || v.tipo_vehiculo === filterVehicleType || v.tipoVehiculo === filterVehicleType;
    return serviceMatch && vehicleTypeMatch;
  });

  // Contadores por tipo de servicio
  const limpiezaCount = vehicles.filter(v => v.tipo_servicio === 'limpieza').length;
  const recoleccionCount = vehicles.filter(v => v.tipo_servicio === 'recoleccion').length;
  const fumigacionCount = vehicles.filter(v => v.tipo_servicio === 'fumigacion').length;

  // Contadores por tipo de vehículo (solo limpieza)
  const busCount = vehicles.filter(v => (v.tipo_vehiculo === 'bus' || v.tipoVehiculo === 'bus')).length;
  const barredoraCount = vehicles.filter(v => (v.tipo_vehiculo === 'barredora' || v.tipoVehiculo === 'barredora')).length;
  const pickupCount = vehicles.filter(v => (v.tipo_vehiculo === 'pickup' || v.tipoVehiculo === 'pickup')).length;
  const cisternaCount = vehicles.filter(v => (v.tipo_vehiculo === 'cisterna' || v.tipoVehiculo === 'cisterna')).length;
  const camionCargaCount = vehicles.filter(v => (v.tipo_vehiculo === 'camion_carga' || v.tipoVehiculo === 'camion_carga')).length;
  const compactadorCount = vehicles.filter(v => (v.tipo_vehiculo === 'compactador' || v.tipoVehiculo === 'compactador')).length;
  const fumigadoraCount = vehicles.filter(v => (v.tipo_vehiculo === 'fumigadora' || v.tipoVehiculo === 'fumigadora')).length;

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Si se cambia el tipo de servicio, actualizar el tipo de vehículo por defecto
    if (name === 'tipoServicio') {
      const defaultVehicleTypes = {
        limpieza: 'bus',
        recoleccion: 'compactador',
        fumigacion: 'fumigadora'
      };

      setFormData(prev => ({
        ...prev,
        [name]: value,
        tipoVehiculo: defaultVehicleTypes[value] || 'bus'
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
        tipoServicio: 'limpieza',
        tipoVehiculo: 'bus'
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
            <span className="stat-badge stat-limpieza">🧹 Limpieza: {limpiezaCount}</span>
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
        <div className="service-filters">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => { setFilterType('all'); setFilterVehicleType('all'); }}
          >
            Todos
          </button>
          <button
            className={`filter-btn filter-limpieza ${filterType === 'limpieza' ? 'active' : ''}`}
            onClick={() => { setFilterType('limpieza'); setFilterVehicleType('all'); }}
          >
            🧹 Limpieza
          </button>
          <button
            className={`filter-btn filter-recoleccion ${filterType === 'recoleccion' ? 'active' : ''}`}
            onClick={() => { setFilterType('recoleccion'); setFilterVehicleType('all'); }}
          >
            🚛 Recolección
          </button>
          <button
            className={`filter-btn filter-fumigacion ${filterType === 'fumigacion' ? 'active' : ''}`}
            onClick={() => { setFilterType('fumigacion'); setFilterVehicleType('all'); }}
          >
            🦟 Fumigación
          </button>
        </div>

        {/* Filtros de tipo de vehículo - limpieza */}
        {(filterType === 'all' || filterType === 'limpieza') && (
          <div className="vehicle-type-filters">
            <span className="filter-label">Tipo de vehículo:</span>
            <button
              className={`filter-btn-small ${filterVehicleType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('all')}
            >
              Todos
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'bus' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('bus')}
            >
              🚌 Buses ({busCount})
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'barredora' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('barredora')}
            >
              🧹 Barredora ({barredoraCount})
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'pickup' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('pickup')}
            >
              🛻 Pickup ({pickupCount})
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'cisterna' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('cisterna')}
            >
              🚰 Cisternas ({cisternaCount})
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'camion_carga' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('camion_carga')}
            >
              🚚 Camiones Carga ({camionCargaCount})
            </button>
          </div>
        )}

        {/* Filtros de tipo de vehículo - recolección */}
        {filterType === 'recoleccion' && (
          <div className="vehicle-type-filters">
            <span className="filter-label">Tipo de vehículo:</span>
            <button
              className={`filter-btn-small ${filterVehicleType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('all')}
            >
              Todos
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'compactador' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('compactador')}
            >
              🚛 Compactadores ({compactadorCount})
            </button>
          </div>
        )}

        {/* Filtro de fumigadoras cuando se selecciona fumigación */}
        {filterType === 'fumigacion' && (
          <div className="vehicle-type-filters">
            <span className="filter-label">Tipo de vehículo:</span>
            <button
              className={`filter-btn-small ${filterVehicleType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('all')}
            >
              Todos
            </button>
            <button
              className={`filter-btn-small ${filterVehicleType === 'fumigadora' ? 'active' : ''}`}
              onClick={() => setFilterVehicleType('fumigadora')}
            >
              🦟 Fumigadoras ({fumigadoraCount})
            </button>
          </div>
        )}
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
                  {vehicle.tipo_servicio === 'limpieza' || vehicle.tipoServicio === 'limpieza'
                    ? '🧹 Limpieza'
                    : vehicle.tipo_servicio === 'recoleccion' || vehicle.tipoServicio === 'recoleccion'
                    ? '🚛 Recolección'
                    : '🦟 Fumigación'}
                </span>
                {(vehicle.tipo_vehiculo || vehicle.tipoVehiculo) && (
                  <span className={`vehicle-subtype-badge subtype-${vehicle.tipo_vehiculo || vehicle.tipoVehiculo}`}>
                    {vehicle.tipo_vehiculo === 'bus' || vehicle.tipoVehiculo === 'bus' ? '🚌 Bus' :
                     vehicle.tipo_vehiculo === 'barredora' || vehicle.tipoVehiculo === 'barredora' ? '🧹 Barredora' :
                     vehicle.tipo_vehiculo === 'pickup' || vehicle.tipoVehiculo === 'pickup' ? '🛻 Pickup' :
                     vehicle.tipo_vehiculo === 'cisterna' || vehicle.tipoVehiculo === 'cisterna' ? '🚰 Cisterna' :
                     vehicle.tipo_vehiculo === 'camion_carga' || vehicle.tipoVehiculo === 'camion_carga' ? '🚚 Camión' :
                     vehicle.tipo_vehiculo === 'compactador' || vehicle.tipoVehiculo === 'compactador' ? '🚛 Compactador' :
                     vehicle.tipo_vehiculo === 'fumigadora' || vehicle.tipoVehiculo === 'fumigadora' ? '🦟 Fumigadora' : ''}
                  </span>
                )}
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
                    <option value="limpieza">Limpieza</option>
                    <option value="recoleccion">Recolección</option>
                    <option value="fumigacion">Fumigación</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tipo de Vehículo</label>
                <select
                  name="tipoVehiculo"
                  value={formData.tipoVehiculo}
                  onChange={handleInputChange}
                  required
                >
                  {formData.tipoServicio === 'limpieza' && (
                    <>
                      <option value="bus">🚌 Bus</option>
                      <option value="barredora">🧹 Barredora</option>
                      <option value="pickup">🛻 Pickup</option>
                      <option value="cisterna">🚰 Cisterna</option>
                      <option value="camion_carga">🚚 Camión de Carga Liviana</option>
                    </>
                  )}
                  {formData.tipoServicio === 'recoleccion' && (
                    <>
                      <option value="compactador">🚛 Camión Compactador</option>
                      <option value="camion_recolector">🚛 Camión Recolector</option>
                    </>
                  )}
                  {formData.tipoServicio === 'fumigacion' && (
                    <>
                      <option value="fumigadora">🦟 Fumigadora</option>
                      <option value="atomizador">💨 Atomizador</option>
                    </>
                  )}
                </select>
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
