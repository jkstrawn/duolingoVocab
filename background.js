var vocabList = [];
var newVocab = [];
var duplicates = [];
var vocab_count = 0;
var ajaxQueries = 0;
var currentWord = 0;

chrome.storage.local.get("vocabList", function(items) {
	vocabList = items.vocabList;
	setNextWord();
	displayNewWordAlert();
	displayWord();
});

$(document).ready(function() {
	$('#update').bind('click', function() {
		getAnyNewVocab();
	});

	$('#clear').bind('click', function() {
		vocabList = [];
		saveVocab();
	});

	$('#save').bind('click', function() {	
		saveVocab();
	});

	$('#showVocab').bind('click', function() {
		writeVocabToPage();
	});

	$('#showHints').bind('click', function() {
		showHintsForCurrentWord();
	});

	$('#addHint').bind('click', function() {
		openUserHintDiv();
	});

	document.addEventListener("keypress", function(e){
		if (e.keyCode == 13) {
			submitGuess();
		}
	});
});

function saveVocab() {
	var obj = {"vocabList": vocabList};
	chrome.storage.local.set(obj);
	console.log("vocab saved");
}

function getAnyNewVocab() {
	$.ajax({
		dataType: "json",
		url: "http://www.duolingo.com/words?page=1",
		success: function(response) {
			vocab_count = response.vocab_count;
			console.log("Our vocab: " + vocabList.length + " vs Duolingo vocab: " + vocab_count);
			if (vocab_count > vocabList.length) {
				getVocabPageFromQuery();
			} else {
				var alertDiv = document.getElementById('alert');
				alertDiv.innerHTML += "<p>There are no new words</p>";
			}
		}
	});
}

function getVocabPageFromQuery(pageNumber) {
	var numOfPages = Math.ceil(vocab_count / 20);
	ajaxQueries = numOfPages;
	clearNewVocab();

	console.log("getting " + numOfPages + " pages..");
	for (var i = 1; i <= numOfPages; i++) {
		$.ajax({
			dataType: "json",
			url: "http://www.duolingo.com/words?page="+i,
			success: processVocabPage
		});	
	}
}

function clearNewVocab() {
	newVocab = [];
	duplicates = [];	
}

function processVocabPage(response) {
	for (var wordIndex = 0; wordIndex < response.vocab.length; wordIndex++) {
		var newWord = response.vocab[wordIndex].surface_form;
		var newType = response.vocab[wordIndex].forms_data[0].pos_key;
		if (!isWordAlreadyDefined(newWord, newType)) {
			addWordToNewVocab(newWord, newType);
		}
	}
	ajaxQueries--;
	isVocabQueryComplete();
}

function isWordAlreadyDefined(word, type) {
	for (var i = 0; i < vocabList.length; i++) {
		if (oldWordMatchesNewWord(i, word, type)) {
			return true;
		}
	}
	return false;
}

function oldWordMatchesNewWord(index, word, type) {
	return vocabList[index].word == word && vocabList[index].type == type;
}

function addWordToNewVocab(word, type) {
	newVocab.push({word: word, type: type});
}

function isVocabQueryComplete() {
	if (ajaxQueries == 0) {
		checkForDuplicates();
		getHintsForNewWords();
	}
}

function checkForDuplicates() {
	var valuesSoFar = {};
	for (var i = 0; i < newVocab.length; i++) {
		var value = newVocab[i].word;
		if (wordAlreadyUsed(valuesSoFar, value)) {
			duplicates.push(value);
		}
		valuesSoFar[value] = true;
	}
}

function wordAlreadyUsed(valuesSoFar, value) {
	return Object.prototype.hasOwnProperty.call(valuesSoFar, value);
}

function getHintsForNewWords() {
	var query = constructHintQuery();

	$.ajax({
		dataType: "json",
		url:  encodeURI(query),
		success: processHints
	});
}

function constructHintQuery() {
	var query = "http://d.duolingo.com/words/hints/es/en?tokens=[";
	for (var i = 0; i < newVocab.length; i++) {
		query += "\"" + newVocab[i].word + "\"";
		if (i != newVocab.length - 1) {
			query += ',';
		}
	}
	query += ']';
	return query;
}

function processHints(response) {
	for (var i = 0; i < newVocab.length; i++) {
		var word = newVocab[i].word;
		var hints = checkForUndefinedHints(word, response[word]);

		addNewVocab(word, hints, newVocab[i].type);
	}

	checkForBadHints();
	processHintsForDuplicateWords();
}

function checkForUndefinedHints(word, hints) {
	if (!hints) {
		var newWord = word.replace("+", " ");
		hints = response[newWord];
	}
	return hints;
}

function checkForBadHints() {
	for (var i = 0; i < vocabList.length; i++) {
		if (vocabList[i].type == "Adjective" && vocabList[i].hints[0][0] == "(") {
			setNewHintForWord(i);
		}

		var hints = vocabList[i].hints;
		for (var _hint = hints.length - 1; _hint >= 0; _hint--) {
			if (hints[_hint].indexOf("(you-formal)") != -1 ||
				hints[_hint].indexOf("(I)") != -1 ||
				hints[_hint].indexOf("(he/she/it)") != -1 ||
				hints[_hint].indexOf("!") != -1) {
				hints.splice(_hint, 1);
			}
		};

		if (hints.length == 0) {
			setNewHintForWord(i);
		}
	}
}

