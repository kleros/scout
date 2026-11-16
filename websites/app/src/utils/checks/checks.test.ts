import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crc32 } from 'node:zlib'
import * as ts from 'typescript-5'
import {
  analyzeAtqSource,
  countSourceLines,
  isAllowedAtqSpecifier,
} from './atqSource'
import { parseCaip10 } from './caip10'
import {
  isCommitHash,
  isKebabCase,
  lookupPinnedSource,
  parseGithubRepository,
  readTextUpTo,
} from './github'
import { withDeadline } from './deadline'
import { decodePng, logoFile } from './logoFixtures'
import { cdnDomainPatterns } from './duplicates'
import { readCodeSnapshot } from './evm'
import { inspectPng } from './png'
import { PUBLIC_RPC_URLS, readWithQuorum } from './rpc'
import {
  cdnDomainHasForbiddenPattern,
  checkAddressOnChain,
  checkAtqSource,
  checkTokenLogo,
  compareDecimals,
  readAddressOnChain,
  runLocalChecks,
  suggestCdnDomain,
} from './rules'
import { chains } from 'utils/chains'
import { lengthVerdict } from './text'
import { isBlocking, type CheckResult, type SubmissionDraft } from './types'

const TS = ts as unknown as typeof import('typescript')
const byId = (results: CheckResult[], id: string) =>
  results.find((r) => r.id === id)
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

describe('CAIP-10', () => {
  it('accepts canonical eip155 values regardless of checksum casing', () => {
    assert.ok(parseCaip10(`eip155:1:${USDC}`))
    assert.ok(parseCaip10(`eip155:1:${USDC.toLowerCase()}`))
    assert.ok(
      parseCaip10(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      ),
    )
  })
  it('rejects whitespace, leading zeros, uppercase namespaces and missing 0x', () => {
    for (const value of [
      `eip155:1:${USDC} `,
      `eip155:01:${USDC}`,
      `EIP155:1:${USDC}`,
      `eip155:1:${USDC.slice(2)}`,
      `eip155:1:${USDC}00`,
    ]) {
      assert.equal(parseCaip10(value), null, value)
    }
  })
})

describe('length limits', () => {
  it('only flags values over the limit in both code points and graphemes', () => {
    assert.equal(lengthVerdict('a'.repeat(50), 50), 'within')
    assert.equal(lengthVerdict('a'.repeat(51), 50), 'over')
    // 26 family emojis: 182 code points but 26 user-perceived characters.
    assert.equal(lengthVerdict('👨‍👩‍👧‍👦'.repeat(26), 50), 'ambiguous')
  })
})

describe('CDN domain pattern', () => {
  it('flags the global wildcard, schemes, paths, queries, fragments, ports and whitespace', () => {
    for (const domain of [
      '*',
      'https://app.uniswap.org',
      'mailto:a@b.c',
      'a.com/swap',
      'a.com?x',
      'a.com#f',
      ' a.com',
      'a.com ',
      'a.com ',
      'example.com:8080',
      'localhost:3000',
      // A port is not part of a domain, whatever the first character is.
      '1inch.io:443',
    ]) {
      assert.equal(cdnDomainHasForbiddenPattern(domain), true, domain)
    }
  })
  it('accepts subdomain wildcards and other plain hosts', () => {
    for (const domain of [
      '*.balancer.fi',
      '**',
      '*.*',
      'UPPER.COM',
      'münchen.de',
      'xn--mnchen-3ya.de',
      'example.com.',
    ]) {
      assert.equal(cdnDomainHasForbiddenPattern(domain), false, domain)
    }
  })
  it('suggests the bare host for pasted URLs', () => {
    assert.equal(
      suggestCdnDomain('https://app.uniswap.org/swap?chain=1'),
      'app.uniswap.org',
    )
    assert.equal(suggestCdnDomain('example.com:8080'), 'example.com')
    assert.equal(suggestCdnDomain('1inch.io:443'), '1inch.io')
    assert.equal(
      suggestCdnDomain('https://user@app.example.org/swap'),
      'app.example.org',
    )
    assert.equal(
      suggestCdnDomain('https://user:secret@app.example.org:8443/'),
      'app.example.org',
    )
    assert.equal(suggestCdnDomain('*'), undefined)
  })
  it('does not guess a domain for gateway links or non-web schemes', () => {
    for (const value of [
      'https://ipfs.io/ipns/app.uniswap.org/',
      'https://gateway.pinata.cloud/ipfs/QmX/',
      'ipfs.io/ipfs/QmX',
      'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      'ipns://app.uniswap.org',
      'ar://abc',
      'https://arweave.net/abc123',
      'ftp://files.example.org/app',
    ]) {
      assert.equal(suggestCdnDomain(value), undefined, value)
    }
  })
})

describe('ATQ repository and commit rules', () => {
  it('parses GitHub repository URLs', () => {
    for (const url of [
      'https://github.com/kleros/scout-snap.git',
      'https://github.com/kleros/scout-snap/',
      'https://GitHub.com/a/b?x#y',
      ' https://github.com/a/b ',
      'https://www.github.com/a/b',
    ]) {
      assert.ok(parseGithubRepository(url), url)
    }
    assert.deepEqual(
      parseGithubRepository('https://github.com/kleros/scout-snap.git'),
      {
        owner: 'kleros',
        repository: 'scout-snap',
      },
    )
    for (const url of [
      'http://github.com/a/b',
      'https://github.com/a/b/tree/main',
      'https://github.com/a',
      'git@github.com:a/b.git',
      'github.com/a/b',
      'https://gist.github.com/a/b',
    ]) {
      assert.equal(parseGithubRepository(url), null, url)
    }
  })
  it('accepts 1 to 40 hex characters as a commit hash', () => {
    assert.ok(isCommitHash('c8baafd'))
    assert.ok(isCommitHash('a'.repeat(40)))
    assert.ok(!isCommitHash('a'.repeat(41)))
    assert.ok(!isCommitHash(' c8baafd'))
    assert.ok(!isCommitHash('xyz'))
  })
  it('requires kebab-case repository names', () => {
    assert.ok(isKebabCase('scout-snap'))
    for (const name of ['Scout-Snap', 'a_b', 'a.b', 'a--b', '-a', 'a-'])
      assert.ok(!isKebabCase(name), name)
  })
})

