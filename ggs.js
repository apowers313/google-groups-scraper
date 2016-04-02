var googleGroups = require("./google-groups-list");
var cred = require("./google-credentials");

var webdriver = require("selenium-webdriver");
var inquirer = require("inquirer");
var async = require("async");

var driver = new webdriver.Builder().forBrowser("chrome").build();
var By = webdriver.By;
var until = webdriver.until;
driver.manage().timeouts().implicitlyWait(10000);

// authenticate with Google Accounts
driver.get("http://accounts.google.com");
// TODO: this could be automated
driver.wait(until.titleIs('Sign in - Google Accounts'), 10000);
// Enter email
// <input id="Email" name="Email" placeholder="Enter your email" type="email" value="" spellcheck="false" autofocus="">
driver.findElement(By.name('Email')).sendKeys(cred.email);
// Click next
// <input id="next" name="signIn" class="rc-button rc-button-submit" type="submit" value="Next">
driver.findElement(By.name('signIn')).click();
// Wait for page to load
driver.wait(driver.isElementPresent(By.name('Passwd')), 10000);
// Enter password
// <input id="Passwd" name="Passwd" type="password" placeholder="Password" class="">
driver.findElement(By.name('Passwd')).sendKeys(cred.password);
driver.findElement(By.name('Passwd')).submit();
// Wait for title "My Account"
driver.wait(until.titleIs('My Account'), 10000);

indexGroup();

// after authenticating 
function indexGroup() {
	var i;
	
	// TODO: async series
	for (i = 0; i < googleGroups.length; i++) {
		driver.get(googleGroups[i]);
		// driver.wait(until.titleIs('Google Groups'), 30000);

		// TODO: might be able to replace this manual work with the following gist (or something like it):
		// lastHeight = driver.execute_script("return document.body.scrollHeight")
		// while True:
		//     driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
		//     time.sleep(pause)
		//     newHeight = driver.execute_script("return document.body.scrollHeight")
		//     if newHeight == lastHeight:
		//         break
		//     lastHeight = newHeight

		// load topics
		inquirer.prompt({
			type: "confirm",
			name: "throwaway",
			message: "Please scroll to the bottom of the Google Group. Are you done?",
			default: false
		}, scrapeGroup);
	}
	// 	driver.quit();
}

// after we get all the URLs for the group, scrape all the messages
function scrapeGroup(answer) {
	// scrape topic URLs
	var i, p, hrefList = [];
	async.series([
		getHrefList,
		scrapeThread
	]);

	function getHrefList(cb) {
		driver.findElements(By.xpath("//a[@class='IVILX2C-p-Q']"))
			// for each <a class=IVILX2C-p-Q ...
			.then(function(elems) {
					console.log("Group contains " + elems.length + " threads.");
					// get the href=
					async.mapSeries(elems, getHrefFromElem, function(err, res) {
						console.log ("mapSeries res:", res);
						console.log ("hrefList:", hrefList);
						cb();
					});
				},
				function(err) {
					console.log(err);
				});
	}

	function getHrefFromElem(elem, cb) {
		elem.getAttribute("href")
			.then(function(href) {
				console.log(href);
				hrefList.push(href);
				cb (null, href);
			}, function(err) {
				console.log(err);
			});
	}

	function scrapeThread(cb) {
		console.log(hrefList.length + " hrefs.");
		for (i = 0; i < hrefList.length; i++) {
			// visit topic URL
			driver.get(hrefList[i]);

			// wait for load

			// click on message

			// scrape relevant information	
		}


	}
}