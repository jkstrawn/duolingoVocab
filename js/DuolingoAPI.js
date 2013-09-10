angular.module("superapp")
.service("DuolingoAPI", function(Vocab, VocabularyManager) {
	return {

		newVocab: [],
		duplicates: [],
		vocab_count: 0,
		ajaxQueries: 0,
		callback: null,

		getAnyNewVocab: function(callback) {
			this.callback = callback;
			var that = this;
			$.ajax({
				dataType: "json",
				url: "http://www.duolingo.com/words?page=1",
				success: function(response) {
					that.vocab_count = response.vocab_count;
					console.log("Our vocab: " + Vocab.vocabList.length + " vs Duolingo vocab: " + that.vocab_count);
					if (that.vocab_count > Vocab.vocabList.length) {
						that.getVocabPagesFromQuery();
					} else {
						that.callback(0);
					}
				}
			});
		},

		getVocabPagesFromQuery: function(pageNumber) {
			var numOfPages = Math.ceil(this.vocab_count / 20);
			this.ajaxQueries = numOfPages;
			this.clearNewVocab();

			console.log("getting " + numOfPages + " pages..");
			var that = this;
			for (var i = 1; i <= numOfPages; i++) {
				$.ajax({
					dataType: "json",
					url: "http://www.duolingo.com/words?page="+i,
					success: function(response) {
						that.processVocabPage(response);
					}
				});	
			}
		},

		clearNewVocab: function() {
			this.newVocab = [];
			this.duplicates = [];	
		},

		processVocabPage: function(response) {
			for (var wordIndex = 0; wordIndex < response.vocab.length; wordIndex++) {
				var newWord = response.vocab[wordIndex].surface_form;
				var newType = response.vocab[wordIndex].forms_data[0].pos_key;
				if (!this.isWordAlreadyDefined(newWord, newType)) {
					this.addWordToNewVocab(newWord, newType);
				}
			}
			this.ajaxQueries--;
			this.isVocabQueryComplete();
		},

		isWordAlreadyDefined: function(word, type) {
			for (var i = 0; i < Vocab.vocabList.length; i++) {
				if (this.oldWordMatchesNewWord(i, word, type)) {
					return true;
				}
			}
			return false;
		},

		oldWordMatchesNewWord: function(index, word, type) {
			return Vocab.vocabList[index].word == word && Vocab.vocabList[index].type == type;
		},

		addWordToNewVocab: function(word, type) {
			this.newVocab.push({word: word, type: type});
		},

		isVocabQueryComplete: function() {
			if (this.ajaxQueries == 0) {
				this.checkForDuplicates();
				this.getHintsForNewWords();
			}
		},

		checkForDuplicates: function() {
			var valuesSoFar = {};
			for (var i = 0; i < this.newVocab.length; i++) {
				var value = this.newVocab[i].word;
				if (this.wordAlreadyUsed(valuesSoFar, value)) {
					this.duplicates.push(value);
				}
				valuesSoFar[value] = true;
			}
		},

		wordAlreadyUsed: function(valuesSoFar, value) {
			return Object.prototype.hasOwnProperty.call(valuesSoFar, value);
		},

		getHintsForNewWords: function() {
			var query = this.constructHintQuery();

			var that = this;
			$.ajax({
				dataType: "json",
				url:  encodeURI(query),
				success: function(response) {
					that.processHints(response);
				}
			});
		},

		constructHintQuery: function() {
			var query = "http://d.duolingo.com/words/hints/es/en?tokens=[";
			for (var i = 0; i < this.newVocab.length; i++) {
				query += "\"" + this.newVocab[i].word + "\"";
				if (i != this.newVocab.length - 1) {
					query += ',';
				}
			}
			query += ']';
			return query;
		},

		processHints: function(response) {
			for (var i = 0; i < this.newVocab.length; i++) {
				var word = this.newVocab[i].word;
				var hints = this.checkForUndefinedHints(word, response);

				Vocab.addNewVocab(word, hints, this.newVocab[i].type);
			}

			this.checkForBadHints();
			this.processHintsForDuplicateWords();
		},

		checkForUndefinedHints: function(word, response) {
			var hints = response[word];
			if (!hints) {
				var newWord = word.replace("+", " ");
				hints = response[newWord];
			}
			return hints;
		},

		checkForBadHints: function() {
			for (var i = 0; i < Vocab.vocabList.length; i++) {
				if (Vocab.vocabList[i].type == "Adjective" && Vocab.vocabList[i].hints[0][0] == "(") {
					this.setNewHintForWord(i);
				}

				var hints = Vocab.vocabList[i].hints;
				for (var _hint = hints.length - 1; _hint >= 0; _hint--) {
					if (hints[_hint].indexOf("!") != -1) {
						hints.splice(_hint, 1);
					} else
					if (hints[_hint].indexOf("(you-formal)") != -1 ||
						hints[_hint].indexOf("(I)") != -1 ||
						hints[_hint].indexOf("(he/she/it)") != -1 ||
						hints[_hint].indexOf("(I/he/she/it/you)") != -1) {
						hints[_hint] = hints[_hint].slice(hints[_hint].indexOf(")") + 2);
					}
				};

				if (hints.length == 0) {
					this.setNewHintForWord(i);
				}
			}
		},

		processHintsForDuplicateWords: function() {
			for (var duplicateIndex = 0; duplicateIndex < this.duplicates.length; duplicateIndex++) {
				var duplicate = this.duplicates[duplicateIndex];
				for (var vocabIndex = 0; vocabIndex < Vocab.vocabList.length; vocabIndex++) {
					if (Vocab.vocabList[vocabIndex].word == duplicate) {
						this.setNewHintForWord(vocabIndex);
					}
				}
			}
		},

		setNewHintForWord: function(index) {
			this.ajaxQueries++;
			var that = this;
			$.ajax({
				dataType: "json",
				url: that.constructSingleHintURI(index),
				success: function(response) {
					that.addHintForSingleWord(response, index);
				}
			});
		},

		constructSingleHintURI: function(index) {
			return encodeURI("http://www.duolingo.com/words/es/" + 
				Vocab.vocabList[index].word + "/" + Vocab.vocabList[index].type);
		},

		addHintForSingleWord: function(response, index) {
			var responseText = JSON.stringify(response);
			var indexOfHint = responseText.indexOf("hint");
			var newHints = [];

			while (indexOfHint >= 0) {
				var hint = this.getHintFromText(responseText, indexOfHint);
				newHints.push(hint);	

				responseText = responseText.slice(indexOfHint + 4);
				indexOfHint = responseText.indexOf("hint");
			}

			if (newHints.length > 0) {
				Vocab.vocabList[index].hints = newHints;
			}

			this.ajaxQueries--;
			this.isHintQueryComplete();
		},

		getHintFromText: function(text, index) {
			var smallSlice = text.slice(index + 7);
			var endIndex = smallSlice.indexOf('"');
			return smallSlice.slice(0, endIndex);
		},

		isHintQueryComplete: function() {
			if (this.ajaxQueries == 0) {
				this.callback(this.newVocab.length);
				VocabularyManager.save();
			}
		}		
	}
});