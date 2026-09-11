import { useId, type ReactNode } from 'react';
import { HistoryRichText } from './HistoryRichText';
import {
  HISTORY_DIAGRAM_KEYS,
  cepheidMagnitude,
  ellipseAt,
  hubbleTeachingPoints,
  linearScale,
  sahaLogRatio,
  sampledPath,
  sampleRange,
  whiteDwarfRadiusRatio,
} from '@/learn/historyDiagramGeometry';

type Lang = 'ko' | 'en';
export type HistoryDiagramProps = { questId: string; questionId: string; lang: Lang };
const fg = 'var(--fg)',
  muted = 'var(--muted)',
  accent = 'var(--accent)',
  soft = 'var(--accent-soft)';
const tr = (lang: Lang, ko: string, en: string) => (lang === 'ko' ? ko : en);
// 아래첨자는 의미/숫자 모두 정체. 변수만 기울임체로 표시한다.
const V = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <tspan fontStyle="italic">
    {children}
    {sub && (
      <tspan fontStyle="normal" baselineShift="sub" fontSize="75%">
        {sub}
      </tspan>
    )}
  </tspan>
);
const Label = ({
  x,
  y,
  children,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
}) => (
  <text x={x} y={y} textAnchor={anchor} fill={fg} stroke="none">
    {children}
  </text>
);
const Line = ({
  x1,
  y1,
  x2,
  y2,
  dash,
  strong = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dash?: boolean;
  strong?: boolean;
}) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={strong ? accent : muted}
    strokeWidth={strong ? 2.5 : 1.4}
    strokeDasharray={dash ? '5 4' : undefined}
  />
);
const Dot = ({ x, y, hollow = false }: { x: number; y: number; hollow?: boolean }) => (
  <circle
    cx={x}
    cy={y}
    r={4}
    fill={hollow ? 'var(--surface)' : accent}
    stroke={accent}
    strokeWidth={2}
  />
);
function Arrow({
  x1,
  y1,
  x2,
  y2,
  dash = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dash?: boolean;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const wing = (offset: number) =>
    `${x2 - 6 * Math.cos(angle + offset)},${y2 - 6 * Math.sin(angle + offset)}`;
  return (
    <g>
      <Line {...{ x1, y1, x2, y2, dash }} strong />
      <polyline
        points={`${wing(-0.45)} ${x2},${y2} ${wing(0.45)}`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
    </g>
  );
}
const Curve = ({ d, dash = false }: { d: string; dash?: boolean }) => (
  <path
    d={d}
    fill="none"
    stroke={dash ? muted : accent}
    strokeWidth={2.5}
    strokeDasharray={dash ? '5 4' : undefined}
  />
);
function Axes({ xLabel, yLabel }: { xLabel: ReactNode; yLabel: ReactNode }) {
  return (
    <g>
      <Line x1={46} y1={176} x2={294} y2={176} />
      <Line x1={46} y1={176} x2={46} y2={36} />
      <Label x={48} y={23} anchor="start">
        {yLabel}
      </Label>
      <Label x={290} y={212} anchor="end">
        {xLabel}
      </Label>
    </g>
  );
}
const px = (x: number, max = 40) => linearScale(x, 0, max, 46, 286);
const py = (y: number, max: number) => linearScale(y, 0, max, 176, 42);

function Earth({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('baseline'))
    return (
      <g>
        <Arrow x1={70} y1={178} x2={70} y2={44} />
        <Label x={70} y={28}>
          N
        </Label>
        <Line x1={70} y1={178} x2={130} y2={74.077} strong />
        <Line x1={70} y1={74.077} x2={130} y2={74.077} dash />
        <path d="M70 145 A33 33 0 0 1 86.5 149.421" stroke={accent} fill="none" />
        <Label x={109} y={145}>
          30°
        </Label>
        <Label x={123} y={122}>
          <V>s</V>
        </Label>
        <Label x={170} y={65}>
          {tr(lang, '남북 성분', 'N–S part')}
        </Label>
        <Line x1={78} y1={79} x2={108} y2={65} />
        <Dot x={70} y={178} />
        <Dot x={130} y={74.077} />
        <Label x={214} y={173}>
          {tr(lang, '국소 평면', 'Local plane')}
        </Label>
      </g>
    );
  const uncertainty = q.endsWith('uncertainty');
  const cx = 117,
    cy = 130,
    r = 65,
    angle = (34 * Math.PI) / 180;
  const x = cx + r * Math.sin(angle),
    y = cy - r * Math.cos(angle);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} stroke={muted} fill={soft} />
      <Arrow x1={cx} y1={25} x2={cx} y2={61} />
      <Arrow x1={x} y1={25} x2={x} y2={y - 5} />
      <Line x1={cx} y1={cy} x2={cx} y2={cy - r} dash />
      <Line x1={cx} y1={cy} x2={x + 18} y2={y - 26.7} dash />
      <path
        d={`M${cx} ${cy - r} A${r} ${r} 0 0 1 ${x} ${y}`}
        stroke={accent}
        strokeWidth={4}
        fill="none"
      />
      <path
        d={`M${cx} ${cy - 23} A23 23 0 0 1 ${cx + 23 * Math.sin(angle)} ${cy - 23 * Math.cos(angle)}`}
        stroke={accent}
        fill="none"
      />
      <Dot x={cx} y={cy - r} />
      <Dot x={x} y={y} />
      <Label x={cx - 16} y={cy + 7}>
        O
      </Label>
      <Label x={154} y={119}>
        <V>θ</V>
      </Label>
      <Label x={218} y={45}>
        {tr(lang, '평행광', 'Parallel rays')}
      </Label>
      <Label x={160} y={211}>
        <V>s</V> = {uncertainty ? '800 ± 8' : '800.0'} km
      </Label>
      <Label x={217} y={148}>
        <V>θ</V> = {uncertainty ? '7.20°' : '7.200°'}
      </Label>
      {uncertainty && (
        <Label x={217} y={171}>
          ± 0.12°
        </Label>
      )}
    </g>
  );
}

