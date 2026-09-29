/**
 * Character counting for the policy length limits.
 *
 * Automated challenges only target a value that is over the limit
 * both in Unicode code points and in user-perceived characters (grapheme
 * clusters), so emoji and combining marks never make a compliant value look
 * too long. It does not trim or normalize: spaces count.
 */

interface GraphemeSegmenter {
  segment(input: string): Iterable<unknown>
}

// Intl.Segmenter is newer than the app's configured `lib` (and only reached
// Firefox in v125); without it, counting falls back to code points.
const Segmenter = (
  Intl as unknown as {
    Segmenter?: new (locale: string, options: object) => GraphemeSegmenter
  }
).Segmenter
const segmenter = Segmenter
  ? new Segmenter('en', { granularity: 'grapheme' })
  : undefined

export interface CharacterCount {
  codePoints: number
  graphemes: number
}

export const countCharacters = (value: string): CharacterCount => {
  const codePoints = [...value].length
  const graphemes = segmenter
    ? [...segmenter.segment(value)].length
    : codePoints
  return { codePoints, graphemes }
}

export type LengthVerdict = 'within' | 'ambiguous' | 'over'

/**
 * `over`: both counts exceed the limit (this gets challenged automatically).
 * `ambiguous`: only one count exceeds it, so a reviewer counting differently
 * could still call it too long.
 */
export const lengthVerdict = (value: string, limit: number): LengthVerdict => {
  const { codePoints, graphemes } = countCharacters(value)
  if (codePoints > limit && graphemes > limit) return 'over'
  if (codePoints > limit || graphemes > limit) return 'ambiguous'
  return 'within'
}
