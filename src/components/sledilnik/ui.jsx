/**
 * Shared inline-styled UI primitives for the tracker.
 */

export function Card({ children, padding = '1.25rem', style = {}, ...rest }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding,
      ...style,
    }} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>{title}</h2>
        {subtitle && (
          <div style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{subtitle}</div>
        )}
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', children, style = {}, ...rest }) {
  const sizes = {
    sm: { padding: '0.35rem 0.7rem', fontSize: '0.8rem' },
    md: { padding: '0.5rem 0.95rem', fontSize: '0.88rem' },
    lg: { padding: '0.7rem 1.2rem', fontSize: '0.95rem' },
  };
  const variants = {
    primary:   { background: 'var(--color-accent)', color: 'white', border: '1px solid var(--color-accent)' },
    secondary: { background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)' },
    ghost:     { background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid transparent' },
    danger:    { background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' },
  };
  return (
    <button {...rest} style={{
      ...sizes[size], ...variants[variant],
      borderRadius: 6, fontWeight: 500, cursor: 'pointer',
      transition: 'all 0.15s', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input {...props} style={{
      width: '100%',
      padding: '0.55rem 0.75rem',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      color: 'var(--color-text)',
      fontSize: '0.9rem',
      fontFamily: 'inherit',
      outline: 'none',
      ...(props.style || {}),
    }} />
  );
}

export function Select({ children, ...rest }) {
  return (
    <select {...rest} style={{
      width: '100%',
      padding: '0.55rem 0.75rem',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      color: 'var(--color-text)',
      fontSize: '0.9rem',
      fontFamily: 'inherit',
      outline: 'none',
      cursor: 'pointer',
      ...(rest.style || {}),
    }}>{children}</select>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
      {hint && <span style={{ fontSize: '0.74rem', color: 'var(--color-text-subtle)' }}>{hint}</span>}
    </label>
  );
}

export function KpiCard({ label, value, sub, trend, color }) {
  return (
    <Card padding="1.1rem 1.25rem">
      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.55rem', fontWeight: 700, marginTop: 4, color: color || 'var(--color-text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {(sub || trend != null) && (
        <div style={{ marginTop: 4, fontSize: '0.76rem', color: 'var(--color-text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
          {trend != null && (
            <span style={{ color: trend > 0 ? '#059669' : trend < 0 ? '#dc2626' : 'var(--color-text-muted)', fontWeight: 600 }}>
              {trend > 0 ? '▲' : trend < 0 ? '▼' : '◆'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </Card>
  );
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,15,15,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '4rem 1rem 1rem',
      overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: width,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '1.5rem',
        boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--color-text)' }}>{title}</h3>
          <button onClick={onClose} aria-label="Zapri" style={{
            background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, description, action }) {
  return (
    <Card padding="3rem 2rem" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>{title}</div>
      {description && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', maxWidth: 420, margin: '0 auto 1rem', lineHeight: 1.65 }}>
          {description}
        </div>
      )}
      {action}
    </Card>
  );
}

export function Tag({ children, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', fontSize: '0.7rem', fontWeight: 600,
      background: color ? `${color}14` : 'var(--color-bg)',
      color: color || 'var(--color-text-muted)',
      border: `1px solid ${color ? `${color}33` : 'var(--color-border)'}`,
      borderRadius: 4,
      letterSpacing: '0.01em',
    }}>{children}</span>
  );
}
