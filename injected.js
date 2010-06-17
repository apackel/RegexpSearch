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
}

function clearPreviousSearch() {
    for (var i in nodesToReplace) {
	var spanNode = nodesToReplace[i].span;
	var textNode = nodesToReplace[i].text;

	spanNode.parentElement.replaceChild(textNode, spanNode);
    }

    nodesToReplace = [];
}

function highlightMatchSegment(matchSegment) {
    var node = matchSegment.node;
    var start = matchSegment.start;
    var length = matchSegment.length;
    var offset = matchSegment.nodeOffset;

    var nodeText = node.nodeValue;

    var parentNode = node.parentNode;

    var beforeText = nodeText.substring(0, start);
    var matchingText = nodeText.substring(start, start+length);
    var afterText = nodeText.substring(start+length);

    var beforeNode = null;
    if (beforeText.length > 0) {
	beforeNode = document.createTextNode(beforeText);
	nodeOffsets[offset] = beforeNode;
    }

    var matchingSpan = document.createElement("span");
    var innerTextNode = document.createTextNode(matchingText);
    matchingSpan.className = matchClass;
    matchingSpan.appendChild(innerTextNode);
    nodeOffsets[offset+start] = innerTextNode;

    var afterNode = null;
    if (afterText.length > 0) {
	afterNode = document.createTextNode(afterText);
	nodeOffsets[offset+start+length] = afterNode;
    }

    var succeedingNode = node;
    if (afterNode != null) {
	parentNode.insertBefore(afterNode, succeedingNode);
	succeedingNode = afterNode;
    }

    parentNode.insertBefore(matchingSpan, succeedingNode);
    if (beforeNode != null) {
	parentNode.insertBefore(beforeNode, matchingSpan);
    }

    nodesToReplace.push({span: matchingSpan, text: innerTextNode});

    // note parameter order; FML.
    parentNode.removeChild(node);
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
	length: Math.min(startIndex + nodeOffsets[startNodeIndex].length - startNodeIndex, endIndex-startIndex),
	nodeOffset: startNodeIndex
    };
    matchingNodes.push(startMatch);

    var endNodeIndex = endIndex-1;
    while (nodeOffsets[endNodeIndex] === undefined) {
	endNodeIndex--;
    }

    var endMatch = {
	node: nodeOffsets[endNodeIndex],
	start: 0,
	length: endIndex - endNodeIndex,
	nodeOffset: endNodeIndex
    };

    var index = startIndex+1;
    while (index < endNodeIndex) {
	if (nodeOffsets[index] !== undefined) {
	    matchingNodes.push({
		node: nodeOffsets[index],
		start: 0,
		length: nodeOffsets[index].length,
		nodeOffset: index
	    });
	}
	index++;
    }

    if (endMatch.node != startMatch.node)
	matchingNodes.push(endMatch);
    return matchingNodes;
}

function runSearch(query) {
    clearPreviousSearch();

    // need to do this for every search; contents may have changed
    loadDocumentText();

    var modifiers = "g" +
	(query.caseInsensitive ? "i" : "") +
	(query.multiLine ? "m" : "");
    var re = new RegExp(query.searchString, modifiers);

    var match;
    var matchCount = 0;
    while ((matchInfo = re.exec(documentText)) !== null) {
	var match = matchInfo[0];

	var matchingNodes = getMatchingNodes(matchInfo.index, matchInfo.index + match.length);
	matchingNodes.forEach(highlightMatchSegment);
	matchCount++;
    }

    safari.self.tab.dispatchMessage("resultCount", { count: matchCount });
}

safari.self.addEventListener("message", handleMessage, false);
