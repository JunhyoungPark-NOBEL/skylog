import { useTranslation } from 'react-i18next';
import type { CommunityIdentity } from '@/community/identity';
import { DEFAULT_AVATAR } from '@/personal/avatar';
import { AvatarPortrait } from './AvatarArt';

export function AuthorIdentity({
  identity,
  compact = false,
}: {
  identity?: CommunityIdentity;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const name = identity?.name || t('social.observer');
  return (
    <span className="flex min-w-0 items-center gap-2" data-testid="author-identity">
      <AvatarPortrait
        profile={identity?.avatar ?? DEFAULT_AVATAR}
        label={t('communityIdentity.avatarLabel', { name })}
        className={compact ? 'h-8 w-8' : 'h-11 w-11'}
      />
      <span className="min-w-0 break-words text-body-sm text-muted">{name}</span>
    </span>
  );
}
