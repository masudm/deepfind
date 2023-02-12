import { CreateLogger } from '../common/logger'
import { IMAGE_MESSAGE, BASE_MESSAGE, IMAGE_PORT, SEND_IMAGE } from '../common/messages'
import { ParseImage } from './imageParser'

console.info('chrome-ext template-react-ts background script')

const logger = new CreateLogger('Background')

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === IMAGE_PORT) {
    logger.info(`Port: ${port.name}`)
    port.onMessage.addListener(function (msg: BASE_MESSAGE) {
      if (msg.type === IMAGE_MESSAGE) {
        const data: SEND_IMAGE = msg as SEND_IMAGE
        logger.info(`we got an image! ${data.image}`)
        ParseImage(data.image)
        logger.info(`Sending back`)
      }
      // if (msg.joke === 'Knock knock') port.postMessage({ question: "Who's there?" })
      // else if (msg.answer === 'Madame') port.postMessage({ question: 'Madame who?' })
      // else if (msg.answer === 'Madame... Bovary') port.postMessage({ question: "I don't get it." })
    })
  }
})

export {}
