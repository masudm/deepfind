import { CreateLogger } from '../common/logger'
import { decode, encode } from './decode'

const indexHighlight = 'find-ext-index-highlight'
const allHighlight = 'find-ext-all-highlight'

/**
 * Highlight all occurrences of a regex in the page, using an occurrence map and regex.
 *
 * @private
 * @param {object} occurrenceMap - The occurrence map
 * @param {string} regex - The regular expression
 * @param {object} options - The search and highlight options
 * */
export const highlightAll = function (
  occurrenceMap: any,
  regex: any,
  options: {
    max_results?: number
    match_case?: boolean
    all_highlight_color: { hexColor: string }
  },
) {
  const logger = new CreateLogger('Highlighter')
  logger.info(`Starting highlighting...`)
  const tags: any = {
    occIndex: null,
    maxIndex: null,
    openingMarkup: '',
    closingMarkup: '',
    update: function (index: number) {
      if (this.occIndex !== index) {
        this.occIndex = index

        //If reached max number of occurrences to show, don't highlight text
        if (this.maxIndex == null || this.occIndex <= this.maxIndex) {
          let style =
            'all: unset; background-color: ' +
            options.all_highlight_color.hexColor +
            '; color: black;'
          let classList = 'find-ext-occr' + index + ' ' + allHighlight
          this.openingMarkup = '<span style="' + style + '" class="' + classList + '">'
          this.closingMarkup = '</span>'
        } else {
          this.openingMarkup = ''
          this.closingMarkup = ''
        }
      }
    },
  }

  if (options.max_results && options.max_results !== 0) {
    tags.maxIndex = options.max_results - 1
  } else {
    tags.maxIndex = null
  }

  regex = regex.replace(/ /g, '\\s')
  if (!options || options.match_case) {
    regex = new RegExp(regex, 'm')
  } else {
    regex = new RegExp(regex, 'mi')
  }

  //Iterate each text group
  let occIndex = 0
  for (let index = 0; index < occurrenceMap.groups; index++) {
    let uuids = occurrenceMap[index].uuids
    let groupText = ''
    let charMap: any = {}
    let charIndexMap = []

    //Build groupText, charMap and charIndexMap
    let count = 0
    for (let uuidIndex = 0; uuidIndex < uuids.length; uuidIndex++) {
      let el = document.getElementById(uuids[uuidIndex])

      if (!el || !el.childNodes[0].nodeValue) {
        continue
      }

      let text = el.childNodes[0].nodeValue

      text = decode(text)
      groupText += text

      for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        charIndexMap.push(count)
        charMap[count++] = {
          char: text.charAt(stringIndex),
          nodeUUID: uuids[uuidIndex],
          nodeIndex: stringIndex,
          ignorable: false,
          matched: false,
          boundary: false,
        }
      }
    }
    charMap.length = count

    //Format text nodes (whitespaces) whilst keeping references to their nodes in the DOM, updating charMap ignorable characters
    if (!occurrenceMap[index].preformatted) {
      let info

      //Replace all whitespace characters (\t \n\r) with the space character
      while ((info = /[\t\n\r]/.exec(groupText))) {
        charMap[charIndexMap[info.index]].ignorable = true
        groupText = groupText.replace(/[\t\n\r]/, ' ')
      }

      //Truncate consecutive whitespaces
      while ((info = / {2,}/.exec(groupText))) {
        let len = info[0].length
        let offset = info.index

        for (let currIndex = 0; currIndex < len; currIndex++) {
          charMap[charIndexMap[offset + currIndex]].ignorable = true
        }

        for (let currIndex = 0; currIndex < len - 1; currIndex++) {
          charIndexMap.splice(offset, 1)
        }

        groupText = groupText.replace(/ {2,}/, ' ')
      }

      //Collapse leading or trailing whitespaces
      while ((info = /^ | $/.exec(groupText))) {
        let len = info[0].length
        let offset = info.index

        for (let currIndex = 0; currIndex < len; currIndex++) {
          charMap[charIndexMap[offset + currIndex]].ignorable = true
        }

        for (let currIndex = 0; currIndex < len; currIndex++) {
          charIndexMap.splice(offset, 1)
        }

        groupText = groupText.replace(/^ | $/, '')
      }
    }

    //Perform complex regex search, updating charMap matched characters
    let info
    while ((info = regex.exec(groupText))) {
      let len = info[0].length
      let offset = info.index

      if (len === 0) {
        break
      }

      let first = charIndexMap[offset]
      let last = charIndexMap[offset + len - 1]
      for (let currIndex = first; currIndex <= last; currIndex++) {
        charMap[currIndex].matched = true
        if (currIndex === last) {
          charMap[currIndex].boundary = true
        }
      }

      for (let currIndex = 0; currIndex < offset + len; currIndex++) {
        charIndexMap.splice(0, 1)
      }

      groupText = groupText.substring(offset + len)
    }

    // logger.info(`Group text: ${groupText}`)
    // logger.info(`charMap: ${JSON.stringify(charMap)}`)

    //Wrap matched characters in an element with class indexHighlight and occurrenceIdentifier
    let matchGroup = { text: '', groupUUID: charMap[0].nodeUUID }
    let inMatch = false
    for (let key = 0; key < charMap.length; key++) {
      tags.update(occIndex)

      //If Transitioning Into New Text Group
      if (matchGroup.groupUUID !== charMap[key].nodeUUID) {
        if (inMatch) {
          matchGroup.text += tags.closingMarkup
        }

        const matchElement = document.getElementById(matchGroup?.groupUUID)
        if (matchElement) {
          matchElement.innerHTML = matchGroup.text
        }

        matchGroup.text = ''
        matchGroup.groupUUID = charMap[key].nodeUUID

        if (inMatch) {
          matchGroup.text += tags.openingMarkup
        }
      }

      //If Current Character is Matched
      if (charMap[key].matched) {
        if (!inMatch) {
          inMatch = charMap[key].matched
          matchGroup.text += tags.openingMarkup
        }
      } else {
        if (inMatch) {
          inMatch = charMap[key].matched
          matchGroup.text += tags.closingMarkup

          if (key < charMap.length) {
            occIndex++
          }
        }
      }

      matchGroup.text += encode(charMap[key].char)
      // logger.info(`Match group: ${JSON.stringify(matchGroup)}`)

      if (charMap[key].boundary) {
        inMatch = false
        matchGroup.text += tags.closingMarkup
        if (key < charMap.length) {
          occIndex++
        }
      }

      //If End of Map Reached
      if (key === charMap.length - 1) {
        if (inMatch) {
          matchGroup.text += tags.closingMarkup
          occIndex++
        }

        const matchElement = document.getElementById(matchGroup.groupUUID)
        if (matchElement) {
          matchElement.innerHTML = matchGroup.text
        }
      }
    }
  }
}

