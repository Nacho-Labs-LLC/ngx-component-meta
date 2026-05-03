import type { ComponentDoc, PipeDoc, InputDoc, OutputDoc, ModelDoc, MethodDoc, PropertyDoc } from './types.js';

export interface ApiDiff {
  breaking: ApiChange[];
  nonBreaking: ApiChange[];
  summary: { breaking: number; nonBreaking: number };
}

export interface ApiChange {
  component: string;
  change: string;
  name: string;
  details: Record<string, any>;
}

type DocEntry = ComponentDoc | PipeDoc;

function isComponentDoc(doc: DocEntry): doc is ComponentDoc {
  return 'kind' in doc && (doc.kind === 'component' || doc.kind === 'directive');
}

function buildNameMap<T extends { name: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.name, item);
  }
  return map;
}

function diffInputs(
  component: string,
  baseInputs: InputDoc[],
  headInputs: InputDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(baseInputs);
  const headMap = buildNameMap(headInputs);

  for (const [name, baseInput] of baseMap) {
    const headInput = headMap.get(name);
    if (!headInput) {
      breaking.push({
        component,
        change: 'input-removed',
        name,
        details: { type: baseInput.type },
      });
      continue;
    }

    if (baseInput.type !== headInput.type) {
      breaking.push({
        component,
        change: 'input-type-changed',
        name,
        details: { before: baseInput.type, after: headInput.type },
      });
    }

    if (!baseInput.required && headInput.required) {
      breaking.push({
        component,
        change: 'input-became-required',
        name,
        details: { before: { required: false }, after: { required: true } },
      });
    }

    if (baseInput.required && !headInput.required) {
      nonBreaking.push({
        component,
        change: 'input-became-optional',
        name,
        details: { before: { required: true }, after: { required: false } },
      });
    }

    if (baseInput.defaultValue !== headInput.defaultValue) {
      if (baseInput.defaultValue !== undefined && headInput.defaultValue === undefined) {
        breaking.push({
          component,
          change: 'input-default-removed',
          name,
          details: { before: baseInput.defaultValue, after: undefined },
        });
      } else if (baseInput.defaultValue === undefined && headInput.defaultValue !== undefined) {
        nonBreaking.push({
          component,
          change: 'input-default-added',
          name,
          details: { before: undefined, after: headInput.defaultValue },
        });
      } else {
        nonBreaking.push({
          component,
          change: 'default-changed',
          name,
          details: { before: baseInput.defaultValue, after: headInput.defaultValue },
        });
      }
    }

    if (baseInput.description !== headInput.description) {
      nonBreaking.push({
        component,
        change: 'description-changed',
        name,
        details: { before: baseInput.description, after: headInput.description },
      });
    }
  }

  for (const [name, headInput] of headMap) {
    if (!baseMap.has(name)) {
      if (headInput.required) {
        breaking.push({
          component,
          change: 'input-added-required',
          name,
          details: {
            type: headInput.type,
            required: true,
          },
        });
      } else {
        nonBreaking.push({
          component,
          change: 'input-added',
          name,
          details: {
            type: headInput.type,
            required: headInput.required,
            default: headInput.defaultValue,
          },
        });
      }
    }
  }
}

function diffOutputs(
  component: string,
  baseOutputs: OutputDoc[],
  headOutputs: OutputDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(baseOutputs);
  const headMap = buildNameMap(headOutputs);

  for (const [name, baseOutput] of baseMap) {
    const headOutput = headMap.get(name);
    if (!headOutput) {
      breaking.push({
        component,
        change: 'output-removed',
        name,
        details: { type: baseOutput.type },
      });
      continue;
    }

    if (baseOutput.type !== headOutput.type) {
      breaking.push({
        component,
        change: 'output-type-changed',
        name,
        details: { before: baseOutput.type, after: headOutput.type },
      });
    }
  }

  for (const [name, headOutput] of headMap) {
    if (!baseMap.has(name)) {
      nonBreaking.push({
        component,
        change: 'output-added',
        name,
        details: { type: headOutput.type },
      });
    }
  }
}

