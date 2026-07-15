import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing, type Locale } from './routing';
import enMessages from '../messages/en.json';
import zhMessages from '../messages/zh.json';

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  zh: zhMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messages[locale],
  };
});
