import type * as TS from 'typescript'
import type { CheckResult } from './types'

/**
 * Static analysis of an Address Tags Query module (`src/main.mts`) against
 * the policy's code rules, so a submitter sees problems before paying the
 * deposit. The TypeScript compiler is injected because it is a large, lazily
 * loaded dependency in the browser.
 *
 * Policy (ATQ v2.3.0, p.2): one file named main.mts in src/, compiles, at most
 * 500 lines, may use only atq-types plus optionally axios or node-fetch, must
 * not use `this`, and must export exactly one async `returnTags` function
 * taking exactly two arguments.
 */

const FIELD = 'Github Repository URL'
const MAX_LINES = 500
/** Sources are downloaded up to this size; a module within the line limit is far smaller. */
export const MAX_SOURCE_BYTES = 1024 * 1024
/** Larger sources are not parsed: parsing is synchronous and would freeze the page. */
export const MAX_PARSED_LENGTH = 256 * 1024

/** Node.js built-in modules; the policy lets a module use them freely. */
const NODE_BUILTINS = new Set(
  (
    '_http_agent _http_client _http_common _http_incoming _http_outgoing _http_server _stream_duplex ' +
    '_stream_passthrough _stream_readable _stream_transform _stream_wrap _stream_writable _tls_common ' +
    '_tls_wrap assert assert/strict async_hooks buffer child_process cluster console constants crypto ' +
    'dgram diagnostics_channel dns dns/promises domain events fs fs/promises http http2 https inspector ' +
    'inspector/promises module net os path path/posix path/win32 perf_hooks process punycode querystring ' +
    'readline readline/promises repl stream stream/consumers stream/promises stream/web string_decoder sys ' +
    'timers timers/promises tls trace_events tty url util util/types v8 vm wasi worker_threads zlib'
  ).split(' '),
)
const PREFIX_ONLY_BUILTINS = new Set([
  'node:sea',
  'node:sqlite',
  'node:test',
  'node:test/reporters',
])

const isNodeBuiltin = (specifier: string): boolean =>
  PREFIX_ONLY_BUILTINS.has(specifier) ||
  NODE_BUILTINS.has(
    specifier.startsWith('node:') ? specifier.slice(5) : specifier,
  )

export const isAllowedAtqSpecifier = (specifier: string): boolean => {
  if (isNodeBuiltin(specifier)) return true
  if (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/')
  )
    return true
  return ['atq-types', 'axios', 'node-fetch'].some(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  )
}

/** Lines as the 500-line rule counts them: a final newline does not add a line. */
export const countSourceLines = (source: string): number =>
  source.length === 0
    ? 0
    : source.split(/\r\n|\r|\n/).length - (/\r\n$|\r$|\n$/.test(source) ? 1 : 0)

interface RuntimeExport {
  name: string
  node: TS.Node
  async: boolean
}

const hasModifier = (
  ts: typeof TS,
  node: TS.Node | undefined,
  kind: TS.SyntaxKind,
): boolean =>
  Boolean(
    node &&
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(
      (modifier) => modifier.kind === kind,
    ),
  )

/** `<instance>.returnTags`, as in `export const returnTags = tagService.returnTags`. */
const isReturnTagsMemberAccess = (
  ts: typeof TS,
  node: TS.Node | undefined,
): node is TS.PropertyAccessExpression =>
  Boolean(
    node &&
    ts.isPropertyAccessExpression(node) &&
    node.name.text === 'returnTags',
  )

