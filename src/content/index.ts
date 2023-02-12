import {
  IMAGE_MESSAGE,
  RECEIVE_IMAGE,
  BASE_MESSAGE,
  SEND_IMAGE,
  IMAGE_PORT,
} from '../common/messages'
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

var port = chrome.runtime.connect({ name: IMAGE_PORT })

const img: SEND_IMAGE = {
  type: IMAGE_MESSAGE,
  image: 'https://tesseract.projectnaptha.com/img/eng_bw.png',
}
port.postMessage(img)

port.onMessage.addListener(function (msg: BASE_MESSAGE) {
  if (msg.type === IMAGE_MESSAGE) {
    const data: RECEIVE_IMAGE = msg as RECEIVE_IMAGE
    console.log(`we got data! ${data.content}`)
  }
  // if (msg.question === "Who's there?") port.postMessage({ answer: 'Madame' })
  // else if (msg.question === 'Madame who?') port.postMessage({ answer: 'Madame... Bovary' })
})

export {}
