import React from 'react'

// Shown to screen readers only.
const SCREEN_READER_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/** What the badge and the dot say to screen readers. */
export const attentionLabel = (count: number) =>
  `${count} ${count === 1 ? 'case needs' : 'cases need'} your attention`

/**
 * The badge's content: the short count for the eye, a sentence for screen
 * readers, which read it as part of the link it sits in ("My Profile, 2
 * cases need your attention").
 */
export const CountText: React.FC<{ count: number }> = ({ count }) => (
  <>
    <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
    <span style={SCREEN_READER_ONLY}>{`, ${attentionLabel(count)}`}</span>
  </>
)

/** The dot's content: it has nothing to show, so it only names itself. */
export const DotText: React.FC<{ count: number }> = ({ count }) => (
  <span style={SCREEN_READER_ONLY}>{attentionLabel(count)}</span>
)
