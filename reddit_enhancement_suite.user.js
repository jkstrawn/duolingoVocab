document.title = "This is the new page title.";

var vocabList = [];

chrome.storage.local.get("vocabList", function(items) {
	vocabList = items.vocabList;
	console.log(vocabList);
});

function nodeInsertedCallback(event) {
	var div = event.relatedNode;
	
	if (div.className == "token-wrapper popover-wrapper") {
		var wordData = getWordData(div);

		if (wordAlreadyInList(wordData.word)) {
			return;
		}
		vocabList.push(wordData);
		var obj = {"vocabList": vocabList};

		chrome.storage.local.set(obj);
	}
};

function wordAlreadyInList(word) {
	for (var i = 0; i < vocabList.length; i++) {
		if (vocabList[i].word == word) {
			return true;
		}
	}
	return false;
}

function getWordData(div) {
	var wordData = {};
	wordData.hints = [];

	var child = div.children[0];
	wordData.word = child.innerHTML;

	//going to replace with word definition query
	var newWordDiv = $('.highlighted-new-word');
	var $table = newWordDiv.parent().find('table').first();
	$table.find('tr').each(function( index ) {
		wordData.hints.push($(this).text().trim());
	});
	wordData.hints.splice(0, 1);
	wordData.hints.splice(wordData.hints.length - 1, 1);
	wordData.last = 0;
	//------

	return wordData;
};

document.addEventListener('DOMNodeInserted', nodeInsertedCallback);

function getVocabList () {
	$.ajax({
	  dataType: "json",
	  url: "http://www.duolingo.com/words?page=2",
	  success: function(response) {
	  	console.log(response.vocab);
	  	console.log(response.vocab_count);
	  	for (var i = 0; i < response.vocab.length; i++) {
	  		console.log(response.vocab[i].surface_form);
	  	}
	  }
	});
}


//getVocabList();