const exportedRuntimeDeclarations = (
  ts: typeof TS,
  sourceFile: TS.SourceFile,
): RuntimeExport[] => {
  const unwrap = (
    node: TS.Expression | undefined,
  ): TS.Expression | undefined => {
    let current = node
    while (
      current &&
      (ts.isParenthesizedExpression(current) ||
        ts.isAsExpression(current) ||
        ts.isSatisfiesExpression(current) ||
        ts.isTypeAssertionExpression(current) ||
        ts.isNonNullExpression(current))
    ) {
      current = current.expression
    }
    return current
  }
  const bindingIdentifiers = (name: TS.BindingName): string[] => {
    if (ts.isIdentifier(name)) return [name.text]
    return (name.elements as TS.NodeArray<TS.ArrayBindingElement>).flatMap(
      (element) =>
        ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name),
    )
  }

  const locals = new Map<string, RuntimeExport>()
  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      statement.body
    ) {
      locals.set(statement.name.text, {
        name: statement.name.text,
        node: statement,
        async: hasModifier(ts, statement, ts.SyntaxKind.AsyncKeyword),
      })
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const initializer = unwrap(declaration.initializer)
        const direct = ts.isIdentifier(declaration.name)
        for (const name of bindingIdentifiers(declaration.name)) {
          locals.set(name, {
            name,
            node: direct ? (initializer ?? declaration) : declaration,
            async:
              direct &&
              hasModifier(ts, initializer, ts.SyntaxKind.AsyncKeyword),
          })
        }
      }
    }
  }

  // The policy's reference module exports a class member:
  //   const tagService = new TagService()
  //   export const returnTags = tagService.returnTags
  // When the class is declared in this file, check the member itself.
  const classes = new Map<string, TS.ClassDeclaration>()
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement) && statement.name)
      classes.set(statement.name.text, statement)
  }
  const instanceOf = (
    expression: TS.Expression,
  ): TS.NewExpression | undefined => {
    const target = unwrap(expression)
    if (target && ts.isNewExpression(target)) return target
    const local =
      target && ts.isIdentifier(target) ? locals.get(target.text)?.node : null
    return local && ts.isNewExpression(local) ? local : undefined
  }
  const memberFunction = (
    access: TS.PropertyAccessExpression,
  ): TS.FunctionLikeDeclaration | undefined => {
    const instance = instanceOf(access.expression)
    if (!instance || !ts.isIdentifier(instance.expression)) return undefined
    for (const member of classes.get(instance.expression.text)?.members ?? []) {
      if (
        !member.name ||
        !ts.isIdentifier(member.name) ||
        member.name.text !== access.name.text ||
        hasModifier(ts, member, ts.SyntaxKind.StaticKeyword)
      )
        continue
      if (ts.isMethodDeclaration(member) && member.body) return member
      if (ts.isPropertyDeclaration(member)) {
        const value = unwrap(member.initializer)
        if (
          value &&
          (ts.isArrowFunction(value) || ts.isFunctionExpression(value))
        )
          return value
      }
    }
    return undefined
  }
  for (const [name, local] of locals) {
    if (isReturnTagsMemberAccess(ts, local.node)) {
      const member = memberFunction(local.node)
      if (member)
        locals.set(name, {
          name,
          node: member,
          async: hasModifier(ts, member, ts.SyntaxKind.AsyncKeyword),
        })
    }
  }

  const exports: (RuntimeExport | undefined)[] = []
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      const expression = unwrap(statement.expression)
      exports.push({
        name: statement.isExportEquals ? 'export=' : 'default',
        node: expression ?? statement,
        async: hasModifier(ts, expression, ts.SyntaxKind.AsyncKeyword),
      })
      continue
    }
    const exported = hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword)
    if (exported && ts.isFunctionDeclaration(statement) && statement.name) {
      if (statement.body) {
        const local = locals.get(statement.name.text)
        const asDefault = hasModifier(
          ts,
          statement,
          ts.SyntaxKind.DefaultKeyword,
        )
        exports.push(asDefault && local ? { ...local, name: 'default' } : local)
      }
    } else if (exported && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of bindingIdentifiers(declaration.name))
          exports.push(locals.get(name))
      }
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      ) {
        exports.push({ name: '*', node: statement, async: false })
        continue
      }
      for (const element of statement.exportClause.elements) {
        if (element.isTypeOnly) continue
        const local = locals.get(
          element.propertyName?.text ?? element.name.text,
        )
        exports.push(
          local
            ? { ...local, name: element.name.text }
            : { name: element.name.text, node: element, async: false },
        )
      }
    } else if (
      exported &&
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement)
    ) {
      exports.push({
        name: statement.getText(sourceFile).slice(0, 80),
        node: statement,
        async: false,
      })
    }
  }
  return exports.filter((entry): entry is RuntimeExport => Boolean(entry))
}