describe('ATQ source analysis', () => {
  const GOOD = [
    'import { ContractTag, ITagService } from "atq-types";',
    'import fetch from "node-fetch";',
    'import { readFileSync } from "node:fs";',
    'export async function returnTags(chainId: string, apiKey: string): Promise<ContractTag[]> { return []; }',
  ].join('\n')
  const analyze = (source: string) => analyzeAtqSource(TS, source)
  const outcome = (source: string, id: string) => {
    const result = byId(analyze(source), id)
    return result ? `${result.outcome}:${result.severity}` : 'missing'
  }

  it('passes a compliant module', () => {
    const results = analyze(GOOD)
    assert.deepEqual(
      results.filter((r) => r.outcome !== 'pass'),
      [],
    )
  })
  it('accepts named, parenthesized and overloaded returnTags exports', () => {
    for (const source of [
      'async function returnTags(chainId: number, key: string) { return []; }\nexport { returnTags };\n',
      'export const returnTags = (async (chainId: number, key: string) => []);\n',
      'export function returnTags(chainId: number, key: string): Promise<unknown[]>;\nexport async function returnTags(chainId: number, key: string) { return []; }\n',
    ]) {
      assert.equal(
        outcome(source, 'atq.return-tags-export'),
        'pass:violation',
        source,
      )
      assert.equal(
        outcome(source, 'atq.no-extra-functions'),
        'pass:warning',
        source,
      )
    }
  })
  it('treats `export default` as a missing returnTags and an extra function', () => {
    const source =
      'export default async function returnTags(_a, _b) { return []; }\n'
    assert.equal(outcome(source, 'atq.return-tags-export'), 'fail:violation')
    assert.equal(outcome(source, 'atq.no-extra-functions'), 'fail:warning')
  })
  it("accepts the policy's reference pattern: an instance's returnTags exported by name", () => {
    const reference = [
      'import { ContractTag, ITagService } from "atq-types";',
      'class TagService implements ITagService {',
      '  returnTags = async (chainId: string, apiKey: string): Promise<ContractTag[]> => {',
      '    return [];',
      '  };',
      '}',
      'const tagService = new TagService();',
      'export const returnTags = tagService.returnTags;',
    ].join('\n')
    assert.deepEqual(
      analyze(reference).filter((r) => r.outcome !== 'pass'),
      [],
    )
    // An async method works the same way.
    assert.equal(
      outcome(
        'class S { async returnTags(chainId: string, apiKey: string) { return []; } }\nexport const returnTags = new S().returnTags;\n',
        'atq.return-tags-export',
      ),
      'pass:violation',
    )
    // The class lives elsewhere: the pattern is accepted, not flagged.
    assert.equal(
      outcome(
        'import { service } from "./service.mjs";\nexport const returnTags = service.returnTags;\n',
        'atq.return-tags-export',
      ),
      'pass:violation',
    )
    // A member of the wrong shape breaks the rule like a direct function.
    assert.equal(
      outcome(
        'class S { returnTags = (chainId: string) => []; }\nconst s = new S();\nexport const returnTags = s.returnTags;\n',
        'atq.return-tags-export',
      ),
      'fail:violation',
    )
  })
  it('sends star re-exports and indirect exports to review', () => {
    assert.equal(
      outcome(
        'export * from "./implementation.mjs";\n',
        'atq.return-tags-export',
      ),
      'fail:warning',
    )
    assert.equal(
      outcome(
        'const impl = async (a, b) => [];\nexport const returnTags = wrap(impl);\n',
        'atq.return-tags-export',
      ),
      'fail:warning',
    )
  })
  it('rejects non-async, wrong arity and duplicate returnTags', () => {
    assert.equal(
      outcome(
        'export function returnTags(a, b) { return []; }',
        'atq.return-tags-export',
      ),
      'fail:violation',
    )
    assert.equal(
      outcome(
        'export async function returnTags(a, b, c) { return []; }',
        'atq.return-tags-export',
      ),
      'fail:violation',
    )
    assert.equal(
      outcome(
        'export async function returnTags(_a, _b) { return []; }\nexport async function returnTags(_a, _b) { return []; }',
        'atq.return-tags-export',
      ),
      'fail:violation',
    )
  })
  it('warns about extra exported functions and values (registered modules have them)', () => {
    assert.equal(
      outcome(`${GOOD}\nexport function helper() {}`, 'atq.no-extra-functions'),
      'fail:warning',
    )
    assert.equal(
      outcome(`${GOOD}\nexport const LIMIT = 5;`, 'atq.no-extra-functions'),
      'fail:warning',
    )
  })
  it('enforces the dependency allowlist on every module-load form', () => {
    const loads = [
      'import axios from "axios";',
      'export { value } from "forbidden-reexport";',
      'const dynamic = import("forbidden-dynamic");',
      'import legacy = require("forbidden-import-equals");',
      'const common = require("forbidden-require");',
    ].join('\n')
    const result = byId(analyze(`${loads}\n${GOOD}`), 'atq.dependencies')
    assert.equal(result?.outcome, 'fail')
    assert.equal(result?.severity, 'violation')
    for (const name of [
      'forbidden-reexport',
      'forbidden-dynamic',
      'forbidden-import-equals',
      'forbidden-require',
    ]) {
      assert.match(result?.message ?? '', new RegExp(name))
    }
    assert.equal(
      outcome(
        `const computed = import(packageName);\n${GOOD}`,
        'atq.dependencies',
      ),
      'fail:warning',
    )
  })
  it('matches the builtin allowlist exactly', () => {
    for (const ok of [
      'node:fs',
      'fs',
      'node:test',
      'node:test/reporters',
      'axios',
      'node-fetch/lib',
      'atq-types',
      './local.mjs',
    ]) {
      assert.ok(isAllowedAtqSpecifier(ok), ok)
    }
    for (const bad of [
      'test',
      'test/reporters',
      'node:not-a-real-builtin',
      'left-pad',
      'ethers',
    ]) {
      assert.ok(!isAllowedAtqSpecifier(bad), bad)
    }
  })
  it('counts `this` expressions only', () => {
    assert.equal(
      outcome(
        `${GOOD}\nfunction f(this: Window) { return globalThis; }`,
        'atq.no-this',
      ),
      'pass:violation',
    )
    assert.equal(
      outcome(`${GOOD}\nconst o = { f() { return this; } };`, 'atq.no-this'),
      'fail:violation',
    )
  })
  it('reports syntax errors, long files and subgraph endpoint literals', () => {
    assert.equal(
      outcome(`${GOOD}\nconst broken = ;`, 'atq.typescript-syntax'),
      'fail:violation',
    )
    assert.equal(
      outcome(`${GOOD}\n${'// line\n'.repeat(497)}`, 'atq.source-lines'),
      'fail:violation',
    )
    assert.equal(
      outcome(`${GOOD}\n${'// line\n'.repeat(496)}`, 'atq.source-lines'),
      'pass:violation',
    )
    assert.equal(
      outcome(
        `${GOOD}\nconst u = "https://api.goldsky.com/api/public/x";`,
        'atq.subgraph-endpoints',
      ),
      'fail:warning',
    )
  })
  it("doesn't parse a source over the line limit or too large to analyze", () => {
    const long = analyze(`${GOOD}\n${'// line\n'.repeat(600)}`)
    assert.equal(byId(long, 'atq.source-lines')?.outcome, 'fail')
    assert.equal(byId(long, 'atq.typescript-syntax'), undefined)
    // Within 500 lines but over 256 KB (e.g. minified): not analyzed, not blocking.
    const wide = analyze(`${GOOD}\nconst data = "${'x'.repeat(300 * 1024)}";\n`)
    assert.equal(byId(wide, 'atq.source-lines')?.outcome, 'pass')
    assert.equal(byId(wide, 'atq.typescript-syntax')?.outcome, 'inconclusive')
    assert.equal(wide.some(isBlocking), false)
    // Only the first MB was downloaded: over 500 lines in it is still a fail.
    const cut = (source: string) =>
      byId(analyzeAtqSource(TS, source, true), 'atq.source-lines')
    assert.equal(cut('// x\n'.repeat(600))?.outcome, 'fail')
    assert.match(cut('// x\n'.repeat(600))?.message ?? '', /more than 500/)
    assert.equal(cut(GOOD)?.outcome, 'inconclusive')
  })
  it('counts lines, ignoring a final newline', () => {
    assert.equal(countSourceLines(''), 0)
    assert.equal(countSourceLines('a'), 1)
    assert.equal(countSourceLines('a\n'), 1)
    assert.equal(countSourceLines('a\r\nb\r\n'), 2)
    assert.equal(countSourceLines('a\rb'), 2)
    assert.equal(countSourceLines('a\u2028b'), 1)
  })
})

