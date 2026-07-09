import ts from '@typescript/typescript6';
import type { InterfaceDoc, InterfacePropertyDoc, InterfaceMethodDoc } from '../types.js';
import { extractParams, getReturnTypeString } from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';

/**
 * Extract an exported interface declaration into an InterfaceDoc.
 */
export function extractInterface(
  checker: ts.TypeChecker,
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
): InterfaceDoc | null {
  const symbol = node.name ? checker.getSymbolAtLocation(node.name) : undefined;
  if (!symbol) return null;
  if (isInternal(symbol)) return null;

  const properties: InterfacePropertyDoc[] = [];
  const methods: InterfaceMethodDoc[] = [];

  for (const member of node.members) {
    if (ts.isPropertySignature(member)) {
      const propDoc = extractInterfaceProperty(checker, member, sourceFile);
      if (propDoc) properties.push(propDoc);
    } else if (ts.isMethodSignature(member)) {
      const methodDoc = extractInterfaceMethod(checker, member, sourceFile);
      if (methodDoc) methods.push(methodDoc);
    }
  }

  const extendsList: string[] = [];
  if (node.heritageClauses) {
    for (const clause of node.heritageClauses) {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        for (const type of clause.types) {
          extendsList.push(type.getText(sourceFile));
        }
      }
    }
  }

  return {
    name: symbol.getName(),
    filePath: sourceFile.fileName,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    properties,
    methods,
    extends: extendsList,
  };
}

function extractInterfaceProperty(
  checker: ts.TypeChecker,
  member: ts.PropertySignature,
  sourceFile: ts.SourceFile,
): InterfacePropertyDoc | null {
  const symbol = member.name ? checker.getSymbolAtLocation(member.name) : undefined;
  if (!symbol) return null;

  let type = checker.getTypeOfSymbolAtLocation(symbol, member);

  // For optional properties (age?: number), the checker returns `number | undefined`.
  // Strip the undefined union branch so the type reads `number` — the `optional` flag
  // already conveys optionality.
  if (member.questionToken && type.isUnion()) {
    const filtered = type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
    if (filtered.length === 1) {
      type = filtered[0];
    }
  }

  return {
    name: symbol.getName(),
    type: checker.typeToString(type, member, ts.TypeFormatFlags.NoTruncation),
    optional: !!member.questionToken,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

function extractInterfaceMethod(
  checker: ts.TypeChecker,
  member: ts.MethodSignature,
  sourceFile: ts.SourceFile,
): InterfaceMethodDoc | null {
  const symbol = member.name ? checker.getSymbolAtLocation(member.name) : undefined;
  if (!symbol) return null;

  const signature = checker.getSignatureFromDeclaration(member);
  const params = extractParams(checker, member.parameters, sourceFile, symbol);

  // Strip "| undefined" from optional param types — optionality is conveyed by the flag
  for (let i = 0; i < member.parameters.length; i++) {
    const param = member.parameters[i];
    if (param.questionToken || param.initializer) {
      const paramSymbol = checker.getSymbolAtLocation(param.name);
      let paramType = paramSymbol
        ? checker.getTypeOfSymbolAtLocation(paramSymbol, param)
        : checker.getTypeAtLocation(param);
      if (paramType.isUnion()) {
        const filtered = paramType.types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
        if (filtered.length === 1) {
          params[i].type = checker.typeToString(filtered[0], param, ts.TypeFormatFlags.NoTruncation);
        }
      }
    }
  }

  return {
    name: symbol.getName(),
    params,
    returnType: getReturnTypeString(checker, signature, member),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}