function Orbit({ q, lang }: { q: string; lang: Lang }) {
  const time = q.endsWith('flight-time'),
    mass = q.endsWith('binary-mass');
  const a = time || mass ? 82 : 96,
    e = mass ? 0.3 : 0.6,
    p = ellipseAt(a, e, Math.PI / 2);
  const cx = 160,
    cy = 116,
    focus = cx + p.focusX;
  return (
    <g>
      {time && <circle cx={cx} cy={cy} r={a} stroke={muted} fill="none" strokeDasharray="5 4" />}
      <ellipse cx={cx} cy={cy} rx={a} ry={p.b} fill="none" stroke={accent} strokeWidth={2.5} />
      <Dot x={focus} y={cy} />
      <Label x={focus - 7} y={cy + 22}>
        {mass ? '1' : 'F'}
      </Label>
      <Line x1={cx - a} y1={cy} x2={cx + a} y2={cy} dash />
      {time ? (
        <>
          <path
            d={`M${focus} ${cy} L${cx + a} ${cy} A${a} ${p.b} 0 0 0 ${cx} ${cy - p.b} Z`}
            fill={soft}
          />
          <Line x1={cx} y1={cy} x2={cx} y2={cy - a} />
          <Line x1={focus} y1={cy} x2={cx} y2={cy - p.b} strong />
          <Dot x={cx} y={cy - p.b} />
          <Dot x={cx} y={cy - a} hollow />
          <path d={`M${cx + 30} ${cy} A30 30 0 0 0 ${cx} ${cy - 30}`} stroke={muted} fill="none" />
          <Label x={cx + 12} y={cy - 5}>
            <V>E</V>
          </Label>
          <Label x={cx - 14} y={cy + 20}>
            O
          </Label>
          <Label x={56} y={28}>
            <V>E</V> = π/2
          </Label>
          <Label x={160} y={216}>
            <V>P</V> = 400 {tr(lang, '일', 'days')}
          </Label>
        </>
      ) : mass ? (
        <>
          <Dot x={cx} y={cy - p.b} />
          <Label x={cx + 17} y={cy - p.b + 5}>
            2
          </Label>
          <Line x1={focus} y1={cy} x2={cx} y2={cy - p.b} strong />
          <Line x1={cx} y1={cy + 12} x2={cx + a} y2={cy + 12} strong />
          <Label x={cx + 40} y={cy + 36}>
            <V>a</V> = 4 AU
          </Label>
          <Label x={160} y={216}>
            <V>P</V> = 2 {tr(lang, '년', 'yr')}
          </Label>
        </>
      ) : (
        <>
          <Dot x={cx + a} y={cy} />
          <Dot x={cx - a} y={cy} />
          <Arrow x1={cx + a} y1={cy} x2={cx + a} y2={cy - 30} />
          <Arrow x1={cx - a} y1={cy} x2={cx - a} y2={cy + 30} />
          <Label x={cx + a + 15} y={cy - 37}>
            <V>v</V>
          </Label>
          <Label x={cx - a - 15} y={cy + 50}>
            <V>v</V>
          </Label>
          <Label x={160} y={216}>
            <V>e</V> = 0.600
          </Label>
        </>
      )}
    </g>
  );
}

function LightDelay({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('period-bias'))
    return (
      <g>
        <Axes
          xLabel={tr(lang, '주기 간격 수', 'Orbital intervals')}
          yLabel={tr(lang, '잔차 (s)', 'Residual (s)')}
        />
        <Curve d={`M${px(0)} ${py(0, 70)} L${px(40)} ${py(60, 70)}`} />
        {[0, 20, 40].map((n) => (
          <Label key={n} x={px(n)} y={195}>
            {n}
          </Label>
        ))}
        <Label x={35} y={py(60, 70) + 4} anchor="end">
          60
        </Label>
        <Dot x={px(0)} y={py(0, 70)} />
        <Dot x={px(40)} y={py(60, 70)} />
      </g>
    );
  const compare = q.endsWith('model-test');
  return (
    <g>
      <circle cx={58} cy={91} r={22} fill={soft} stroke={accent} />
      <Label x={58} y={130}>
        {tr(lang, '목성', 'Jupiter')}
      </Label>
      <Dot x={88} y={78} />
      <Label x={88} y={55}>
        Io
      </Label>
      <Arrow x1={94} y1={80} x2={190} y2={80} />
      <Arrow x1={94} y1={86} x2={272} y2={143} />
      <circle cx={204} cy={80} r={9} fill={soft} stroke={accent} />
      <circle cx={281} cy={146} r={9} fill={soft} stroke={accent} />
      <Label x={210} y={60}>
        {tr(lang, '지구 A', 'Earth A')}
      </Label>
      <Label x={265} y={175}>
        {tr(lang, '지구 B', 'Earth B')}
      </Label>
      {compare ? (
        <>
          <Arrow x1={209} y1={101} x2={257} y2={135} />
          <Arrow x1={253} y1={115} x2={220} y2={90} dash />
          <Label x={160} y={214}>
            {tr(lang, '서로 다른 계절 비교', 'Compare seasons')}
          </Label>
        </>
      ) : (
        <>
          <Label x={193} y={26}>
            Δ<V>t</V> = 1200 s
          </Label>
          <Label x={166} y={214}>
            Δ<V>D</V> = 1.80 AU
          </Label>
        </>
      )}
    </g>
  );
}

