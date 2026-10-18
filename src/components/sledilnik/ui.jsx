/**
 * Skupni gradniki sledilnika. Videz je v sledilnik.css (prenova 18. 10. 2026); tu so samo zgradba
 * in razredi, da so vsi pogledi enotni.
 */

const cx = (...names) => names.filter(Boolean).join(' ');

export function Card({ children, padding = '1.15rem', style = {}, className, ...rest }) {
  return (
    <div className={cx('sl-card', className)} style={{ padding, ...style }} {...rest}>
      {children}
    </div>
  );
}

// Naslov ploskve znotraj pogleda.
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="sl-sechead">
      <div style={{ minWidth: 0 }}>
        <h2 className="sl-sectitle">{title}</h2>
        {subtitle && <div className="sl-secsub">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// Naslov pogleda: velik, na vrhu zaslona.
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="sl-pagehead">
      <div style={{ minWidth: 0 }}>
        <h1 className="sl-pagetitle">{title}</h1>
        {subtitle && <div className="sl-pagesub">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', children, className, ...rest }) {
  return (
    <button {...rest} className={cx('sl-btn', `sl-btn--${variant}`, `sl-btn--${size}`, className)}>
      {children}
    </button>
  );
}

export function Input({ className, ...props }) {
  return <input {...props} className={cx('sl-input', className)} />;
}

export function Select({ children, className, ...rest }) {
  return <select {...rest} className={cx('sl-select', className)}>{children}</select>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="sl-field">
      <span className="sl-label">{label}</span>
      {children}
      {hint && <span className="sl-hint">{hint}</span>}
    </label>
  );
}

// Skupina številk v eni ploskvi. items: [{ label, value, sub, color }]
export function Stats({ items }) {
  return (
    <div className="sl-card sl-stats-wrap">
      <div className="sl-stats">
        {items.filter(Boolean).map((s) => (
          <div key={s.label} className="sl-stat">
            <div className="sl-stat-label">{s.label}</div>
            <div className="sl-stat-value" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
            {s.sub && <div className="sl-stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub, trend, color }) {
  return (
    <Card padding="0.95rem 1.05rem">
      <div className="sl-stat-label">{label}</div>
      <div className="sl-stat-value" style={color ? { color } : undefined}>{value}</div>
      {(sub || trend != null) && (
        <div className="sl-stat-sub" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {trend != null && (
            <span style={{ color: trend > 0 ? 'var(--sl-in)' : trend < 0 ? 'var(--sl-bad)' : 'var(--sl-muted)', fontWeight: 600 }}>
              {trend > 0 ? '▲' : trend < 0 ? '▼' : '◆'} {Math.abs(trend).toFixed(1)} %
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </Card>
  );
}

const ZAPRI = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>;

// Na telefonu se okno odpre kot list od spodaj (sledilnik.css), na računalniku na sredini zaslona.
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div className="sl-overlay" onClick={onClose}>
      <div className="sl-dialog" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="sl-dialog-handle" aria-hidden="true" />
        <div className="sl-dialog-head">
          <h3 className="sl-dialog-title">{title}</h3>
          <button type="button" className="sl-iconbtn" onClick={onClose} aria-label="Zapri">{ZAPRI}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, description, action }) {
  return (
    <Card padding="2.75rem 1.5rem" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.02rem', fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 6 }}>{title}</div>
      {description && (
        <div style={{ color: 'var(--sl-muted)', fontSize: '0.88rem', maxWidth: 400, margin: '0 auto 1.1rem', lineHeight: 1.6 }}>
          {description}
        </div>
      )}
      {action}
    </Card>
  );
}

export function Tag({ children, color }) {
  return (
    <span className="sl-tag">
      {color && <span className="sl-dot" style={{ width: 6, height: 6, background: color }} />}
      {children}
    </span>
  );
}

const NOTICE_ICONS = {
  warn: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  good: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5h.01" /></>,
  bad: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5" /><path d="M12 16.5h.01" /></>,
};

// Obvestilo z ikono: varnostna kopija, testni podatki, samodejno vpisani redni stroški, nasveti.
export function Notice({ tone = 'info', children, action, onClose }) {
  return (
    <div role="status" className={`sl-notice sl-notice--${tone}`}>
      <span className="sl-notice-ico" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{NOTICE_ICONS[tone]}</svg>
      </span>
      <div className="sl-notice-body">{children}</div>
      {action}
      {onClose && <button type="button" className="sl-iconbtn" style={{ width: 30, height: 30 }} onClick={onClose} aria-label="Zapri obvestilo">{ZAPRI}</button>}
    </div>
  );
}
