import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { communityClient, emailCodeEnabled, signupsReady } from '@/community/client';
import {
  LOGIN_RESEND_MS,
  loginError,
  NATIVE_LOGIN_URL,
  readPendingEmail,
  writePendingEmail,
} from '@/community/auth';
import { clearLoginCallback, useLoginCallback, verifyPastedLogin } from '@/community/callback';
import { PillButton } from '@/ui/PillButton';

/** 메일 전송과 확인을 분리한다. 메일 앱 왕복·새로고침에도 주소와 전송 단계만 복원한다. */
export function EmailLogin({ callbackOnly = false }: { callbackOnly?: boolean }) {
  const { t } = useTranslation();
  const callback = useLoginCallback();
  // 표시 문구만 플랫폼에 맞춘다. 인증 검증은 UA와 관계없이 동일하다.
  const native = Capacitor.isNativePlatform();
  const android = /Android/i.test(navigator.userAgent) && !native;
  const recoveryUrl = native ? null : callback.recoveryUrl;
  const [initial] = useState(readPendingEmail);
  const [email, setEmail] = useState(initial?.email ?? '');
  const [sentAt, setSentAt] = useState(initial?.sentAt ?? 0);
  const [now, setNow] = useState(Date.now);
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState(() =>
    window.location.hash.includes('auth_error=1') ? 'auth.otherBrowser' : '',
  );
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const alive = useRef(true);
  const sent = sentAt > 0;
  const locked = busy || callback.busy;
  const failure = error || callback.error;
  const errorKey = native && failure === 'auth.otherBrowser' ? 'auth.requestLost' : failure;
  const wait = Math.max(0, Math.ceil((sentAt + LOGIN_RESEND_MS - now) / 1000));
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!sentAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sentAt]);

  async function run(action: 'send' | 'code' | 'link') {
    if (running.current || callback.busy) return;
    if (action === 'send' && sentAt + LOGIN_RESEND_MS > Date.now()) return;
    running.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    clearLoginCallback();
    const address = email.trim();
    const pasted = link;
    // 붙여넣은 링크는 응답의 성공 여부와 관계없이 입력란에서 즉시 지운다.
    if (action === 'link') setLink('');
    try {
      if (action === 'send') {
        // 서버 allowlist에 등록된 네이티브 주소로 메일에서 곧바로 원래 앱에 돌아온다.
        const redirect = Capacitor.isNativePlatform()
          ? NATIVE_LOGIN_URL
          : new URL(import.meta.env.BASE_URL, window.location.origin).href;
        const result = await communityClient().auth.signInWithOtp({
          email: address,
          options: { emailRedirectTo: redirect },
        });
        if (result.error) throw result.error;
        if (alive.current) {
          const time = Date.now();
          writePendingEmail({ email: address, sentAt: time });
          setEmail(address);
          setSentAt(time);
          setNow(time);
          setCode('');
          setNotice(emailCodeEnabled ? 'social.codeSent' : 'auth.linkSent');
        }
      } else {
        if (action === 'link') await verifyPastedLogin(pasted);
        else {
          const result = await communityClient().auth.verifyOtp({
            email: address,
            token: code.trim(),
            type: 'email',
          });
          if (result.error) throw result.error;
          if (!result.data.session) throw new Error('NO_SESSION');
          writePendingEmail(null);
        }
        if (alive.current) {
          setCode('');
          setNotice('auth.signedIn');
        }
      }
    } catch (cause) {
      if (alive.current) setError(loginError(cause));
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <section className="space-y-4" aria-label={t('social.signIn')}>
      <div>
        <h2 className="text-headline">{t('social.signIn')}</h2>
        {!callbackOnly && <p className="mt-2 text-body-sm text-muted">{t('social.loginHint')}</p>}
        {!callbackOnly && !signupsReady && (
          <p className="mt-3 rounded-xl bg-surface p-3 text-body-sm text-muted">
            {t('social.pilot')}
          </p>
        )}
      </div>
      {errorKey && (
        <p role="alert" className="rounded-xl bg-danger-soft p-4">
          {t(errorKey)}
        </p>
      )}
      {callback.busy && <p role="status">{t('auth.checking')}</p>}
      {notice && (
        <p role="status" className="text-accent">
          {t(notice)}
        </p>
      )}
      {recoveryUrl && (
        <div className="space-y-3 rounded-2xl bg-surface p-4">
          <p className="text-body-sm">{t(android ? 'auth.returnAndroid' : 'auth.returnWeb')}</p>
          {android && callback.nativeUrl && (
            <a
              href={callback.nativeUrl}
              className="inline-flex min-h-12 items-center rounded-pill bg-accent px-5 font-semibold text-accent-fg"
            >
              {t('auth.openApp')}
            </a>
          )}
          <PillButton
            onClick={() => {
              const url = callback.recoveryUrl;
              if (!url) return;
              if (!navigator.clipboard) {
                setError('auth.copyFailed');
                return;
              }
              void navigator.clipboard
                .writeText(url)
                .then(() => {
                  if (alive.current) setNotice('auth.copied');
                })
                .catch(() => {
                  if (alive.current) setError('auth.copyFailed');
                });
            }}
          >
            {t('auth.copyRecovery')}
          </PillButton>
        </div>
      )}
      {!callbackOnly && (
        <>
          <details open={!recoveryUrl}>
            <summary
              hidden={!recoveryUrl}
              className="min-h-11 cursor-pointer py-2 text-body-sm text-accent"
            >
              {t('auth.startAgain')}
            </summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(sent && emailCodeEnabled ? 'code' : 'send');
              }}
            >
              <fieldset disabled={locked} className="space-y-4">
                <label className="block text-body-sm">
                  {t('social.email')}
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    disabled={sent}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
                  />
                </label>
                {sent && (
                  <div className="rounded-xl bg-surface p-4">
                    <h3 className="font-semibold">{t('auth.checkEmail')}</h3>
                    <p className="mt-2 text-body-sm text-muted">
                      {t(emailCodeEnabled ? 'social.codeSent' : 'auth.linkSent')}
                    </p>
                  </div>
                )}
                {sent && emailCodeEnabled && (
                  <label className="block text-body-sm">
                    {t('social.code')}
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6,10}"
                      maxLength={10}
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
                      className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
                    />
                  </label>
                )}
                {(!sent || emailCodeEnabled) && (
                  <PillButton type="submit" variant="primary">
                    {t(
                      sent
                        ? 'social.verify'
                        : emailCodeEnabled
                          ? 'social.sendCode'
                          : 'social.sendLink',
                    )}
                  </PillButton>
                )}
                {sent && (
                  <div className="flex flex-wrap gap-2">
                    <PillButton disabled={wait > 0} onClick={() => void run('send')}>
                      {wait ? t('auth.resendWait', { seconds: wait }) : t('auth.resend')}
                    </PillButton>
                    <PillButton
                      onClick={() => {
                        writePendingEmail(null);
                        setSentAt(0);
                        setCode('');
                        setLink('');
                        setNotice('');
                        setError('');
                        clearLoginCallback();
                      }}
                    >
                      {t('social.changeEmail')}
                    </PillButton>
                  </div>
                )}
              </fieldset>
            </form>
          </details>
          <details className="rounded-2xl border border-fg/10 p-4">
            <summary className="min-h-11 cursor-pointer py-2 text-body-sm text-accent">
              {t('auth.needHelp')}
            </summary>
            <p className="mb-3 text-body-sm text-muted">{t('auth.pasteHelp')}</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run('link');
              }}
            >
              <fieldset disabled={locked} className="space-y-3">
                <label className="block text-body-sm">
                  {t('auth.pasteLabel')}
                  <input
                    type="password"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    maxLength={8192}
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl bg-surface px-4"
                  />
                </label>
                <PillButton type="submit" disabled={!link.trim()}>
                  {t('auth.pasteVerify')}
                </PillButton>
              </fieldset>
            </form>
            <p className="mt-3 text-body-sm text-muted">{t('auth.freshLink')}</p>
          </details>
        </>
      )}
    </section>
  );
}
