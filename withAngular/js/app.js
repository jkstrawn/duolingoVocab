var app = angular.module("superapp", []);

app.config( function($routeProvider) {

	$routeProvider.when( "/home", { templateUrl: 'home.html', controller: "HomeController"});

	$routeProvider.otherwise({ redirectTo: "/home"});
});

app.controller("HomeController", function($scope, VocabularyManager, Vocab) {
	$scope.title = "I'm the homepage";
	$scope.message = "Welcome nub";
	$scope.currentWord = Vocab.currentWord;



	$scope.init = function() {
		VocabularyManager.init();
	};

	$scope.save = function() {
		VocabularyManager.save();
	};
});

app.service("VocabularyManager", function(Vocab) {
	return {
		init: function() {
			var newVocab = [];
			var duplicates = [];
			var vocab_count = 0;
			var ajaxQueries = 0;
			var ctrlDown = false;
			
			console.log(Vocab.vocabList.length);
			var that = this;

			chrome.storage.local.get("vocabList", function(items) {
				if (items) {
					Vocab.vocabList = items.vocabList;
					console.log(Vocab.vocabList.length);
				}

				that.getNextNewWord();
			});
		},

		save: function() {
			var obj = {"vocabList": Vocab.vocabList};
			chrome.storage.local.set(obj);
			console.log("vocab saved");
		},

		getNextNewWord: function() {
			for (var i = 0; i < Vocab.vocabList.length; i++) {
				if (Vocab.vocabList[i].isNew) {
					Vocab.currentWord = i;
					return;
				}
			};
		},

		addNewVocab: function(word, hints, type) {
			var wordData = {};
			wordData.hints = hints;
			wordData.word = word;
			wordData.last = new Date().getTime();
			wordData.type = type;
			wordData.isNew = true;

			Vocab.vocabList.push(wordData);
		}
	};
});

app.factory("Vocab", function() {
	return {vocabList: [], currentWord: -1};
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