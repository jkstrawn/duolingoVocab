angular.module("superapp")
.service("DuolingoAPI", function(Vocab, VocabularyManager) {
	return {

		newVocab: [],
		duplicates: [],
		vocab_count: 0,
		ajaxQueries: 0,
		callback: null,
		language: "error",
		hints: {},

		getAnyNewVocab: function(callback) {
			VocabularyManager.addLog("START: Getting new vocab.");
			this.callback = callback;
			var that = this;
			$.ajax({
				dataType: "json",
				url: "http://www.duolingo.com/words?page=1",
				success: function(response) {
					that.vocab_count = response.vocab_count;
					that.language = response.language;
					Vocab.language = response.language_string;
					VocabularyManager.addLog("trying to get vocab for language: " + Vocab.language);

					VocabularyManager.addLog("Our vocab: " + Vocab.vocabList.length + " vs Duolingo vocab: " + that.vocab_count);
					if (that.vocab_count > Vocab.vocabList.length) {
						that.getVocabPagesFromQuery();
					} else {
						VocabularyManager.addLog("FINISH: Vocab complete");
						VocabularyManager.addLog("-------------------------------");
						that.callback(0);
					}
				},
				error: function(xhr, ajaxOptions, thrownError){
					// will fire when timeout is reached
					VocabularyManager.addLog("ERROR: " + xhr.status);
					VocabularyManager.addLog(xhr.responseText);
        			VocabularyManager.addLog(thrownError.toString());
        			if (xhr.status === 200 && 
        				thrownError.toString() === "SyntaxError: Unexpected token <") {
        				that.callback(-2);
        			} else {
        				that.callback(-1);
        			}
				},
				timeout: 30000
			});
		},

		getVocabPagesFromQuery: function(pageNumber) {
			var numOfPages = Math.ceil(this.vocab_count / 20);
			this.ajaxQueries = numOfPages;
			this.clearNewVocab();

			VocabularyManager.addLog("getting " + numOfPages + " pages..");
			var that = this;
			for (var i = 1; i <= numOfPages; i++) {
				$.ajax({
					dataType: "json",
					url: "http://www.duolingo.com/words?page="+i,
					success: function(response) {
						that.processVocabPage(response);
					},
					error: function(xhr, ajaxOptions, thrownError){
						VocabularyManager.addLog("ERROR: " + xhr.status);
						VocabularyManager.addLog(xhr.responseText);
	        			VocabularyManager.addLog(thrownError.toString());
						that.callback(-1);
					},
					timeout: 30000
				});	
			}
		},

		clearNewVocab: function() {
			this.newVocab = [];
			this.duplicates = [];	
		},

		processVocabPage: function(response) {
			VocabularyManager.addLog("processing vocab page");
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
			VocabularyManager.addLog("checking for duplicate words");
			var valuesSoFar = {};
			for (var i = 0; i < this.newVocab.length; i++) {
				var value = this.newVocab[i].word;
				if (this.wordAlreadyUsed(valuesSoFar, value)) {
					VocabularyManager.addLog("found duplicate word: " + value);
					this.duplicates.push(value);
				}
				valuesSoFar[value] = true;
			}
		},

		wordAlreadyUsed: function(valuesSoFar, value) {
			return Object.prototype.hasOwnProperty.call(valuesSoFar, value);
		},

		getHintsForNewWords: function() {
			var pages = Math.ceil(this.newVocab.length / 100);
			VocabularyManager.addLog("getting hints for all words: " + pages + " pages");
			for (var i = 0; i < pages; i++) {
				var query = this.constructHintQuery(i);

				this.ajaxQueries++;
				var that = this;
				$.ajax({
					dataType: "json",
					url:  encodeURI(query),
					success: function(response) {
						that.processHintsPage(response);
					},
					error: function(xhr, ajaxOptions, thrownError){
						VocabularyManager.addLog("ERROR: " + xhr.status);
						VocabularyManager.addLog(xhr.responseText);
						VocabularyManager.addLog(query);
	        			VocabularyManager.addLog(thrownError.toString());
						that.callback(-1);
					},
					timeout: 30000
				});				
			};

		},

		constructHintQuery: function(pageNumber) {
			var query = "http://d.duolingo.com/words/hints/" + this.language + "/en?tokens=[";
			for (var i = pageNumber * 100; i < this.newVocab.length && i < pageNumber * 100 + 100; i++) {
				if (i != pageNumber * 100) {
					query += ',';
				}
				query += "\"" + this.newVocab[i].word + "\"";
			}
			query += ']';
			return query;
		},

		processHintsPage: function(response) {
			VocabularyManager.addLog("processing hints page");

			jQuery.extend(this.hints, response);
			this.ajaxQueries--;
			this.isAllHintsQueryComplete();
		},

		isAllHintsQueryComplete: function() {
			if (this.ajaxQueries == 0) {
				this.processHints();
			}
		},

		processHints: function() {
			VocabularyManager.addLog("Processing all hints together");
			console.log(this.hints);

			for (var i = 0; i < this.newVocab.length; i++) {
				var word = this.newVocab[i].word;
				var hints = this.checkForUndefinedHints(word, this.hints);

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
			VocabularyManager.addLog("check for bad hints");
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
						//hints[_hint] = "--" + hints[_hint].slice(hints[_hint].indexOf(")") + 2);
						hints.splice(_hint, 1);
					}
				};

				if (hints.length == 0) {
					this.setNewHintForWord(i);
				}
			}
		},

		processHintsForDuplicateWords: function() {
			VocabularyManager.addLog("get hints individually for duplicate words");
			for (var duplicateIndex = 0; duplicateIndex < this.duplicates.length; duplicateIndex++) {
				var duplicate = this.duplicates[duplicateIndex];
				for (var vocabIndex = 0; vocabIndex < Vocab.vocabList.length; vocabIndex++) {
					if (Vocab.vocabList[vocabIndex].word == duplicate) {
						this.setNewHintForWord(vocabIndex);
					}
				}
			}
			this.isHintQueryComplete();
		},

		setNewHintForWord: function(index) {
			VocabularyManager.addLog("getting individual hint");
			if (this.ajaxQueries > 50) {
				VocabularyManager.addLog("ERROR: There are too many individual hint queries, aborting query");
				return;
			}
			
			this.ajaxQueries++;
			var that = this;
			$.ajax({
				dataType: "json",
				url: that.constructSingleHintURI(index),
				success: function(response) {
					that.addHintForSingleWord(response, index);
				},
				error: function(xhr, ajaxOptions, thrownError){
					VocabularyManager.addLog("ERROR: " + xhr.status);
					VocabularyManager.addLog(xhr.responseText);
        			VocabularyManager.addLog(thrownError.toString());
					that.callback(-1);
				},
				timeout: 30000
			});
		},

		constructSingleHintURI: function(index) {
			return encodeURI("http://www.duolingo.com/words/" + this.language + "/" + 
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
				VocabularyManager.addLog("FINISH: Vocab complete");
				VocabularyManager.addLog("-------------------------------");
				this.callback(this.newVocab.length);
				VocabularyManager.save();
			}
		}		
	}
});