var googleGroups = require("./google-groups-list");
var cred = require("./google-credentials");

var webdriver = require("selenium-webdriver");
var inquirer = require("inquirer");
var async = require("async");
var fs = require("fs");

var driver;
var debug = true;
if (debug) {
	driver = new webdriver.Builder().forBrowser("chrome").build();
} else {
	driver = new webdriver.Builder().forBrowser("phantomjs").build();
}
var By = webdriver.By;
var until = webdriver.until;
var Key = webdriver.Key;
var ActionSequence = webdriver.ActionSequence;
driver.manage().timeouts().implicitlyWait(3000);

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

// scrapeMessageList("https://groups.google.com/a/fidoalliance.org/forum/#!topic/fido-bod/NrEkqMN40MU", function() {});
// scrapeMessageList("https://groups.google.com/a/fidoalliance.org/forum/#!topic/ap-tech/eFAd8VtMMjw", function() {});

// after authenticating 
function indexGroup() {
	var i;

	// TODO: async series
	for (i = 0; i < googleGroups.length; i++) {
		driver.get(googleGroups[i]);
		// driver.wait(until.titleIs('Google Groups'), 30000);

		// load topics
		async.doUntil(scrollDown, atBottom, function(err, ret) {
			if (err) {
				console.log(err);
			} else {
				console.log("done scrolling");
			}
		});

		scrapeGroup();
	}
	// 	driver.quit();
}

var oldHeight = 0, height = 0;
function scrollDown(cb) {
	console.log("Scrolling down...");
	driver.isElementPresent(By.xpath("//div[@class='IVILX2C-b-G']"), 10000);
	console.log("Page loaded...");
	// IVILX2C-p-M
	// driver.findElement(By.xpath("//tbody[@class='IVILX2C-p-w']")).sendKeys(Key.PAGE_DOWN).then(function() {

	new ActionSequence(driver).sendKeys([Key.PAGE_DOWN, Key.PAGE_DOWN, Key.PAGE_DOWN, Key.PAGE_DOWN]).perform().then(function() {
		console.log("sent key");
		driver.sleep(2000);
		driver.executeScript("return document.getElementsByClassName(\"IVILX2C-b-G\")[0].offsetHeight;").then(function(h) {
			height = h;
			cb(null, "blah");
		}, function(err) {
			console.log(err);
			cb(err);
		});
	}, function(err) {
		console.log(err);
		cb(err);
	});
}

function atBottom(cb) {
	console.log("Old height:", oldHeight);
	console.log("New height:", height);
	var done = (oldHeight === height);
	oldHeight = height;

	return done;
}

