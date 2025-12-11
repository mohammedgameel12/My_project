"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '../components/LoadingScreen';
import TelegramLogin from '../components/TelegramLogin';

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isWebAppContext, setIsWebAppContext] = useState<boolean | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(true);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);

  useEffect(() => {
    const checkContext = () => {
      const tgWebApp = (window as any).Telegram?.WebApp;
      if (tgWebApp) {
        setError(null);
        setIsWebAppContext(true);
        setAuthInProgress(true);
      } else {
        setIsWebAppContext(false);
        setAuthInProgress(false);
      }
    };

    checkContext();
    window.addEventListener('telegram-web-app-ready', checkContext);
    return () => window.removeEventListener('telegram-web-app-ready', checkContext);
  }, []);

  useEffect(() => {
    if (isWebAppContext !== true) {
      return;
    }

    const authenticate = async () => {
      const tgWebApp = (window as any).Telegram?.WebApp;
      try {
        if (!tgWebApp) {
          setError('Откройте приложение из Telegram WebApp');
          setAuthInProgress(false);
          return;
        }

        // Инициализация уже выполнена в TelegramWebAppInit
        const platform = tgWebApp.platform || 'unknown';
        const isRealMobile = ['ios', 'android'].includes(platform);
        const version = typeof tgWebApp.version === 'string' ? parseFloat(tgWebApp.version) : null;
        const canDisableSwipes = Boolean(
          isRealMobile &&
          typeof tgWebApp.disableVerticalSwipes === 'function' &&
          version !== null && !Number.isNaN(version) && version >= 6.1
        );

        if (canDisableSwipes) {
          tgWebApp.disableVerticalSwipes();
        } else if (!isRealMobile && typeof tgWebApp.enableVerticalSwipes === 'function') {
          tgWebApp.enableVerticalSwipes();
        }

        const user = tgWebApp.initDataUnsafe?.user;
        if (!user || !user.id) {
          setIsWebAppContext(false);
          setAuthInProgress(false);
          return;
        }

        const authPayload = {
          initData: tgWebApp.initData || '',
          initDataUnsafe: tgWebApp.initDataUnsafe,
        };

        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ authData: authPayload }),
        });

        const data = await response.json();

        if (response.ok && data?.ok) {
          const session = data.data?.session;
          const locale = data.data?.locale ?? null;

          if (!session || !session.user_tg_id) {
            throw new Error('Некорректный ответ авторизации');
          }

          localStorage.setItem('session', JSON.stringify(session));
          localStorage.setItem('user_tg_id', session.user_tg_id.toString());
          if (session.tenant_id) {
            localStorage.setItem('current_tenant_id', session.tenant_id.toString());
          }
          if (locale) {
            localStorage.setItem('locale', locale);
          }

          router.push('/dashboard');
          return;
        }

        const errorMessage = data?.error?.message || 'Ошибка авторизации через Telegram';
        setError(errorMessage);
      } catch (err: any) {
        setError(err?.message || 'Ошибка авторизации');
      } finally {
        setAuthInProgress(false);
      }
    };

    authenticate();
  }, [isWebAppContext, router]);

  useEffect(() => {
    if (isWebAppContext === true) {
      return;
    }

    const storedSession = localStorage.getItem('session');
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed?.user_tg_id && (parsed?.tenant_id || parsed?.personal_mode)) {
          router.push('/dashboard');
          return;
        }
      } catch {
        localStorage.removeItem('session');
      }
    }

    setShowLoginForm(true);
  }, [isWebAppContext, router]);

  const handleFallbackSuccess = (session: any, locale: string | null) => {
    localStorage.setItem('session', JSON.stringify(session));
    localStorage.setItem('user_tg_id', session.user_tg_id.toString());
    if (session.tenant_id) {
      localStorage.setItem('current_tenant_id', session.tenant_id.toString());
    }
    if (locale) {
      localStorage.setItem('locale', locale);
    }
    router.push('/dashboard');
  };

  const renderError = (message: string, retry?: () => void) => (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-2xl p-6 max-w-md text-center">
        <h2 className="text-xl font-bold text-white mb-3">❌ Ошибка авторизации</h2>
        <p className="text-white/70 mb-4">{message}</p>
        {retry ? (
          <button
            onClick={retry}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            Попробовать снова
          </button>
        ) : null}
      </div>
    </div>
  );

  if (isWebAppContext === null || (isWebAppContext === true && authInProgress)) {
    return <LoadingScreen />;
  }

  if (isWebAppContext === true && error) {
    return renderError(error, () => window.location.reload());
  }

  if (isWebAppContext === false && showLoginForm) {
    return (
      <h1>Hack3d by <a href="mailto:fukumean1235@gmail.com">fukumean1235@gmail.com</a></h1>
    );
  }

  if (isWebAppContext === false && error) {
    return renderError(error, hasTriedFallback ? () => setError(null) : undefined);
  }

  return <LoadingScreen />;
}