function processHintsForDuplicateWords() {
	for (var duplicateIndex = 0; duplicateIndex < duplicates.length; duplicateIndex++) {
		var duplicate = duplicates[duplicateIndex];
		for (var vocabIndex = 0; vocabIndex < vocabList.length; vocabIndex++) {
			if (vocabList[vocabIndex].word == duplicate) {
				setNewHintForWord(vocabIndex);
			}
		}
	}
}

function setNewHintForWord(index) {
	ajaxQueries++;
	$.ajax({
		dataType: "json",
		url: constructSingleHintURI(index),
		success: function(response) {
			addHintForSingleWord(response, index);
		}
	});
}

function constructSingleHintURI(index) {
	return encodeURI("http://www.duolingo.com/words/es/" + 
		vocabList[index].word + "/" + vocabList[index].type);
}

function addHintForSingleWord(response, index) {
	var responseText = JSON.stringify(response);
	var indexOfHint = responseText.indexOf("hint");
	var newHints = [];

	while (indexOfHint >= 0) {
		var hint = getHintFromText(responseText, indexOfHint);
		newHints.push(hint);	

		responseText = responseText.slice(indexOfHint + 4);
		indexOfHint = responseText.indexOf("hint");
	}

	if (newHints.length > 0) {
		vocabList[index].hints = newHints;
	}

	ajaxQueries--;
	isHintQueryComplete();
}

function getHintFromText(text, index) {
	var smallSlice = text.slice(index + 7);
	var endIndex = smallSlice.indexOf('"');
	return smallSlice.slice(0, endIndex);
}

function isHintQueryComplete() {
	if (ajaxQueries == 0) {
		var alertDiv = document.getElementById('alert');
		alertDiv.innerHTML += "<p>Added " + newVocab.length + " new words.</p>";
		saveVocab();
	}
}

function addNewVocab (word, hints, type) {
	var wordData = {};
	wordData.hints = hints;
	wordData.word = word;
	wordData.last = new Date().getTime();
	wordData.type = type;
	wordData.isNew = true;

	vocabList.push(wordData);
}



function showHintsForCurrentWord() {
	var html = "";
	var hints = vocabList[currentWord].hints;

	if (hints) {
		for (var hint = 0; hint < hints.length && hint < 3; hint++) {
			html += "<p>" + hints[hint] + "</p>";
		}
	} else {
		html += "No hints available";
	}

	var hintsDiv = document.getElementById('hints');
	hintsDiv.innerHTML = html;
}

function displayNewWordAlert() {
	var numOfNewWord = 0;
	for (var i = 0; i < vocabList.length; i++) {
		if (vocabList[i].isNew) {
			numOfNewWord++;
		}
	};

	var div = document.getElementById('alert');
	div.innerHTML += "<p>You have " + numOfNewWord + " new words!</p>";
}

function displayWord() {
	var wordData = vocabList[currentWord];

	var html = "<h2>" + wordData.word + "</h2>";
	html += "<p>" + wordData.type + "<p>";

	var div = document.getElementById('word');
	div.innerHTML = html;
}

function submitGuess() {
	if ($("#newHint").is(":focus")) {
		submitNewUserHint();
		return;
	}

	var guessDiv = document.getElementById("guess");
	for (var i = 0; i < vocabList[currentWord].hints.length; i++) {
		if (vocabList[currentWord].hints[i] == guessDiv.value) {
			guessDiv.value = "";
			submitCorrectGuess();
		}
	};
}

function submitCorrectGuess() {
	saveWord();
	setNextWord();
	displayWord();
}

function saveWord() {
	vocabList[currentWord].isNew = false;
	vocabList[currentWord].last = new Date().getTime();
	saveVocab();
}

function setNextWord() {
	for (var i = 0; i < vocabList.length; i++) {
		if (vocabList[i].isNew) {
			currentWord = i;
			return;
		}
	};
}

function openUserHintDiv() {
	var div = document.getElementById('userHint');
	div.style.visibility = "visible";
}

function submitNewUserHint() {
	var hintInput = document.getElementById('newHint');
	addUserHint(hintInput.value);
	hintInput.value = "";

	var hintDiv = document.getElementById('userHint');
	hintDiv.style.visibility = "hidden";
}

function addUserHint(hint) {
	vocabList[currentWord].hints.push(hint);
}

















function writeVocabToPage() {
	for (var i = 0; i < vocabList.length; i++) {
		var newDiv = document.createElement('div');
		var html = "<h2>" + vocabList[i].word + "</h2>";
		html += "<p>" + vocabList[i].type + "</p>";

		var hints = vocabList[i].hints;
		if (hints) {
			for (var hint = 0; hint < hints.length && hint < 3; hint++) {
				html += "<p>" + vocabList[i].hints[hint] + "</p>";
			}
		} else {
			html += "No hints available";
		}

		var d = new Date(vocabList[i].last);
		var now = new Date();
		html += (now - d) / 1000 / 60 / 60;

		newDiv.innerHTML = html;
		document.body.appendChild(newDiv);
	}
}