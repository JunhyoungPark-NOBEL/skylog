import { useId } from 'react';
import type { DecorationId, Personal } from '@/personal/catalog';
import { AvatarArt, PersonalArtNightFilter } from './AvatarArt';
import { personalArtNightStyle } from './personalArtStyle';
import { AvatarBackdrop } from './AvatarBackdrop';

function DecorationShape({ id }: { id: DecorationId }) {
  if (id === 'flowers' || id === 'sunflowers')
    return (
      <g stroke="#5e8870" strokeWidth="3">
        {[-16, 0, 15].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 8v${-27 - i * 5}l-8 9m8-4l8-5`} fill="none" />
            <circle
              cx={x}
              cy={-22 - i * 5}
              r={id === 'flowers' ? 7 : 10}
              fill={id === 'flowers' ? '#e2cbdc' : '#efd183'}
              stroke="none"
            />
            <circle cx={x} cy={-22 - i * 5} r="3" fill="#b78951" stroke="none" />
          </g>
        ))}
      </g>
    );
  if (id === 'bench')
    return (
      <g stroke="#987b60" strokeWidth="6" strokeLinecap="round">
        <path d="M-25-25h50m-50 10h50m-49 8h48m-42 0v16m35-16v16" />
        <path d="M-26-30v25m51-25v25" strokeWidth="3" />
      </g>
    );
  if (id === 'stones')
    return (
      <g fill="#a0adab">
        <ellipse cx="-10" cy="4" rx="16" ry="8" />
        <ellipse cx="15" cy="6" rx="10" ry="6" />
        <ellipse cx="0" cy="-3" rx="10" ry="7" fill="#c0c7b8" />
      </g>
    );
  if (id === 'fern')
    return (
      <g stroke="#75a389" strokeWidth="5" strokeLinecap="round">
        <path d="M0 8v-44m0 31l-16-13m16 3l18-16M0-16l-11-13m11 5l9-12" />
      </g>
    );
  if (id === 'telescope')
    return (
      <g stroke="#bac4c0" strokeWidth="4">
        <path d="M0-18L-18 11M0-18L18 11M0-18V12" />
        <path d="M-22-20L15-40" stroke="#ddd9c6" strokeWidth="15" />
        <path d="M12-47l8 15" strokeWidth="5" />
      </g>
    );
  if (id === 'signpost')
    return (
      <g fill="#bdab85">
        <path d="M-3-48h6v60H-3z" />
        <path d="M-22-45h37l10 8-10 8h-37z" />
        <path d="M-16-39h27" stroke="#756d55" />
      </g>
    );
  if (id === 'moon')
    return (
      <g>
        <path d="M0-15V10" stroke="#b8bfc1" strokeWidth="3" />
        <path d="M14-52a22 22 0 1 0 4 37 22 22 0 0 1-4-37" fill="#e4d4a3" />
      </g>
    );
  if (id === 'lantern')
    return (
      <g stroke="#79898d" strokeWidth="3">
        <path d="M-10-34q0-17 20 0M-12-33h24l4 33h-32z" fill="#dbc38b" />
        <path d="M0-28V-6m-17 8h34" />
      </g>
    );
  if (id === 'crystal')
    return (
      <path
        d="M-17 5l3-30 14-17 16 20 3 27zM0-42L3 5m-17-30L3 5l13-27"
        fill="#b2b2d7"
        stroke="#858bb1"
        strokeWidth="2"
      />
    );
  return (
    <g stroke="#91a398" strokeWidth="3">
      <path
        d="M-23 4V-28q12-5 23 3 12-8 23-3V4Q11-3 0 4q-11-7-23 0"
        fill={id === 'books' ? '#c8b793' : '#e0ddcf'}
      />
      <path d="M0-25V4m6-22h11m-33 7h10" />
    </g>
  );
}

export function DecorationArt({ id }: { id: DecorationId }) {
  const nightId = useId() + '-decoration-night';
  return (
    <g className="personal-art-tone" style={personalArtNightStyle(nightId)}>
      <defs>
        <PersonalArtNightFilter id={nightId} />
        <clipPath id={id + '-backdrop'}>
          <rect width="400" height="166" rx="26" />
        </clipPath>
      </defs>
      <DecorationShape id={id} />
    </g>
  );
}
const GARDEN_SLOTS = [
  { x: 58, y: 178 },
  { x: 122, y: 205 },
  { x: 291, y: 189 },
  { x: 343, y: 231 },
  { x: 62, y: 251 },
];
export function GardenArt({
  profile,
  label,
  selectedSlot,
}: {
  profile: Personal;
  label: string;
  selectedSlot?: number;
}) {
  const id = useId();
  const nightId = id + '-night';
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={label}
      className="w-full rounded-3xl personal-art personal-art-tone"
      style={personalArtNightStyle(nightId)}
    >
      <defs>
        <PersonalArtNightFilter id={nightId} />
        <linearGradient id={id + 'sky'} x2="0" y2="1">
          <stop stopColor="#172d41" />
          <stop offset="1" stopColor="#91a7a0" />
        </linearGradient>
        <linearGradient id={id + 'grass'} x2="0" y2="1">
          <stop stopColor="#607f70" />
          <stop offset="1" stopColor="#2e544b" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" rx="26" fill={`url(#${id}sky)`} />
      <g clipPath={`url(#${id}-backdrop)`}>
        <g transform="translate(200 146) scale(2)">
          <AvatarBackdrop background={profile.background} />
        </g>
      </g>
      <g fill="#e6e4cf" opacity=".7">
        <circle cx="63" cy="45" r="1.4" />
        <circle cx="162" cy="28" r="1" />
        <circle cx="241" cy="49" r="1.7" />
        <circle cx="280" cy="24" r="1" />
        <circle cx="116" cy="80" r="1" />
        <circle cx="358" cy="71" r="1.3" />
      </g>
      {profile.background === 'garden' && (
        <path d="M331 24a17 17 0 1 0 9 29 18 18 0 0 1-9-29" fill="#efe4bf" />
      )}
      <path
        d="M0 166Q81 148 151 170T400 158V274q0 26-26 26H26Q0 300 0 274Z"
        fill={`url(#${id}grass)`}
      />
      <path
        d="M190 300Q255 244 222 221T211 161"
        stroke="#b1b69c"
        strokeWidth="23"
        fill="none"
        opacity=".22"
      />
      {profile.slots.map(
        (item, i) =>
          item && (
            <g key={i} transform={`translate(${GARDEN_SLOTS[i]!.x} ${GARDEN_SLOTS[i]!.y})`}>
              <ellipse cy="9" rx="24" ry="6" fill="#243b36" opacity=".25" />
              <DecorationArt id={item} />
            </g>
          ),
      )}
      <g transform="translate(209 184)">
        <ellipse cy="55" rx="29" ry="7" fill="#243b36" opacity=".25" />
        <AvatarArt profile={profile} />
      </g>
      {selectedSlot !== undefined &&
        GARDEN_SLOTS.map((position, i) => (
          <g key={i} transform={`translate(${position.x} ${position.y + 24})`} aria-hidden>
            <circle
              r="12"
              fill={selectedSlot === i ? '#dce5d3' : '#243b36'}
              stroke="#dce5d3"
              strokeWidth="1.2"
            />
            <text
              y="4"
              textAnchor="middle"
              fontSize="12"
              fontFamily="system-ui"
              fill={selectedSlot === i ? '#243b36' : '#dce5d3'}
            >
              {i + 1}
            </text>
          </g>
        ))}
    </svg>
  );
}
