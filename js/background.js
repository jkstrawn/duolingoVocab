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