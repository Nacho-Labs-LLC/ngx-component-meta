// Storybook compatibility entry point
export { toCompodocJson } from './compodoc-mapper.js';
export { createArgTypesExtractor } from './arg-types.js';

// Re-export Compodoc types for consumers
export type { CompodocJson, CompodocComponent, CompodocDirective, CompodocProperty, CompodocMethod } from './compodoc-types.js';
