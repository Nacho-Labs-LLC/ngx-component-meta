import { test, expect } from '@playwright/test';

const SAMPLE_COMPONENT = `import { Component, Input, Output, EventEmitter } from '@angular/core';
import { input, output, model } from '@angular/core';

/**
 * A configurable button component.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  template: '<button>{{ label() }}</button>'
})
export class ButtonComponent {
  /** The text displayed on the button */
  label = input.required<string>();

  /** Visual style variant */
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';

  /** Whether the button is disabled */
  disabled = input(false);

  /** Size of the button */
  size = model<'sm' | 'md' | 'lg'>('md');

  /** Emitted when the button is clicked */
  clicked = output<MouseEvent>();

  /** Emitted on hover */
  @Output() hovered = new EventEmitter<void>();

  /** Reset the button state */
  reset(): void {
    this.size.set('md');
  }
}`;

test.describe('Demo page loads', () => {
  test('renders the page with header and panels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header h1')).toHaveText('@nacho-labs/ngx-component-meta');
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('.tab.active')).toHaveText('Visual');
  });

  test('auto-parses the default source on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });
  });
});

test.describe('Visual tab', () => {
  test('displays inputs table with correct data', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual')).toContainText('Inputs', { timeout: 10_000 });

    const inputsTable = page.locator('#tab-visual table').first();
    await expect(inputsTable).toContainText('label');
    await expect(inputsTable).toContainText('signal');
  });

  test('displays outputs table', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual')).toContainText('Outputs', { timeout: 10_000 });
    await expect(page.locator('#tab-visual')).toContainText('clicked');
    await expect(page.locator('#tab-visual')).toContainText('hovered');
  });

  test('displays models table', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual')).toContainText('Models', { timeout: 10_000 });
    await expect(page.locator('#tab-visual')).toContainText('size');
  });

  test('displays methods table', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual')).toContainText('Methods', { timeout: 10_000 });
    await expect(page.locator('#tab-visual')).toContainText('reset');
    await expect(page.locator('#tab-visual')).toContainText('void');
  });
});

test.describe('JSON tab', () => {
  test('shows valid JSON output', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });

    await page.click('[data-tab="json"]');
    await expect(page.locator('#tab-json')).toBeVisible();

    const jsonText = await page.locator('#json-output').textContent();
    const parsed = JSON.parse(jsonText!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].name).toBe('ButtonComponent');
    expect(parsed[0].inputs.length).toBeGreaterThan(0);
  });
});

test.describe('Lint tab', () => {
  test('shows lint results', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });

    await page.click('[data-tab="lint"]');
    await expect(page.locator('#tab-lint')).toBeVisible();

    const lintContent = await page.locator('#tab-lint').textContent();
    expect(lintContent!.length).toBeGreaterThan(0);
  });
});

test.describe('Stats tab', () => {
  test('shows signal adoption stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });

    await page.click('[data-tab="stats"]');
    await expect(page.locator('#tab-stats')).toBeVisible();
    await expect(page.locator('#tab-stats')).toContainText('Signal Adoption');
    await expect(page.locator('#tab-stats')).toContainText('ButtonComponent');
  });
});

test.describe('Live editing', () => {
  test('updates output when editor content changes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });

    await page.locator('#editor').fill(`import { Component, Input } from '@angular/core';

@Component({ selector: 'app-hello', template: '' })
export class HelloComponent {
  /** Greeting message */
  @Input() message: string = 'Hello';
}`);

    await expect(page.locator('#tab-visual .section-title')).toContainText('HelloComponent', { timeout: 10_000 });
    await expect(page.locator('#tab-visual')).toContainText('message');
    await expect(page.locator('#tab-visual')).not.toContainText('ButtonComponent');
  });

  test('handles empty input gracefully', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });

    await page.locator('#editor').fill('');
    await expect(page.locator('#tab-visual')).toContainText('No components or pipes found', { timeout: 10_000 });
  });

  test('handles invalid TypeScript gracefully', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-visual .section-title')).toContainText('ButtonComponent', { timeout: 10_000 });

    await page.locator('#editor').fill('this is not valid typescript @@@');
    await expect(page.locator('#tab-visual')).toContainText('No components or pipes found', { timeout: 10_000 });
  });
});

test.describe('API endpoint', () => {
  test('POST /api/parse returns structured data', async ({ request }) => {
    const response = await request.post('/api/parse', {
      data: {
        source: `import { Component, Input } from '@angular/core';
@Component({ selector: 'app-test', template: '' })
export class TestComponent {
  @Input() name: string = '';
}`,
      },
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.docs).toHaveLength(1);
    expect(data.docs[0].name).toBe('TestComponent');
    expect(data.docs[0].inputs).toHaveLength(1);
    expect(data.docs[0].inputs[0].name).toBe('name');
    expect(data.docs[0].inputs[0].type).toBe('string');
    expect(data.allDocs).toBeDefined();
    expect(data.lintResult).toBeDefined();
    expect(data.stats).toBeDefined();
  });

  test('POST /api/parse returns error for missing source', async ({ request }) => {
    const response = await request.post('/api/parse', {
      data: {},
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.docs).toHaveLength(0);
  });
});