function diffModels(
  component: string,
  baseModels: ModelDoc[],
  headModels: ModelDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(baseModels);
  const headMap = buildNameMap(headModels);

  for (const [name, baseModel] of baseMap) {
    const headModel = headMap.get(name);
    if (!headModel) {
      breaking.push({
        component,
        change: 'model-removed',
        name,
        details: { type: baseModel.type },
      });
      continue;
    }

    if (baseModel.type !== headModel.type) {
      breaking.push({
        component,
        change: 'model-type-changed',
        name,
        details: { before: baseModel.type, after: headModel.type },
      });
    }

    if (!baseModel.required && headModel.required) {
      breaking.push({
        component,
        change: 'model-became-required',
        name,
        details: { before: { required: false }, after: { required: true } },
      });
    }

    if (baseModel.required && !headModel.required) {
      nonBreaking.push({
        component,
        change: 'model-became-optional',
        name,
        details: { before: { required: true }, after: { required: false } },
      });
    }

    if (baseModel.defaultValue !== headModel.defaultValue) {
      if (baseModel.defaultValue !== undefined && headModel.defaultValue === undefined) {
        breaking.push({
          component,
          change: 'model-default-removed',
          name,
          details: { before: baseModel.defaultValue, after: undefined },
        });
      } else if (baseModel.defaultValue === undefined && headModel.defaultValue !== undefined) {
        nonBreaking.push({
          component,
          change: 'model-default-added',
          name,
          details: { before: undefined, after: headModel.defaultValue },
        });
      } else {
        nonBreaking.push({
          component,
          change: 'model-default-changed',
          name,
          details: { before: baseModel.defaultValue, after: headModel.defaultValue },
        });
      }
    }
  }

  for (const [name, headModel] of headMap) {
    if (!baseMap.has(name)) {
      nonBreaking.push({
        component,
        change: 'model-added',
        name,
        details: { type: headModel.type },
      });
    }
  }
}

function diffMethods(
  component: string,
  baseMethods: MethodDoc[],
  headMethods: MethodDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(baseMethods);
  const headMap = buildNameMap(headMethods);

  for (const [name, baseMethod] of baseMap) {
    const headMethod = headMap.get(name);
    if (!headMethod) {
      breaking.push({
        component,
        change: 'method-removed',
        name,
        details: { returnType: baseMethod.returnType },
      });
      continue;
    }

    if (baseMethod.returnType !== headMethod.returnType) {
      breaking.push({
        component,
        change: 'method-return-type-changed',
        name,
        details: { before: baseMethod.returnType, after: headMethod.returnType },
      });
    }

    const baseParamMap = buildNameMap(baseMethod.params);
    const headParamMap = buildNameMap(headMethod.params);

    for (const [paramName, baseParam] of baseParamMap) {
      const headParam = headParamMap.get(paramName);
      if (headParam && baseParam.type !== headParam.type) {
        breaking.push({
          component,
          change: 'method-param-type-changed',
          name,
          details: { param: paramName, before: baseParam.type, after: headParam.type },
        });
      }
    }

    for (const [paramName, headParam] of headParamMap) {
      if (!baseParamMap.has(paramName)) {
        if (headParam.optional || headParam.defaultValue !== undefined) {
          nonBreaking.push({
            component,
            change: 'method-param-added',
            name,
            details: { param: paramName, type: headParam.type, optional: true },
          });
        } else {
          breaking.push({
            component,
            change: 'method-param-added-required',
            name,
            details: { param: paramName, type: headParam.type },
          });
        }
      }
    }
  }

  for (const [name, headMethod] of headMap) {
    if (!baseMap.has(name)) {
      nonBreaking.push({
        component,
        change: 'method-added',
        name,
        details: { returnType: headMethod.returnType },
      });
    }
  }
}

function diffProperties(
  component: string,
  baseProperties: PropertyDoc[],
  headProperties: PropertyDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(baseProperties);
  const headMap = buildNameMap(headProperties);

  for (const [name, baseProperty] of baseMap) {
    const headProperty = headMap.get(name);
    if (!headProperty) {
      nonBreaking.push({
        component,
        change: 'property-removed',
        name,
        details: { type: baseProperty.type },
      });
      continue;
    }

    if (baseProperty.type !== headProperty.type) {
      nonBreaking.push({
        component,
        change: 'property-changed',
        name,
        details: { before: baseProperty.type, after: headProperty.type },
      });
    }
  }

  for (const [name, headProperty] of headMap) {
    if (!baseMap.has(name)) {
      nonBreaking.push({
        component,
        change: 'property-added',
        name,
        details: { type: headProperty.type },
      });
    }
  }
}

