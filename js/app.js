var app = angular.module("superapp", []);

app.config( function($routeProvider) {

	$routeProvider.when( "/home", { templateUrl: 'home.html', controller: "HomeController"});
	$routeProvider.when( "/practice", { templateUrl: 'practice.html', controller: "PracticeController"});
	$routeProvider.when( "/vocab", { templateUrl: 'vocab.html', controller: "VocabController"});

	$routeProvider.otherwise({ redirectTo: "/home"});
});

app.controller("HomeController", function($scope, $location, VocabularyManager, Vocab, Accents, DuolingoAPI) {

	$scope.queryInProgress = false;
	$scope.numberOfWordsToStudy = 0;


	$scope.go = function ( path ) {
		$location.path( path );
	};

	$scope.init = function() {
		if (Vocab.vocabList.length == 0) {
			VocabularyManager.init($scope.setNumberOfWordsToStudy);
		} else {
			$scope.numberOfWordsToStudy = VocabularyManager.getNumberOfWordsToStudy();
		}
	};

	$scope.reset = function() {
		Vocab.vocabList = [];
		VocabularyManager.save();
		$scope.numberOfWordsToStudy = VocabularyManager.getNumberOfWordsToStudy();
	};

	$scope.update = function() {
		$scope.queryInProgress = true;
		$scope.message = "";
		$scope.notificationClass = "";
		DuolingoAPI.getAnyNewVocab($scope.queryEnded);
	};

	$scope.queryEnded = function(numberOfWords) {

		if (numberOfWords == -1) {
			$scope.notificationClass = "notification color-red";
			$scope.message = "Duolingo not responding. Try again later.";
		} else
		if (numberOfWords == 0) {
			$scope.notificationClass = "notification color-yellow";
			$scope.message = "There were no new words.";
		} else {
			$scope.notificationClass = "notification color-green";
			$scope.message = "There were " + numberOfWords + " new words added.";
		}
		$scope.queryInProgress = false;
		$scope.numberOfWordsToStudy = VocabularyManager.getNumberOfWordsToStudy();
		$scope.$apply();
	};

	$scope.setNumberOfWordsToStudy = function(number) {
		console.log(Vocab.vocabList);
		$scope.numberOfWordsToStudy = number;
		$scope.$apply();
	};

	$scope.setToNotNew = function() {
		for (var i = Vocab.vocabList.length - 1; i >= 0; i--) {
			if (Vocab.vocabList[i].isNew) {
				Vocab.vocabList[i].isNew = false;
				Vocab.vocabList[i].level = 1;
				Vocab.vocabList[i].toStudy = false;
			}
		};
		VocabularyManager.save();
	};
});

app.controller("VocabController", function($scope, $location) {
	$scope.go = function ( path ) {
		$location.path( path );
	};
});

app.controller("PracticeController", function($scope, $location, VocabularyManager, Vocab, Accents) {
	$scope.input = "";
	$scope.practicingWord = false;
	$scope.guessesInEnglish = true;
	$scope.word = {title: "test", show: "test2", type: "Noun"};
	$scope.showCorrectWord = false;
	$scope.inputClass = "";
	$scope.isWrongGuess = false;

	$scope.go = function ( path ) {
		$location.path( path );
	};

	$scope.init = function() {
		console.log("starting!");
		VocabularyManager.setNextNewWord($scope.setNextNewWord);
	};

	$scope.changeGuessLanguage = function() {
		$scope.guessesInEnglish = !$scope.guessesInEnglish;
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

		if ($scope.input == "") {
			return;
		}

		if ($scope.showCorrectWord) {
			VocabularyManager.setNextNewWord($scope.setNextNewWord);
			return;
		}

		$scope.showCorrectWord = true;

		if (VocabularyManager.isGuessCorrect($scope.input, $scope.guessesInEnglish)) {
			$scope.inputClass = "correct";
		} else {
			$scope.isWrongGuess = true;
			$scope.inputClass = "incorrect";
		}
		VocabularyManager.updateWord(!$scope.isWrongGuess);

		if(!$scope.$$phase) {
			$scope.$apply();
		}
	};

	$scope.setNextNewWord = function(isNew) {

			console.log("change word");
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
		$scope.showCorrectWord = false;
		$scope.inputClass = "";
		$scope.input = "";
		$scope.isWrongGuess = false;
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
	}
});

app.service("VocabularyManager", function(Vocab, Intervals) {
	return {
		init: function(callback) {
			var that = this;

			chrome.storage.local.get("vocabList", function(items) {
				Vocab.vocabList = items.vocabList;
				var numberOfWordsToStudy = 0;

				if (!Vocab.vocabList) {
					Vocab.vocabList = [];
				} else {
					that.calculateWordStudyTimes();
					numberOfWordsToStudy = that.getNumberOfWordsToStudy();
				}

				callback(numberOfWordsToStudy);
			});
		},

		getNumberOfWordsToStudy: function() {
			var number = 0;
			for (var i = Vocab.vocabList.length - 1; i >= 0; i--) {
				if (Vocab.vocabList[i].toStudy) {
					number++;
				}
			};
			return number;
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

			for (var i = 0; i < Vocab.vocabList.length; i++) {
				if (Vocab.vocabList[i].toStudy) {
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

		calculateWordStudyTimes: function() {
			for (var i = Vocab.vocabList.length - 1; i >= 0; i--) {
				var level = Vocab.vocabList[i].level;
				var now = new Date().getTime();
				var last = Vocab.vocabList[i].last;
				var interval = now - last;
				if (interval > Intervals.intervals[level]) {
					Vocab.vocabList[i].toStudy = true;
				}
			};
		},

		updateWord: function(firstGuess) {
			Vocab.currentWord.isNew = false;
			var now = new Date().getTime();
			if (firstGuess) {
				Vocab.currentWord.toStudy = false;
				var level = Vocab.currentWord.level;
				var actualInterval = now - Vocab.currentWord.last;
				var expectedInterval = Intervals.intervals[level];
				if (actualInterval > expectedInterval) {
					Vocab.currentWord.level++;
				}
			} else {
				this.moveCurrentWordToEndOfList();
			}
			Vocab.currentWord.last = now;
			console.log("Level: " + Vocab.currentWord.level + " -- tostudy: " + Vocab.currentWord.toStudy);
			this.save();
		},

		moveCurrentWordToEndOfList: function() {
			Vocab.vocabList.splice(Vocab.currentWordIndex, 1);
			Vocab.vocabList.push(Vocab.currentWord);
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
			wordData.toStudy = true;
			wordData.level = 0;

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

app.factory("Intervals", function() {
	var intervals = [
	//  Mil,  Sec, Min, Hour, Days
		0,
		1000 * 60 * 60,
		1000 * 60 * 60 * 24,
		1000 * 60 * 60 * 24 * 5,
		1000 * 60 * 60 * 24 * 25,
		1000 * 60 * 60 * 24 * 90
	];
	return {intervals: intervals};
});

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keypress", function (event) {
            if(event.which === 13) {
                //scope.submitGuess();

                //event.preventDefault();
            } else
            if (event.which === 96) {
                scope.addAccentToLastCharacter();

                event.preventDefault();
            }
        });
    };
});

app.directive('focusMe', function($timeout) {
	return {
		link: function(scope, element, attrs) {
			scope.$watch(attrs.focusMe, function(value) {
				element[0].focus();
			});
		}
	};
});

$( window ).bind('keypress', function(e){
	if ( e.keyCode == 13 ) {
		$( "#invisible" ).click();
	}
});