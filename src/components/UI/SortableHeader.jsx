import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import './SortableHeader.css';

/**
 * Header de tabla clickeable que ordena por column.
 *
 * Uso:
 *   <SortableHeader column="nombre" label="Nombre"
 *     sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
 */
export const SortableHeader = ({ column, label, sortKey, sortDir, onSort, align = 'left' }) => {
  const isActive = sortKey === column;
  const Icon = !isActive ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  const ariaSort = !isActive ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending';

  return (
    <th aria-sort={ariaSort} className={`sortable-th sortable-th--${align}`}>
      <button
        type="button"
        className={`sortable-header ${isActive ? 'is-active' : ''}`}
        onClick={() => onSort(column)}
        aria-label={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <Icon size={12} aria-hidden="true" className="sortable-header__icon" />
      </button>
    </th>
  );
};

export default SortableHeader;
