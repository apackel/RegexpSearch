var documentText = null;
var textNodes = null;
var matchedNodes = null;

var matchClass = "__regex0r_match";

function handleMessage(e) {
    if (e.name === "regexSearch") {
	runSearch(e.message);
    }
}

function getNextSearchableNode(node) {
    if (textNodes == null) {
	textNodes = document.evaluate("//body//text()[normalize-space(.) != '']",
		document, null,
		XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    }

    if (node == null)
	return textNodes.snapshotItem(0);

    for (var i = 0; i < textNodes.snapshotLength-1; i++) {
	if (textNodes.snapshotItem(i) === node)
	    return textNodes.snapshotItem(i+1);
    }

    return null;
}

function getStringMatchLength(matchString, matchPosition, nodeText, nodePosition) {
    var lengthNeeded = Math.min(matchString.length-matchPosition, nodeText.length - nodePosition);
    return matchString.substring(matchPosition, matchPosition+lengthNeeded) ===
	nodeText.substring(nodePosition, nodePosition+lengthNeeded) ? lengthNeeded : -1;
}

function getNextMatchingNode(matchString, previousNode) {
    var node = previousNode;

    console.log("ENTER");
    while (node != null) {
	var currentPosition = -1;
	var text = node.nodeValue; //.trim();

	console.log("gNMN: trying to match '" + matchString[0] + "' in " + text.substring(0, 20));
	while ((currentPosition = text.indexOf(matchString[0], currentPosition+1)) != -1)
	{
	    console.log("With currentpos " + currentPosition);
	    var matchLength = getStringMatchLength(matchString, 0, text, currentPosition);
	    if (matchLength > 0) {
		console.log("Yes indeed!");
		return { match: node, start: currentPosition, length: matchLength };
	    }
	}

	node = getNextSearchableNode(node);
    }

    return { match: null };
}

function selectMatchingNodes(matchString, matchPosition, currentNode, nodeStack) {
    console.log("TOP: MATCHPOS: " + matchPosition);

    // we win
    if (matchPosition == matchString.length)
	return true;

    var elementText = currentNode.nodeValue; // .trim();

    // if this is NOT the first element we're matching, must match at start of element
    if (matchPosition > 0) {
	var matchLength = getStringMatchLength(matchString, matchPosition, elementText, 0);
	if (matchLength > 0) {
	    nodeStack.push({match: currentNode, start: 0, length: matchLength });
	    return selectMatchingNodes(
		    matchString, matchPosition+matchLength,
		    getNextSearchableNode(currentNode), nodeStack);
	}
    }

    var nextMatch = getNextMatchingNode(matchString, currentNode);
    if (nextMatch.match != null) {
	nodeStack.push(nextMatch);

	return selectMatchingNodes(matchString, matchPosition + nextMatch.length,
		getNextSearchableNode(nextMatch.match), nodeStack);
    }

    return false;
}

function addClass(element, className) {
    element.className += " " + className;
    console.log(element.nodeName + " NCL: " + element.className);
}

function clearPreviousSearch() {
    var matchingElts = document.getElementsByClassName(matchClass);

    for (var i = 0; i < matchingElts.length; i++) {
	var element = matchingElts[i];
	var classes = element.className.split(" ");

	console.log("Clearing... ");
	console.log("Old class name: " + element.className);
	var newClassName = classes.filter(function(c) { return c !== matchClass; });
	element.className = newClassName.join(" ");

	console.log("New class name: " + element.className);
    }
}

function runSearch(query) {
    if (documentText === null) {
	documentText = document.documentElement.innerText;

	//computeOffsets();
    }

    clearPreviousSearch();

    var modifiers = "g" + (query.caseSensitive ? "" : "i");
    var re = new RegExp(query.searchString, modifiers);

    var matches = documentText.match(re);
    var previousNode = null;
    for (var match in matches) {
	console.log("MATCHstring: " + matches[match]);
	var nodeStack = [];
	if (selectMatchingNodes(matches[match], 0, getNextSearchableNode(previousNode), nodeStack)) {
	    for (var i in nodeStack) {
		console.log(nodeStack[i]);
		addClass(nodeStack[i].match.parentElement, matchClass);
	    }

	    previousNode = nodeStack[nodeStack.length-1].match;
	}
    }
}

safari.self.addEventListener("message", handleMessage, false);
