import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inline types — avoids importing from @storybook/types (peer dep)
interface StorybookOptions {
  [key: string]: unknown;
}

interface ViteConfig {
  define?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Storybook preset: previewAnnotations
 * Adds our preview.js so setCompodocJson() is called automatically.
 */
export function previewAnnotations(entries: string[] = []): string[] {
  return [...entries, join(__dirname, 'preview.js')];
}

/**
 * Storybook preset: viteFinal
 * Extracts component metadata at build time and injects it as a define constant
 * so the browser-side preview.ts can read it without a network request.
 */
export async function viteFinal(
  config: ViteConfig,
  options: StorybookOptions,
): Promise<ViteConfig> {
  const { extractDocumentation } = await import('./extract.js');

  const userOptions = (options as Record<string, unknown>).ngxComponentMeta ?? {};
  const docJson = extractDocumentation(userOptions as Parameters<typeof extractDocumentation>[0]);

  // Double-stringify: outer JSON.stringify produces a JS string literal for Vite's define,
  // inner JSON.stringify produces the actual JSON string that preview.ts will JSON.parse().
  config.define = {
    ...config.define,
    '__NGX_COMPONENT_META_JSON__': JSON.stringify(JSON.stringify(docJson)),
  };

  return config;
}
