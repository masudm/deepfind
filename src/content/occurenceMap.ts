// Based on https://github.com/brandon1024/find/blob/develop/background/background.js
/**
 * Construct an occurrence map object from a document representation and regular expression.
 * The occurrence map is used to map occurrences of a given regex to nodes in the DOM.
 *
 * The occurrence map will have the following format:
 * {
 *     occurrenceIndexMap: {
 *          1: {
 *              groupIndex: _index to the parent group of this occurrence_,
 *              subIndex: _the occurrence subindex of the parent group_,
 *              occurrence: _the matched text_
 *          }, ...
 *     },
 *     length: _number of occurrences of the regex_,
 *     groups: _number of occurrence groups_,
 *     1: {
 *         uuids: [...],
 *         count: _number of matches in this group_,
 *         preformated: _whether or not the text node in the DOM is preformatted_
 *     }, ...
 * }
 *
 * @private
 * @param {object} documentRepresentation - The representation of the page's DOM
 * @param {string} regex - A regular expression
 * @param {object} options - Options used to alter the creation of the occurrence map.
 * @return {object} occurrence map
 * */
export function buildOccurrenceMap(
  documentRepresentation: any,
  regex: any,
  options: { match_case?: boolean; max_results?: number },
) {
  let occurrenceMap: { occurrenceIndexMap: any; length: number | null; groups: number | null } = {
    occurrenceIndexMap: {},
    length: null,
    groups: null,
  }
  let count = 0
  let groupIndex = 0

  regex = regex.replace(/ /g, '\\s')
  regex = options.match_case ? new RegExp(regex, 'gm') : new RegExp(regex, 'gmi')

  //Loop over all text nodes in documentRepresentation
  for (let key in documentRepresentation) {
    let textNodes = documentRepresentation[key].group,
      preformatted = documentRepresentation[key].preformatted
    let textGroup = ''
    let uuids = []
    for (let nodeIndex = 0; nodeIndex < textNodes.length; nodeIndex++) {
      textGroup += textNodes[nodeIndex].text
      uuids.push(textNodes[nodeIndex].elementUUID)
    }

    let matches = textGroup.match(regex)
    if (!matches) {
      continue
    }

    count += matches.length
    //@ts-ignore
    occurrenceMap[groupIndex] = {
      uuids: uuids,
      count: matches.length,
      preformatted: preformatted,
    }

    for (let matchesIndex = 0; matchesIndex < matches.length; matchesIndex++) {
      let occMapIndex = matchesIndex + (count - matches.length)
      occurrenceMap.occurrenceIndexMap[occMapIndex] = {
        groupIndex: groupIndex,
        subIndex: matchesIndex,
        occurrence: matches[matchesIndex],
      }
    }

    groupIndex++

    //If reached maxIndex, exit
    if (options.max_results && options.max_results !== 0 && count >= options.max_results) {
      break
    }
  }

  occurrenceMap.length = count
  occurrenceMap.groups = groupIndex
  return occurrenceMap
}
