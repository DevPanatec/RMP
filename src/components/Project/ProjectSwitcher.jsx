import { useProject } from '../../context/ProjectContext';
import './ProjectSwitcher.css';

const ProjectSwitcher = () => {
  const { currentProjectId, availableProjects, isAdmin, setCurrentProject } = useProject();

  if (!isAdmin) return null;

  return (
    <div className="project-switcher">
      <label htmlFor="project-switcher-select" className="project-switcher-label">
        Proyecto
      </label>
      <select
        id="project-switcher-select"
        className="project-switcher-select"
        value={currentProjectId ?? ''}
        onChange={(e) => setCurrentProject(e.target.value || null)}
      >
        <option value="">Todos los proyectos</option>
        {availableProjects.map((p) => (
          <option key={p._id} value={p._id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProjectSwitcher;
