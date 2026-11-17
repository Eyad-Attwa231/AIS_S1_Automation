import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const bundle = readdirSync('dist/assets').find((f) => f.endsWith('.js'));
const code = readFileSync(`dist/assets/${bundle}`, 'utf8').replace(/<\/script/gi, '<\\/script');

if (!/\.supabase\.co/.test(code)) {
  throw new Error('Supabase URL missing from the bundle. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env first.');
}

const preview = html.replace(/<script type="module"[^>]*><\/script>/, () => `<script type="module">${code}</script>`);
writeFileSync('preview.html', preview);
console.log(`preview.html written (${Math.round(preview.length / 1024)} KB)`);
