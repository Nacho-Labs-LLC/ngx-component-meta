import type { ParseResult, ComponentDoc } from './types.js';

export interface MigrationStats {
  /** Overall signal adoption percentage (0-100). */
  signalAdoption: number;

  inputs: {
    total: number;
    decorator: number;
    signal: number;
    percentage: number;
  };

  outputs: {
    total: number;
    decorator: number;
    signal: number;
    percentage: number;
  };

  models: {
    /** Models are always signals, so this is just a count. */
    total: number;
  };

  /** Per-component breakdown. */
  components: ComponentMigrationStats[];

  /** Summary of fully-migrated vs partially-migrated vs legacy components. */
  componentSummary: {
    /** All inputs+outputs use signals. */
    fullyMigrated: number;
    /** Mix of decorator and signal. */
    partiallyMigrated: number;
    /** All inputs+outputs use decorators. */
    legacy: number;
    /** No inputs or outputs (just methods/properties). */
    noBindings: number;
    total: number;
  };
}

export interface ComponentMigrationStats {
  name: string;
  filePath: string;
  status: 'fully-migrated' | 'partially-migrated' | 'legacy' | 'no-bindings';
  inputs: { decorator: number; signal: number };
  outputs: { decorator: number; signal: number };
  models: number;
}

const STATUS_ORDER: Record<ComponentMigrationStats['status'], number> = {
  'legacy': 0,
  'partially-migrated': 1,
  'fully-migrated': 2,
  'no-bindings': 3,
};

function classifyComponent(comp: ComponentDoc): ComponentMigrationStats {
  const inputDecorator = comp.inputs.filter(i => i.source === 'decorator').length;
  const inputSignal = comp.inputs.filter(i => i.source === 'signal').length;
  const outputDecorator = comp.outputs.filter(o => o.source === 'decorator').length;
  const outputSignal = comp.outputs.filter(o => o.source === 'signal').length;
  const models = comp.models.length;

  const totalDecorator = inputDecorator + outputDecorator;
  const totalSignal = inputSignal + outputSignal + models;

  let status: ComponentMigrationStats['status'];
  if (totalDecorator === 0 && totalSignal === 0) {
    status = 'no-bindings';
  } else if (totalDecorator === 0) {
    status = 'fully-migrated';
  } else if (totalSignal === 0) {
    status = 'legacy';
  } else {
    status = 'partially-migrated';
  }

  return {
    name: comp.name,
    filePath: comp.filePath,
    status,
    inputs: { decorator: inputDecorator, signal: inputSignal },
    outputs: { decorator: outputDecorator, signal: outputSignal },
    models,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return round1((numerator / denominator) * 100);
}

export function computeStats(result: ParseResult): MigrationStats {
  const componentStats = result.components.map(classifyComponent);

  let inputDecorator = 0;
  let inputSignal = 0;
  let outputDecorator = 0;
  let outputSignal = 0;
  let totalModels = 0;

  for (const cs of componentStats) {
    inputDecorator += cs.inputs.decorator;
    inputSignal += cs.inputs.signal;
    outputDecorator += cs.outputs.decorator;
    outputSignal += cs.outputs.signal;
    totalModels += cs.models;
  }

  const totalInputs = inputDecorator + inputSignal;
  const totalOutputs = outputDecorator + outputSignal;
  const totalBindings = totalInputs + totalOutputs + totalModels;
  const totalSignalBindings = inputSignal + outputSignal + totalModels;

  componentStats.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  let fullyMigrated = 0;
  let partiallyMigrated = 0;
  let legacy = 0;
  let noBindings = 0;

  for (const cs of componentStats) {
    switch (cs.status) {
      case 'fully-migrated': fullyMigrated++; break;
      case 'partially-migrated': partiallyMigrated++; break;
      case 'legacy': legacy++; break;
      case 'no-bindings': noBindings++; break;
    }
  }

  return {
    signalAdoption: safePercentage(totalSignalBindings, totalBindings),

    inputs: {
      total: totalInputs,
      decorator: inputDecorator,
      signal: inputSignal,
      percentage: safePercentage(inputSignal, totalInputs),
    },

    outputs: {
      total: totalOutputs,
      decorator: outputDecorator,
      signal: outputSignal,
      percentage: safePercentage(outputSignal, totalOutputs),
    },

    models: {
      total: totalModels,
    },

    components: componentStats,

    componentSummary: {
      fullyMigrated,
      partiallyMigrated,
      legacy,
      noBindings,
      total: componentStats.length,
    },
  };
}
