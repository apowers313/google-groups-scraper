var googleGroups = require("./google-groups-list");
var cred = require("./google-credentials");

var webdriver = require("selenium-webdriver");
var inquirer = require("inquirer");
var async = require("async");

var driver;
var debug = true;
if (debug) {
	driver = new webdriver.Builder().forBrowser("chrome").build();
} else {
	driver = new webdriver.Builder().forBrowser("phantomjs").build();
}
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

scrapeMessageList(function() {});

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
						console.log("mapSeries res:", res);
						console.log("hrefList:", hrefList);
						cb();
					});
				},
				function(err) {
					console.log(err);
					cb(err);
				});
	}

	function getHrefFromElem(elem, cb) {
		elem.getAttribute("href")
			.then(function(href) {
				console.log(href);
				hrefList.push(href);
				cb(null, href);
			}, function(err) {
				console.log(err);
				cb(err);
			});
	}

	function scrapeThread(cb) {
		console.log(hrefList.length + " hrefs.");
		for (i = 0; i < hrefList.length; i++) {
			// visit topic URL
			driver.get(hrefList[i]);

			// wait for load

			// find all messages

			// click on each message

			// scrape relevant information

			// save to JSON
		}
	}
}

function scrapeMessageList(cb) {
	var url = "https://groups.google.com/a/fidoalliance.org/forum/#!topic/ap-tech/eFAd8VtMMjw"; // TODO: remove

	driver.get(url);

	// <div tabindex="0" class="IVILX2C-tb-W IVILX2C-sb-n IVILX2C-sb-k IVILX2C-tb-Y IVILX2C-b-Db IVILX2C-tb-X">
	driver.findElements(By.xpath("//div[@class='IVILX2C-tb-W']")).then(
		function(elems) {
			async.mapSeries(elems, scrapeMessage, function(err, res) {
				if (err) {
					console.log(err);
					cb(err);
				}

				console.log ("Names:", res);
				cb(null, res);
			});
		},
		function(err) {
			console.log(err);
			cb(err);
		});
}

function scrapeMessage(elem, cb) {
	// click on the message to expand it and load the message
	elem.click();

	// Get sender
	// <span class="IVILX2C-D-a" style="color: rgb(34, 34, 34);">Michelle Ball</span>
	driver.findElement(By.xpath("//span[@class='IVILX2C-D-a']")).getText().then(
		function(name) {
			console.log ("Name:", name);
			cb (null, name);
		}, function (err) {
			console.log (err);
		});


	// Get date
	// <span class="IVILX2C-tb-Q IVILX2C-b-Cb" title="Monday, March 28, 2016 at 5:46:20 AM UTC-7">Mar 28</span>

	// Get (optional) other recipients
	// <div style=""> <span class="IVILX2C-tb-r"> Other recipients: </span> <span class="IVILX2C-tb-q"> <span>joe@company.org</span> </span> </div>

	// Get message
	// < div tabindex = "0"
	// class = "IVILX2C-tb-P" > < input type = "text"
	// tabindex = "-1"
	// role = "presentation"
	// style = "opacity: 0; height: 1px; width: 1px; z-index: -1; overflow: hidden; position: absolute;" > < div > < div style = "overflow: auto" > < div style = "max-height: 10000px" >
	// 	< div lang = "EN-US"
	// link = "blue"
	// vlink = "purple" >
	// 	< div >
	// 	< p class = "MsoNormal" > < span style = "font-size:11.0pt;font-family:&quot;Calibri&quot;,&quot;sans-serif&quot;;color:#1f497d" > Hi Adam, < /span></p >

	// Get (optional) attachments
	// <div class="IVILX2C-tb-o"><div> <span class="IVILX2C-sb-S">Attachments</span> 
	// ...
}