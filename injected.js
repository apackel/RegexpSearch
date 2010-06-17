var documentText = null;
var textNodes = null;
var nodeOffsets = {};
var nodesToReplace = [];

var matchClass = "__regex0r_match";
var matchContainerClass = "__regex0r_match_container";

function handleMessage(e) {
    if (e.name === "regexSearch") {
	runSearch(e.message);
    }
}

function addClass(element, className) {
    element.className += " " + className;
    console.log(element.nodeName + " NCL: " + element.className);
}

function clearPreviousSearch() {
    for (var i in nodesToReplace) {
	var spanNode = nodesToReplace[i].span;
	var textNode = nodesToReplace[i].text;

	spanNode.parentNode.replaceChild(textNode, spanNode);
    }

    nodesToReplace = [];
}

function highlightMatchSegment(matchSegment) {
    var node = matchSegment.node;
    var start = matchSegment.start;
    var length = matchSegment.length;

    var nodeText = node.nodeValue;

    var parentNode = node.parentNode;

    var beforeText = nodeText.substring(0, start);
    var matchingText = nodeText.substring(start, start+length);
    var afterText = nodeText.substring(start+length);

    var outerSpan = document.createElement("span");
    outerSpan.className = matchContainerClass;

    if (beforeText.length > 0) {
	var beforeNode = document.createTextNode(beforeText);
	outerSpan.appendChild(beforeNode);
    }

    var matchingSpan = document.createElement("span");
    matchingSpan.className = matchClass;
    matchingSpan.appendChild(document.createTextNode(matchingText));
    outerSpan.appendChild(matchingSpan);

    if (afterText.length > 0) {
	var afterNode = document.createTextNode(afterText);
	outerSpan.appendChild(afterNode);
    }

    nodesToReplace.push({span: outerSpan, text: node});
    // note parameter order; FML.
    parentNode.replaceChild(outerSpan, node);
}

function loadDocumentText() {
    var textNodeList = document.evaluate("//body//text()",
	    document, null,
	    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);

    var textNodes = [];
    var text = [];

    nodeOffsets = {};
    var length = 0;
    for (var i = 0; i < textNodeList.snapshotLength; i++) {
	var node = textNodeList.snapshotItem(i);
	textNodes.push(node);
	text.push(node.nodeValue);

	nodeOffsets[length] = node;
	length += node.nodeValue.length;
    }

    documentText = text.join("");
}

function getMatchingNodes(startIndex, endIndex) {
    var matchingNodes = [];

    var startNodeIndex = startIndex;
    while (nodeOffsets[startNodeIndex] === undefined) {
	startNodeIndex--;
    }
    var startMatch = {
	node: nodeOffsets[startNodeIndex],
	start: startIndex - startNodeIndex,
	length: Math.min(startIndex + nodeOffsets[startNodeIndex].length - startNodeIndex, endIndex-startIndex)
    };
    matchingNodes.push(startMatch);

    var endNodeIndex = endIndex-1;
    while (nodeOffsets[endNodeIndex] === undefined) {
	endNodeIndex--;
    }

    var endMatch = {
	node: nodeOffsets[endNodeIndex],
	start: 0,
	length: endIndex - endNodeIndex
    };

    var index = startIndex;
    while (index < endNodeIndex) {
	index++;
	if (nodeOffsets[index] !== undefined) {
	    matchingNodes.push({
		node: nodeOffsets[index],
		start: 0,
		length: nodeOffsets[index].length
	    });
	}
    }

    if (endMatch.node != startMatch.node)
	matchingNodes.push(endMatch);
    return matchingNodes;
}

function highlightNodes(nodes) {
    nodes.forEach(function(n) {
	highlightMatchSegment(n);
    });
}

function runSearch(query) {
    clearPreviousSearch();

    // need to do this for every search; contents may have changed
    loadDocumentText();


    var modifiers = "g" + (query.caseSensitive ? "" : "i");
    var re = new RegExp(query.searchString, modifiers);

    var matches = documentText.match(re);
    var previousNode = null;

    var currentPosition = 0;
    for (var i in matches) {
	var match = matches[i];
	var matchIndex = documentText.indexOf(match, currentPosition);

	var matchingNodes = getMatchingNodes(matchIndex, matchIndex + match.length);
	highlightNodes(matchingNodes);

	currentPosition = matchIndex + match.length;
    }
}

safari.self.addEventListener("message", handleMessage, false);