const chunk = (type: string, data: Uint8Array) => {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}
const png = (width: number, height: number, extra: Uint8Array[] = []) => {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([8, 6, 0, 0, 0], 8)
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array([1, 2, 3])),
    chunk('IEND', new Uint8Array()),
    ...extra,
  ]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

describe('PNG structure', () => {
  it('reads dimensions from a well-formed PNG', () => {
    const { structure, integrityWarnings } = inspectPng(png(256, 128))
    assert.deepEqual(
      structure.valid && [structure.width, structure.height],
      [256, 128],
    )
    assert.deepEqual(integrityWarnings, [])
  })
  it('accepts bytes after IEND with a warning, as decoders ignore them', () => {
    for (const extra of [1, 16]) {
      const { structure, integrityWarnings } = inspectPng(
        png(128, 128, [new Uint8Array(extra)]),
      )
      assert.equal(structure.valid, true)
      assert.equal(integrityWarnings.length, 1)
      assert.match(integrityWarnings[0], new RegExp(`^${extra} extra byte`))
    }
  })
  it('rejects truncation, a missing IEND, non-PNG files and a non-IHDR first chunk', () => {
    const full = png(128, 128)
    assert.equal(
      inspectPng(full.subarray(0, full.length - 4)).structure.valid,
      false,
    )
    // Cut right before IEND: every chunk is whole, but the end marker is gone.
    const noEnd = inspectPng(full.subarray(0, full.length - 12)).structure
    assert.equal(noEnd.valid, false)
    assert.match(noEnd.valid ? '' : noEnd.reason, /IEND\) is missing/)
    assert.equal(
      inspectPng(new Uint8Array([0xff, 0xd8, 0xff, ...new Array(40).fill(0)]))
        .structure.valid,
      false,
    )
    const swapped = png(128, 128)
    swapped.set(new TextEncoder().encode('IDAT'), 12)
    assert.equal(inspectPng(swapped).structure.valid, false)
  })
  it('keeps structurally valid files with bad CRCs, but warns', () => {
    const bytes = png(128, 128)
    bytes[bytes.length - 16] ^= 0xff // first byte of the IDAT CRC (IEND is the last 12 bytes)
    const { structure, integrityWarnings } = inspectPng(bytes)
    assert.equal(structure.valid, true)
    assert.equal(integrityWarnings.length, 1)
  })
})

