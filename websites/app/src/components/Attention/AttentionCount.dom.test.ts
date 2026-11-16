import { it } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { CountText, DotText } from './AttentionCount'

const render = async (element: ReactElement) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(element))
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

// What a screen reader reads: the text, minus what is aria-hidden.
const spoken = (node: Node): string =>
  node.nodeType === node.TEXT_NODE
    ? (node.textContent ?? '')
    : (node as Element).getAttribute?.('aria-hidden') === 'true'
      ? ''
      : Array.from(node.childNodes).map(spoken).join('')

it('gives the My Profile badge and the menu dot a name screen readers read', async () => {
  // As in the header: the badge sits inside the My Profile link.
  const link = await render(
    createElement(
      'a',
      { href: '/profile/pending' },
      'My Profile',
      createElement('span', null, createElement(CountText, { count: 12 })),
    ),
  )
  const anchor = link.container.querySelector('a')!
  assert.equal(spoken(anchor), 'My Profile, 12 cases need your attention')
  // Sighted users still see the short count.
  assert.equal(anchor.querySelector('[aria-hidden="true"]')?.textContent, '9+')
  await link.unmount()

  const one = await render(createElement(CountText, { count: 1 }))
  assert.equal(spoken(one.container), ', 1 case needs your attention')
  await one.unmount()

  // The dot shows no text: it must still be named, not hidden.
  const dot = await render(
    createElement('span', null, createElement(DotText, { count: 2 })),
  )
  assert.equal(spoken(dot.container), '2 cases need your attention')
  assert.equal(dot.container.querySelector('[aria-hidden]'), null)
  await dot.unmount()
})