function isPipeDoc(doc: DocEntry): doc is PipeDoc {
  return 'pipeName' in doc && !('kind' in doc && ((doc as any).kind === 'component' || (doc as any).kind === 'directive'));
}

function diffPipeDocs(
  basePipes: PipeDoc[],
  headPipes: PipeDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(basePipes);
  const headMap = buildNameMap(headPipes);

  for (const [name, basePipe] of baseMap) {
    const headPipe = headMap.get(name);
    if (!headPipe) {
      breaking.push({
        component: name,
        change: 'pipe-removed',
        name,
        details: { pipeName: basePipe.pipeName },
      });
      continue;
    }

    const baseParams = basePipe.transform.params;
    const headParams = headPipe.transform.params;
    const baseReturnType = basePipe.transform.returnType;
    const headReturnType = headPipe.transform.returnType;

    let signatureChanged = false;

    if (baseReturnType !== headReturnType) {
      signatureChanged = true;
    }

    if (baseParams.length !== headParams.length) {
      signatureChanged = true;
    } else {
      for (let i = 0; i < baseParams.length; i++) {
        if (baseParams[i].type !== headParams[i].type || baseParams[i].name !== headParams[i].name) {
          signatureChanged = true;
          break;
        }
      }
    }

    if (signatureChanged) {
      breaking.push({
        component: name,
        change: 'pipe-transform-changed',
        name,
        details: {
          before: { params: baseParams, returnType: baseReturnType },
          after: { params: headParams, returnType: headReturnType },
        },
      });
    }
  }

  for (const [name, headPipe] of headMap) {
    if (!baseMap.has(name)) {
      nonBreaking.push({
        component: name,
        change: 'pipe-added',
        name,
        details: { pipeName: headPipe.pipeName },
      });
    }
  }
}

function diffComponentDocs(
  baseDocs: ComponentDoc[],
  headDocs: ComponentDoc[],
  breaking: ApiChange[],
  nonBreaking: ApiChange[],
): void {
  const baseMap = buildNameMap(baseDocs);
  const headMap = buildNameMap(headDocs);

  for (const [name, baseDoc] of baseMap) {
    const headDoc = headMap.get(name);
    if (!headDoc) {
      breaking.push({
        component: name,
        change: 'component-removed',
        name,
        details: {},
      });
      continue;
    }

    if (baseDoc.selector !== headDoc.selector) {
      breaking.push({
        component: name,
        change: 'selector-changed',
        name,
        details: { before: baseDoc.selector, after: headDoc.selector },
      });
    }

    diffInputs(name, baseDoc.inputs, headDoc.inputs, breaking, nonBreaking);
    diffOutputs(name, baseDoc.outputs, headDoc.outputs, breaking, nonBreaking);
    diffModels(name, baseDoc.models, headDoc.models, breaking, nonBreaking);
    diffMethods(name, baseDoc.methods, headDoc.methods, breaking, nonBreaking);
    diffProperties(name, baseDoc.properties, headDoc.properties, breaking, nonBreaking);
  }

  for (const [name] of headMap) {
    if (!baseMap.has(name)) {
      nonBreaking.push({
        component: name,
        change: 'component-added',
        name,
        details: {},
      });
    }
  }
}

export function diff(
  base: (ComponentDoc | PipeDoc)[],
  head: (ComponentDoc | PipeDoc)[],
): ApiDiff {
  const breaking: ApiChange[] = [];
  const nonBreaking: ApiChange[] = [];

  const baseComponents = base.filter(isComponentDoc);
  const headComponents = head.filter(isComponentDoc);
  const basePipes = base.filter(isPipeDoc);
  const headPipes = head.filter(isPipeDoc);

  diffComponentDocs(baseComponents, headComponents, breaking, nonBreaking);
  diffPipeDocs(basePipes, headPipes, breaking, nonBreaking);

  return {
    breaking,
    nonBreaking,
    summary: { breaking: breaking.length, nonBreaking: nonBreaking.length },
  };
}