describe('token logo', () => {
  const withDecoder = (decode: typeof decodePng | undefined) => {
    Object.assign(globalThis, { createImageBitmap: decode })
  }
  afterEach(() => withDecoder(undefined))
  const outcomes = (results: CheckResult[]) =>
    Object.fromEntries(results.map((r) => [r.id, `${r.severity}:${r.outcome}`]))

  it('passes a decodable 128×128 PNG', async () => {
    withDecoder(decodePng)
    const results = await checkTokenLogo(logoFile(128, 128))
    assert.equal(results.some(isBlocking), false)
    assert.equal(outcomes(results)['tokens.logo-decode'], 'violation:pass')
  })

  it('only warns about data after the end of the PNG', async () => {
    withDecoder(decodePng)
    const padded = new File(
      [await logoFile(128, 128).arrayBuffer(), new Uint8Array(16)],
      'logo.png',
      { type: 'image/png' },
    )
    const results = await checkTokenLogo(padded)
    assert.equal(results.some(isBlocking), false)
    assert.equal(outcomes(results)['tokens.logo-png'], 'violation:pass')
    assert.equal(outcomes(results)['tokens.logo-integrity'], 'warning:fail')
  })

  it('blocks a PNG without pixel data, even where nothing can decode it', async () => {
    const empty = logoFile(128, 128, { idat: null })
    assert.equal(empty.size, 45)
    for (const decoder of [decodePng, undefined]) {
      withDecoder(decoder)
      const results = await checkTokenLogo(empty)
      assert.equal(outcomes(results)['tokens.logo-decode'], 'violation:fail')
      assert.ok(results.some(isBlocking))
    }
  })

  it('blocks a PNG whose pixel data is corrupt', async () => {
    withDecoder(decodePng)
    const corrupt = logoFile(128, 128, { idat: new Uint8Array([1, 2, 3, 4]) })
    const results = await checkTokenLogo(corrupt)
    // The structure is fine; only decoding shows the damage.
    assert.equal(outcomes(results)['tokens.logo-png'], 'violation:pass')
    assert.equal(outcomes(results)['tokens.logo-decode'], 'violation:fail')
    assert.ok(results.some(isBlocking))
  })

  it('reports a browser without a decoder as unchecked, not as a broken file', async () => {
    withDecoder(undefined)
    const results = await checkTokenLogo(logoFile(128, 128))
    assert.equal(
      outcomes(results)['tokens.logo-decode'],
      'violation:inconclusive',
    )
    assert.equal(results.some(isBlocking), false)
  })

  it('warns when the decoded size differs from the header', async () => {
    withDecoder(async () => ({ width: 64, height: 64, close: () => undefined }))
    const results = await checkTokenLogo(logoFile(128, 128))
    assert.equal(outcomes(results)['tokens.logo-decode'], 'warning:fail')
    assert.equal(results.some(isBlocking), false)
  })

  it('applies the dimension and size limits at their boundaries', async () => {
    withDecoder(decodePng)
    const blocked = async (file: File) =>
      (await checkTokenLogo(file)).some(isBlocking)
    assert.equal(await blocked(logoFile(128, 128)), false)
    assert.equal(await blocked(logoFile(127, 128)), true)
    assert.equal(await blocked(logoFile(128, 127)), true)
    const size = async (bytes: number) => {
      const file = logoFile(128, 128, { size: bytes })
      assert.equal(file.size, bytes)
      return outcomes(await checkTokenLogo(file))['tokens.logo-size']
    }
    assert.equal(await size(1_000_000), 'violation:pass')
    assert.equal(await size(1_000_001), 'warning:fail')
    assert.equal(await size(1_048_576), 'warning:fail')
    assert.equal(await size(1_048_577), 'violation:fail')
    // The exact size, not a rounded "1024 KB" that reads as within 1 MB.
    const over = (
      await checkTokenLogo(logoFile(128, 128, { size: 1_048_577 }))
    ).find((r) => r.id === 'tokens.logo-size')
    assert.ok(
      over?.message?.startsWith(
        `The logo is ${(1_048_577).toLocaleString()} bytes.`,
      ),
      over?.message,
    )
  })
})

const tokensDraft = (
  values: Partial<Record<string, string>>,
): SubmissionDraft => ({
  registry: 'tokens',
  values: {
    Address: `eip155:1:${USDC}`,
    Name: 'USD Coin',
    Symbol: 'USDC',
    Decimals: '6',
    Logo: '',
    Website: 'https://www.circle.com',
    ...values,
  } as Record<string, string>,
  files: {},
})

