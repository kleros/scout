// Loaded before the `*.dom.test.ts` files: gives them a browser page before
// React, React DOM and React Query load, since those look for one only then.
import { JSDOM } from 'jsdom'

const { window } = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://scout.test/',
  pretendToBeVisual: true,
})
Object.assign(global, {
  window,
  document: window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
})
// Node has its own navigator only from version 21; React DOM reads it.
if (!('navigator' in global)) global.navigator = window.navigator
