var intervals = [
//  Mil,  Sec, Min, Hour, Days
	0,
	1000 * 60 * 60,
	1000 * 60 * 60 * 24,
	1000 * 60 * 60 * 24 * 5,
	1000 * 60 * 60 * 24 * 25,
	1000 * 60 * 60 * 24 * 90
];

chrome.browserAction.setBadgeText({"text": ""});

chrome.alarms.onAlarm.addListener(function (alarm) {
	setAlarm();
	updateVocab();
});

function setAlarm() {
	var when = Date.now() + 1000 * 60;
	chrome.alarms.create("update", {"when": when});
}

function updateVocab() {
	chrome.storage.local.get("vocabList", function(items) {
		var count = calculateWordStudyTimes(items.vocabList);
		if (count === 0) {
			chrome.browserAction.setBadgeText({"text": ""});
		} else {
			chrome.browserAction.setBadgeText({"text": count.toString()});
		}
	});
}

function calculateWordStudyTimes(vocabList) {
	var count = 0;

	for (var i = vocabList.length - 1; i >= 0; i--) {
		var level = vocabList[i].level;
		var now = new Date().getTime();
		var last = vocabList[i].last;
		var interval = now - last;
		if (interval > intervals[level]) {
			count++;
		}
	};

	return count;
}

chrome.browserAction.onClicked.addListener(function(tab) {
	updateVocab();
});

updateVocab();
setAlarm();

var executed = {}

function executeScripts(tab) {
	/*
	chrome.tabs.executeScript(null, { file: "js/jquery.js" }, function() {
		chrome.tabs.executeScript(null, { file: "js/replaceText.js" }, function() {
			chrome.tabs.executeScript(null, { file: "js/content.js" }, function() {
				executed[tab] = "jp";
			});
		});
	});
*/
	chrome.tabs.executeScript(null, { file: "js/jquery.js" });
}

chrome.tabs.onUpdated.addListener(loadOnUpdated);

function loadOnUpdated(tab, change) {
	if (change.status === 'complete') {
		delete executed[tab];
		executeScripts(tab);
	}
}


// Google Analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-36136584-2', 'auto');
ga('send', 'pageview');