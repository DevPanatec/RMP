import './Skeleton.css';

export const Skeleton = ({ width = '100%', height = '1em', radius, className = '', style }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: radius ?? 'var(--radius-base)',
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

export const SkeletonText = ({ lines = 3, lastWidth = '70%' }) => (
  <div className="skeleton-text">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="0.9em"
        width={i === lines - 1 ? lastWidth : '100%'}
      />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-card__header">
      <Skeleton width="40px" height="40px" radius="var(--radius-full)" />
      <div style={{ flex: 1 }}>
        <Skeleton height="1em" width="60%" />
        <Skeleton height="0.8em" width="40%" style={{ marginTop: 6 }} />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonRow = ({ cols = 4 }) => (
  <tr className="skeleton-row">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}>
        <Skeleton height="0.9em" width={i === 0 ? '80%' : '60%'} />
      </td>
    ))}
  </tr>
);

export default Skeleton;