function Cepheid({ q, lang }: { q: string; lang: Lang }) {
  const zero = q.endsWith('zero-point'),
    extinction = q.endsWith('extinction-bias');
  const y = (m: number) => linearScale(m, 0, -8, 176, 42);
  const path = (offset = 0) =>
    sampledPath(
      sampleRange(0, 2).map((logP) => ({
        x: px(logP, 2),
        y: y(cepheidMagnitude(10 ** logP) + offset),
      })),
    );
  return (
    <g>
      <Axes
        xLabel={
          <>
            <V>P</V> ({tr(lang, '일 · 로그축', 'days · log')})
          </>
        }
        yLabel={
          zero ? (
            tr(lang, '겉보기 밝기 비교', 'Apparent brightness')
          ) : (
            <>
              <V>M</V>
              <tspan fontStyle="normal" baselineShift="sub" fontSize="75%">
                V
              </tspan>{' '}
              (mag)
            </>
          )
        }
      />
      <Curve d={path()} />
      {zero && <Curve d={path(1)} dash />}
      {[0, 1, 2].map((n) => (
        <Label key={n} x={px(n, 2)} y={195}>
          {10 ** n}
        </Label>
      ))}
      {!zero &&
        [0, -4, -8].map((n) => (
          <Label key={n} x={35} y={y(n) + 4} anchor="end">
            {n}
          </Label>
        ))}
      {!zero && (
        <>
          <Line x1={px(1, 2)} y1={176} x2={px(1, 2)} y2={y(cepheidMagnitude(10))} dash />
          <Dot x={px(1, 2)} y={y(cepheidMagnitude(10))} />
          <Label x={194} y={143}>
            <V>A</V>
            <tspan fontStyle="normal" baselineShift="sub" fontSize="75%">
              V
            </tspan>{' '}
            = 0.30 mag
          </Label>
          {!extinction && (
            <Label x={194} y={166}>
              <V>m</V>
              <tspan fontStyle="normal" baselineShift="sub" fontSize="75%">
                V
              </tspan>{' '}
              = 15.20
            </Label>
          )}
        </>
      )}
      {zero && (
        <Label x={193} y={165}>
          {tr(lang, '영점?', 'Offset?')}
        </Label>
      )}
    </g>
  );
}

function Spectrum({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('saha-ratio')) {
    const max = sahaLogRatio(10000);
    return (
      <g>
        <Axes
          xLabel={
            <>
              <V>T</V> (K)
            </>
          }
          yLabel={tr(lang, '이온/중성 · 로그축', 'Ion/neutral · log')}
        />
        <Curve
          d={sampledPath(
            sampleRange(6000, 10000).map((t) => ({
              x: linearScale(t, 6000, 10000, 46, 286),
              y: py(sahaLogRatio(t), max * 1.12),
            })),
          )}
        />
        <Label x={46} y={196}>
          6000
        </Label>
        <Label x={286} y={196}>
          10000
        </Label>
        <Label x={162} y={160}>
          {tr(lang, '전자 밀도 고정', 'Fixed electron density')}
        </Label>
      </g>
    );
  }
  if (q.endsWith('level-population'))
    return (
      <g>
        {[
          { x: 82, t: 6000, r: '0.01' },
          { x: 235, t: 10000, r: '10' },
        ].map(({ x, t, r }) => (
          <g key={t}>
            <Label x={x} y={24}>
              {t} K
            </Label>
            <Line x1={x - 40} y1={158} x2={x + 40} y2={158} strong />
            <Line x1={x - 40} y1={102} x2={x + 40} y2={102} strong />
            <Line x1={x - 40} y1={56} x2={x + 40} y2={56} dash />
            <Arrow x1={x - 17} y1={151} x2={x - 17} y2={109} />
            <Arrow x1={x + 15} y1={151} x2={x + 15} y2={63} />
            <Label x={x - 14} y={94} anchor="end">
              <V>n</V> = 2
            </Label>
            <Label x={x} y={183}>
              <V>R</V> = {r}
            </Label>
          </g>
        ))}
        <Label x={160} y={217}>
          {tr(lang, '실선: 중성 · 점선: 이온화', 'Solid: neutral · dashed: ionized')}
        </Label>
      </g>
    );
  const path = (depth: number, offset: number) =>
    sampledPath(
      sampleRange(0, 1).map((t) => ({
        x: 46 + 240 * t,
        y: 70 + offset + depth * Math.exp(-(((t - 0.47) / 0.07) ** 2)),
      })),
    );
  return (
    <g>
      <Axes
        xLabel={tr(lang, '파장 →', 'Wavelength →')}
        yLabel={tr(lang, '연속광에 대한 세기', 'Relative intensity')}
      />
      <Curve d={path(58, 0)} />
      <Curve d={path(27, 33)} dash />
      <Label x={278} y={62}>
        A
      </Label>
      <Label x={278} y={120}>
        B
      </Label>
    </g>
  );
}

