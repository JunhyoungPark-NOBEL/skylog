import { useId } from 'react';
import type { AvatarLook } from '@/personal/avatar';
import { personalArtNightStyle } from './personalArtStyle';
import { AvatarBackdrop } from './AvatarBackdrop';

const SUIT_COLORS: Record<AvatarLook['suit'], string> = {
  sage: '#83b8a1',
  lavender: '#a5a1d0',
  clay: '#d69b82',
  navy: '#617b9f',
  ochre: '#d3ad60',
  rose: '#c98e9c',
};
const SKIN_COLORS: Record<AvatarLook['skin'], string> = {
  sand: '#f3cead',
  amber: '#c58b5d',
  cocoa: '#795440',
  porcelain: '#f6dfcf',
  umber: '#513c34',
};
const HAIR_COLORS: Record<AvatarLook['hairColor'], string> = {
  ink: '#30343f',
  chestnut: '#70503f',
  copper: '#b76945',
  gold: '#d9b465',
  silver: '#c8d1d1',
};
const INK = '#344448';
const FACE_INK = '#172225';
const CREAM = '#eee8d4';

export function PersonalArtNightFilter({ id }: { id: string }) {
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values=".3 .59 .11 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
    </filter>
  );
}

function HairBack({ profile, color }: { profile: AvatarLook; color: string }) {
  if (profile.hair === 'bob')
    return (
      <path
        d="M-18-30Q-31-26-27-4L-24 13Q-15 18-10 9H11Q20 18 26 9L27-10Q29-31 13-35Z"
        fill={color}
      />
    );
  if (profile.hair === 'waves')
    return (
      <path
        d="M-17-31Q-35-32-31-15Q-39-5-28 1Q-31 16-17 15L-8 8H12Q25 18 31 7Q37-2 29-10Q35-28 18-33Z"
        fill={color}
      />
    );
  if (profile.hair === 'ponytail')
    return (
      <g fill={color}>
        <path d="M18-25Q35-39 41-24Q44-8 31 4Q24-2 27-10Q32-23 19-19Z" />
        <path d="M31-26Q36-18 31-7" fill="none" stroke={CREAM} opacity=".25" />
        <path d="M23-25l7 4" stroke={SUIT_COLORS[profile.suit]} strokeWidth="5" />
      </g>
    );
  return null;
}

function HairFront({ profile, color }: { profile: AvatarLook; color: string }) {
  if (profile.hair === 'none') return null;
  return (
    <g fill={color}>
      {profile.hair === 'short' && (
        <path d="M-21-18Q-24-38-3-38Q21-41 23-19L15-18L9-26L2-21L-4-28L-12-22L-16-25L-19-14Z" />
      )}
      {profile.hair === 'bob' && (
        <path d="M-22-17Q-25-38-2-38Q22-39 23-18L19-3L13-5L14-25Q5-14-5-18L-7-25Q-13-13-21-16L-17-4L-22-2Z" />
      )}
      {profile.hair === 'waves' && (
        <path d="M-23-17Q-29-34-12-35Q-1-44 11-35Q29-34 24-15Q17-10 14-24Q4-14-2-23Q-13-11-23-17Z" />
      )}
      {profile.hair === 'ponytail' && (
        <>
          <path d="M-21-16Q-25-35-6-38Q16-43 23-21L18-12L13-22Q3-16-5-28Q-12-15-21-16Z" />
          <path d="M-5-32Q6-24 16-25" stroke={CREAM} fill="none" opacity=".25" />
        </>
      )}
    </g>
  );
}

function Expression({ value }: { value: AvatarLook['expression'] }) {
  return (
    <g fill="none" stroke={FACE_INK} strokeLinecap="round" strokeWidth="2.2">
      {value === 'smile' && (
        <>
          <path d="M-8-11v2m16-2v2" strokeWidth="3.3" />
          <path d="M-5 1q5 6 11-1" />
        </>
      )}
      {value === 'calm' && <path d="M-12-10q4 4 8 0m8 0q4 4 8 0M-3 2h7" />}
      {value === 'joy' && (
        <>
          <path d="M-12-8q4-7 8 0m8 0q4-7 8 0" />
          <path d="M-5-1Q0 1 6-1Q7 6 1 6Q-5 6-5-1Z" fill={FACE_INK} />
          <path d="M-2 4q3-2 6 0" stroke="#d9a08c" strokeWidth="2.6" />
        </>
      )}
      {value === 'wink' && (
        <>
          <path d="M-8-11v2" strokeWidth="3.3" />
          <path d="M5-12l5 3 4-3M-5 1q5 6 11-1" />
        </>
      )}
      <path d="M0-7l-1 4h2" opacity=".4" strokeWidth="1.3" />
    </g>
  );
}

