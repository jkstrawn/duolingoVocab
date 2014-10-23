var app = angular.module("superapp", []);

app.config( function($routeProvider) {

	$routeProvider.when( "/home", { templateUrl: 'home.html', controller: "HomeController"});
	$routeProvider.when( "/practice", { templateUrl: 'practice.html', controller: "PracticeController"});
	$routeProvider.when( "/vocab", { templateUrl: 'vocab.html', controller: "VocabController"});
	$routeProvider.when( "/settings", { templateUrl: 'settings.html', controller: "SettingsController"});
	$routeProvider.when( "/logs", { templateUrl: 'logs.html', controller: "LogController"});

	$routeProvider.otherwise({ redirectTo: "/home"});
});

app.controller("HomeController", function($scope, $location, VocabularyManager, Vocab, Accents, DuolingoAPI) {

	_gaq.push(['_trackPageview', window.location.hash]);
	$scope.queryInProgress = false;
	$scope.numberOfWordsToStudy = 0;
	$scope.studyLanguage = "";

	$scope.go = function ( path ) {
		$location.path( path );
	};

	$scope.init = function() {
		if (Vocab.vocabList.length == 0) {
			VocabularyManager.init($scope.setNumberOfWordsToStudy);
		} else {
			$scope.studyLanguage = Vocab.language;
			$scope.numberOfWordsToStudy = VocabularyManager.getNumberOfWordsToStudy();
		}
	};

	$scope.reset = function() {
		Vocab.vocabList = [];
		Vocab.language = "";
		Vocab.fromLanguage = "";
		VocabularyManager.save();
		VocabularyManager.saveStudyLanguage();
		$scope.studyLanguage = "";
		$scope.numberOfWordsToStudy = 0;
	};

	$scope.update = function() {
		$scope.queryInProgress = true;
		$scope.message = "";
		$scope.notificationClass = "";
		DuolingoAPI.getAnyNewVocab($scope.queryEnded);
	};

	$scope.queryEnded = function(numberOfWords) {
		if (Vocab.language && numberOfWords > 0) {
			$scope.studyLanguage = Vocab.language;
			VocabularyManager.saveStudyLanguage();
		}

		if (numberOfWords == -1) {
			$scope.notificationClass = "notification notification-error";
			$scope.message = "Duolingo is not responding. Try again later.";
		} else
		if (numberOfWords === -2) {
			$scope.notificationClass = "notification notification-error";
			$scope.message = "You are not logged in.";
		} else
		if (numberOfWords == 0) {
			$scope.notificationClass = "notification notification-warning";
			$scope.message = "There were no new words.";
		} else {
			$scope.notificationClass = "notification notification-success";
			$scope.message = "There were " + numberOfWords + " new words added.";
		}
		$scope.queryInProgress = false;
		$scope.numberOfWordsToStudy = VocabularyManager.getNumberOfWordsToStudy();
		$scope.$apply();
	};

	$scope.setNumberOfWordsToStudy = function(number) {
		console.log(Vocab.vocabList);
		//$scope.checkForWordWithSameMeaning();
		$scope.studyLanguage = Vocab.language;
		$scope.numberOfWordsToStudy = number;
		$scope.$apply();
	};

	$scope.checkForWordWithSameMeaning = function() {
		console.log("checking words...");
		for (var first = 0; first < Vocab.vocabList.length; first++) {
			var hints = Vocab.vocabList[first].hints;
			var valuesSoFar = {};
			for (var _hint = 0; _hint < hints.length && _hint < 3; _hint++) {
				valuesSoFar[hints[_hint]] = true;
			};
			for (var second = first + 1; second < Vocab.vocabList.length; second++) {
				var secondHints = Vocab.vocabList[second].hints;
				for (var _hint2 = 0; _hint2 < secondHints.length; _hint2++) {
					var value = secondHints[_hint2];
					if (Object.prototype.hasOwnProperty.call(valuesSoFar, value)) {
						console.log("hints for " + Vocab.vocabList[first].word  + 
							" could also be for " + Vocab.vocabList[second].word + 
							" because of hint: " + value);
					}
				};
			}
		};



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

app.controller("VocabController", function($scope, $location, Vocab) {
	_gaq.push(['_trackPageview', window.location.hash]);

	$scope.vocab = Vocab.vocabList;

	$scope.go = function ( path ) {
		$location.path( path );
	};
});

app.controller("LogController", function($scope, $location, VocabularyManager) {
	_gaq.push(['_trackPageview', window.location.hash]);

	$scope.logs = VocabularyManager.logs;

	$scope.go = function ( path ) {
		$location.path( path );
	};
});

app.controller("SettingsController", function($scope, $location) {
	_gaq.push(['_trackPageview', window.location.hash]);

	$scope.go = function ( path ) {
		$location.path( path );
	};
});

app.controller("PracticeController", function($scope, $location, VocabularyManager, Vocab, Accents, Intervals) {
	_gaq.push(['_trackPageview', window.location.hash]);
	$scope.input = "";
	$scope.practicingWord = false;
	$scope.guessesInEnglish = true;
	$scope.word = {title: "test", show: "test2", type: "Noun"};
	$scope.showCorrectWord = false;
	$scope.inputClass = "";
	$scope.isWrongGuess = false;
	$scope.isRightGuess = false;
	$scope.interval = [false, false, false];
	$scope.studyTime = "unknown";
	$scope.showAccentReminder = false;
	$scope.showAccentError = false;
	$scope.language = Vocab.language;
	$scope.fromLanguage = Vocab.fromLanguage;

	$scope.go = function ( path ) {
		$location.path( path );
	};

	$scope.init = function() {
		console.log(window.location.hash);
		console.log("starting!");
		if (Accents.accents[Vocab.language]) {
			$scope.showAccentReminder = true;
		} else {
			$scope.showAccentError = true;
		}
		VocabularyManager.setNextNewWord($scope.setNextNewWord);
	};

	$scope.setInterval = function(i) {
		var value = $scope.interval[i];
		$scope.interval = [false, false, false];
		$scope.interval[i] = value;
	}

	$scope.changeGuessLanguage = function() {
		$scope.guessesInEnglish = !$scope.guessesInEnglish;
		this.changeCurrentWord();
	};

	$scope.addAccentToLastCharacter = function() {
		if (!Accents.accents[Vocab.language]) return;

		var lastLetter = $scope.input.charCodeAt($scope.input.length - 1);
		var accentCharCode = Accents.accents[Vocab.language][lastLetter];
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

		$scope.focusInput = false;
		$scope.showCorrectWord = true;
		$scope.showAccentReminder = false;
		$scope.showAccentError = false;

		var result = VocabularyManager.isGuessCorrect($scope.input, $scope.guessesInEnglish);
		if (result.correct) {
			if (result.typo) {
				$scope.isCorrection = true;
			} else {
				$scope.isRightGuess = true;
			}
			$scope.inputClass = "correct";
			$scope.interval = [false, false, false];
		} else {
			$scope.isWrongGuess = true;
			$scope.inputClass = "incorrect";
		}
		VocabularyManager.updateWord(!$scope.isWrongGuess);
		$scope.updateStudyTime();

		_gaq.push(['_trackEvent', "Study", 'Studied Word']);

		if(!$scope.$$phase) {
			$scope.$apply();
		}
	};

	$scope.updateStudyTime = function() {
		$scope.studyTime = Intervals.text[Vocab.currentWord.level];
	};

	$scope.setNextNewWord = function(isNew) {
		var desiredInterval = $scope.getUserDefinedInterval();
		if (desiredInterval > -1) {
			VocabularyManager.setUserDefinedInterval(desiredInterval + 2);
		}

		$scope.clearPracticeDiv();
		if (isNew) {
			$scope.changeCurrentWord();
			$scope.practicingWord = true;
		} else {
			$scope.practicingWord = false;
		}
		$scope.focusInput = true;
		//$scope.$broadcast('focusInput');
		if(!$scope.$$phase) {
			$scope.$apply();
		}
	}

	$scope.clearPracticeDiv = function() {
		$scope.showCorrectWord = false;
		$scope.inputClass = "";
		$scope.input = "";
		$scope.isWrongGuess = false;
		$scope.isRightGuess = false;
		$scope.isCorrection = false;
	};

	$scope.changeCurrentWord = function() {
		$scope.word = $scope.generateWordData();
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
	};

	$scope.generateForeignWordData = function() {
		var word = {
			title: "Current Word", 
			show: Vocab.currentWord.word, 
			type: Vocab.currentWord.type,
			correct: Vocab.currentWord.hints[0]
		};
		return word;
	};

	$scope.getUserDefinedInterval = function() {
		for (var i = $scope.interval.length - 1; i >= 0; i--) {
			if ($scope.interval[i] == true) {
				return i;
			}
		};
		return -1;
	};
});

app.service("VocabularyManager", function(Vocab, Intervals) {
	return {
		logs: [],

		init: function(callback) {
			this.logs.push({'message': 'Logging information:', "number": 1});
			var that = this;

			chrome.storage.local.get("language", function(item) {
				Vocab.language = item.language.to;
				Vocab.fromLanguage = item.language.from;
			});

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

		saveStudyLanguage: function() {
			var obj = {"language": {"to": Vocab.language, "from": Vocab.fromLanguage}};
			chrome.storage.local.set(obj);
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
			console.log("guess");
			if (guessForWord) {
				return this.isGuessForWordCorrect(guess);
			}
			return this.isGuessForHintsCorrect(guess);
		},

		isGuessForHintsCorrect: function(guess) {
			console.log("checking against english words");
			var hints = Vocab.currentWord.hints;

			for (var i = 0; i < hints.length; i++) {
				if (hints[i].indexOf('(') != -1) {
					hints.push(hints[i].replace(/ *\([^)]*\) */g, ""));
				}
				if (hints[i].substring(0, 4) == "(to)") {
					hints.push("to " + hints[i].slice(5));
				}
				if (hints[i] == guess || hints[i] == guess.toLowerCase() || hints[i] == guess.trim()) {
					return {correct: true, typo: false};
				} else {
					var result = this.checkForTypo(guess, hints[i]);
					if (result.correct) {
						return result;
					}
				}
			};
			
			return {correct: false, typo: false};	
		},

		isGuessForWordCorrect: function(guess) {
			if (guess == Vocab.currentWord.word) {
				return {correct: true, typo: false};
			}
			return this.checkForTypo(guess, Vocab.currentWord.word);
		},

		checkForTypo: function(word, expected) {
			var offByLetter = 0;
			word = word.split("");
			expected = expected.split("");

			if (expected.length == word.length) {
				for (var i = 0; i < expected.length; i++) {
					if (expected[i] != word[i]) {
						offByLetter++;
					}
				};		
			} else {
				for (var i = 0; i < expected.length || i < word.length; i++) {
					if (expected[i] != word[i]) {
						offByLetter++;
						if (expected.length > word.length) {
							word.splice(i, 0, " ");
						} else {
							word.splice(i, 1);
						}
					}
				};
			}

			if (offByLetter < 2) {
				return {correct: true, typo: true};
			}
			return {correct: false, typo: false};
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
		},

		setUserDefinedInterval: function(level) {
			Vocab.currentWord.level = level;
			this.save();
		},

		addLog: function(message) {
			console.log(message);
			if (this.logs[this.logs.length - 1].message == message) {
				this.logs[this.logs.length - 1].number++;
			} else {
				this.logs.push({'message': message, 'number': 1});
			}
		}
	};
});

app.factory("Vocab", function() {
	return {
		vocabList: [], 
		currentWordIndex: -1,
		currentWord: {word: "otter", type: "Noun"},
		language: "",
		fromLanguage: "",

		setWordIndex: function(index) {
			this.currentWordIndex = index;
			this.currentWord = this.vocabList[index];
		},

		addNewVocab: function(word, hints, type) {
			var wordData = {};
			wordData.hints = hints;
			wordData.word = word;
			wordData.last = new Date().getTime();
			wordData.type = type || "unknown type";
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
		// Spanish
		'Spanish': {
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
		},
		// German
		'German' : {
			97:  228, 	// a -> ä
			111: 246, 	// o -> ö
			117: 252, 	// u -> ü
			98:  223, 	// b -> ß
			228: 97 , 	// ä -> a
			246: 111, 	// ö -> o
			252: 117, 	// ü -> u
			223: 98  	// ß -> b
		},
		// French
		'French' : {
			97:  224,	// a -> à 
			224: 226,	// à -> â 
			226: 230,	// â -> æ 
			230: 97 ,	// æ -> a 
			101: 232,	// e -> è 
			232: 233,	// è -> é 
			233: 234,	// é -> ê 
			234: 235,	// ê -> ë 
			235: 101,	// ë -> e 
			105: 238,	// i -> î 
			238: 239,	// î -> ï 
			239: 105,	// ï -> i 
			111: 244,	// o -> ô 
			244: 339,	// ô -> œ
			339: 111,	// œ -> o
			117: 249,	// u -> ù 
			249: 251,	// ù -> û 
			251: 252,	// û -> ü 
			252: 117,	// ü -> u 
			99:  231,	// c -> ç 
			231: 99		// ç -> c 
		},
		// Portuguese
		'Portuguese' : {
			97:  224,	// a -> à 
			224: 225,	// à -> á 
			225: 226,	// á -> â 
			226: 227,	// â -> ã
			227: 97,	// ã -> a 
			101: 233,	// e -> é 
			233: 234,	// é -> ê
			234: 101,	// ê -> e 
			105: 237,	// i -> í
			237: 105,	// í -> i 
			111: 243,	// o -> ó 
			243: 244,	// ó -> ô 
			244: 245,	// ô -> õ
			245: 111,	// õ -> o 
			117: 250,	// u -> ú 
			250: 252,	// ú -> ü
			252: 117,	// ü -> u 
			99:  231,	// c -> ç
			231: 99 	// ç -> c
		},
		// Italian
		'Italian' : {
			97:  224,	// a -> à 
			224: 225,	// à -> á
			225: 97,	// á -> a 
			101: 232,	// e -> è 
			232: 233,	// è -> é
			233: 101,	// é -> e 
			105: 236,	// i -> ì 
			236: 237,	// ì -> í
			237: 105,	// í -> i 
			111: 242,	// o -> ò 
			242: 243,	// ò -> ó
			243: 111,	// ó -> o 
			117: 249,	// u -> ù 
			249: 250,	// ù -> ú
			250: 117	// ú -> u
		}
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
	var text = [
		"now",
		"1 hour",
		"1 day",
		"5 days",
		"25 days",
		"3 months"
	];
	return {intervals: intervals, text: text};
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
				console.log("focus");
				element[0].focus();
			});
		}
	};
});

$( window ).bind('keypress', function(e){
	//console.log(e.keyCode);
	if ( e.keyCode == 13 ) {
		$( "#invisible" ).click();
	}
	if (e.keyCode == 49) {

	chrome.storage.local.get("vocabList", function(result) {
		var data = JSON.stringify(result);
		var html = "<div>" + data + "</div>";
		
		//document.getElementById("home").innerHTML = html;
	});

		$("#interval1").click();
	}
	if (e.keyCode == 50) {
		$("#interval2").click();
	}
	if (e.keyCode == 51) {
		$("#interval3").click();
	}
});

$(document).keydown(function(e) {
    var elid = $(document.activeElement).hasClass('duolingo-input');
    if (e.keyCode === 8 && !elid) {
        return false;
    };
});

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-36136584-2']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();