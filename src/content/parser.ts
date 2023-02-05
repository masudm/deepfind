// Based on https://github.com/brandon1024/find/blob/develop/content/parser.js

import { CreateLogger } from '../common/logger'
import { decode } from './decode'

const log = new CreateLogger('Parser')

/**
 * Walk the pages DOM tree and construct the document representation object, while
 * wrapping text nodes with wrapper elements.
 *
 * @return {object} the document representation object
 * */
export function buildDOMReferenceObject() {
  log.info('Starting parser...')
  let DOMTreeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, {
    acceptNode: nodeFilter,
  })
  log.info(DOMTreeWalker)
  let DOMModelObject = {}
  let reachedEndOfTree = false
  let groupIndex = 0
  let blockLevels = []
  let elementBoundary = false
  let preformatted: { flag: boolean; index: null | number } = { flag: false, index: null }
  let hidden: { flag: boolean; index: null | number } = { flag: false, index: null }
  let node: Node | null = DOMTreeWalker.root

  if (node) {
    return
  }

  while (!reachedEndOfTree) {
    node = DOMTreeWalker.nextNode()

    if (!node) {
      reachedEndOfTree = true
    }

    let textGroup = { group: [], preformatted: false }
    while (node) {
      const currentNode = node as HTMLElement
      let nodeDepth = getNodeTreeDepth(currentNode)

      if (!preformatted.flag && isPreformattedElement(currentNode)) {
        preformatted.flag = true
        preformatted.index = nodeDepth
      } else if (preformatted.flag && preformatted.index && nodeDepth <= preformatted.index) {
        preformatted.flag = false
        preformatted.index = null
      }

      if (!hidden.flag && isHiddenElement(currentNode)) {
        hidden.flag = true
        hidden.index = nodeDepth
      } else if (hidden.flag && hidden.index && nodeDepth <= hidden.index) {
        if (!isHiddenElement(currentNode)) {
          hidden.flag = false
          hidden.index = null
        } else {
          hidden.index = nodeDepth
        }
      }

      if (hidden.flag) {
        node = DOMTreeWalker.nextNode()
        continue
      }

      if (isElementNode(node)) {
        if (nodeDepth <= blockLevels[blockLevels.length - 1]) {
          while (nodeDepth <= blockLevels[blockLevels.length - 1]) {
            blockLevels.pop()
          }

          if (!isInlineLevelElement(currentNode)) {
            blockLevels.push(nodeDepth)
          }

          elementBoundary = true
          break
        } else {
          if (!isInlineLevelElement(currentNode)) {
            blockLevels.push(nodeDepth)
            elementBoundary = true
            break
          }
        }
      } else if (isTextNode(node)) {
        if (nodeDepth <= blockLevels[blockLevels.length - 1]) {
          while (nodeDepth <= blockLevels[blockLevels.length - 1]) {
            blockLevels.pop()
          }

          DOMTreeWalker.previousNode()
          elementBoundary = true
          break
        }

        if (
          node.nodeValue &&
          !preformatted.flag &&
          isNodeTextValueWhitespaceOnly(currentNode) &&
          node.nodeValue.length !== 1
        ) {
          node = DOMTreeWalker.nextNode()
          continue
        } else if (
          node.nodeValue &&
          node.nodeValue.length === 1 &&
          node.nodeValue.charCodeAt(0) === 10
        ) {
          node = DOMTreeWalker.nextNode()
          continue
        }

        let identifierUUID = generateElementUUID()
        let nodeText = formatTextNodeValue(currentNode, preformatted.flag, elementBoundary)

        if (!nodeText || nodeText.length === 0) {
          node = DOMTreeWalker.nextNode()
          continue
        }

        let wrapperElement = document.createElement('span')
        wrapperElement.style.cssText = 'all: unset;'
        wrapperElement.setAttribute('id', identifierUUID)
        if (node.parentNode) {
          node.parentNode.insertBefore(wrapperElement, node)
        }

        wrapperElement.appendChild(node)

        let textNodeInformation = {
          groupIndex: groupIndex,
          text: nodeText,
          elementUUID: identifierUUID,
        }
        //@ts-ignore
        textGroup.group.push(textNodeInformation)
        textGroup.preformatted = preformatted.flag
      }

      node = DOMTreeWalker.nextNode()
      elementBoundary = false
      if (!node) {
        reachedEndOfTree = true
      }
    }

    if (textGroup.group.length === 0) {
      continue
    }

    //@ts-ignore
    DOMModelObject[groupIndex++] = textGroup
  }

  return DOMModelObject
}

/**
 * Restore the web page by removing any wrapper elements.
 *
 * @param {array} uuids - A list of UUIDs
 * */
export function restoreWebPage(uuids: string[]) {
  for (let index = 0; index < uuids.length; index++) {
    let el = document.getElementById(uuids[index])
    if (el) {
      let parent = el.parentElement

      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el)
        }

        parent.removeChild(el)
        parent.normalize()
      }
    }
  }
}

/**
 * Filter used by the DOM tree walker. Used to skip certain elements.
 * @private
 * @param {Element} node - The DOM node.
 * @return {number} NodeFilter.FILTER_ACCEPT if the node is accepted, or NodeFilter.FILTER_REJECT
 * if the node is rejected.
 * */
