function maina(items) {
    console.log("running it up!");
    console.log(items.vocabList);
}

// The main program driver.
// main : Object ->
function main(cache) {
    var apiKey = cache[API_KEY];
    if (!apiKey) {
        console.error("No API key provided! Please use the options page to specify your API key.");
    }

    var vocabList = tryCacheOrWaniKani(cache, apiKey);
    if (!vocabList || vocabList.length == 0) {
        return; // nothing to do.
    }

    var filteredList = filterVocabList(vocabList, getFilters(cache));
    var vocabDictionary = toDictionary(filteredList);
    var dictionaryCallback = buildDictionaryCallback(vocabDictionary);

    $("body *:not(noscript):not(script)").replaceText(/\b(\S+?)\b/g, dictionaryCallback);
}

// Returns the filters to use for vocab filtering
// getFilters: Object -> [Function]
function getFilters(cache) {
    var options = cache[SRS_KEY];
    if (options) {
        return filters = options.map(function(obj, index) {
            return FILTER_MAP[obj];
        });
    }
    return [];
}   

// Returns a dictionary from String -> String. 
// tryCacheOrWaniKani : Object, String -> Object
function tryCacheOrWaniKani(cache, apiKey) {   
    function isExpired(date) {
        var then = new Date(date);
        var now = new Date();
        return (Math.abs(now - then) > 600000);
    }

    var hit = cache[VOCAB_KEY];
    if (hit && hit.vocabList) {
        if (!hit.inserted || isExpired(hit.inserted)) {
            tryWaniKani(apiKey, true);
        }
        return hit.vocabList;
    }

    var waniKaniList = tryWaniKani(apiKey, false);
    return waniKaniList;
}

// Returns a [Object] of vocabulary words from WaniKani
// tryWaniKani : String, Boolean -> [Object]
function tryWaniKani(apiKey, async) {
    if (!apiKey) {
        console.error("No API key provided! Please use the options page to specify your API key.");
        return [];
    }

    var info;
    $.ajax({
        async: async,
        accepts: "application/json",
        type: "GET",
        url: "http://www.wanikani.com/api/user/"+apiKey+"/vocabulary",
    }).done(function (response) {
        if (response.error) {
            console.error("Vocabulary request failed.");
            info = [];
        } else {
            info = response.requested_information.general;
            cacheVocabList(info);
        }
    }).fail(function (response) {
        console.error("Vocabulary request failed.");
        info = [];
    });
    return info;
}

// Caches a given [Object] of vocabulary words with an inserted date
// cacheVocabList: [Object] -> 
function cacheVocabList(vocabList) {
    var obj = {};
    obj[VOCAB_KEY] = {
        "inserted": (new Date()).toJSON(),
        "vocabList": vocabList
    };

    chrome.storage.local.set(obj);
}

// Filters the given [Object] of vocabulary words with the given list of filters.
// filterVocabList : [Object], [Function] -> [Object]
function filterVocabList(vocabList, filters) {
    return vocabList.filter(function(obj) {
        for (var i = 0; i < filters.length; i++) {
            if (filters[i](obj)) {
                return true;
            }
        }
        return false;
    });
}

// Converts a list of vocab words to a dictionary.
// toDictionary : [Object] -> Object
function toDictionary(vocabList) {
    var vocab = {};
    $.each(vocabList, function(index, value) {
        var character = value.character;
        var values = value.meaning.split(", ");
        for (var i = 0; i < values.length; i++) {
            vocab[values[i]] = character;
        }
    });
    return vocab;
}

// Creates a closure on the given dictionary.
// buildDictionaryCallback : Object -> (function(String) -> String)
function buildDictionaryCallback(vocabDictionary) {
    return function(str) {
        var translation = vocabDictionary[str.toLowerCase()];
        if (translation) {
//            return '<span class="wanikanified" title="' + str + '" onClick=";">' + translation + '<\/span>'
            return '<span class="wanikanified" title="' + str + '" data-en="' + str + '" data-jp="' + translation +
                '" onClick="var t = this.getAttribute(\'title\'); this.setAttribute(\'title\', this.innerHTML); this.innerHTML = t;">' + translation + '<\/span>';
        }
        return str;
    }
}

// kick off the program
chrome.storage.local.get("vocabList", maina);