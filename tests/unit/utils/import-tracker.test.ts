import { describe, it, expect } from 'vitest';
import ts from '@typescript/typescript6';
import { getCallName } from '../../../src/utils/import-tracker.js';

// Helper to create TS nodes from a string
function createCallExpression(sourceText: string) {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  // Expecting the source text to be just a call expression, e.g., "myFunc()" or "obj.myFunc()"
  const stmt = sourceFile.statements[0];
  if (
    stmt &&
    ts.isExpressionStatement(stmt) &&
    ts.isCallExpression(stmt.expression)
  ) {
    return stmt.expression;
  }

  throw new Error('Failed to parse a call expression from: ' + sourceText);
}

describe('getCallName', () => {
  it('should return the name for a simple identifier call', () => {
    const callExpr = createCallExpression('myFunction()');
    expect(getCallName(callExpr)).toBe('myFunction');
  });

  it('should return the name for a simple property access call', () => {
    const callExpr = createCallExpression('myObj.myMethod()');
    expect(getCallName(callExpr)).toBe('myMethod');
  });

  it('should return undefined for an element access call (bracket notation)', () => {
    const callExpr = createCallExpression('myObj["myMethod"]()');
    expect(getCallName(callExpr)).toBeUndefined();
  });

  it('should return the name for a nested property access call', () => {
    const callExpr = createCallExpression('a.b.c.myMethod()');
    expect(getCallName(callExpr)).toBe('myMethod');
  });

  it('should return undefined for an IIFE (Immediately Invoked Function Expression)', () => {
    const callExpr = createCallExpression('(function() { return 1; })()');
    expect(getCallName(callExpr)).toBeUndefined();
  });

  it('should return undefined for an anonymous arrow function call', () => {
    const callExpr = createCallExpression('(() => 1)()');
    expect(getCallName(callExpr)).toBeUndefined();
  });
});