function Deflection({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('weighted-fit')) {
    const x = (n: number) => linearScale(n, 1.2, 2.4, 46, 286);
    return (
      <g>
        <Axes
          xLabel={
            <>
              <V>α</V> (″)
            </>
          }
          yLabel={tr(lang, '독립 측정 · 1σ', 'Independent data · 1σ')}
        />
        {[
          { m: 1.7, e: 0.2, y: 75 },
          { m: 1.9, e: 0.3, y: 127 },
        ].map(({ m, e, y }) => (
          <g key={m}>
            <Line x1={x(m - e)} y1={y} x2={x(m + e)} y2={y} strong />
            <Dot x={x(m)} y={y} />
            <Line x1={x(m - e)} y1={y - 5} x2={x(m - e)} y2={y + 5} />
            <Line x1={x(m + e)} y1={y - 5} x2={x(m + e)} y2={y + 5} />
            <Label x={x(m)} y={y - 14}>
              {m.toFixed(2)} ± {e.toFixed(2)}
            </Label>
          </g>
        ))}
        {[1.2, 1.8, 2.4].map((n) => (
          <Label key={n} x={x(n)} y={196}>
            {n}
          </Label>
        ))}
      </g>
    );
  }
  if (q.endsWith('systematics'))
    return (
      <g>
        <Label x={160} y={24}>
          <V>N</V> = 100
        </Label>
        <Label x={160} y={57}>
          <V>σ</V> = 0.20″
        </Label>
        {(
          [
            [8, 11],
            [-10, -9],
            [5, -10],
            [-7, 8],
            [9, 4],
          ] as const
        ).map(([dx, dy], i) => (
          <g key={i}>
            <Dot x={55 + i * 48} y={83} hollow />
            <Arrow x1={55 + i * 48} y1={83} x2={55 + i * 48 + dx} y2={83 + dy} />
          </g>
        ))}
        <Label x={160} y={129}>
          <V>τ</V> = 0.10″
        </Label>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <Dot x={55 + i * 48} y={156} hollow />
            <Arrow x1={55 + i * 48} y1={156} x2={70 + i * 48} y2={161} />
          </g>
        ))}
        <Label x={160} y={213}>
          {tr(lang, '위: 각각 · 아래: 함께', 'Above: separate · below: shared')}
        </Label>
      </g>
    );
  return (
    <g>
      <circle cx={160} cy={145} r={31} stroke={accent} fill={soft} />
      <Label x={160} y={152}>
        {tr(lang, '태양', 'Sun')}
      </Label>
      <Line x1={24} y1={83} x2={292} y2={83} dash />
      <Curve d="M24 83 L143 83 Q174 83 192 94 L292 126" />
      <Arrow x1={47} y1={83} x2={88} y2={83} />
      <Arrow x1={240} y1={109.36} x2={277} y2={121.2} />
      <Line x1={160} y1={145} x2={160} y2={83} strong />
      <Label x={123} y={114}>
        <V>b</V>
      </Label>
      <Label x={236} y={69}>
        <V>α</V>
      </Label>
      <Label x={160} y={213}>
        <V>b</V> = 2<V>R</V>
        <tspan fontStyle="normal" baselineShift="sub" fontSize="75%">
          ☉
        </tspan>
      </Label>
    </g>
  );
}

function Degeneracy({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('radius'))
    return (
      <g>
        {[
          { x: 84, m: 0.4 },
          { x: 236, m: 0.8 },
        ].map(({ x, m }, i) => (
          <g key={m}>
            <circle
              cx={x}
              cy={110}
              r={44 * whiteDwarfRadiusRatio(m)}
              fill={soft}
              stroke={accent}
              strokeWidth={2}
            />
            <Line x1={x} y1={110} x2={x + 44 * whiteDwarfRadiusRatio(m)} y2={110} strong />
            <Label x={x} y={188}>
              {m.toFixed(2)} <V>M</V>
              <tspan fontStyle="normal" baselineShift="sub" fontSize="75%">
                ☉
              </tspan>
            </Label>
            <Label x={x} y={91}>
              <V sub={String(i + 1)}>R</V>
            </Label>
          </g>
        ))}
      </g>
    );
  const scaling = q.endsWith('scaling');
  return (
    <g>
      <circle cx={160} cy={113} r={54} fill={soft} stroke={muted} />
      {(
        [
          [142, 95],
          [177, 101],
          [151, 135],
          [183, 131],
        ] as const
      ).map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={5} fill={accent} />
          <Label x={x - 10} y={y - 9}>
            <V>e</V>
            <tspan fontStyle="normal" baselineShift="super" fontSize="75%">
              −
            </tspan>
          </Label>
        </g>
      ))}
      <Arrow x1={107} y1={113} x2={77} y2={113} />
      <Arrow x1={213} y1={113} x2={243} y2={113} />
      <Arrow x1={160} y1={32} x2={160} y2={60} />
      <Arrow x1={160} y1={194} x2={160} y2={165} />
      <Label x={160} y={22}>
        {tr(lang, '중력', 'Gravity')}
      </Label>
      <Label x={160} y={216}>
        {scaling ? (
          tr(lang, '같은 조성 · 압력 비교', 'Fixed composition · pressure')
        ) : (
          <>
            <V sub="e">μ</V> = 2.15
          </>
        )}
      </Label>
      <Label x={49} y={97}>
        <V sub="deg">P</V>
      </Label>
      <Label x={270} y={97}>
        <V sub="deg">P</V>
      </Label>
      {scaling && <Line x1={160} y1={113} x2={199} y2={76} dash />}
    </g>
  );
}