/**
 * Seek the search to the given index.
 *
 * @private
 * @param {number} index - The index to seek to
 * @param {object} options - The search options
 * */
export const seekHighlight = function (
  index: number,
  options: {
    all_highlight_color: { hexColor: string }
    index_highlight_color: { hexColor: string }
  },
) {
  const logger = new CreateLogger('Seek Highligher')
  logger.info(`Seeking...`)
  if (index === null || options == null) {
    return
  }

  let previousIndex = Array.from(document.querySelectorAll('.' + indexHighlight))
  logger.info(`Previous index: ${previousIndex}`)
  if (previousIndex && previousIndex.length) {
    for (let elsIndex = 0; elsIndex < previousIndex.length; elsIndex++) {
      let style =
        'all: unset; background-color: ' + options.all_highlight_color.hexColor + '; color: black;'
      previousIndex[elsIndex].classList.remove(indexHighlight)
      previousIndex[elsIndex].setAttribute('style', style)
    }
  }

  let els = Array.from(document.querySelectorAll('.find-ext-occr' + index))
  if (els == null || els.length === 0) {
    return
  }

  for (let elsIndex = 0; elsIndex < els.length; elsIndex++) {
    let style =
      'all: unset; background-color: ' + options.index_highlight_color.hexColor + '; color: black;'
    els[elsIndex].classList.add(indexHighlight)
    els[elsIndex].setAttribute('style', style)
  }

  // only scroll if the element is not in the current viewport
  if (!isElementInViewport(els[0])) {
    els[0].scrollIntoView(true)

    let docHeight = Math.max(
      document.documentElement.clientHeight,
      document.documentElement.offsetHeight,
      document.documentElement.scrollHeight,
    )
    let bottomScrollPos = window.pageYOffset + window.innerHeight
    if (bottomScrollPos + 100 < docHeight) {
      window.scrollBy(0, -100)
    }
  }
}

