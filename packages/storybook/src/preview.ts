// Browser-side module — loaded via previewAnnotations.
// @storybook/angular is always available in the preview iframe (peer dep).
import { setCompodocJson } from '@storybook/angular';

// Injected at build time by the preset's viteFinal hook.
declare const __NGX_COMPONENT_META_JSON__: string;

try {
  const docJson = JSON.parse(__NGX_COMPONENT_META_JSON__);
  setCompodocJson(docJson);
} catch {
  console.warn('[ngx-component-meta] Failed to load component metadata');
}