describe('local rules', () => {
  it('lists missing required fields as pending, not failing', () => {
    const results = runLocalChecks({ registry: 'single-tags', values: {} })
    assert.equal(byId(results, 'mandatory-fields')?.outcome, 'pending')
    assert.ok(!results.some((r) => r.outcome === 'fail'))
  })
  it('flags malformed decimals and chain IDs with a fix', () => {
    const decimals = byId(
      runLocalChecks(tokensDraft({ Decimals: '018' })),
      'mandatory.decimals',
    )
    assert.deepEqual([decimals?.outcome, decimals?.fix], ['fail', '18'])
    const chain = byId(
      runLocalChecks({
        registry: 'tags-queries',
        values: {
          'Github Repository URL': 'https://github.com/a/b',
          'Commit hash': 'abc',
          'EVM Chain ID': '01',
          Description: 'x',
        },
      }),
      'mandatory.chain-id',
    )
    assert.deepEqual([chain?.outcome, chain?.fix], ['fail', '1'])
  })
  it('applies token name/symbol limits and formatting guardrails', () => {
    const results = runLocalChecks(
      tokensDraft({
        Name: 'N'.repeat(41),
        Symbol: 'AB C',
        Website: 'kleros.io',
      }),
    )
    assert.equal(byId(results, 'tokens.name-length')?.outcome, 'fail')
    assert.equal(byId(results, 'tokens.symbol-spaces')?.outcome, 'fail')
    assert.equal(byId(results, 'tokens.website')?.fix, 'https://kleros.io')
  })
  it('checks addresses: CAIP-10, checksum and precompiles', () => {
    const tag = (address: string) =>
      runLocalChecks({
        registry: 'single-tags',
        values: { 'Contract Address': `eip155:1:${address}` },
      })
    const spaced = byId(tag(`${USDC} `), 'address.caip10')
    assert.deepEqual(
      [spaced?.outcome, spaced?.fix],
      ['fail', `eip155:1:${USDC}`],
    )
    const badChecksum = USDC.replace('A0b8', 'a0B8')
    assert.equal(byId(tag(badChecksum), 'address.format')?.outcome, 'fail')
    assert.equal(
      byId(
        tag('0x0000000000000000000000000000000000000001'),
        'address.precompile',
      )?.severity,
      'warning',
    )
  })
  it('checks CDN domains and suggests fixes', () => {
    const cdn = (domain: string) =>
      runLocalChecks({
        registry: 'cdn',
        values: {
          'Contract address': `eip155:1:${USDC}`,
          'Domain name': domain,
        },
      })
    assert.equal(
      byId(cdn('https://app.uniswap.org/swap'), 'cdn.domain-pattern')?.fix,
      'app.uniswap.org',
    )
    assert.equal(
      byId(cdn('*.balancer.fi'), 'cdn.domain-pattern')?.outcome,
      'pass',
    )
    assert.equal(
      byId(cdn('App.Uniswap.org'), 'cdn.domain-lowercase')?.fix,
      'app.uniswap.org',
    )
    assert.equal(
      byId(cdn('localhost'), 'cdn.domain-hostname')?.severity,
      'warning',
    )
    const gateway = byId(
      cdn('https://ipfs.io/ipns/app.uniswap.org/'),
      'cdn.domain-pattern',
    )
    assert.deepEqual([gateway?.outcome, gateway?.fix], ['fail', undefined])
    assert.match(gateway?.message ?? '', /gateway/)
  })
  it('suggests the canonical GitHub URL', () => {
    const results = runLocalChecks({
      registry: 'tags-queries',
      values: {
        'Github Repository URL': 'https://github.com/a/b/tree/main',
        'Commit hash': 'xyz',
      },
    })
    assert.equal(
      byId(results, 'atq.repository-url')?.fix,
      'https://github.com/a/b',
    )
    assert.equal(byId(results, 'atq.commit-hash')?.outcome, 'fail')
    // An organization page is not a repository.
    const org = runLocalChecks({
      registry: 'tags-queries',
      values: {
        'Github Repository URL': 'https://github.com/orgs/foo/repositories',
      },
    })
    assert.equal(byId(org, 'atq.repository-url')?.fix, undefined)
  })
  it('warns that commit hashes under 7 characters are not looked up', () => {
    const commit = (hash: string) =>
      byId(
        runLocalChecks({
          registry: 'tags-queries',
          values: { 'Commit hash': hash },
        }),
        'atq.commit-length',
      )
    assert.deepEqual(
      [commit('abc12')?.outcome, commit('abc12')?.severity],
      ['fail', 'warning'],
    )
    assert.equal(commit('abc1234'), undefined)
    assert.equal(commit('a'.repeat(40)), undefined)
  })
})

describe('CDN duplicate lookup', () => {
  // Postgres ILIKE, as the indexer applies `_ilike`.
  const ilike = (value: string, pattern: string) =>
    new RegExp(
      `^${pattern.replace(
        /\\(.)|([%_])|([^\\%_]+)/g,
        (_, escaped, wildcard, text) =>
          escaped !== undefined
            ? escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            : wildcard === '%'
              ? '.*'
              : wildcard === '_'
                ? '.'
                : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      )}$`,
      'is',
    ).test(value)
  const matches = (stored: string, domain: string) => {
    const { domain: exact, domainPath } = cdnDomainPatterns(domain)
    return ilike(stored, exact) || ilike(stored, domainPath)
  }

  it('matches the same domain or a stored path under it, not a longer domain', () => {
    assert.ok(matches('sushi.com', 'sushi.com'))
    assert.ok(matches('SUSHI.com', 'sushi.com'))
    assert.ok(matches('sushi.com/swap', 'sushi.com'))
    assert.ok(!matches('sushi.com.au', 'sushi.com'))
    assert.ok(!matches('sushi.community', 'sushi.com'))
    assert.ok(matches('*.balancer.fi', '*.balancer.fi'))
  })
  it('treats LIKE wildcards in the domain literally', () => {
    assert.deepEqual(cdnDomainPatterns('my_app.com'), {
      domain: 'my\\_app.com',
      domainPath: 'my\\_app.com/%',
    })
    assert.ok(!matches('myxapp.com', 'my_app.com'))
    assert.ok(matches('my_app.com', 'my_app.com'))
    assert.ok(!matches('anything.com', '%'))
  })
})

// ---------------------------------------------------------------------------
// Network checks with a mocked fetch
// ---------------------------------------------------------------------------

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

type RpcHandler = (method: string, params: unknown[], host: string) => unknown
// A request that never answers; only its signal ends it, as with fetch.
const hang = (init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    const signal = init?.signal
    if (signal?.aborted) reject(signal.reason)
    signal?.addEventListener('abort', () => reject(signal.reason))
  })