function Expansion({ q }: { q: string; lang: Lang }) {
  const recalibrate = q.endsWith('calibration'),
    time = q.endsWith('time');
  const max = recalibrate ? 80 : 40;
  const points = hubbleTeachingPoints();
  return (
    <g>
      <Axes
        xLabel={
          <>
            <V>d</V> (Mpc)
          </>
        }
        yLabel={
          <>
            <V>v</V> (km/s)
          </>
        }
      />
      {[0, max / 2, max].map((n) => (
        <Label key={n} x={px(n, max)} y={196}>
          {n}
        </Label>
      ))}
      {[0, 1500, 3000].map((n) => (
        <Label key={n} x={39} y={py(n, 3200) + 4} anchor="end">
          {n}
        </Label>
      ))}
      {time ? (
        <>
          <Curve d={`M46 176 L${px(40)} ${py(2800, 3200)}`} />
          <Label x={176} y={78}>
            <V>H</V> = 70.0
          </Label>
        </>
      ) : (
        points.map(({ x, y }, i) => (
          <g key={x}>
            <Dot x={px(x, max)} y={py(y, 3200)} hollow={recalibrate} />
            {!recalibrate && (
              <Label
                x={px(x, max) + (i === 2 ? -8 : 8)}
                y={py(y, 3200) + (i === 0 ? 21 : i === 2 ? -12 : -10)}
                anchor={i === 2 ? 'end' : 'start'}
              >
                {x}, {y}
              </Label>
            )}
            {recalibrate && (
              <>
                <Arrow
                  x1={px(x, max) + 6}
                  y1={py(y, 3200)}
                  x2={px(x * 2, max) - 5}
                  y2={py(y, 3200)}
                />
                <Dot x={px(x * 2, max)} y={py(y, 3200)} />
              </>
            )}
          </g>
        ))
      )}
    </g>
  );
}

function Cluster({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('noise-correction'))
    return (
      <g>
        <Label x={160} y={27}>
          {tr(lang, '분산: 표준편차의 제곱', 'Variance: squared dispersion')}
        </Label>
        <Label x={160} y={64}>
          <V sub="obs">σ</V> = 900 km/s
        </Label>
        <rect x={46} y={78} width={234} height={22} fill={soft} stroke={accent} />
        <Label x={160} y={137}>
          <V sub="err">σ</V> = 300 km/s
        </Label>
        <rect
          x={46}
          y={152}
          width={234 * (300 / 900) ** 2}
          height={22}
          fill={soft}
          stroke={accent}
          strokeDasharray="4 3"
        />
        <Label x={160} y={214}>
          {tr(lang, '막대 길이는 σ²에 비례', 'Bar length represents σ²')}
        </Label>
      </g>
    );
  const evidence = q.endsWith('evidence');
  return (
    <g>
      <circle cx={145} cy={114} r={70} fill={soft} stroke={muted} strokeDasharray="5 4" />
      {(
        [
          [117, 73],
          [178, 83],
          [102, 121],
          [153, 111],
          [188, 139],
          [134, 158],
        ] as const
      ).map(([x, y], i) => (
        <g key={i}>
          <ellipse
            cx={x}
            cy={y}
            rx={7}
            ry={3}
            transform={`rotate(${i * 29} ${x} ${y})`}
            fill={accent}
          />
          {!evidence && <Arrow x1={x} y1={y + 5} x2={x + (i % 2 ? 9 : -9)} y2={y + 18} />}
        </g>
      ))}
      <Line x1={145} y1={114} x2={215} y2={114} dash />
      <Label x={179} y={104}>
        <V>R</V>
      </Label>
      {evidence ? (
        <>
          <Label x={247} y={72}>
            {tr(lang, '별빛', 'Starlight')}
          </Label>
          <Label x={244} y={162}>
            {tr(lang, '뜨거운 기체', 'Hot gas')}
          </Label>
        </>
      ) : (
        <>
          <Label x={160} y={24}>
            <V>R</V> = 1.00 Mpc
          </Label>
          <Label x={160} y={215}>
            <V>σ</V> = 900 km/s
          </Label>
        </>
      )}
    </g>
  );
}

