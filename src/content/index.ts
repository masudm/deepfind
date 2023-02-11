import { highlightAll, restore, seekHighlight } from './highlighter'
import { buildOccurrenceMap } from './occurenceMap'
import { buildDOMReferenceObject } from './parser'

console.info('chrome-ext template-react-ts content script')

const dom = buildDOMReferenceObject()

console.table(dom)

const find = 'in'
const options = {}
const map = buildOccurrenceMap(dom, find, options)

console.log(map)

restore()

highlightAll(map, find, { all_highlight_color: { hexColor: '#FF0000' } })

seekHighlight(1, {
  all_highlight_color: { hexColor: '#FF0000' },
  index_highlight_color: { hexColor: '#FFFF00' },
})

export {}