/**
 * Replace a given occurrence of a regex with a given string.
 *
 * @private
 * @param {number} index - The index of the occurrence that will be replaced
 * @param {string} replaceWith - The text that will replace the given occurrence of the regex
 * */
const replace = function (index: number, replaceWith: string) {
  let els = Array.from(document.querySelectorAll('.find-ext-occr' + index))

  if (els.length === 0) {
    return
  }
  //@ts-ignore
  els.shift().innerText = replaceWith
  for (let elsIndex = 0; elsIndex < els.length; elsIndex++) {
    //@ts-ignore
    els[elsIndex].innerText = ''
  }
}

/**
 * Replace all occurrences of a regex with a given string.
 *
 * @private
 * @param {string} replaceWith - The text that will replace all occurrences of the regex
 * */
const replaceAll = function (replaceWith: string) {
  let els = Array.from(document.querySelectorAll("[class*='find-ext-occr']"))

  let currentOccurrence = null
  for (let index = 0; index < els.length; index++) {
    let el = els[index]
    //@ts-ignore
    let occrClassName = el.getAttribute('class').match(/find-ext-occr\d*/)[0]
    let occurrenceFromClass = parseInt(occrClassName.replace('find-ext-occr', ''))

    if (occurrenceFromClass !== currentOccurrence) {
      currentOccurrence = occurrenceFromClass
      //@ts-ignore
      el.innerText = replaceWith
    } else {
      //@ts-ignore
      el.innerText = ''
    }
  }
}

/**
 * Follow the link that is currently highlighted.
 *
 * @private
 * */
const followLinkUnderFocus = function () {
  let els = document.getElementsByClassName(indexHighlight)
  for (let index = 0; index < els.length; index++) {
    let el = els[index]
    while (el.parentElement) {
      el = el.parentElement
      if (el.tagName.toLowerCase() === 'a') {
        //@ts-ignore
        return el.click()
      }
    }
  }
}

/**
 * Restore the page by removing any highlighting markup.
 *
 * @private
 * */
export const restore = function () {
  let classes = [indexHighlight, allHighlight]
  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    let els = Array.from(document.querySelectorAll('.' + classes[classIndex]))

    for (let elsIndex = 0; elsIndex < els.length; elsIndex++) {
      let el = els[elsIndex]
      let parent = el.parentElement

      while (el.firstChild) {
        //@ts-ignore
        parent.insertBefore(el.firstChild, el)
      }

      //@ts-ignore
      parent.removeChild(el)
      //@ts-ignore
      parent.normalize()
    }
  }
}

function isElementInViewport(element: any) {
  let elementBoundingRect = element.getBoundingClientRect()
  if (elementBoundingRect.top < 0 || elementBoundingRect.left < 0) {
    return false
  }

  if (elementBoundingRect.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
    return false
  }

  if (elementBoundingRect.right > (window.innerWidth || document.documentElement.clientWidth)) {
    return false
  }

  return true
}