function Rotation({ q, lang }: { q: string; lang: Lang }) {
  if (q.endsWith('missing-fraction'))
    return (
      <g>
        <Axes
          xLabel={tr(lang, '같은 반지름', 'Same radius')}
          yLabel={
            <>
              <V>v</V> (km/s)
            </>
          }
        />
        <rect
          x={83}
          y={py(120, 240)}
          width={55}
          height={176 - py(120, 240)}
          fill={soft}
          stroke={muted}
          strokeDasharray="5 4"
        />
        <rect
          x={212}
          y={py(200, 240)}
          width={55}
          height={176 - py(200, 240)}
          fill={soft}
          stroke={accent}
        />
        <Label x={110} y={py(120, 240) - 12}>
          120
        </Label>
        <Label x={239} y={py(200, 240) - 12}>
          200
        </Label>
        <Label x={110} y={194}>
          {tr(lang, '바리온', 'Baryons')}
        </Label>
        <Label x={239} y={194}>
          {tr(lang, '관측', 'Observed')}
        </Label>
      </g>
    );
  const density = q.endsWith('density-slope');
  return (
    <g>
      <Axes
        xLabel={
          <>
            <V>r</V> {density ? '' : '(kpc)'}
          </>
        }
        yLabel={
          density ? (
            <>
              <V>v</V> / <V sub="0">v</V>
            </>
          ) : (
            <>
              <V sub="los">v</V> (km/s)
            </>
          )
        }
      />
      {density ? (
        <>
          <Curve d="M86 87 L268 87" />
          <Dot x={86} y={87} hollow />
          <Dot x={268} y={87} hollow />
          <Label x={35} y={92} anchor="end">
            1
          </Label>
          <Label x={86} y={195}>
            <V sub="1">r</V>
          </Label>
          <Label x={268} y={195}>
            <V sub="2">r</V>
          </Label>
        </>
      ) : (
        <>
          <Line x1={px(20)} y1={176} x2={px(20)} y2={py(180, 240)} dash />
          <Dot x={px(20)} y={py(180, 240)} />
          <Label x={px(20)} y={195}>
            20.0
          </Label>
          <Label x={px(20) - 9} y={py(180, 240) - 12} anchor="end">
            180
          </Label>
          <ellipse cx={252} cy={94} rx={31} ry={15.5} stroke={muted} fill={soft} />
          <Line x1={221} y1={94} x2={283} y2={94} dash />
          <Label x={248} y={62}>
            <V>i</V> = 60°
          </Label>
          <Label x={241} y={147}>
            {tr(lang, '투영 장축', 'Major axis')}
          </Label>
        </>
      )}
    </g>
  );
}

