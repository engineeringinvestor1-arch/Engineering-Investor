/**
 * Lightweight SVG chart primitives (no dependencies).
 * All charts use CSS variables for theming.
 */

import { useEffect, useRef, useState } from 'react';

// Širina vsebnika v slikovnih pikah, da se graf nariše v pravi velikosti (ostra črta in besedilo),
// namesto da bi ga brskalnik raztegnil.
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Okrogla zgornja meja osi in koraki: 0, 250, 500 ... namesto 0, 137, 274.
export function niceTicks(max, count = 4) {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * Poraba skozi mesec: seštevek odhodkov po dnevih za izbrani mesec in mesec prej.
 *
 * Oblika "poudarek": izbrani mesec v poudarjeni barvi z rahlim polnilom in končno piko, mesec prej v sivi
 * kot ozadje za primerjavo. Legenda je vedno prisotna (dve seriji), vrednost izbranega meseca je zapisana
 * ob koncu črte. Kazalec ali puščici levo/desno pokažeta navpično črto in obe vrednosti za tisti dan.
 *
 * current, previous: [vsota po 1. dnevu, po 2. dnevu, ...]; current je lahko krajši (tekoči mesec).
 */
export function CumulativeChart({ current, previous, days, currentLabel, previousLabel, format, height = 220 }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);

  const padL = 52, padR = 76, padT = 12, padB = 26;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const maxVal = Math.max(current.at(-1) ?? 0, previous.at(-1) ?? 0);
  const ticks = niceTicks(maxVal);
  const top = ticks.at(-1);
  const x = (day) => padL + (days > 1 ? ((day - 1) / (days - 1)) * innerW : 0);
  const y = (v) => padT + innerH * (1 - v / top);
  const linePath = (values) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const dayTicks = [1, 5, 10, 15, 20, 25, days].filter((d, i, all) => d <= days && all.indexOf(d) === i && (d === days || days - d >= 3));

  const lastDay = current.length;
  const endVal = current.at(-1) ?? 0;
  const prevEnd = previous.at(-1) ?? 0;
  // Oznaka prejšnjega meseca ob koncu črte samo, kadar se ne prekriva z oznako izbranega meseca.
  const showPrevLabel = previous.length > 0 && (lastDay < days - 2 || Math.abs(y(endVal) - y(prevEnd)) > 16);

  function dayFromPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const day = Math.round(((px - padL) / Math.max(1, innerW)) * (days - 1)) + 1;
    return Math.min(days, Math.max(1, day));
  }
  function onKey(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setHover((h) => Math.min(days, Math.max(1, (h ?? lastDay ?? 1) + (e.key === 'ArrowRight' ? 1 : -1))));
  }

  const hoverCur = hover && hover <= current.length ? current[hover - 1] : null;
  const hoverPrev = hover && hover <= previous.length ? previous[hover - 1] : null;
  const tipLeft = hover ? Math.min(Math.max(x(hover) - 80, 0), Math.max(0, width - 170)) : 0;
  const key = (color) => ({ display: 'inline-block', width: 16, height: 0, borderTop: `2px solid ${color}`, verticalAlign: 'middle', marginRight: 6 });
  const summary = `Poraba skozi mesec. ${currentLabel}: ${format(endVal)} do ${lastDay}. dne. ${previousLabel}: ${format(prevEnd)} v celem mesecu.`;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
        <span><span style={key('var(--color-accent)')} />{currentLabel}</span>
        <span><span style={key('var(--color-text-muted)')} />{previousLabel}</span>
      </div>
      <div ref={ref} style={{ position: 'relative', height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={summary} tabIndex={0}
            onPointerMove={(e) => setHover(dayFromPointer(e))} onPointerLeave={() => setHover(null)}
            onKeyDown={onKey} onBlur={() => setHover(null)}
            style={{ display: 'block', outlineOffset: 2, touchAction: 'pan-y' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={padL + innerW} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth="1" />
                <text x={padL - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--color-text-subtle)" style={{ fontVariantNumeric: 'tabular-nums' }}>{format(t)}</text>
              </g>
            ))}
            {dayTicks.map((d) => (
              <text key={d} x={x(d)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-text-subtle)">{d}.</text>
            ))}

            {previous.length > 1 && <path d={linePath(previous)} fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {current.length > 1 && (
              <path d={`${linePath(current)} L${x(lastDay).toFixed(1)},${y(0).toFixed(1)} L${x(1).toFixed(1)},${y(0).toFixed(1)} Z`} fill="var(--color-accent)" opacity="0.1" />
            )}
            {current.length > 1 && <path d={linePath(current)} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {current.length > 0 && (
              <>
                <circle cx={x(lastDay)} cy={y(endVal)} r="5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
                <text x={x(lastDay) + 10} y={y(endVal)} dominantBaseline="middle" fontSize="12" fontWeight="700" fill="var(--color-text)">{format(endVal)}</text>
              </>
            )}
            {showPrevLabel && (
              <text x={x(previous.length) + 10} y={y(prevEnd)} dominantBaseline="middle" fontSize="11" fill="var(--color-text-muted)">{format(prevEnd)}</text>
            )}

            {hover && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--color-border-strong)" strokeWidth="1" />
                {hoverPrev != null && <circle cx={x(hover)} cy={y(hoverPrev)} r="4" fill="var(--color-text-muted)" stroke="var(--color-surface)" strokeWidth="2" />}
                {hoverCur != null && <circle cx={x(hover)} cy={y(hoverCur)} r="4" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />}
              </g>
            )}
          </svg>
        )}
        {hover && (
          <div role="status" style={{
            position: 'absolute', top: 4, left: tipLeft, width: 170, pointerEvents: 'none',
            background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', borderRadius: 6,
            padding: '0.45rem 0.6rem', fontSize: '0.78rem', boxShadow: '0 6px 18px rgba(0,0,0,0.14)', lineHeight: 1.5,
          }}>
            <div style={{ color: 'var(--color-text-muted)' }}>Do {hover}. dne v mesecu</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: 'var(--color-text-muted)' }}><span style={key('var(--color-accent)')} />{currentLabel}</span>
              <strong style={{ color: 'var(--color-text)' }}>{hoverCur != null ? format(hoverCur) : 'še ni'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: 'var(--color-text-muted)' }}><span style={key('var(--color-text-muted)')} />{previousLabel}</span>
              <strong style={{ color: 'var(--color-text)' }}>{hoverPrev != null ? format(hoverPrev) : 'ni dneva'}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PieChart({ data, size = 200, thickness = 32, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  let acc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Tortni graf">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
      {total > 0 && data.map((d, i) => {
        const v = Math.max(0, d.value);
        if (v === 0) return null;
        const len = (v / total) * (2 * Math.PI * r);
        const dash = `${len} ${2 * Math.PI * r - len}`;
        const offset = -acc;
        acc += len;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color || 'var(--color-accent)'}
            strokeWidth={thickness}
            strokeDasharray={dash}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      {(centerLabel || centerValue) && (
        <g>
          {centerValue && (
            <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle"
              fill="var(--color-text)" fontSize={Math.round(size * 0.13)} fontWeight="700">
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle"
              fill="var(--color-text-muted)" fontSize={Math.round(size * 0.07)}>
              {centerLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

export function BarChart({ data, height = 220, format = (v) => String(v) }) {
  const max = Math.max(1, ...data.map((d) => Math.max(Math.abs(d.income || 0), Math.abs(d.expense || 0), Math.abs(d.value || 0))));
  const w = 100;
  const padX = 6;
  const usableW = w - 2 * padX;
  const barAreaW = usableW / data.length;
  const isDual = data.some((d) => 'income' in d || 'expense' in d);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} 100`} preserveAspectRatio="none" width="100%" height={height} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={padX} x2={w - padX} y1={5 + 90 * (1 - p)} y2={5 + 90 * (1 - p)}
            stroke="var(--color-border)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const x = padX + i * barAreaW;
          if (isDual) {
            const inc = Math.max(0, d.income || 0);
            const exp = Math.max(0, d.expense || 0);
            const ih = (inc / max) * 90;
            const eh = (exp / max) * 90;
            const bw = barAreaW * 0.35;
            return (
              <g key={i}>
                <rect x={x + barAreaW * 0.1} y={5 + (90 - ih)} width={bw} height={ih} fill="#059669" rx="0.5" />
                <rect x={x + barAreaW * 0.1 + bw + 1} y={5 + (90 - eh)} width={bw} height={eh} fill="#dc2626" rx="0.5" />
              </g>
            );
          }
          const v = Math.max(0, d.value || 0);
          const h = (v / max) * 90;
          return <rect key={i} x={x + barAreaW * 0.15} y={5 + (90 - h)} width={barAreaW * 0.7} height={h} fill={d.color || 'var(--color-accent)'} rx="0.5" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ series, height = 220, format = (v) => String(v) }) {
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) return null;
  const max = Math.max(...allPoints.map((p) => p.y));
  const min = Math.min(0, ...allPoints.map((p) => p.y));
  const range = Math.max(1, max - min);
  const w = 100, h = 100;
  const padL = 4, padR = 2, padT = 4, padB = 8;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

  const yPos = (v) => padT + innerH * (1 - (v - min) / range);
  const xPos = (i) => padL + i * xStep;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={height} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={padL} x2={w - padR} y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)}
            stroke="var(--color-border)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s, si) => {
          const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.y)}`).join(' ');
          return (
            <g key={si}>
              {s.fill && (
                <path
                  d={`${path} L ${xPos(s.points.length - 1)} ${yPos(0)} L ${xPos(0)} ${yPos(0)} Z`}
                  fill={s.color}
                  opacity="0.12"
                />
              )}
              <path d={path} fill="none" stroke={s.color || 'var(--color-accent)'} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
              {s.points.map((p, i) => (
                <circle key={i} cx={xPos(i)} cy={yPos(p.y)} r="0.7" fill={s.color || 'var(--color-accent)'} />
              ))}
            </g>
          );
        })}
      </svg>
      {labels.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
          {labels.map((l, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, max, color = 'var(--color-accent)', height = 8 }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div style={{
      width: '100%', height, background: 'var(--color-border)', borderRadius: height,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${pct * 100}%`, height: '100%',
        background: color,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

export function StackedBar({ segments, height = 14 }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  return (
    <div style={{
      display: 'flex', width: '100%', height, borderRadius: height,
      overflow: 'hidden', background: 'var(--color-border)',
    }}>
      {total > 0 && segments.map((s, i) => {
        const pct = (Math.max(0, s.value) / total) * 100;
        if (pct === 0) return null;
        return (
          <div key={i} title={s.label}
            style={{ width: `${pct}%`, background: s.color, transition: 'width 0.3s ease' }}
          />
        );
      })}
    </div>
  );
}

/**
 * Sankey-style flow chart: incomes -> total -> expense categories.
 * Custom minimal renderer (single hub).
 */
export function FlowChart({ incomes, expenses, height = 360 }) {
  const totalIn = incomes.reduce((s, d) => s + Math.max(0, d.value), 0);
  const totalOut = expenses.reduce((s, d) => s + Math.max(0, d.value), 0);
  const total = Math.max(totalIn, totalOut, 1);
  const w = 100;
  const hubW = 8;
  const hubX = (w - hubW) / 2;

  let leftAcc = 0;
  let rightAcc = 0;
  const incomeNodes = incomes.map((d) => {
    const h = (Math.max(0, d.value) / total) * 100;
    const node = { ...d, h, y: leftAcc };
    leftAcc += h + 1.5;
    return node;
  });
  const expenseNodes = expenses.map((d) => {
    const h = (Math.max(0, d.value) / total) * 100;
    const node = { ...d, h, y: rightAcc };
    rightAcc += h + 1.5;
    return node;
  });

  const incTotalH = incomeNodes.reduce((s, n) => s + n.h, 0) + Math.max(0, incomeNodes.length - 1) * 1.5;
  const expTotalH = expenseNodes.reduce((s, n) => s + n.h, 0) + Math.max(0, expenseNodes.length - 1) * 1.5;

  let hubInY = 0;
  let hubOutY = 0;

  return (
    <svg viewBox={`0 0 ${w} 100`} preserveAspectRatio="none" width="100%" height={height} style={{ display: 'block' }}>
      <rect x={hubX} y={0} width={hubW} height={100} fill="var(--color-accent)" opacity="0.7" rx="0.5" />
      {incomeNodes.map((n, i) => {
        const sourceX = 0;
        const sourceY = n.y + n.h / 2;
        const targetX = hubX;
        const targetY = hubInY + n.h / 2;
        hubInY += n.h;
        const path = `M ${sourceX} ${sourceY} C ${(sourceX + targetX) / 2} ${sourceY}, ${(sourceX + targetX) / 2} ${targetY}, ${targetX} ${targetY}`;
        return (
          <g key={`in-${i}`}>
            <rect x={0} y={n.y} width={2} height={n.h} fill={n.color} rx="0.3" />
            <path d={path} stroke={n.color} strokeWidth={n.h} fill="none" opacity="0.45"
              vectorEffect="non-scaling-stroke" style={{ strokeWidth: `${n.h}px`, strokeLinecap: 'butt' }} />
          </g>
        );
      })}
      {expenseNodes.map((n, i) => {
        const sourceX = hubX + hubW;
        const sourceY = hubOutY + n.h / 2;
        hubOutY += n.h;
        const targetX = w;
        const targetY = n.y + n.h / 2;
        const path = `M ${sourceX} ${sourceY} C ${(sourceX + targetX) / 2} ${sourceY}, ${(sourceX + targetX) / 2} ${targetY}, ${targetX} ${targetY}`;
        return (
          <g key={`out-${i}`}>
            <rect x={w - 2} y={n.y} width={2} height={n.h} fill={n.color} rx="0.3" />
            <path d={path} stroke={n.color} strokeWidth={n.h} fill="none" opacity="0.45"
              vectorEffect="non-scaling-stroke" style={{ strokeWidth: `${n.h}px`, strokeLinecap: 'butt' }} />
          </g>
        );
      })}
    </svg>
  );
}
