import ts from 'typescript';

/**
 * Extract JSDoc description from a symbol.
 */
export function getDescription(checker: ts.TypeChecker, symbol: ts.Symbol): string {
  const docs = symbol.getDocumentationComment(checker);
  return ts.displayPartsToString(docs);
}

/**
 * Extract raw JSDoc text from a symbol's declarations.
 * Returns the raw text content of JSDoc comments.
 */
export function getRawDescription(symbol: ts.Symbol): string {
  if (!symbol.declarations?.length) return '';

  for (const decl of symbol.declarations) {
    const jsDocs = getJsDocNodes(decl);
    if (jsDocs.length > 0) {
      return jsDocs
        .map(doc => doc.comment ? getJsDocCommentText(doc.comment) : '')
        .filter(Boolean)
        .join('\n');
    }
  }
  return '';
}

/**
 * Extract JSDoc tags as a Record<string, string>.
 * Tag names exclude the @ prefix.
 * Repeated tags have values joined with \n.
 * Tags without values get empty string.
 */
export function getTags(symbol: ts.Symbol): Record<string, string> {
  const jsDocTags = symbol.getJsDocTags();
  const tags: Record<string, string> = {};

  for (const tag of jsDocTags) {
    const value = tag.text ? ts.displayPartsToString(tag.text) : '';
    if (tags[tag.name] !== undefined) {
      tags[tag.name] += '\n' + value;
    } else {
      tags[tag.name] = value;
    }
  }

  return tags;
}

export function isInternal(symbol: ts.Symbol): boolean {
  return symbol.getJsDocTags().some(t => t.name === 'internal');
}

/**
 * Extract description for a method parameter from @param JSDoc tags.
 */
export function getParamDescription(
  checker: ts.TypeChecker,
  methodSymbol: ts.Symbol,
  paramName: string,
): string {
  const tags = methodSymbol.getJsDocTags();
  const paramTag = tags.find(t => t.name === 'param' && t.text?.some(p => p.text.startsWith(paramName)));
  if (!paramTag?.text) return '';

  const parts = paramTag.text;
  // Format is: [{ text: "paramName" }, { text: " - description" }] or similar
  const textParts = parts.map(p => p.text).join('');
  // Remove the param name prefix
  const afterName = textParts.slice(paramName.length).trim();
  // Remove leading dash/hyphen
  return afterName.replace(/^[-–—]\s*/, '').trim();
}

function getJsDocNodes(node: ts.Node): ts.JSDoc[] {
  // Access jsDoc property which exists on statement nodes
  let docs = (node as any).jsDoc ?? [];
  if (docs.length === 0 && node.parent?.parent && ts.isVariableStatement(node.parent.parent)) {
    // For variables, the JSDoc is attached to the VariableStatement, not the VariableDeclaration
    docs = (node.parent.parent as any).jsDoc ?? [];
  }
  return docs;
}

function getJsDocCommentText(comment: string | ts.NodeArray<ts.JSDocComment>): string {
  if (typeof comment === 'string') return comment;
  return comment.map(c => c.getText()).join('');
}