function Outfit({ profile, suit }: { profile: AvatarLook; suit: string }) {
  const space = profile.outfit === 'spacesuit';
  const bodyColor = space ? '#e0e8e3' : suit;
  return (
    <>
      {profile.outfit === 'hoodie' && (
        <path d="M-15 0Q-26 4-21 15L-9 20H11L23 12Q25 3 16 0Z" fill={suit} />
      )}
      <path d="M-15 24L-14 48H-3L0 31L4 48H16L15 24Z" fill={bodyColor} />
      <path d="M-12 48H-3v5h-15q-1-5 6-5Zm17 0h10q5 0 5 5H5Z" fill={space ? suit : '#405151'} />
      <path d="M-16 52H-4m10 0h12" stroke={CREAM} opacity=".35" strokeWidth="1.2" />
      <path
        d="M-15 5Q-23 7-26 24L-22 31L-15 29L-10 13M15 5Q23 7 27 24L23 31L16 29L10 13"
        fill={profile.outfit === 'overalls' ? CREAM : bodyColor}
      />
      <path
        d="M-16 5Q0 0 16 5L18 31Q0 36-18 31Z"
        fill={profile.outfit === 'overalls' ? CREAM : bodyColor}
      />
      {profile.outfit === 'classic' && (
        <>
          <path d="M-7 5l7 9 7-9M0 14v19" fill="none" />
          <path d="M5 16h8v9H5Z" fill={CREAM} strokeWidth="1.4" />
          <path d="M9 18v5m-2-2h4" stroke="#a79062" strokeWidth="1.2" />
          <path d="M-13 21h7" opacity=".45" />
        </>
      )}
      {profile.outfit === 'hoodie' && (
        <>
          <path d="M-9 5Q0 12 9 5" fill="#53756b" />
          <path d="M-5 9v10m10-10v10" stroke={CREAM} strokeWidth="1.6" />
          <path d="M-10 23l3-5H7l3 5v5h-20Z" fill="none" strokeWidth="1.5" />
          <path d="M-18 30h36" stroke={CREAM} opacity=".4" />
        </>
      )}
      {profile.outfit === 'overalls' && (
        <>
          <path d="M-13 5h5v11H8V5h5v12l4 15q-17 5-34 0l4-15Z" fill={suit} />
          <path d="M-6 20H6v7q-6 4-12 0Z" fill="none" strokeWidth="1.4" />
          <g fill={CREAM} strokeWidth="1.2">
            <circle cx="-10" cy="17" r="2" />
            <circle cx="10" cy="17" r="2" />
          </g>
        </>
      )}
      {space && (
        <>
          <path d="M-12 5Q0 12 12 5M-17 31h34" fill="none" strokeWidth="3" />
          <rect x="-10" y="13" width="20" height="14" rx="3" fill={suit} />
          <path d="M-5 18h10M-5 22h5" stroke={CREAM} strokeWidth="1.8" />
          <circle cx="6" cy="23" r="1.5" fill="#d3ad60" stroke="none" />
          <path d="M-25 24l8 2m0 15h14m8 0h13m1-15 7-2" stroke={suit} strokeWidth="4" />
        </>
      )}
    </>
  );
}