const notes: Record<string, { title: [string, string]; caption: [string, string] }> = {
  'eratosthenes-circumference': {
    title: ['두 지점과 평행한 햇빛', 'Two sites and parallel sunlight'],
    caption: [
      '구형 지구 모형. 중심각을 알아보기 쉽게 확대했으며 그림은 축척도가 아니에요.',
      'Spherical model; the angle is enlarged for clarity. Not to scale.',
    ],
  },
  'eratosthenes-uncertainty': {
    title: ['거리와 각도의 불확실성', 'Uncertainty in distance and angle'],
    caption: [
      '거리와 각도에 각각 측정 오차가 있어요. 중심각은 확대 표시한 교육 모형이에요.',
      'Both measurements have uncertainty. The teaching diagram enlarges the central angle.',
    ],
  },
  'eratosthenes-baseline': {
    title: ['측정선의 남북 성분', 'North–south baseline component'],
    caption: [
      '실제 고대 도시 배치가 아닌 국소 평면 모형이에요. 두 축의 길이 척도는 같아요.',
      'A local plane model, not the ancient cities. Both spatial axes use the same scale.',
    ],
  },
  'kepler-binary-mass': {
    title: ['두 별 사이의 상대 궤도', 'Relative orbit of two stars'],
    caption: [
      '별1을 기준으로 그린 별2의 상대 궤도예요. 질량중심 궤도와 다르며 모양은 예시예요.',
      'Star 2 relative to star 1, not a barycentric orbit. The orbit shape is illustrative.',
    ],
  },
  'kepler-apsis-speed': {
    title: ['타원의 두 끝점', 'The two apsides'],
    caption: [
      '초점 F에서의 거리가 달라요. 화살표는 속도의 방향만 표시하며 길이는 속력 척도가 아니에요.',
      'Distances from focus F differ. Arrows show direction only; their lengths do not encode speed.',
    ],
  },
  'kepler-flight-time': {
    title: ['보조원에서 잰 각도 E', 'Eccentric anomaly on an auxiliary circle'],
    caption: [
      'E는 타원 중심 O에서 보조원까지 잰 각도예요. 초점 F에서 본 각도와 구분하세요.',
      'E is measured at ellipse center O on the auxiliary circle, not at focus F.',
    ],
  },
  'romer-path-speed': {
    title: ['이오 신호의 두 빛 경로', 'Two light paths from Io'],
    caption: [
      '추가 경로와 도착 시간 차를 비교해요. 교육용 배치이며 천체 거리·크기는 축척도가 아니에요.',
      'Compare added path and arrival delay. Teaching layout; distances and bodies are not to scale.',
    ],
  },
  'romer-period-bias': {
    title: ['주기 간격에 따른 시간 잔차', 'Timing residual over orbital intervals'],
    caption: [
      '문제의 가상 자료예요. 0번부터 40번까지는 40개 간격이며 뢰머 원자료가 아니에요.',
      'Invented question data, not Rømer’s measurements. Events 0 to 40 span exactly 40 intervals.',
    ],
  },
  'romer-model-test': {
    title: ['계절에 따라 바뀌는 관측 위치', 'Observing position across seasons'],
    caption: [
      '서로 다른 계절의 경로와 시계 잔차를 비교하는 상황이에요. 실제 궤도 축척은 생략했어요.',
      'Compare paths and timing residuals across seasons. Actual orbital scales are omitted.',
    ],
  },
  'leavitt-modulus': {
    title: ['주기와 절대등급', 'Period and absolute magnitude'],
    caption: [
      '문제의 교육용 V대역 보정식이에요. 가로는 로그축, 세로는 위로 갈수록 더 밝은 등급이에요.',
      'The question’s V-band teaching calibration. Period is logarithmic; brighter magnitudes are higher.',
    ],
  },
  'leavitt-extinction-bias': {
    title: ['밝기와 소광 보정', 'Brightness and extinction'],
    caption: [
      '주기–절대등급 관계와 별도로 소광을 고려해요. 교육용 보정식이며 역사 원자료가 아니에요.',
      'Extinction is separate from the period calibration. This is a teaching relation, not historical data.',
    ],
  },
  'leavitt-zero-point': {
    title: ['관계의 모양과 영점', 'Relation shape and zero point'],
    caption: [
      '세로 위치를 달리한 두 관계를 비교해요. 간격과 영점은 임의로 그렸으며 절대등급 눈금이 아니에요.',
      'Compare vertically offset relations. Offsets are illustrative; this is not an absolute-magnitude scale.',
    ],
  },
  'payne-saha-ratio': {
    title: ['온도에 따른 이온화', 'Ionization as temperature changes'],
    caption: [
      '전자 밀도를 고정한 LTE 모형이에요. 세로 로그축의 영점은 임의이며 최종 배율은 표시하지 않아요.',
      'Fixed-density LTE model. The log axis has an arbitrary zero; the final ratio is not labeled.',
    ],
  },
  'payne-level-population': {
    title: ['들뜸과 이온화를 함께 보기', 'Excitation and ionization together'],
    caption: [
      '준위 간격은 축척도가 아니에요. 두 층의 전자 밀도는 다르므로 앞 문제의 고정 밀도 곡선을 쓰지 않아요.',
      'Energy gaps are not to scale. These layers have different electron densities, unlike the preceding model.',
    ],
  },
  'payne-abundance-inference': {
    title: ['서로 다른 흡수선', 'Two different absorption profiles'],
    caption: [
      '정규화한 예시 흡수선을 세로로 띄워 그렸어요. 실제 스펙트럼·원소 존재량 측정값이 아니에요.',
      'Illustrative normalized absorption profiles, vertically offset; not observed spectra or abundance measurements.',
    ],
  },
  'einstein-deflection': {
    title: ['태양 근처의 빛 경로', 'Light passing near the Sun'],
    caption: [
      'b는 중심에서 원래 진행선까지의 거리예요. 편향은 크게 과장했으며 태양 관측 지시가 아니에요.',
      'b is measured from the center to the unbent path. Deflection is exaggerated; not an observing instruction.',
    ],
  },
  'einstein-weighted-fit': {
    title: ['두 측정값의 오차 막대', 'Error bars for two measurements'],
    caption: [
      '점은 문제의 가상 측정값, 막대는 각각 ±1σ예요. 역사 원자료나 계산한 평균은 표시하지 않았어요.',
      'Dots are invented measurements; bars show ±1σ. Neither historical data nor the fitted mean is plotted.',
    ],
  },
  'einstein-systematics': {
    title: ['독립 오차와 공통 이동', 'Independent errors and a shared shift'],
    caption: [
      '100개 중 일부를 기호로 표시했어요. 화살표는 두 오차의 구조만 보여 주며 각도 척도가 아니에요.',
      'Symbols stand for part of the 100-star sample. Arrows show error structure, not angular scale.',
    ],
  },
  'chandra-composition': {
    title: ['백색왜성을 지지하는 압력', 'Pressure supporting a white dwarf'],
    caption: [
      '차갑고 회전하지 않는 이상 모형이에요. 전자 기호의 개수와 간격은 실제 조성·밀도 비율이 아니에요.',
      'Cold, nonrotating ideal model. Electron symbols do not encode composition or density.',
    ],
  },
  'chandra-radius': {
    title: ['두 정적 백색왜성 모형', 'Two static white-dwarf models'],
    caption: [
      '같은 조성의 비상대론적 관계로 반지름을 그렸어요. 하나의 별이 변하는 과정이 아니에요.',
      'Radii follow the nonrelativistic fixed-composition relation. These are separate static stars.',
    ],
  },
  'chandra-scaling': {
    title: ['중력과 축퇴압의 균형', 'Gravity and degeneracy pressure'],
    caption: [
      '같은 조성에서 압력의 질량·반지름 의존성을 비교해요. 화살표 길이는 압력 수치가 아니에요.',
      'Compare how both pressures depend on mass and radius. Arrow lengths do not encode pressure.',
    ],
  },
  'hubble-slope': {
    title: ['거리–속도의 세 점', 'Three distance–velocity points'],
    caption: [
      '문제에 주어진 가상 세 점만 그렸어요. 정답 회귀선과 최신 허블상수 측정값은 표시하지 않았어요.',
      'Only the three invented input points are shown, without a fitted line or a modern Hubble measurement.',
    ],
  },
  'hubble-time': {
    title: ['별도의 H = 70 모형', 'The separate H = 70 model'],
    caption: [
      '문제에서 따로 준 기울기예요. 앞 문제의 회귀 결과나 특정 우주론의 나이를 표시한 그림이 아니에요.',
      'This is the separately supplied slope, not the previous fit or the age of a specified cosmology.',
    ],
  },
  'hubble-calibration': {
    title: ['거리 눈금의 재보정', 'Recalibrating the distance scale'],
    caption: [
      '빈 점은 이전 거리, 채운 점은 2배 거리예요. 같은 은하의 속도는 유지하며 회귀선은 그리지 않아요.',
      'Open dots use old distances; filled dots use doubled distances. Velocities stay fixed; no fit is shown.',
    ],
  },
  'zwicky-virial-mass': {
    title: ['은하단의 크기와 내부 운동', 'Cluster size and internal motion'],
    caption: [
      '위치는 모식도예요. σ는 평균을 뺀 시선 속도의 1차원 표준편차이며 화살표 길이는 속력 수치가 아니에요.',
      'Positions are schematic. σ is the mean-subtracted 1D line-of-sight standard deviation; arrows are not speed scales.',
    ],
  },
  'zwicky-noise-correction': {
    title: ['관측 분산과 측정 잡음', 'Observed variance and measurement noise'],
    caption: [
      '문제의 입력 표준편차를 제곱해 같은 척도로 그렸어요. 보정한 분산이나 질량비는 표시하지 않았어요.',
      'Bars use squared input dispersions on one scale. The corrected variance and mass ratio are not shown.',
    ],
  },
  'zwicky-evidence': {
    title: ['빛나는 물질과 은하단 모형', 'Luminous material and the cluster model'],
    caption: [
      '별과 뜨거운 기체를 구분한 모식도예요. 실제 머리털자리 은하단 지도나 질량비 측정값이 아니에요.',
      'Schematic stars and hot gas, not a Coma map or measured mass fractions.',
    ],
  },
  'rubin-inclined-mass': {
    title: ['투영된 은하의 시선 속도', 'Line-of-sight speed in a tilted disk'],
    caption: [
      '점은 문제의 장축 측정값이에요. i는 정면 0°인 원반 경사각이며 질량 계산은 구대칭 근사예요.',
      'The dot is the supplied major-axis measurement. Face-on is i=0°; the mass estimator is spherical.',
    ],
  },
  'rubin-density-slope': {
    title: ['유한 구간의 평평한 회전 곡선', 'A flat curve on a finite interval'],
    caption: [
      '주어진 일정한 속력을 r₁부터 r₂까지만 그렸어요. 중심이나 무한대까지 연장하지 않아요.',
      'The given constant speed is shown only from r₁ to r₂, not extended to the center or infinity.',
    ],
  },
  'rubin-missing-fraction': {
    title: ['같은 반지름에서 비교한 두 속력', 'Two speeds at the same radius'],
    caption: [
      '두 속력은 이미 경사각 보정을 마쳤어요. 막대는 속력이며 질량이나 누락 비율을 직접 나타내지 않아요.',
      'Both speeds are inclination-corrected. Bars show speed, not mass or the missing fraction.',
    ],
  },
};

