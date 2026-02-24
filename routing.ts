import {defineRouting} from 'next-intl/routing';
import { locales } from './i18n';

export const routing = defineRouting({
  // Список всех поддерживаемых локалей
  locales: locales,
 
  // Локаль по умолчанию
  defaultLocale: 'ru'
});