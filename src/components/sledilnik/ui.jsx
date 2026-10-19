/**
 * Skupni gradniki sledilnika. Videz je v sledilnik.css (prenova 18. 10. 2026); tu so samo zgradba
 * in razredi, da so vsi pogledi enotni.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const cx = (...names) => names.filter(Boolean).join(' ');

export function Card({ children, padding = '1rem', style = {}, className, ...rest }) {
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

// Koliko oken je odprtih: dokler je katero, se stran pod njim ne pomika.
let odprtaOkna = 0;
const ZAPIRANJE_MS = 260;

/**
 * Okno: na telefonu list od spodaj, na računalniku na sredini zaslona (sledilnik.css).
 * Ob zaprtju zdrsne navzdol, ne izgine naenkrat: še ZAPIRANJE_MS kaže zadnjo vsebino. Na telefonu se
 * zapre tudi s potegom navzdol (avtor, 19. 10. 2026), kadar je vsebina na vrhu ali uporabnik prime ročaj.
 * Okno se izriše v koren aplikacije (.sl), da je nad vsem drugim in ima njene barve.
 */
export function Sheet({ open, onClose, label, width = 520, className, children }) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const zadnja = useRef(children);
  const dialogRef = useRef(null);
  const overlayRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  if (open) zadnja.current = children;

  useEffect(() => {
    if (open) {
      // Ponovno odprto med zapiranjem: počisti zamik od potega, sicer bi okno ostalo pod robom zaslona.
      if (dialogRef.current) dialogRef.current.style.transform = '';
      if (overlayRef.current) overlayRef.current.style.backgroundColor = '';
      setMounted(true); setLeaving(false);
      return undefined;
    }
    if (!mounted) return undefined;
    setLeaving(true);
    const t = setTimeout(() => { setMounted(false); setLeaving(false); }, ZAPIRANJE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;
    odprtaOkna += 1;
    document.documentElement.classList.add('sl-zaklep');
    return () => {
      odprtaOkna -= 1;
      if (odprtaOkna === 0) document.documentElement.classList.remove('sl-zaklep');
    };
  }, [mounted]);

  // Poteg navzdol: okno sledi prstu; dovolj dolg ali hiter poteg ga zapre, kratek ga vrne nazaj.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el || !mounted || leaving) return undefined;
    let y0 = 0, x0 = 0, dy = 0, zadnjiY = 0, zadnjiT = 0, hitrost = 0, vlecem = false, smem = false;
    const zacetek = (e) => {
      if (e.touches.length !== 1) { smem = false; return; }
      const t = e.touches[0];
      y0 = t.clientY; x0 = t.clientX; zadnjiY = y0; zadnjiT = e.timeStamp; dy = 0; hitrost = 0; vlecem = false;
      smem = el.scrollTop <= 0 || Boolean(e.target.closest?.('.sl-dialog-handle, .sl-dialog-head'));
    };
    const premik = (e) => {
      if (!smem) return;
      const t = e.touches[0];
      const ddy = t.clientY - y0;
      const ddx = t.clientX - x0;
      if (!vlecem) {
        if (ddy < -4 || Math.abs(ddx) > Math.abs(ddy)) { smem = false; return; }
        if (ddy < 8) return;
        vlecem = true;
        el.style.transition = 'none';
      }
      e.preventDefault();
      dy = Math.max(0, ddy - 8);
      hitrost = (t.clientY - zadnjiY) / Math.max(1, e.timeStamp - zadnjiT);
      zadnjiY = t.clientY; zadnjiT = e.timeStamp;
      el.style.transform = `translateY(${dy}px)`;
      if (overlayRef.current) overlayRef.current.style.backgroundColor = `rgba(12, 12, 12, ${(0.42 * Math.max(0, 1 - dy / el.offsetHeight)).toFixed(3)})`;
    };
    const konec = () => {
      if (!vlecem) return;
      vlecem = false;
      el.style.transition = '';
      if (dy > 110 || (dy > 30 && hitrost > 0.5)) {
        el.style.transform = 'translateY(100%)';
        onCloseRef.current?.();
      } else {
        el.style.transform = '';
        if (overlayRef.current) overlayRef.current.style.backgroundColor = '';
      }
    };
    el.addEventListener('touchstart', zacetek, { passive: true });
    el.addEventListener('touchmove', premik, { passive: false });
    el.addEventListener('touchend', konec);
    el.addEventListener('touchcancel', konec);
    return () => {
      el.removeEventListener('touchstart', zacetek);
      el.removeEventListener('touchmove', premik);
      el.removeEventListener('touchend', konec);
      el.removeEventListener('touchcancel', konec);
    };
  }, [mounted, leaving]);

  if (!mounted) return null;
  const root = document.querySelector('.sl') || document.body;
  return createPortal(
    <div ref={overlayRef} className={cx('sl-overlay', leaving && 'sl-leave')} onClick={() => !leaving && onClose?.()}>
      <div ref={dialogRef} className={cx('sl-dialog', className)} role="dialog" aria-modal="true" aria-label={label} style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="sl-dialog-handle" aria-hidden="true" />
        {open ? children : zadnja.current}
      </div>
    </div>,
    root,
  );
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  return (
    <Sheet open={open} onClose={onClose} label={title} width={width}>
      <div className="sl-dialog-head">
        <h3 className="sl-dialog-title">{title}</h3>
        <button type="button" className="sl-iconbtn" onClick={onClose} aria-label="Zapri">{ZAPRI}</button>
      </div>
      {children}
    </Sheet>
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
