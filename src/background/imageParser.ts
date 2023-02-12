import Tesseract from 'tesseract.js'
import { CreateLogger } from '../common/logger'
import 'subworkers'

const logger = new CreateLogger('ImageParser')

export async function ParseImage(image: string) {
  const { createWorker } = Tesseract
  const worker = await createWorker({
    workerBlobURL: false,
    workerPath: chrome.runtime.getURL('ocr/worker.min.js'),
    langPath: chrome.runtime.getURL('ocr'),
    corePath: chrome.runtime.getURL('ocr/tesseract-core.wasm.js'),
  })

  await worker.load()
  await worker.loadLanguage('eng')
  await worker.initialize('eng')
  const {
    data: { text },
  } = await worker.recognize(image)
  logger.info(text)
  await worker.terminate()

  return text
}
