import { useState, useEffect } from 'react';
import { appData } from '../../data/mockData';
import './PersonnelComponent.css';

const PersonnelComponent = ({ userType = 'admin' }) => {
  const [activePersonnelTab, setActivePersonnelTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const defaultForm = { nombre: '', apellido: '', cargo: '', turno: 'Matutino', telefono: '', departamento: '' };
  const [employeeForm, setEmployeeForm] = useState(defaultForm);

  // Inicializar datos del personal
  useEffect(() => {
    loadPersonnelData();
  }, []);

  const loadPersonnelData = () => {
    setIsLoading(true);
    
    // Simular carga de datos
    setTimeout(() => {
      // Empleados expandidos con más información
      const employeeData = [
        {
          id: 'EMP001',
          nombre: 'Juan Pérez',
          apellido: 'García',
          cedula: '8-123-456',
          cargo: 'Conductor',
          telefono: '+507 6234-5678',
          email: 'juan.perez@rmp.com',
          fechaIngreso: '2023-01-15',
          salario: 950.00,
          turno: 'Matutino',
          estado: 'Activo',
          asignacion: 'TR-001',
          departamento: 'Operaciones',
          supervisor: 'María García',
          direccion: 'San Francisco, Panamá',
          emergencia: {
            contacto: 'Ana Pérez',
            telefono: '+507 6765-4321',
            relacion: 'Esposa'
          },
          historialLaboral: [
            { fecha: '2023-01-15', evento: 'Contratación', descripcion: 'Ingreso como conductor' },
            { fecha: '2023-06-15', evento: 'Evaluación', descripcion: 'Evaluación semestral - Excelente' },
            { fecha: '2023-12-15', evento: 'Aumento', descripcion: 'Aumento salarial 5%' }
          ]
        },
        {
          id: 'EMP002',
          nombre: 'María',
          apellido: 'García',
          cedula: '8-234-567',
          cargo: 'Supervisora',
          telefono: '+507 6345-6789',
          email: 'maria.garcia@rmp.com',
          fechaIngreso: '2022-03-10',
          salario: 1200.00,
          turno: 'Matutino',
          estado: 'Activo',
          asignacion: 'Zona Centro',
          departamento: 'Operaciones',
          supervisor: 'Carlos López',
          direccion: 'Betania, Panamá',
          emergencia: {
            contacto: 'Roberto García',
            telefono: '+507 6876-5432',
            relacion: 'Hermano'
          },
          historialLaboral: [
            { fecha: '2022-03-10', evento: 'Contratación', descripcion: 'Ingreso como conductora' },
            { fecha: '2022-09-10', evento: 'Promoción', descripcion: 'Ascenso a supervisora' },
            { fecha: '2023-03-10', evento: 'Evaluación', descripcion: 'Evaluación anual - Sobresaliente' }
          ]
        },
        {
          id: 'EMP003',
          nombre: 'Carlos',
          apellido: 'López',
          cedula: '8-345-678',
          cargo: 'Conductor',
          telefono: '+507 6456-7890',
          email: 'carlos.lopez@rmp.com',
          fechaIngreso: '2023-05-20',
          salario: 900.00,
          turno: 'Vespertino',
          estado: 'Activo',
          asignacion: 'TR-003',
          departamento: 'Operaciones',
          supervisor: 'María García',
          direccion: 'Río Abajo, Panamá',
          emergencia: {
            contacto: 'Lucia López',
            telefono: '+507 6987-6543',
            relacion: 'Madre'
          },
          historialLaboral: [
            { fecha: '2023-05-20', evento: 'Contratación', descripcion: 'Ingreso como conductor' },
            { fecha: '2023-11-20', evento: 'Evaluación', descripcion: 'Evaluación semestral - Bueno' }
          ]
        },
        {
          id: 'EMP004',
          nombre: 'Ana',
          apellido: 'Martín',
          cedula: '8-456-789',
          cargo: 'Operadora de limpieza',
          telefono: '+507 6567-8901',
          email: 'ana.martin@rmp.com',
          fechaIngreso: '2023-02-28',
          salario: 750.00,
          turno: 'Matutino',
          estado: 'Activo',
          asignacion: 'Equipo A',
          departamento: 'Limpieza',
          supervisor: 'Luis Rodríguez',
          direccion: 'Villa Lucre, Panamá',
          emergencia: {
            contacto: 'José Martín',
            telefono: '+507 6098-7654',
            relacion: 'Padre'
          },
          historialLaboral: [
            { fecha: '2023-02-28', evento: 'Contratación', descripcion: 'Ingreso como operadora' },
            { fecha: '2023-08-28', evento: 'Evaluación', descripcion: 'Evaluación semestral - Bueno' }
          ]
        },
        {
          id: 'EMP005',
          nombre: 'Luis',
          apellido: 'Rodríguez',
          cedula: '8-567-890',
          cargo: 'Técnico en fumigación',
          telefono: '+507 6678-9012',
          email: 'luis.rodriguez@rmp.com',
          fechaIngreso: '2022-11-15',
          salario: 1100.00,
          turno: 'Flexible',
          estado: 'Activo',
          asignacion: 'Unidad Móvil',
          departamento: 'Fumigación',
          supervisor: 'María García',
          direccion: 'Tocumen, Panamá',
          emergencia: {
            contacto: 'Carmen Rodríguez',
            telefono: '+507 6109-8765',
            relacion: 'Esposa'
          },
          historialLaboral: [
            { fecha: '2022-11-15', evento: 'Contratación', descripcion: 'Ingreso como técnico' },
            { fecha: '2023-05-15', evento: 'Evaluación', descripcion: 'Evaluación semestral - Excelente' },
            { fecha: '2023-11-15', evento: 'Certificación', descripcion: 'Renovación certificación fumigación' }
          ]
        }
      ];

      // Turnos de trabajo
      const shiftData = [
        {
          id: 'SHIFT001',
          nombre: 'Matutino',
          horaInicio: '06:00',
          horaFin: '14:00',
          empleados: ['EMP001', 'EMP002', 'EMP004'],
          activo: true
        },
        {
          id: 'SHIFT002',
          nombre: 'Vespertino',
          horaInicio: '14:00',
          horaFin: '22:00',
          empleados: ['EMP003'],
          activo: true
        },
        {
          id: 'SHIFT003',
          nombre: 'Nocturno',
          horaInicio: '22:00',
          horaFin: '06:00',
          empleados: [],
          activo: false
        },
        {
          id: 'SHIFT004',
          nombre: 'Flexible',
          horaInicio: 'Variable',
          horaFin: 'Variable',
          empleados: ['EMP005'],
          activo: true
        }
      ];

      // Asistencia (últimos 7 días)
      const attendanceData = generateAttendanceData(employeeData);

      // Evaluaciones de desempeño
      const performanceData = generatePerformanceData(employeeData);

      setEmployees(employeeData);
      setShifts(shiftData);
      setAttendance(attendanceData);
      setPerformance(performanceData);
      setIsLoading(false);
    }, 1000);
  };

  const generateAttendanceData = (employees) => {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      employees.forEach(emp => {
        data.push({
          id: `ATT${emp.id}${date.toISOString().split('T')[0]}`,
          empleadoId: emp.id,
          empleadoNombre: `${emp.nombre} ${emp.apellido}`,
          fecha: date.toISOString().split('T')[0],
          horaEntrada: emp.turno === 'Matutino' ? '06:05' : emp.turno === 'Vespertino' ? '14:10' : 'N/A',
          horaSalida: emp.turno === 'Matutino' ? '14:02' : emp.turno === 'Vespertino' ? '22:05' : 'N/A',
          horasTrabajadas: emp.turno === 'Flexible' ? Math.floor(Math.random() * 4) + 6 : 8,
          estado: Math.random() > 0.1 ? 'Presente' : Math.random() > 0.5 ? 'Tardanza' : 'Falta',
          observaciones: ''
        });
      });
    }
    
    return data;
  };

  const generatePerformanceData = (employees) => {
    return employees.map(emp => ({
      empleadoId: emp.id,
      empleadoNombre: `${emp.nombre} ${emp.apellido}`,
      periodo: '2024-Q1',
      puntualidad: Math.floor(Math.random() * 30) + 70,
      calidad: Math.floor(Math.random() * 30) + 70,
      productividad: Math.floor(Math.random() * 30) + 70,
      colaboracion: Math.floor(Math.random() * 30) + 70,
      promedioGeneral: Math.floor(Math.random() * 30) + 70,
      comentarios: 'Evaluación trimestral satisfactoria',
      objetivos: [
        'Mejorar puntualidad',
        'Incrementar productividad',
        'Capacitación en nuevas tecnologías'
      ],
      fechaEvaluacion: '2024-01-15'
    }));
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      nombre: employee.nombre,
      apellido: employee.apellido,
      cargo: employee.cargo,
      turno: employee.turno,
      telefono: employee.telefono,
      departamento: employee.departamento
    });
    setShowEmployeeModal(true);
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeForm(defaultForm);
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = (employeeData) => {
    if (selectedEmployee) {
      // Editar empleado existente
      setEmployees(prev => prev.map(emp => 
        emp.id === selectedEmployee.id ? { ...emp, ...employeeData } : emp
      ));
    } else {
      // Agregar nuevo empleado
      const newEmployee = {
        ...employeeData,
        id: `EMP${String(employees.length + 1).padStart(3, '0')}`,
        estado: 'Activo',
        fechaIngreso: new Date().toISOString().split('T')[0],
        historialLaboral: [
          { 
            fecha: new Date().toISOString().split('T')[0], 
            evento: 'Contratación', 
            descripcion: 'Ingreso a la empresa' 
          }
        ]
      };
      setEmployees(prev => [...prev, newEmployee]);
    }
    setShowEmployeeModal(false);
  };

  const handleFormChange = (field, value) => {
    setEmployeeForm(prev => ({ ...prev, [field]: value }));
  };

  const renderEmployeesTab = () => (
    <div className="personnel-content">
      <div className="personnel-header">
        <h3>👥 Gestión de Empleados</h3>
        <button className="btn btn--primary" onClick={handleAddEmployee}>
          ➕ Nuevo Empleado
        </button>
      </div>

      <div className="employees-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-data">
            <div className="stat-value">{employees.length}</div>
            <div className="stat-label">Total Empleados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-data">
            <div className="stat-value">{employees.filter(e => e.estado === 'Activo').length}</div>
            <div className="stat-label">Activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚛</div>
          <div className="stat-data">
            <div className="stat-value">{employees.filter(e => e.cargo === 'Conductor').length}</div>
            <div className="stat-label">Conductores</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧹</div>
          <div className="stat-data">
            <div className="stat-value">{employees.filter(e => e.departamento === 'Limpieza').length}</div>
            <div className="stat-label">Limpieza</div>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="personnel-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Empleado</th>
              <th>Cargo</th>
              <th>Departamento</th>
              <th>Turno</th>
              <th>Asignación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>
                  <div className="employee-info">
                    <div className="employee-name">{employee.nombre} {employee.apellido}</div>
                    <div className="employee-details">{employee.cedula} • {employee.telefono}</div>
                  </div>
                </td>
                <td>{employee.cargo}</td>
                <td>{employee.departamento}</td>
                <td>
                  <span className={`shift-badge shift-${employee.turno.toLowerCase()}`}>
                    {employee.turno}
                  </span>
                </td>
                <td>{employee.asignacion}</td>
                <td>
                  <span className={`status ${employee.estado === 'Activo' ? 'status--success' : 'status--warning'}`}>
                    {employee.estado}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn--small btn--secondary"
                    onClick={() => handleEmployeeSelect(employee)}
                  >
                    Ver Perfil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAttendanceTab = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(att => att.fecha === today);
    
    return (
      <div className="personnel-content">
        <div className="attendance-header">
          <h3>📅 Control de Asistencia</h3>
          <div className="attendance-date">
            <input type="date" defaultValue={today} className="date-input" />
          </div>
        </div>

        <div className="attendance-summary">
          <div className="summary-card">
            <div className="summary-icon">✅</div>
            <div className="summary-data">
              <div className="summary-value">
                {todayAttendance.filter(att => att.estado === 'Presente').length}
              </div>
              <div className="summary-label">Presente</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">⏰</div>
            <div className="summary-data">
              <div className="summary-value">
                {todayAttendance.filter(att => att.estado === 'Tardanza').length}
              </div>
              <div className="summary-label">Tardanzas</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">❌</div>
            <div className="summary-data">
              <div className="summary-value">
                {todayAttendance.filter(att => att.estado === 'Falta').length}
              </div>
              <div className="summary-label">Faltas</div>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="personnel-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Hora Entrada</th>
                <th>Hora Salida</th>
                <th>Horas Trabajadas</th>
                <th>Estado</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendance.map(record => (
                <tr key={record.id}>
                  <td>{record.empleadoNombre}</td>
                  <td>{record.horaEntrada}</td>
                  <td>{record.horaSalida}</td>
                  <td>{record.horasTrabajadas}h</td>
                  <td>
                    <span className={`attendance-status attendance-${record.estado.toLowerCase()}`}>
                      {record.estado}
                    </span>
                  </td>
                  <td>{record.observaciones || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderShiftsTab = () => (
    <div className="personnel-content">
      <div className="personnel-header">
        <h3>⏰ Gestión de Turnos</h3>
        <button className="btn btn--primary">
          ➕ Nuevo Turno
        </button>
      </div>

      <div className="shifts-grid">
        {shifts.map(shift => (
          <div key={shift.id} className={`shift-card ${shift.activo ? '' : 'shift-inactive'}`}>
            <div className="shift-header">
              <h4>{shift.nombre}</h4>
              <span className={`shift-status ${shift.activo ? 'status--success' : 'status--danger'}`}>
                {shift.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="shift-time">
              <span className="time-range">
                {shift.horaInicio} - {shift.horaFin}
              </span>
            </div>
            <div className="shift-employees">
              <div className="employees-count">
                👥 {shift.empleados.length} empleados asignados
              </div>
              <div className="employees-list">
                {shift.empleados.map(empId => {
                  const emp = employees.find(e => e.id === empId);
                  return emp ? (
                    <span key={empId} className="employee-tag">
                      {emp.nombre} {emp.apellido}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="personnel-content">
      <div className="personnel-header">
        <h3>📊 Evaluación de Desempeño</h3>
        <select className="period-selector">
          <option value="2024-Q1">Q1 2024</option>
          <option value="2023-Q4">Q4 2023</option>
          <option value="2023-Q3">Q3 2023</option>
        </select>
      </div>

      <div className="performance-overview">
        <div className="performance-stat">
          <div className="stat-icon">⭐</div>
          <div className="stat-data">
            <div className="stat-value">
              {Math.round(performance.reduce((acc, p) => acc + p.promedioGeneral, 0) / performance.length)}%
            </div>
            <div className="stat-label">Promedio General</div>
          </div>
        </div>
        <div className="performance-stat">
          <div className="stat-icon">🎯</div>
          <div className="stat-data">
            <div className="stat-value">
              {performance.filter(p => p.promedioGeneral >= 80).length}
            </div>
            <div className="stat-label">Excelentes</div>
          </div>
        </div>
        <div className="performance-stat">
          <div className="stat-icon">📈</div>
          <div className="stat-data">
            <div className="stat-value">
              {performance.filter(p => p.promedioGeneral >= 60 && p.promedioGeneral < 80).length}
            </div>
            <div className="stat-label">Buenos</div>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="personnel-table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Puntualidad</th>
              <th>Calidad</th>
              <th>Productividad</th>
              <th>Colaboración</th>
              <th>Promedio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {performance.map(perf => (
              <tr key={perf.empleadoId}>
                <td>{perf.empleadoNombre}</td>
                <td>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill"
                      style={{ width: `${perf.puntualidad}%` }}
                    ></div>
                    <span>{perf.puntualidad}%</span>
                  </div>
                </td>
                <td>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill"
                      style={{ width: `${perf.calidad}%` }}
                    ></div>
                    <span>{perf.calidad}%</span>
                  </div>
                </td>
                <td>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill"
                      style={{ width: `${perf.productividad}%` }}
                    ></div>
                    <span>{perf.productividad}%</span>
                  </div>
                </td>
                <td>
                  <div className="performance-bar">
                    <div 
                      className="performance-fill"
                      style={{ width: `${perf.colaboracion}%` }}
                    ></div>
                    <span>{perf.colaboracion}%</span>
                  </div>
                </td>
                <td>
                  <span className={`performance-score ${
                    perf.promedioGeneral >= 80 ? 'score-excellent' :
                    perf.promedioGeneral >= 60 ? 'score-good' : 'score-poor'
                  }`}>
                    {perf.promedioGeneral}%
                  </span>
                </td>
                <td>
                  <button className="btn btn--small btn--secondary">
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="personnel-container">
      <div className="personnel-header-main">
        <div className="personnel-title">
          <h2>👥 Sistema de Gestión de Personal</h2>
          <p>Administración integral de recursos humanos</p>
        </div>
      </div>

      <div className="personnel-tabs">
        <button 
          className={`tab ${activePersonnelTab === 'employees' ? 'tab--active' : ''}`}
          onClick={() => setActivePersonnelTab('employees')}
        >
          👥 Empleados
        </button>
        <button 
          className={`tab ${activePersonnelTab === 'shifts' ? 'tab--active' : ''}`}
          onClick={() => setActivePersonnelTab('shifts')}
        >
          ⏰ Turnos
        </button>
      </div>

      {isLoading ? (
        <div className="personnel-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Cargando datos del personal...</p>
          </div>
        </div>
      ) : (
        <div className="personnel-body">
          {activePersonnelTab === 'employees' && renderEmployeesTab()}
          {activePersonnelTab === 'shifts' && renderShiftsTab()}
        </div>
      )}

      {showEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEmployeeModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label>Nombre:</label>
              <input type="text" value={employeeForm.nombre} onChange={e => handleFormChange('nombre', e.target.value)} />
              <label>Apellido:</label>
              <input type="text" value={employeeForm.apellido} onChange={e => handleFormChange('apellido', e.target.value)} />
              <label>Cargo:</label>
              <input type="text" value={employeeForm.cargo} onChange={e => handleFormChange('cargo', e.target.value)} />
              <label>Departamento:</label>
              <input type="text" value={employeeForm.departamento} onChange={e => handleFormChange('departamento', e.target.value)} />
              <label>Teléfono:</label>
              <input type="text" value={employeeForm.telefono} onChange={e => handleFormChange('telefono', e.target.value)} />
              <label>Turno:</label>
              <select value={employeeForm.turno} onChange={e => handleFormChange('turno', e.target.value)}>
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Nocturno">Nocturno</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn--outline" onClick={() => setShowEmployeeModal(false)}>Cancelar</button>
              <button className="btn btn--primary" onClick={() => handleSaveEmployee(employeeForm)}>
                {selectedEmployee ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelComponent; 