// after we get all the URLs for the group, scrape all the messages
function scrapeGroup() {
	// scrape topic URLs
	var i, p, hrefList = [];
	async.series([
		getHrefList, // have to get all the hrefs first before we leave the page...
		scrapeThread // ...and then scrape each one of them
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
						cb(null, res);
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
		async.mapSeries(hrefList, scrapeMessageList, function(err, res) {
			if (err) {
				console.log(err);
				cb(err);
			}
			fs.writeFileSync("test.json", JSON.stringify(res));
			cb(null, res);
		});
	}
}

function scrapeMessageList(url, cb) {
	console.log("OPENING THREAD:", url);
	driver.get(url);

	// Get list of messages
	// <div tabindex="0" class="IVILX2C-tb-W IVILX2C-sb-n IVILX2C-sb-k IVILX2C-tb-Y IVILX2C-b-Db IVILX2C-tb-X">
	// driver.findElements(By.xpath("//div[@class='IVILX2C-tb-W']")).then(
	driver.findElements(By.xpath("//div[@class='IVILX2C-tb-F IVILX2C-tb-v']")).then(
		function(elems) {
			console.log("Thread has " + elems.length + " messages.");
			if (elems.length > 1) {
				async.mapSeries(elems, scrapeMessages, function(err, res) {
					if (err) {
						console.log(err);
						cb(err);
					}
					cb(null, res);
				});
			} else if (elems.length == 1) { // don't click if there's only one element
				scrapeMessage(elems[0], cb);
			}
		},
		function(err) {
			console.log(err);
			cb(err);
		});
}

function scrapeMessages(elem, doneCb) {
	elem.click();
	scrapeMessage(elem, doneCb);
}

function scrapeMessage(elem, doneCb) {
	// click on the message to expand it and load the message
	driver.isElementPresent(By.xpath(".//div[@class='IVILX2C-tb-eb IVILX2C-tb-kb']"), 10000);

	var ret = {};

	async.parallel([
		getSender,
		getDate,
		getRecipients,
		// getMessage,
		getAttachments
	], function(err, res) {
		doneCb(err, ret);
	});

	function getSender(cb) {
		// Get sender
		// <span class="IVILX2C-D-a" style="color: rgb(34, 34, 34);">John Doe</span>
		elem.findElement(By.xpath(".//span[@class='IVILX2C-D-a']")).getText().then(
			function(name) {
				console.log("Name:", name);
				if (name === "me") {
					name = cred.name;
				}
				ret.name = name;
				cb(null, name);
			},
			function(err) {
				console.log(err);
				cb(err);
			});
	}

	function getDate(cb) {
		// Get date
		// <span class="IVILX2C-tb-Q IVILX2C-b-Cb" title="Monday, March 28, 2016 at 5:46:20 AM UTC-7">Mar 28</span>
		// elem.findElement(By.xpath(".//span[@class='IVILX2C-tb-Q']")).getAttribute("title").then(
		elem.findElement(By.xpath(".//span[@class='IVILX2C-tb-Q IVILX2C-b-Cb']")).getAttribute("title").then(
			function(date) {
				console.log("Date:", date);
				ret.date = date;
				cb(null, date);
			},
			function(err) {
				console.log("Couldn't get date:", err);
				cb(err);
			});
	}

	function getRecipients(cb) {
		// Get (optional) other recipients
		// <div style=""> <span class="IVILX2C-tb-r"> Other recipients: </span> <span class="IVILX2C-tb-q"> <span>joe@company.org</span> </span> </div>
		elem.findElement(By.xpath(".//span[@class='IVILX2C-tb-q']/span")).getInnerHtml().then(
			function(r) {
				console.log("Recipients: \"" + r + "\"");
				ret.recipients = r;
				cb(null, r);
			},
			function(err) {
				console.log("Couldn't get recipients:", err);
				cb(null, ""); // if no recipients found, that's okay
			});
	}

	function getMessage(cb) {
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
		elem.findElement(By.xpath(".//div[@class='IVILX2C-tb-P'][@tabindex='0']")).getInnerHtml().then(
			function(message) {
				console.log("Message:", message);
				ret.message = message;
				cb(null, message);
			},
			function(err) {
				console.log(err);
				cb(err);
			});
	}

	function getAttachments(cb) {
		// Get (optional) attachments -- note that the URL has to be URL decoded
		// <div class="IVILX2C-tb-o"><div> <span class="IVILX2C-sb-S">Attachments</span> 
		// ...
		// <div class="IVILX2C-vc-c"><a class="gwt-Anchor" target="_blank" href="https://docs.google.com/viewer?a=v&amp;pid=forums&amp;srcid=MDQwMDQzMg4NjM3OTI4NDcBMDcyNTkyMDIzNjYyNzU2ODMxMjkBRlRZYklBdVREd0FKATAuMQFmaWRvYWxsaWFuY2Uub3JnAXYy&amp;authuser=0" title="file.pdf">
		// ...
		// <div class="IVILX2C-vc-a"> <div class="IVILX2C-vc-d">file.pdf</div> <span>595 KB</span>
		elem.findElements(By.xpath(".//div[@class='IVILX2C-vc-a']")).then(
			function(attachments) {
				console.log("# Attachments:", attachments.length);
				async.mapSeries(attachments, scrapeAttachment, function(err, res) {
					if (err) {
						console.log(err);
						cb(err);
					}
					console.log("Attachments :", res);
					ret.attachments = res;
					cb(null, res);
				});
			},
			function(err) {
				cb(null, ""); // if no attachment found, that's okay
			});
	}
}

function scrapeAttachment(attachment, attDoneCb) {
	var attRet = {};

	async.series([
		scrapeAttachmentName,
		scrapeAttachmentSize,
		scrapeAttachmentUrl
	], function(err, res) {
		attDoneCb(null, attRet);
	});

	// get name
	function scrapeAttachmentName(cb) {
		// <div class="IVILX2C-vc-d">file.pdf</div>
		// attachment.findElement(By.xpath(".//div[@class='IVILX2C-vc-a']/div[@class='IVILX2C-vc-d']")).getText().then(
		attachment.findElement(By.xpath(".//div[@class='IVILX2C-vc-d']")).getText().then(
			function(filename) {
				console.log("Filename:", filename);
				attRet.filename = filename;
				cb(null, filename);
			},
			function(err) {
				console.log(err);
				cb(err);
			});
	}

	// get size
	function scrapeAttachmentSize(cb) {
		// <div class="IVILX2C-vc-d">file.pdf</div>
		// <span>595 KB</span>
		// attachment.findElement(By.xpath(".//div[@class='IVILX2C-vc-a']/span")).getText().then(
		attachment.findElement(By.xpath("//div[@class='IVILX2C-vc-d']/following-sibling::span")).getText().then(
			function(size) {
				console.log("Size:", size);
				attRet.size = size;
				cb(null, size);
			},
			function(err) {
				console.log(err);
				cb(err);
			});
	}

	// get URL
	function scrapeAttachmentUrl(cb) {
		attachment.findElement(By.xpath(".//a[@class='gwt-Anchor']")).getAttribute("href").then(
			function(url) {
				console.log("URL:", url);
				attRet.url = url;
				cb(null, url);
			},
			function(err) {
				console.log(err);
				cb(err);
			});
	}
}