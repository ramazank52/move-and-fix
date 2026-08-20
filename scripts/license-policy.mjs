export const PERMITTED_LICENSE_IDS = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT-0",
  "MPL-2.0",
  "Python-2.0",
  "Unlicense",
  "WTFPL",
  "Zlib",
]);

// SPDX WITH exceptions are legal-policy decisions. No exception is implicitly approved.
export const PERMITTED_WITH_EXCEPTIONS = new Set();

export function normalizeDeclaredLicense(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.type === "string") return value.type.trim();
  return "UNKNOWN";
}

function tokenizeSpdxExpression(source) {
  const tokens = [];
  const tokenPattern = /\s*(\(|\)|AND|OR|WITH|[A-Za-z0-9.+:-]+)\s*/y;
  let offset = 0;

  while (offset < source.length) {
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(source);
    if (!match || match.index !== offset) throw new Error("Malformed SPDX token");
    tokens.push(match[1]);
    offset = tokenPattern.lastIndex;
  }

  return tokens;
}

function parseSpdxExpression(source) {
  const tokens = tokenizeSpdxExpression(source);
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];
  const isOperator = (token) => token === "AND" || token === "OR" || token === "WITH" || token === "(" || token === ")";

  function parsePrimary() {
    if (peek() === "(") {
      consume();
      const nested = parseExpression();
      if (consume() !== ")") throw new Error("Unclosed SPDX group");
      return nested;
    }

    const license = consume();
    if (!license || isOperator(license)) throw new Error("Missing SPDX license identifier");
    if (peek() === "WITH") {
      consume();
      const exception = consume();
      if (!exception || isOperator(exception)) throw new Error("Missing SPDX exception identifier");
      return { license, exception };
    }
    return { license };
  }

  function parseAnd() {
    let node = parsePrimary();
    while (peek() === "AND") {
      consume();
      node = { left: node, conjunction: "and", right: parsePrimary() };
    }
    return node;
  }

  function parseExpression() {
    let node = parseAnd();
    while (peek() === "OR") {
      consume();
      node = { left: node, conjunction: "or", right: parseAnd() };
    }
    return node;
  }

  if (tokens.length === 0) throw new Error("Empty SPDX expression");
  const result = parseExpression();
  if (cursor !== tokens.length) throw new Error("Unexpected SPDX token");
  return result;
}

function evaluateNode(node) {
  if (node.license) {
    const licenseAllowed = PERMITTED_LICENSE_IDS.has(node.license);
    const exceptionAllowed = !node.exception || PERMITTED_WITH_EXCEPTIONS.has(node.exception);
    return {
      allowed: licenseAllowed && exceptionAllowed,
      selected: licenseAllowed && exceptionAllowed ? [{ license: node.license, exception: node.exception ?? null }] : [],
      reason: licenseAllowed && exceptionAllowed ? "LICENSE_ALLOWED" : !licenseAllowed ? `DISALLOWED_LICENSE:${node.license}` : `UNAPPROVED_EXCEPTION:${node.exception}`,
    };
  }

  if (!node.left || !node.right || (node.conjunction !== "and" && node.conjunction !== "or")) {
    return { allowed: false, selected: [], reason: "MALFORMED_SPDX_AST" };
  }

  const left = evaluateNode(node.left);
  const right = evaluateNode(node.right);
  if (node.conjunction === "and") {
    return {
      allowed: left.allowed && right.allowed,
      selected: left.allowed && right.allowed ? [...left.selected, ...right.selected] : [],
      reason: left.allowed && right.allowed ? "ALL_AND_OPERANDS_ALLOWED" : `AND_OPERAND_DENIED:${left.reason}|${right.reason}`,
    };
  }

  if (left.allowed) return { allowed: true, selected: left.selected, reason: "OR_LEFT_OPERAND_ALLOWED" };
  if (right.allowed) return { allowed: true, selected: right.selected, reason: "OR_RIGHT_OPERAND_ALLOWED" };
  return { allowed: false, selected: [], reason: `OR_NO_ALLOWED_OPERAND:${left.reason}|${right.reason}` };
}

export function evaluateSpdxExpression(expression) {
  const normalized = typeof expression === "string" ? expression.trim() : "";
  if (!normalized || normalized === "UNKNOWN") return { allowed: false, selected: [], reason: "UNKNOWN_LICENSE" };

  try {
    return { expression: normalized, ...evaluateNode(parseSpdxExpression(normalized)) };
  } catch {
    return { expression: normalized, allowed: false, selected: [], reason: "MALFORMED_SPDX_EXPRESSION" };
  }
}
