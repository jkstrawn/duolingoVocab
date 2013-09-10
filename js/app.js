var app = angular.module("superapp", []);

app.config( function($routeProvider) {

	$routeProvider.when( "/home", { templateUrl: 'home.html', controller: "HomeController"});
	$routeProvider.when( "/practice", { templateUrl: 'practice.html', controller: "PracticeController"});
	$routeProvider.when( "/vocab", { templateUrl: 'vocab.html', controller: "VocabController"});

	$routeProvider.otherwise({ redirectTo: "/home"});
});

app.controller("HomeController", function($scope, VocabularyManager, Vocab, Accents, DuolingoAPI) {

	$scope.queryInProcess = false;

	$scope.init = function() {
		VocabularyManager.init($scope);
	};

	$scope.reset = function() {
		Vocab.vocabList = [];
		VocabularyManager.save();
	};

	$scope.update = function() {
		$scope.queryInProcess = true;
		DuolingoAPI.getAnyNewVocab($scope.queryEnded);
	};

	$scope.queryEnded = function(numberOfWords) {
		console.log("query enede: " + numberOfWords);
		$scope.queryInProcess = false;
		$scope.$apply();
	};
});

app.controller("PracticeController", function($scope, VocabularyManager, Vocab, Accents) {
	$scope.showWord = false;
	$scope.input = "";
	$scope.practicingWord = false;
	$scope.guessesInEnglish = true;
	$scope.word = {title: "test", show: "test2", type: "Noun"};
	$scope.styles = {outlineColor: "rgb(91, 157, 217)"};
	$scope.showCorrectWord = false;

	$scope.init = function() {
		console.log("starting!");
		VocabularyManager.setNextNewWord($scope.setNextNewWord);

		if ($scope.practicingWord) {
			$scope.showWord = true;
		}
	};

	$scope.changeGuessLanguage = function() {
		this.changeCurrentWord();
	};

	$scope.addAccentToLastCharacter = function() {
		var lastLetter = $scope.input.charCodeAt($scope.input.length - 1);
		var accentCharCode = Accents.accents[lastLetter];
		var newLetter = String.fromCharCode(accentCharCode);

		if (accentCharCode) {
			$scope.input = this.replaceLastCharacter($scope.input, newLetter);
			$scope.$apply();
		}
	};

	$scope.replaceLastCharacter = function(text, character) {
		return text.substr(0, text.length - 1) + character;
	};

	$scope.submitGuess = function() {
		if (!$scope.input) return;

		if (VocabularyManager.isGuessCorrect($scope.input, $scope.guessesInEnglish)) {
			$scope.input = "";
			VocabularyManager.updateWord();
			VocabularyManager.setNextNewWord($scope.setNextNewWord);
		} else {
			$scope.incorrectGuess();
			$scope.styles = {outlineColor: "red"};
			$scope.$apply();
		}
	};

	$scope.setNextNewWord = function(isNew) {
		console.log("starting a new word: " + isNew);
		if (isNew) {
			$scope.changeCurrentWord();
			$scope.practicingWord = true;
		} else {
			$scope.practicingWord = false;
		}
		if(!$scope.$$phase) {
			$scope.$apply();
		}
	}

	$scope.changeCurrentWord = function() {
		$scope.word = $scope.generateWordData();
		$scope.styles = {outlineColor: "rgb(91, 157, 217)"};
		$scope.showCorrectWord = false;
	},

	$scope.generateWordData = function() {
		if ($scope.guessesInEnglish) {
			return $scope.generateEnglishWordData();
		} else {
			return $scope.generateForeignWordData();
		}
	}

	$scope.generateEnglishWordData = function() {
		var word = {
			title: "Defintions", 
			show: Vocab.getFirstThreeHints().join(", "), 
			type: Vocab.currentWord.type,
			correct: Vocab.currentWord.word
		};
		return word;
	},

	$scope.generateForeignWordData = function() {
		var word = {
			title: "Current Word", 
			show: Vocab.currentWord.word, 
			type: Vocab.currentWord.type,
			correct: Vocab.currentWord.hints[0]
		};
		return word;
	},

	$scope.incorrectGuess = function() {
		$scope.showCorrectWord = true;
	}
});

app.service("VocabularyManager", function(Vocab) {
	return {
		init: function() {
			chrome.storage.local.get("vocabList", function(items) {
				Vocab.vocabList = items.vocabList;

				if (!Vocab.vocabList) {
					Vocab.vocabList = [];
				}

				console.log(Vocab.vocabList);
			});
		},

		save: function() {
			var obj = {"vocabList": Vocab.vocabList};
			chrome.storage.local.set(obj);
			console.log("vocab saved");
		},

		setNextNewWord: function(callback) {
			for (var i = 0; i < Vocab.vocabList.length; i++) {
				if (Vocab.vocabList[i].isNew) {
					Vocab.setWordIndex(i);
					callback(true);
					return;
				}
			};
			callback(false);
		},

		isGuessCorrect: function(guess, guessForWord) {
			if (guessForWord) {
				return this.isGuessForWordCorrect(guess);
			}
			return this.isGuessForHintsCorrect(guess);
		},

		isGuessForHintsCorrect: function(guess) {
			var hints = Vocab.currentWord.hints;
			for (var i = 0; i < hints.length; i++) {
				if (hints[i].indexOf('(') != -1) {
					hints.push(hints[i].replace(/ *\([^)]*\) */g, ""));
				}
				if (hints[i].substring(0, 4) == "(to)") {
					hints.push("to " + hints[i].slice(5));
				}
				if (hints[i] == guess) {
					return true;
				}		
			};
			return false;	
		},

		isGuessForWordCorrect: function(guess) {
			return (guess == Vocab.currentWord.word);
		},

		updateWord: function() {
			Vocab.currentWord.isNew = false;
			Vocab.currentWord.last = new Date().getTime();
			this.save();
		}
	};
});

app.factory("Vocab", function() {
	return {
		vocabList: [], 
		currentWordIndex: -1,
		currentWord: {word: "otter", type: "Noun"},

		setWordIndex: function(index) {
			this.currentWordIndex = index;
			this.currentWord = this.vocabList[index];
		},

		addNewVocab: function(word, hints, type) {
			var wordData = {};
			wordData.hints = hints;
			wordData.word = word;
			wordData.last = new Date().getTime();
			wordData.type = type;
			wordData.isNew = true;

			this.vocabList.push(wordData);
		},

		getFirstThreeHints: function() {
			var hints = [];

			for (var i = 0; i < 3 && i < this.currentWord.hints.length; i++) {
				hints.push(this.currentWord.hints[i]);
			}

			return hints;
		}
	};
});

app.factory("Accents", function() {
	var accents = {
		97:  225,   // a -> á
		225: 97,    // á -> a
		101: 233,   // e -> é
		233: 101,   // é -> e
		105: 237,   // i -> í
		237: 105,   // í -> i
		111: 243,   // o -> ó
		243: 111,   // ó -> o
		117: 250,   // u -> ú
		250: 252,   // ú -> ü
		252: 117,   // ü -> u
		110: 241,   // n -> ñ
		241: 110    // ñ -> n
	};
	return {accents: accents};
});

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keypress", function (event) {
            if(event.which === 13) {
                scope.submitGuess();

                event.preventDefault();
            } else
            if (event.which === 96) {
                scope.addAccentToLastCharacter();

                event.preventDefault();
            }
        });
    };
});