document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("searchInputButton").addEventListener("click", function () {
    const input = document.getElementById("searchInput").value;
    searchPage(input);
  });
});

function searchPage(searchString, capSensitive = false) {
  const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let currentNode = treeWalker.currentNode;

  while (currentNode) {
    if (currentNode.wholeText) {
      let content = currentNode.wholeText;
      if (!capSensitive) {
        content = content.toLowerCase();
      }

      if (content.includes(searchString)) {
        currentNode.parentNode.style.border = `1px solid red`;
      } else {
        console.log(`Not found`);
      }
    }
    currentNode = treeWalker.nextNode();
  }
}
