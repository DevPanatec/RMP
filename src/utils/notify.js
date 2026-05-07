import toast from 'react-hot-toast';

const baseStyle = {
  fontFamily: 'var(--font-family-base)',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--color-border)',
};

const successStyle = {
  ...baseStyle,
  background: 'var(--color-success-light)',
  color: 'var(--color-success-dark)',
  border: '1px solid var(--color-success)',
};

const errorStyle = {
  ...baseStyle,
  background: 'var(--color-error-light)',
  color: 'var(--color-error)',
  border: '1px solid var(--color-error)',
};

const warningStyle = {
  ...baseStyle,
  background: 'var(--color-warning-light)',
  color: 'var(--color-warning-dark)',
  border: '1px solid var(--color-warning)',
};

const infoStyle = {
  ...baseStyle,
  background: 'var(--color-info-light)',
  color: 'var(--color-info-dark)',
  border: '1px solid var(--color-info)',
};

export const notify = {
  success: (message, opts = {}) =>
    toast.success(message, { duration: 3000, style: successStyle, ...opts }),
  error: (message, opts = {}) =>
    toast.error(message, { duration: 4500, style: errorStyle, ...opts }),
  warning: (message, opts = {}) =>
    toast(message, { icon: '⚠', duration: 4000, style: warningStyle, ...opts }),
  info: (message, opts = {}) =>
    toast(message, { duration: 3500, style: infoStyle, ...opts }),
  loading: (message, opts = {}) =>
    toast.loading(message, { style: baseStyle, ...opts }),
  dismiss: (id) => toast.dismiss(id),
};

export default notify;