function Hat({ profile, suit }: { profile: AvatarLook; suit: string }) {
  if (profile.hat === 'starcrown')
    return (
      <g fill="#e9cb80">
        <path d="M-22-24L-24-39L-13-31L0-45L13-31L24-39L22-24Z" />
        <path d="M0-57l3 7 8 1-6 5 2 7-7-4-7 4 2-7-6-5 8-1Z" fill="#f1e3b2" strokeWidth="1.3" />
        <path d="M-21-26h42" stroke="#f1e3b2" strokeWidth="3" />
        <circle cx="-15" cy="-30" r="2" fill={suit} />
        <circle cx="15" cy="-30" r="2" fill={suit} />
      </g>
    );
  if (profile.hat === 'meteorcap')
    return (
      <g fill={suit}>
        <path d="M-22-21Q-20-43-6-46L20-51L10-40Q23-35 23-21Z" />
        <path d="M-23-23Q0-19 24-24L25-15Q0-11-25-16Z" fill="#697fac" />
        <path d="M9-46L-10-33M15-41L-5-29" fill="none" stroke="#e0d6ac" strokeWidth="2" />
        <path d="M-12-39l2 5 6 1-5 3 1 6-4-3-5 3 1-6-4-3 6-1Z" fill="#f1e3b2" strokeWidth="1.1" />
      </g>
    );
  if (profile.hat === 'beanie')
    return (
      <g fill={suit}>
        <circle cy="-49" r="6" />
        <path d="M-22-21Q-22-44 0-44Q22-44 23-21Z" />
        <path d="M-11-38l-2 13M0-40v14m10-12 3 13" stroke={CREAM} opacity=".26" strokeWidth="1.4" />
        <rect x="-23" y="-23" width="47" height="9" rx="3" />
        <rect x="9" y="-21" width="7" height="5" rx="1" fill={CREAM} stroke="none" />
      </g>
    );
  if (profile.hat === 'bucket')
    return (
      <g fill={suit}>
        <path d="M-15-39Q0-43 15-39L22-21H-22Z" />
        <path d="M-22-27Q0-21 22-27L29-20Q0-11-29-20Z" />
        <path d="M-18-26Q0-21 18-26" stroke={CREAM} opacity=".55" />
      </g>
    );
  if (profile.hat === 'starcap')
    return (
      <g fill={suit} transform="translate(0 -3)">
        <path d="M-21-22Q-23-44 0-44Q22-44 23-22Z" />
        <path d="M-22-23Q-2-28 18-23Q29-22 34-16Q13-9-22-17Z" />
        <path d="M0-38l2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill={CREAM} strokeWidth="1.2" />
      </g>
    );
  if (profile.hat === 'helmet')
    return (
      <g>
        <circle cy="-13" r="27" fill="#b7d5d8" fillOpacity=".1" stroke="#e4e8df" strokeWidth="5" />
        <path d="M-14-32Q-4-39 7-35" fill="none" stroke="white" opacity=".65" strokeWidth="2.5" />
        <path d="M-17 8Q0 18 17 8" fill="none" stroke="#e4e8df" strokeWidth="6" />
        <rect x="-31" y="-19" width="7" height="13" rx="3" fill={suit} />
        <rect x="24" y="-19" width="7" height="13" rx="3" fill={suit} />
      </g>
    );
  return null;
}

function Accessory({ profile, skin }: { profile: AvatarLook; skin: string }) {
  if (profile.accessory === 'binoculars')
    return (
      <g>
        <path d="M-7 7l-8 16m22-16 8 16" fill="none" />
        <rect x="-16" y="16" width="12" height="19" rx="3" fill="#526c78" />
        <rect x="4" y="16" width="12" height="19" rx="3" fill="#526c78" />
        <path d="M-4 23h8" strokeWidth="5" />
        <g fill="#233946">
          <circle cx="-10" cy="35" r="6" />
          <circle cx="10" cy="35" r="6" />
        </g>
        <path d="M-13 34q2-3 5-1m15 1q2-3 5-1" fill="none" stroke="#b5d1d9" strokeWidth="1.4" />
        <path d="M-18 25l3 3m3 0 1 4m26-7-3 3m-3 0-1 4" stroke={skin} strokeWidth="4" />
      </g>
    );
  if (profile.accessory === 'sketchbook')
    return (
      <g transform="rotate(9 25 27)">
        <rect x="13" y="10" width="25" height="33" rx="3" fill="#d6b889" />
        <path d="M19 11h16v28H19Z" fill={CREAM} stroke="none" />
        <path d="M16 15h5m-5 6h5m-5 6h5m-5 6h5" strokeWidth="1.5" />
        <path
          d="M30 18a5 5 0 1 0 2 9 5 5 0 0 1-2-9M24 33h8"
          fill="none"
          stroke="#9e8b6c"
          strokeWidth="1.4"
        />
        <path d="M13 30l5-1" stroke={skin} strokeWidth="5" />
      </g>
    );
  if (profile.accessory === 'lantern')
    return (
      <g>
        <ellipse cx="35" cy="34" rx="13" ry="16" fill="#efd88f" opacity=".15" stroke="none" />
        <path d="M28 23Q24 10 35 10Q45 10 41 23" fill="none" />
        <rect x="26" y="23" width="17" height="22" rx="2" fill="#e8c975" />
        <path d="M24 23h21m-21 23h21M30 26v15m9-15v15" fill="none" />
        <path d="M34 28q-5 8 1 11q5-3-1-11" fill="#fff0b7" stroke="none" />
        <path d="M25 27l5-1" stroke={skin} strokeWidth="5" />
      </g>
    );
  if (profile.accessory === 'starwand')
    return (
      <g>
        <path d="M26 36l10-42" stroke="#d8bd82" strokeWidth="4" />
        <path d="M38-27l3 8 8 2-7 5 1 9-7-5-8 4 2-9-6-6 9-1Z" fill="#eed99c" strokeWidth="1.7" />
        <path d="M25-29v5m-2-2h5M46-3v4m-2-2h4" fill="none" stroke="#e4ddbb" strokeWidth="1.4" />
        <path d="M25 27l5 1" stroke={skin} strokeWidth="5" />
      </g>
    );
  return null;
}