const mockRpc = (
  handler: RpcHandler,
  {
    hangs,
    gate,
  }: {
    hangs?: (host: string) => boolean
    /** Answers wait for this, unless their request is cancelled first. */
    gate?: Promise<void>
  } = {},
) => {
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const host = new URL(String(input)).hostname
    if (hangs?.(host)) return hang(init)
    if (gate) await Promise.race([gate, hang(init)])
    const body = JSON.parse(String(init?.body))
    const answer = (call: {
      id: number
      method: string
      params: unknown[]
    }) => {
      const result = handler(call.method, call.params, host)
      return result instanceof Error
        ? {
            jsonrpc: '2.0',
            id: call.id,
            error: { code: 3, message: result.message },
          }
        : { jsonrpc: '2.0', id: call.id, result }
    }
    return new Response(
      JSON.stringify(Array.isArray(body) ? body.map(answer) : answer(body)),
      { status: 200 },
    )
  }) as typeof fetch
}
const uint = (n: number) => `0x${n.toString(16).padStart(64, '0')}`

describe('request deadlines', () => {
  const never = (signal: AbortSignal) => hang({ signal })

  it('times out even when the caller can cancel', async () => {
    const caller = new AbortController()
    await assert.rejects(withDeadline(caller.signal, 20, never), {
      name: 'TimeoutError',
    })
  })

  it('still cancels as soon as the caller does', async () => {
    const caller = new AbortController()
    // A leftover 60 s timer would also keep this test file from exiting.
    const pending = withDeadline(caller.signal, 60_000, never)
    caller.abort(new DOMException('Input changed', 'AbortError'))
    await assert.rejects(pending, { name: 'AbortError' })
    await assert.rejects(
      withDeadline(caller.signal, 60_000, never),
      { name: 'AbortError' },
      'already cancelled',
    )
  })

  const flush = () => new Promise((resolve) => setImmediate(resolve))

  it('moves on from a provider that never answers', async (t) => {
    let first: string | undefined
    mockRpc(() => '0x6080', {
      hangs: (host) => (first ??= host) === host,
    })
    t.mock.timers.enable({ apis: ['setTimeout'] })
    // Base has three providers, so two can still agree.
    const read = readCodeSnapshot(
      8453,
      `0x${'e5'.repeat(20)}`,
      new AbortController().signal,
    )
    await flush()
    t.mock.timers.tick(8_000)
    const snapshot = await read
    assert.equal(snapshot.status, 'agreed')
    assert.ok(
      snapshot.status === 'agreed' && !snapshot.providers.includes(first!),
    )
  })

  it('ends the contract check as inconclusive when no provider answers', async (t) => {
    mockRpc(() => '0x6080', { hangs: () => true })
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let settled = false
    const pending = checkAddressOnChain(
      tokensDraft({ Address: `eip155:8453:0x${'f6'.repeat(20)}` }),
      new AbortController().signal,
    ).finally(() => {
      settled = true
    })
    for (let i = 0; i < 30 && !settled; i++) {
      await flush()
      t.mock.timers.tick(8_000)
    }
    const results = await pending
    assert.equal(byId(results, 'address.deployed')?.outcome, 'inconclusive')
  })
})

describe('cancellation', () => {
  it('rejects a cancelled read instead of reporting the providers as unavailable', async () => {
    mockRpc(() => '0x6080', { hangs: () => true })
    const caller = new AbortController()
    const pending = readCodeSnapshot(1, `0x${'a7'.repeat(20)}`, caller.signal)
    caller.abort()
    await assert.rejects(pending, { name: 'AbortError' })
    await assert.rejects(
      readWithQuorum(1, async () => 'same', { signal: caller.signal }),
      { name: 'AbortError' },
      'already cancelled',
    )
  })

  it("never hands one caller's cancelled read to another", async () => {
    let open!: () => void
    mockRpc(() => '0x6080', {
      gate: new Promise((resolve) => (open = resolve)),
    })
    const address = `0x${'b8'.repeat(20)}`
    // Two readers of the same address (a remount, or a query whose key moved
    // on); the first is cancelled while both are waiting for the providers.
    const first = new AbortController()
    const cancelled = readCodeSnapshot(1, address, first.signal)
    const second = readCodeSnapshot(1, address, new AbortController().signal)
    first.abort()
    await assert.rejects(cancelled, { name: 'AbortError' })
    open()
    assert.equal((await second).status, 'agreed')
    assert.equal((await readCodeSnapshot(1, address)).status, 'agreed')
  })
})

describe('public RPC list', () => {
  it('only lists https endpoints, for chains the registries support', () => {
    for (const [chainId, urls] of Object.entries(PUBLIC_RPC_URLS)) {
      assert.ok(
        chains.some((c) => c.namespace === 'eip155' && c.id === chainId),
        chainId,
      )
      assert.ok(urls.length > 0, chainId)
      for (const url of urls) assert.equal(new URL(url).protocol, 'https:')
    }
  })
  it('reports chains without a working public RPC as unchecked, not as failing', async () => {
    // Blast: none of its public endpoints served eth_getCode when last probed.
    const results = await checkAddressOnChain({
      registry: 'single-tags',
      values: { 'Contract Address': `eip155:81457:${USDC}` },
    })
    assert.equal(byId(results, 'address.deployed')?.outcome, 'inconclusive')
    assert.equal(byId(results, 'address.deployed')?.final, true)
    assert.equal(results.some(isBlocking), false)
  })
})