function nodeFilter(input: Node) {
  if (isElementNode(input)) {
    const node = input as HTMLElement
    switch (node.tagName.toLowerCase()) {
      case 'script':
      case 'noscript':
      case 'style':
      case 'textarea':
      case 'math':
        return NodeFilter.FILTER_REJECT
      default:
        return NodeFilter.FILTER_ACCEPT
    }
  }

  if (isTextNode(input)) {
    return NodeFilter.FILTER_ACCEPT
  }

  return NodeFilter.FILTER_REJECT
}

/**
 * Decode any HTML character entities, strip consecutive whitespaces,
 * and return the node text value.
 *
 * @private
 * @param {Node} node - The DOM node.
 * @param {boolean} preformatted - Whether or not the node is a preformatted text element.
 * @param {boolean} elementBoundary - Whether the element is a boundary element.
 * @return {string} the formatted text.
 * */
function formatTextNodeValue(node: HTMLElement, preformatted: boolean, elementBoundary: boolean) {
  if (isElementNode(node)) {
    return
  }

  if (node.nodeValue) {
    let nodeText = decode(node.nodeValue)
    if (preformatted) {
      return nodeText
    }

    let text = nodeText.replace(/[\t\n\r ]+/g, ' ')
    if (elementBoundary) {
      text = text.replace(/^[\t\n\r ]+/g, '')
    }

    return text
  }
}

/**
 * Determine whether a given node is preformatted.
 *
 * A node is preformatted if it has:
 * - tag name 'pre'
 * - style 'whitespace: pre'
 *
 * @private
 * @param {Element} node - The DOM node.
 * @return {boolean} true of the element is a preformatted element, false if the
 * element is not preformatted, and undefined if the node is not an element.
 * */
function isPreformattedElement(node: HTMLElement) {
  if (!isElementNode(node)) {
    return undefined
  }

  if (node.tagName.toLowerCase() === 'pre' || node.style.whiteSpace.toLowerCase() === 'pre') {
    return true
  }

  let computedStyle = window.getComputedStyle(node)
  if (computedStyle.getPropertyValue('whitespace').toLowerCase() === 'pre') {
    return true
  }

  return false
}

/**
 * Determine whether a given node is visible in the page.
 *
 * @private
 * @param {Node} node - The DOM node.
 * @return {boolean} true if the element is hidden, false if the element is visible,
 * and undefined if the not an element.
 * */
function isHiddenElement(node: HTMLElement) {
  if (!isElementNode(node)) {
    return undefined
  }

  if (node.style.display === 'none' || node.style.display === 'hidden') {
    return true
  }

  let computedStyle = window.getComputedStyle(node)
  if (computedStyle.getPropertyValue('display').toLowerCase() === 'none') {
    return true
  }

  if (computedStyle.getPropertyValue('display').toLowerCase() === 'hidden') {
    return true
  }

  return false
}

/**
 * Determine whether or not a given DOM node is an Element.
 *
 * @private
 * @param {Node} node - The DOM node.
 * @return {boolean} true if the node is an element, false otherwise.
 * */
function isElementNode(node: Node) {
  return node.nodeType === Node.ELEMENT_NODE
}

/**
 * Determine whether or not a given DOM node is a text node.
 *
 * @private
 * @param {Node} node - The DOM node.
 * @return {boolean} true if the node is a text node, false otherwise.
 * */
function isTextNode(node: Node) {
  return node.nodeType === Node.TEXT_NODE
}

/**
 * Determine whether or not an element is inline-level or block-level.
 *
 * @private
 * @param {Element} element - The DOM element.
 * @return {boolean} true if the element is inline, false otherwise.
 * */
function isInlineLevelElement(element: HTMLElement) {
  if (!isElementNode(element)) {
    return false
  }

  //Special case: will treat <br> as block element
  let elementTagName = element.tagName.toLowerCase()
  if (elementTagName === 'br') {
    return false
  }

  if (window.getComputedStyle(element).display === 'inline') {
    return true
  }

  return false
}

/**
 * Determine whether a text node value is whitespace only.
 *
 * @private
 * @param {Node} node - The DOM node.
 * @return {boolean} true if the node value is whitespace only, false otherwise.
 * */
function isNodeTextValueWhitespaceOnly(node: HTMLElement) {
  if (!node.nodeValue) {
    return true //pretend it's just whitespace
  }
  return !/[^\t\n\r ]/.test(node.nodeValue)
}

/**
 * Determine the depth of a given node in the DOM tree.
 *
 * @private
 * @param {Node} node - The DOM node.
 * @return {number} the depth of the DOM node in the tree.
 * */
function getNodeTreeDepth(node: HTMLElement | ParentNode | null) {
  let depth = -1

  while (node != null) {
    depth++
    node = node.parentNode
  }

  return depth
}

/**
 * Generate a UUIDv4.
 *
 * @private
 * @return {string} a new UUIDv4.
 * */
function generateElementUUID() {
  let generateBlock = (size: number) => {
    let block = ''
    for (let index = 0; index < size; index++) {
      block += Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1)
    }

    return block
  }

  const blockSizes = [2, 1, 1, 1, 3]
  let uuid = ''
  for (let index = 0; index < blockSizes.length; index++) {
    uuid += generateBlock(blockSizes[index]) + (index === blockSizes.length - 1 ? '' : '-')
  }

  return uuid
}
