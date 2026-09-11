import { useId } from 'react';
import type { DecorationId, Personal } from '@/personal/catalog';
import {
  decorationSvg,
  HORIZON_GROUND_PALETTE,
  HORIZON_SLOTS,
  horizonPanoramaSvg,
} from '@/personal/horizonArt';
import { AvatarArt, PersonalArtNightFilter } from './AvatarArt';
import { personalArtNightStyle } from './personalArtStyle';
import { AvatarBackdrop } from './AvatarBackdrop';

/** 하늘의 지평선과 같은 도안을 사용한다. 문자열은 앱 내부의 고정된 SVG만 받는다. */
export function DecorationArt({ id }: { id: DecorationId }) {
  const nightId = useId() + '-decoration-night';
  return (
    <g className="personal-art-tone" style={personalArtNightStyle(nightId)}>
      <defs>
        <PersonalArtNightFilter id={nightId} />
      </defs>
      <g dangerouslySetInnerHTML={{ __html: decorationSvg(id) }} />
    </g>
  );
}

/** 프로필에서는 관측 지평선과 아바타를 함께 보여 준다. 댓글은 AvatarPortrait를 쓴다. */
export function GardenArt({
  profile,
  label,
  selectedSlot,
  className = '',
  showAvatar = true,
}: {
  profile: Personal;
  label: string;
  selectedSlot?: number;
  className?: string;
  showAvatar?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const nightId = id + '-night';
  // 숨기기를 켜도 편집 중에는 배치를 볼 수 있다. 실제 표시 상태는 편집기에서 안내한다.
  const slots = profile.sceneryEnabled || selectedSlot !== undefined ? profile.slots : [];
  return (
    <svg
      viewBox="0 0 1200 480"
      role="img"
      aria-label={label}
      data-testid="horizon-preview"
      data-ground={profile.ground}
      data-scenery={profile.sceneryEnabled ? 'visible' : 'hidden'}
      className={`personal-art personal-art-tone block w-full overflow-hidden rounded-3xl ${className}`}
      style={personalArtNightStyle(nightId)}
    >
      <defs>
        <PersonalArtNightFilter id={nightId} />
        <linearGradient id={id + '-sky'} x2="0" y2="1">
          <stop stopColor="#142534" />
          <stop offset="1" stopColor="#405e63" />
        </linearGradient>
        <clipPath id={id + '-clip'}>
          <rect width="1200" height="480" rx="55" />
        </clipPath>
        <clipPath id={id + '-sky-clip'}>
          <rect width="1200" height="230" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="1200" height="480" fill={`url(#${id}-sky)`} />
        <g clipPath={`url(#${id}-sky-clip)`} opacity=".8">
          <g transform="translate(600 218) scale(5.6)">
            <AvatarBackdrop background={profile.background} />
          </g>
        </g>
        {profile.background === 'garden' && (
          <g fill="#d8e0d3" opacity=".7">
            <circle cx="92" cy="69" r="2" />
            <circle cx="238" cy="121" r="1.4" />
            <circle cx="410" cy="43" r="2.1" />
            <circle cx="639" cy="95" r="1.4" />
            <circle cx="866" cy="58" r="1.7" />
            <circle cx="1102" cy="111" r="2.3" />
            <circle cx="716" cy="30" r="1.4" />
          </g>
        )}
        <rect y="390" width="1200" height="90" fill={HORIZON_GROUND_PALETTE[profile.ground][1]} />
        <svg
          x="0"
          y="120"
          width="1200"
          height="280"
          viewBox="0 0 1200 280"
          dangerouslySetInnerHTML={{
            __html: horizonPanoramaSvg({ ...profile, slots }, { idPrefix: id + '-panorama' }),
          }}
        />
        {showAvatar && (
          <g transform="translate(710 315) scale(1.8)" data-testid="horizon-profile-avatar">
            <ellipse cy="57" rx="33" ry="7" fill="#162a26" opacity=".38" />
            <AvatarArt profile={profile} />
          </g>
        )}
        {selectedSlot !== undefined &&
          HORIZON_SLOTS.map((position, i) => (
            <g key={i} transform={`translate(${position.x} 442)`} aria-hidden="true">
              {selectedSlot === i && (
                <ellipse
                  cy="-119"
                  rx="73"
                  ry="17"
                  fill="none"
                  stroke="#d1dcbc"
                  strokeWidth="3"
                  strokeDasharray="6 7"
                />
              )}
              <circle
                r="20"
                fill={selectedSlot === i ? '#d1dcbc' : '#243c36'}
                stroke="#b3c4b1"
                strokeWidth="1.8"
              />
              <text
                y="7"
                textAnchor="middle"
                fontSize="21"
                fontFamily="system-ui"
                fill={selectedSlot === i ? '#243c36' : '#d1dcbc'}
              >
                {i + 1}
              </text>
            </g>
          ))}
      </g>
    </svg>
  );
}
