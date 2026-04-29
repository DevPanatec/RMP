import { useOrganization } from '../../context/OrganizationContext';
import './OrganizationSwitcher.css';

const OrganizationSwitcher = () => {
  const { currentOrgId, availableOrgs, isSuperAdmin, setCurrentOrg } = useOrganization();

  if (!isSuperAdmin) return null;

  return (
    <div className="organization-switcher">
      <label htmlFor="organization-switcher-select" className="organization-switcher-label">
        Organización
      </label>
      <select
        id="organization-switcher-select"
        className="organization-switcher-select"
        value={currentOrgId ?? ''}
        onChange={(e) => setCurrentOrg(e.target.value || null)}
      >
        <option value="">Todas las organizaciones</option>
        {availableOrgs.map((o) => (
          <option key={o._id} value={o._id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </div>
  );
};

export default OrganizationSwitcher;