describe('on-chain checks', () => {
  it('requires independent providers to agree', async () => {
    let call = 0
    const read = await readWithQuorum(1, async () => ++call)
    assert.equal(read.status, 'disagreed')
    const agreed = await readWithQuorum(1, async () => 'same')
    assert.equal(agreed.status, 'agreed')
  })

  it('only blocks when two independent providers agree', async () => {
    // Moonbeam has a single working public RPC operator.
    mockRpc((method) => (method === 'eth_getCode' ? '0x' : uint(18)))
    const single = byId(
      await checkAddressOnChain({
        registry: 'single-tags',
        values: { 'Contract Address': `eip155:1284:${USDC}` },
      }),
      'address.deployed',
    )
    assert.deepEqual([single?.outcome, single?.severity], ['fail', 'warning'])
    assert.match(single?.message ?? '', /only 1 provider/)
    const two = byId(
      await checkAddressOnChain({
        registry: 'single-tags',
        values: { 'Contract Address': `eip155:1:${USDC}` },
      }),
      'address.deployed',
    )
    assert.deepEqual([two?.outcome, two?.severity], ['fail', 'violation'])
    assert.match(two?.message ?? '', /2 independent providers agree/)

    mockRpc((method) => (method === 'eth_getCode' ? '0x6080' : uint(18)))
    const decimals = byId(
      await checkAddressOnChain(
        tokensDraft({ Address: `eip155:1284:${USDC}`, Decimals: '6' }),
      ),
      'tokens.decimals-onchain',
    )
    assert.deepEqual(
      [decimals?.outcome, decimals?.severity, decimals?.fix],
      ['fail', 'warning', '18'],
    )
  })

  it('reads the chain once per address and compares Decimals separately', async () => {
    let calls = 0
    mockRpc((method) => {
      calls++
      return method === 'eth_getCode' ? '0x6080' : uint(6)
    })
    const read = await readAddressOnChain(
      tokensDraft({ Address: `eip155:10:${USDC}`, Decimals: '' }),
    )
    const asked = calls
    assert.deepEqual(read.decimals, {
      value: 6,
      source: 'contract',
      providers: 2,
    })
    const compare = (entered: string) => {
      const [result] = compareDecimals(read.decimals, entered)
      return [result.outcome, result.severity, result.fix]
    }
    assert.deepEqual(compare(''), ['pending', 'violation', '6'])
    assert.deepEqual(compare('7'), ['fail', 'violation', '6'])
    assert.deepEqual(compare('6'), ['pass', 'violation', undefined])
    assert.equal(calls, asked, 'comparing reads nothing')
  })

  it('passes a deployed token whose decimals match, and suggests the right decimals otherwise', async () => {
    mockRpc((method) => (method === 'eth_getCode' ? '0x6080' : uint(6)))
    const ok = await checkAddressOnChain(
      tokensDraft({ Address: `eip155:8453:${USDC}` }),
    )
    assert.equal(byId(ok, 'address.deployed')?.outcome, 'pass')
    assert.equal(byId(ok, 'tokens.decimals-onchain')?.outcome, 'pass')
    const wrong = await checkAddressOnChain(
      tokensDraft({ Address: `eip155:10:${USDC}`, Decimals: '18' }),
    )
    assert.deepEqual(
      [
        byId(wrong, 'tokens.decimals-onchain')?.outcome,
        byId(wrong, 'tokens.decimals-onchain')?.fix,
      ],
      ['fail', '6'],
    )
  })

  it('blocks addresses without bytecode and warns while a deployment is not final', async () => {
    mockRpc(() => '0x')
    const eoa = await checkAddressOnChain({
      registry: 'single-tags',
      values: { 'Contract Address': `eip155:42161:${USDC}` },
    })
    assert.deepEqual(
      [
        byId(eoa, 'address.deployed')?.outcome,
        byId(eoa, 'address.deployed')?.severity,
      ],
      ['fail', 'violation'],
    )

    mockRpc((_, params) =>
      (params as string[])[1] === 'latest' ? '0x6080' : '0x',
    )
    const fresh = await checkAddressOnChain({
      registry: 'single-tags',
      values: { 'Contract Address': `eip155:137:${USDC}` },
    })
    assert.deepEqual(
      [
        byId(fresh, 'address.deployed')?.outcome,
        byId(fresh, 'address.deployed')?.severity,
      ],
      ['fail', 'warning'],
    )
  })

  it('warns about EIP-7702 delegated wallets', async () => {
    mockRpc(() => `0xef0100${'5a'.repeat(20)}`)
    const results = await checkAddressOnChain({
      registry: 'cdn',
      values: {
        'Contract address': `eip155:59144:${USDC}`,
        'Domain name': 'a.com',
      },
    })
    assert.deepEqual(
      [
        byId(results, 'address.deployed')?.outcome,
        byId(results, 'address.deployed')?.severity,
      ],
      ['fail', 'warning'],
    )
  })

  it('reports a decimals() revert as a warning, not a violation', async () => {
    mockRpc((method) =>
      method === 'eth_getCode' ? '0x6080' : new Error('execution reverted'),
    )
    const results = await checkAddressOnChain(
      tokensDraft({ Address: `eip155:43114:${USDC}` }),
    )
    assert.deepEqual(
      [
        byId(results, 'tokens.decimals-onchain')?.outcome,
        byId(results, 'tokens.decimals-onchain')?.severity,
      ],
      ['fail', 'warning'],
    )
  })
})