const loadedModuleSpecifiers = (ts: typeof TS, sourceFile: TS.SourceFile) => {
  const specifiers: string[] = []
  const unresolved: string[] = []
  const visit = (node: TS.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      if (ts.isStringLiteralLike(node.moduleSpecifier))
        specifiers.push(node.moduleSpecifier.text)
      else unresolved.push(ts.SyntaxKind[node.kind])
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const expression = node.moduleReference.expression
      if (expression && ts.isStringLiteralLike(expression))
        specifiers.push(expression.text)
      else unresolved.push('import = require()')
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      if (
        node.arguments.length > 0 &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        specifiers.push(node.arguments[0].text)
      } else {
        unresolved.push(
          node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? 'computed import()'
            : 'computed require()',
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return { specifiers, unresolved }
}

const isDirectFunction = (
  ts: typeof TS,
  node: TS.Node | undefined,
): node is TS.FunctionLikeDeclaration =>
  Boolean(
    node &&
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)),
  )

const parameterCount = (
  ts: typeof TS,
  node: TS.Node | undefined,
): number | undefined =>
  isDirectFunction(ts, node) ? node.parameters.length : undefined

const list = (names: string[]) => [...new Set(names)].join(', ')

const SYNTAX_TITLE = 'src/main.mts parses as TypeScript without syntax errors'

/**
 * The 500-line rule, and whether the source may be parsed here. A file over
 * the limit already fails it and isn't parsed; one within it but larger than
 * MAX_PARSED_LENGTH (minified code, say) is reported as not analyzed.
 * `truncated`: only the first MAX_SOURCE_BYTES were downloaded.
 */
export const checkAtqSourceSize = (
  source: string,
  truncated = false,
): { results: CheckResult[]; parse: boolean } => {
  const lineCount = countSourceLines(source)
  const lines: CheckResult = {
    id: 'atq.source-lines',
    field: FIELD,
    title: `src/main.mts has at most ${MAX_LINES} lines`,
    severity: 'violation',
    outcome: 'pass',
  }
  if (lineCount > MAX_LINES) {
    return {
      parse: false,
      results: [
        {
          ...lines,
          outcome: 'fail',
          message: `src/main.mts has ${truncated ? `more than ${MAX_LINES}` : lineCount} lines; the policy allows at most ${MAX_LINES} (blank lines and comments count).`,
        },
      ],
    }
  }
  if (truncated) {
    return {
      parse: false,
      results: [
        {
          ...lines,
          outcome: 'inconclusive',
          message: `src/main.mts is larger than ${MAX_SOURCE_BYTES / 1024 / 1024} MB, too large to check here. A module within ${MAX_LINES} lines is far smaller; check that this is the right file.`,
        },
      ],
    }
  }
  if (source.length > MAX_PARSED_LENGTH) {
    return {
      parse: false,
      results: [
        lines,
        {
          id: 'atq.typescript-syntax',
          field: FIELD,
          title: SYNTAX_TITLE,
          severity: 'violation',
          outcome: 'inconclusive',
          message: `src/main.mts is ${Math.round(source.length / 1024)} KB, too large to analyze here, so its code was not checked.`,
        },
      ],
    }
  }
  return { parse: true, results: [lines] }
}

/** The rules that need the syntax tree; only for sources `checkAtqSourceSize` lets through. */
export const analyzeAtqSyntax = (
  ts: typeof TS,
  source: string,
): CheckResult[] => {
  const results: CheckResult[] = []
  const push = (result: Omit<CheckResult, 'field'>) =>
    results.push({ field: FIELD, ...result })

  const sourceFile = ts.createSourceFile(
    'main.mts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const parseDiagnostics: readonly TS.Diagnostic[] =
    (sourceFile as unknown as { parseDiagnostics?: TS.Diagnostic[] })
      .parseDiagnostics ?? []
  const firstError = parseDiagnostics[0]
  push({
    id: 'atq.typescript-syntax',
    title: SYNTAX_TITLE,
    severity: 'violation',
    outcome: firstError ? 'fail' : 'pass',
    message: firstError
      ? `${parseDiagnostics.length} syntax error${parseDiagnostics.length === 1 ? '' : 's'}; first at line ${
          sourceFile.getLineAndCharacterOfPosition(firstError.start ?? 0).line +
          1
        }: ${ts.flattenDiagnosticMessageText(firstError.messageText, ' ')}`
      : undefined,
  })

  let thisCount = 0
  let firstThisLine = 0
  const stringLiterals: string[] = []
  const visit = (node: TS.Node) => {
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      thisCount += 1
      if (!firstThisLine)
        firstThisLine =
          sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
            .line + 1
    }
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      stringLiterals.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  push({
    id: 'atq.no-this',
    title: 'src/main.mts does not use “this”',
    severity: 'violation',
    outcome: thisCount === 0 ? 'pass' : 'fail',
    message:
      thisCount === 0
        ? undefined
        : `“this” is used ${thisCount} time${thisCount === 1 ? '' : 's'} (first on line ${firstThisLine}); the policy forbids it.`,
  })

  const runtimeExports = exportedRuntimeDeclarations(ts, sourceFile)
  const returnTags = runtimeExports.filter(({ name }) => name === 'returnTags')
  const starReexport =
    returnTags.length === 0 &&
    runtimeExports.some(
      ({ name, node }) => name === '*' && ts.isExportDeclaration(node),
    )
  const returnTagsNode = returnTags[0]?.node
  const directlyProvable = isDirectFunction(ts, returnTagsNode)
  // The reference module's `export const returnTags = tagService.returnTags`
  // whose class isn't declared in this file: the accepted pattern, unverified.
  const memberOfInstance = isReturnTagsMemberAccess(ts, returnTagsNode)
  const exportTitle =
    'Exports exactly one async returnTags function with two parameters'
  if (starReexport) {
    push({
      id: 'atq.return-tags-export',
      title: exportTitle,
      severity: 'warning',
      outcome: 'fail',
      message:
        'returnTags may come from an “export *” re-export, which cannot be verified statically. Export it directly from src/main.mts.',
    })
  } else if (
    returnTags.length !== 1 ||
    (directlyProvable &&
      (!returnTags[0].async || parameterCount(ts, returnTagsNode) !== 2))
  ) {
    let message =
      'The module must export exactly one async function named returnTags taking exactly two arguments.'
    if (returnTags.length === 0) {
      message = runtimeExports.some(({ name }) => name === 'default')
        ? 'returnTags is not exported by name; “export default” does not count. Use “export async function returnTags(chainId, apiKey)”.'
        : 'No returnTags export was found.'
    } else if (returnTags.length > 1)
      message = 'returnTags is exported more than once.'
    else if (!returnTags[0].async)
      message = 'returnTags must be declared async.'
    else
      message = `returnTags takes ${parameterCount(ts, returnTagsNode)} parameters; it must take exactly two.`
    push({
      id: 'atq.return-tags-export',
      title: exportTitle,
      severity: 'violation',
      outcome: 'fail',
      message,
    })
  } else if (!directlyProvable && !memberOfInstance) {
    push({
      id: 'atq.return-tags-export',
      title: exportTitle,
      severity: 'warning',
      outcome: 'fail',
      message:
        'returnTags is exported indirectly (for example through a wrapper or alias), so its shape cannot be verified statically. Declare it directly as an async function, or as an instance method (export const returnTags = tagService.returnTags).',
    })
  } else {
    push({
      id: 'atq.return-tags-export',
      title: exportTitle,
      severity: 'violation',
      outcome: 'pass',
    })
  }

  const others = runtimeExports.filter(({ name }) => name !== 'returnTags')
  const otherFunctions = others.filter(({ node }) => isDirectFunction(ts, node))
  const otherValues = others.filter((entry) => !otherFunctions.includes(entry))
  // A warning, not a block: the policy says "exactly one and only one
  // function", but the registry has accepted modules that export helpers.
  push({
    id: 'atq.no-extra-functions',
    title: 'returnTags is the only exported function',
    severity: 'warning',
    outcome:
      otherFunctions.length > 0 || otherValues.length > 0 ? 'fail' : 'pass',
    message:
      otherFunctions.length > 0
        ? `Also exports: ${list(otherFunctions.map(({ name }) => name))}. The policy asks for returnTags to be the only exported function; keep the others private to avoid a challenge.`
        : otherValues.length > 0
          ? `Also exports non-function values (${list(otherValues.map(({ name }) => name))}). Reviewers may treat these as extra exports; keep them private.`
          : undefined,
  })

  const loads = loadedModuleSpecifiers(ts, sourceFile)
  const forbidden = loads.specifiers.filter(
    (specifier) => !isAllowedAtqSpecifier(specifier),
  )
  push({
    id: 'atq.dependencies',
    title: 'Only uses atq-types, axios, node-fetch and Node.js built-ins',
    severity: forbidden.length > 0 ? 'violation' : 'warning',
    outcome:
      forbidden.length > 0 || loads.unresolved.length > 0 ? 'fail' : 'pass',
    message:
      forbidden.length > 0
        ? `Loads packages the policy does not allow: ${list(forbidden)}.`
        : loads.unresolved.length > 0
          ? `Uses a computed module load (${list(loads.unresolved)}) that cannot be verified. Import modules with string literals.`
          : undefined,
  })

  const endpoints = stringLiterals.filter((literal) =>
    /goldsky\.com|api\.thegraph\.com\/subgraphs\/name|\/subgraphs\/id\//i.test(
      literal,
    ),
  )
  push({
    id: 'atq.subgraph-endpoints',
    title: 'No hosted-service or unstable subgraph endpoints',
    severity: 'warning',
    outcome: endpoints.length === 0 ? 'pass' : 'fail',
    message:
      endpoints.length === 0
        ? undefined
        : 'The code references a subgraph endpoint the policy does not accept (Goldsky, the retired hosted service, or /subgraphs/id/ URLs). The policy asks for Graph Network gateway deployment endpoints.',
  })

  return results
}

/** Every source rule: the size guard, then the code rules if the file may be parsed. */
export const analyzeAtqSource = (
  ts: typeof TS,
  source: string,
  truncated = false,
): CheckResult[] => {
  const size = checkAtqSourceSize(source, truncated)
  return size.parse
    ? [...size.results, ...analyzeAtqSyntax(ts, source)]
    : size.results
}