/** 마당에서 쓰던 머리 중심(0,-13)·발 위치를 유지한다. 모자·장비 포함 범위는 x±50,y-58..55. */
export function AvatarArt({ profile }: { profile: AvatarLook }) {
  const hairClip = useId() + '-hair';
  const suit = SUIT_COLORS[profile.suit];
  const skin = SKIN_COLORS[profile.skin];
  const hair = HAIR_COLORS[profile.hairColor];
  const clip = profile.hat === 'helmet' ? `url(#${hairClip})` : undefined;
  return (
    <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      {profile.hat === 'helmet' && (
        <defs>
          <clipPath id={hairClip}>
            <circle cy="-13" r="25" />
          </clipPath>
        </defs>
      )}
      <g clipPath={clip}>
        <HairBack profile={profile} color={hair} />
      </g>
      <Outfit profile={profile} suit={suit} />
      <g fill={skin}>
        <ellipse cx="-23" cy="30" rx="4.5" ry="5" />
        <ellipse cx="24" cy="30" rx="4.5" ry="5" />
        <path d="M-6-1H6V8Q0 12-6 8Z" />
        <ellipse cx="-21" cy="-12" rx="4" ry="6" />
        <ellipse cx="21" cy="-12" rx="4" ry="6" />
        <ellipse cy="-13" rx="21" ry="22" />
      </g>
      <g fill="#d48679" opacity=".27" stroke="none">
        <ellipse cx="-12" cy="-2" rx="4" ry="2.5" />
        <ellipse cx="12" cy="-2" rx="4" ry="2.5" />
      </g>
      <Expression value={profile.expression} />
      <g clipPath={clip}>
        <HairFront profile={profile} color={hair} />
      </g>
      <Hat profile={profile} suit={suit} />
      <Accessory profile={profile} skin={skin} />
    </g>
  );
}

/** 편집 화면의 독립 미리보기. 정적인 SVG만 사용해 작은 화면에서도 즉시 바뀐다. */
export function AvatarPreview({
  profile,
  label,
  className = 'h-[220px]',
}: {
  profile: AvatarLook;
  label: string;
  className?: string;
}) {
  const id = useId();
  const nightId = id + '-night';
  return (
    <svg
      viewBox="-100 -73 200 143"
      role="img"
      aria-label={label}
      data-testid="avatar-preview"
      className={`personal-art personal-art-tone block w-full rounded-3xl ${className}`}
      style={personalArtNightStyle(nightId)}
    >
      <defs>
        <PersonalArtNightFilter id={nightId} />
        <radialGradient id={id + '-sky'} cx="45%" cy="40%" r="80%">
          <stop stopColor="#47665f" />
          <stop offset="1" stopColor="#172d41" />
        </radialGradient>
      </defs>
      <rect x="-100" y="-73" width="200" height="143" rx="18" fill={`url(#${id}-sky)`} />
      <AvatarBackdrop background={profile.background} />
      <ellipse
        cy="2"
        rx="68"
        ry="49"
        fill="none"
        stroke="#c6d7c0"
        strokeWidth=".7"
        opacity=".22"
        transform="rotate(-18)"
      />
      <g fill="#e7e1bd" opacity=".72">
        <circle cx="-66" cy="-42" r="1.2" />
        <circle cx="57" cy="-51" r="1" />
        <circle cx="72" cy="13" r="1.4" />
        <circle cx="-77" cy="18" r=".8" />
        <path d="M-54-21l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4ZM64-28l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
      </g>
      <ellipse cy="57" rx="68" ry="12" fill="#729c81" opacity=".24" />
      <ellipse cy="55" rx="30" ry="5" fill="#172d2d" opacity=".5" />
      <AvatarArt profile={profile} />
    </svg>
  );
}

/** 사진·댓글의 동일한 원형 초상. 원격 SVG/이미지 URL을 받지 않는다. */
export function AvatarPortrait({
  profile,
  label,
  className = 'h-10 w-10',
}: {
  profile: AvatarLook;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      viewBox="-48 -61 96 96"
      role="img"
      aria-label={label}
      data-testid="author-avatar"
      className={`personal-art personal-art-tone shrink-0 rounded-full ${className}`}
      style={personalArtNightStyle(id + '-night')}
    >
      <defs>
        <PersonalArtNightFilter id={id + '-night'} />
        <clipPath id={id + '-circle'}>
          <circle cy="-13" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-circle)`}>
        <circle cy="-13" r="48" fill="#365064" />
        <g transform="translate(0 -17) scale(.6)">
          <AvatarBackdrop background={profile.background} />
        </g>
        <AvatarArt profile={profile} />
      </g>
    </svg>
  );
}