describe('ATQ GitHub checks', () => {
  const draft: SubmissionDraft = {
    registry: 'tags-queries',
    values: {
      'Github Repository URL': 'https://github.com/owner/My_Repo',
      'Commit hash': 'abc1234',
      'EVM Chain ID': '1',
      Description: 'x',
    },
  }
  const loadTs = async () => TS
  const mockGithub = (responses: {
    repo: number
    commit: number
    source: number
    name?: string
    rateLimited?: boolean
  }) => {
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input)
      if (responses.rateLimited) {
        return new Response('{}', {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '2000000000',
          },
        })
      }
      if (url.startsWith('https://raw.githubusercontent.com/')) {
        return new Response(
          'export async function returnTags(a: string, b: string) { return []; }\n',
          { status: responses.source },
        )
      }
      if (url.includes('/commits/'))
        return new Response(
          JSON.stringify({ sha: 'abc1234'.padEnd(40, '0') }),
          { status: responses.commit },
        )
      return new Response(
        JSON.stringify({ name: responses.name ?? 'my-repo' }),
        { status: responses.repo },
      )
    }) as typeof fetch
  }

  it('treats a repository that cannot be found at all as a violation', async () => {
    mockGithub({ repo: 404, commit: 404, source: 404 })
    const results = await checkAtqSource(
      { ...draft, values: { ...draft.values, 'Commit hash': 'dead1' } },
      loadTs,
    )
    assert.deepEqual([byId(results, 'atq.source-resolves')?.outcome], ['fail'])
  })
  it('gives up on GitHub after the deadline, even when the caller can cancel', async (t) => {
    globalThis.fetch = (async (_: string | URL, init?: RequestInit) =>
      hang(init)) as typeof fetch
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const pending = checkAtqSource(
      { ...draft, values: { ...draft.values, 'Commit hash': 'dead3' } },
      loadTs,
      new AbortController().signal,
    )
    await new Promise((resolve) => setImmediate(resolve))
    t.mock.timers.tick(20_000)
    const results = await pending
    assert.equal(byId(results, 'atq.source-resolves')?.outcome, 'inconclusive')
  })
  it('reports rate limiting as inconclusive', async () => {
    mockGithub({ repo: 200, commit: 200, source: 200, rateLimited: true })
    const results = await checkAtqSource(
      { ...draft, values: { ...draft.values, 'Commit hash': 'dead2' } },
      loadTs,
    )
    assert.equal(byId(results, 'atq.source-resolves')?.outcome, 'inconclusive')
  })
  it('checks the canonical repository name and analyzes the module', async () => {
    mockGithub({ repo: 200, commit: 200, source: 200, name: 'My_Repo' })
    const results = await checkAtqSource(
      { ...draft, values: { ...draft.values, 'Commit hash': 'dead3' } },
      loadTs,
    )
    assert.equal(byId(results, 'atq.repository-name')?.outcome, 'fail')
    assert.equal(byId(results, 'atq.return-tags-export')?.outcome, 'pass')
  })
  it('asks GitHub about a repository once, and for a commit only its hash', async () => {
    const requests: { url: string; accept: string }[] = []
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      requests.push({
        url,
        accept: new Headers(init?.headers).get('accept') ?? '',
      })
      if (url.startsWith('https://raw.githubusercontent.com/'))
        return new Response('export async function returnTags(a, b) {}\n')
      if (url.includes('/commits/')) return new Response('f'.repeat(40))
      return new Response(JSON.stringify({ name: 'cached-repo' }))
    }) as typeof fetch
    const ref = { owner: 'owner', repository: 'cached-repo' }
    const first = await lookupPinnedSource(ref, 'aaaaaaa')
    const second = await lookupPinnedSource(ref, 'bbbbbbb')
    assert.equal(first.canonicalName, 'cached-repo')
    assert.equal(second.canonicalName, 'cached-repo')
    assert.equal(second.resolvedCommit, 'f'.repeat(40))
    const api = requests.filter((r) =>
      r.url.startsWith('https://api.github.com/'),
    )
    assert.deepEqual(
      api.map((r) =>
        r.url.replace('https://api.github.com/repos/owner/cached-repo', ''),
      ),
      ['', '/commits/aaaaaaa', '/commits/bbbbbbb'],
    )
    for (const r of api.filter((r) => r.url.includes('/commits/')))
      assert.equal(r.accept, 'application/vnd.github.sha')
  })
  it("doesn't download or parse a source far over the line limit", async () => {
    const huge = '// line\n'.repeat(200_000) // 1.6 MB
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input)
      if (url.startsWith('https://raw.githubusercontent.com/'))
        return new Response(huge)
      if (url.includes('/commits/')) return new Response('e'.repeat(40))
      return new Response(JSON.stringify({ name: 'huge-module' }))
    }) as typeof fetch
    let loaded = false
    const results = await checkAtqSource(
      {
        ...draft,
        values: {
          ...draft.values,
          'Github Repository URL': 'https://github.com/owner/huge-module',
          'Commit hash': 'eeeeeee',
        },
      },
      async () => {
        loaded = true
        return TS
      },
    )
    assert.equal(byId(results, 'atq.source-lines')?.outcome, 'fail')
    assert.equal(loaded, false, 'the parser is not even loaded')
  })
})

describe('source download cap', () => {
  it('reads at most the limit, from a stream or a declared length', async () => {
    assert.deepEqual(await readTextUpTo(new Response('a'.repeat(100)), 1000), {
      text: 'a'.repeat(100),
      truncated: false,
    })
    const big = await readTextUpTo(new Response('a'.repeat(5000)), 1000)
    assert.deepEqual([big.text.length, big.truncated], [1000, true])
    // A body that never ends is not read to its end.
    let pulled = 0
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++
        controller.enqueue(new Uint8Array(512).fill(0x61))
      },
    })
    const capped = await readTextUpTo(new Response(endless), 2048)
    assert.deepEqual([capped.text.length, capped.truncated], [2048, true])
    assert.ok(pulled < 10, `pulled ${pulled} chunks`)
    const declared = await readTextUpTo(
      new Response('abc', { headers: { 'content-length': '5000000' } }),
      1000,
    )
    assert.equal(declared.truncated, true)
  })
})
