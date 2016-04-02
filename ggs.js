var googleGroups = [
	"https://groups.google.com/a/fidoalliance.org/forum/#!forum/ap-tech",
	// "https://groups.google.com/a/fidoalliance.org/forum/#!forum/fido-mwg"
];

var webdriver = require("selenium-webdriver");
var inquirer = require("inquirer");
var async = require("async");

var driver = new webdriver.Builder().forBrowser("chrome").build();
var By = webdriver.By;
var until = webdriver.until;
var i, j;

// authenticate with Google
console.log("Please switch to your Chrome window to authenticate.");
driver.get("http://accounts.google.com");
inquirer.prompt({
	type: "confirm",
	name: "throwaway",
	message: "Are you done authenticating?",
	default: false
}, indexGroup);

// after authenticating 
function indexGroup() {
	for (i = 0; i < googleGroups.length; i++) {
		// TODO: might be able to replace this manual work with the following gist (or something like it):
		// lastHeight = driver.execute_script("return document.body.scrollHeight")
		// while True:
		//     driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
		//     time.sleep(pause)
		//     newHeight = driver.execute_script("return document.body.scrollHeight")
		//     if newHeight == lastHeight:
		//         break
		//     lastHeight = newHeight
		driver.get(googleGroups[i]);
		// driver.wait(until.titleIs('Google Groups'), 30000);

		// load topics
		inquirer.prompt({
			type: "confirm",
			name: "throwaway",
			message: "Please scroll to the bottom of the Google Group. Are you done?",
			default: false
		}, scrapeGroup);
	}
}

// after we get all the URLs for the group, scrape all the messages
function scrapeGroup(answer) {
	// scrape topic URLs
	var p;
	driver.findElements(By.xpath("//a[@class='IVILX2C-p-Q']"))
		// for each <a class=IVILX2C-p-Q ...
		.then(function(elems) {
				console.log(elems);
				console.log (elems.length);
				for (j = 0; j < elems.length; j++) {
					// get the href=
					console.log ("resolving attribute of", j);
					console.log (elems[j]);
					elems[j].getAttribute("href")
						.then(function(href) {
							console.log(href);
						}, function(err) {
							console.log(err);
						});
				}
			},
			function(err) {
				console.log(err);
			});

	// driver.findElements (By.xpath("//a[@class='IVILX2C-p-Q']"))
	// // driver.findElements(By.xpath("//a[@class='IVILX2C-p-Q']/@id"))
	// .then(function(elem) {
	// 	console.log("Element:", elem);
	// 	for (j = 0; j < elem.length; j++) {
	// 		console.log("Elem " + j + ":", elem.getText());
	// 	}
	// 	driver.quit();
	// }, function(err) {
	// 	console.log("Caught error:", err);
	// });

	// visit topic URL

	// scrape relevant information
}



// driver.get('https://groups.google.com/a/fidoalliance.org/forum/#!aboutgroup/fido-mwg');
// // driver.findElement(By.name('q')).sendKeys('webdriver');
// // driver.findElement(By.name('btnG')).click();
// driver.wait(until.titleIs('asdfasdf'), 10000);