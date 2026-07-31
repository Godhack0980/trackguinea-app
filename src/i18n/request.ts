import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
import fs from 'fs';
import path from 'path';

export default getRequestConfig(async ({requestLocale}) => {
  // requestLocale is provided when setRequestLocale() is called in layouts/pages
  let locale = await requestLocale;

  // Fallback to default locale if not valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const messagesDir = path.join(process.cwd(), 'src/messages', locale);
  const messages: Record<string, any> = {};

  if (fs.existsSync(messagesDir)) {
    const files = fs.readdirSync(messagesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const key = path.basename(file, '.json');
        const filePath = path.join(messagesDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          messages[key] = JSON.parse(content);
        } catch (e) {
          console.error(`Failed to load translation file: ${filePath}`, e);
        }
      }
    }
  }

  return {
    locale,
    messages
  };
});