/** 질문/선행 문제 전후에 재사용 가능한 관찰 도해. 정답이나 진행 상태에 접근하지 않는다. */
export function HistoryDiagram({ questId, questionId, lang }: HistoryDiagramProps) {
  const id = useId();
  const key = HISTORY_DIAGRAM_KEYS[questId];
  const note = notes[questionId];
  const index = lang === 'ko' ? 0 : 1;
  const prefix = questId === 'chandrasekhar-limit' ? 'chandra' : questId.split('-')[0];
  if (!key || !note || !questionId.startsWith(`${prefix}-`)) return null;
  const props = { q: questionId, lang };
  const content: Record<string, ReactNode> = {
    'earth-angle': <Earth {...props} />,
    orbit: <Orbit {...props} />,
    'light-delay': <LightDelay {...props} />,
    cepheid: <Cepheid {...props} />,
    spectrum: <Spectrum {...props} />,
    deflection: <Deflection {...props} />,
    degeneracy: <Degeneracy {...props} />,
    expansion: <Expansion {...props} />,
    cluster: <Cluster {...props} />,
    rotation: <Rotation {...props} />,
  };
  return (
    <figure
      data-testid="history-diagram"
      data-diagram-key={key}
      data-question-id={questionId}
      className="m-0 min-w-0 rounded-xl border border-border bg-surface p-2 text-fg"
    >
      <svg
        viewBox="0 0 320 228"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        focusable="false"
        className="block h-auto w-full"
        style={{ fontSize: '0.82rem', fontFamily: 'inherit', fontStyle: 'normal' }}
      >
        <title id={`${id}-title`}>{note.title[index]}</title>
        <desc id={`${id}-desc`}>{note.caption[index]}</desc>
        {content[key]}
      </svg>
      <figcaption className="px-1 pb-1 text-xs leading-relaxed text-muted">
        <HistoryRichText text={note.caption[index]} />
      </figcaption>
    </figure>
  );
}
export default HistoryDiagram;
