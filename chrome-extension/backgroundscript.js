var helpdeskUrl = "http://helpdesk.mydomain.com"; //This is the URL you actually use (e.g., a custom domain). If you don't use a custom domain, set it to https://domain.freshdesk.com
var apiUrl = "https://domain.freshdesk.com"; //This is just domain.freshdesk.com
var apiKey = "XXXXXXXXXXXXXXXXXXXX"; //Enter your API key here

var allTicketsUrl = apiUrl + "/helpdesk/tickets/filter/all_tickets?format=json";
var knownTickets = []; //Tickets we already know about; don't show notifications for any of these.
var checkInterval = 30000; //30 seconds
var createdNotifications = [];

function AllTickets(callback) {
	jQuery.ajax({
		type: "GET",
		url: allTicketsUrl,
		contentType: "application/json",
		headers: {
			"Authorization": "Basic " + btoa(apiKey+":X"),
			"Accept": "application/json, text/javascript, */*; q=0.01"
		},
		complete: function(response) {
			var tickets = JSON.parse(response.responseText);
			callback(tickets);
		}
	});
}

function ClaimTicket(ticketPath, staff, callback) {
	chrome.cookies.remove({ url: apiUrl, name: "_helpkit_session" }, function() {
		jQuery.ajax({
			type: "PUT",
			url: apiUrl + ticketPath + "/assign.json",
			data: JSON.stringify({"responder_id": staff}),
			contentType: "application/json",
			dataType: "json",
			headers: {
				"Authorization": "Basic " + btoa(apiKey+":X"),
				"Accept": "application/json, text/javascript, */*; q=0.01"
			},
			complete: callback
		});
	});
}

function ShowNotification(ticket) {
	var trimmedDescription = ticket.description.replace("\r", " ").replace("\t", " ");
	if (trimmedDescription.length > 255) {
		trimmedDescription = trimmedDescription.substring(0, 255);
	}
	var options = {
		type: "basic",
		iconUrl: "freshdesk-logo.png",
		title: ticket.requester_name,
		message: ticket.subject,
		contextMessage: trimmedDescription,
		eventTime: Date.now(),
		buttons: [{
			title: "View"
		},
		{
			title: "Ignore"
		}],
		isClickable: true
	}

	chrome.notifications.create(ticket.display_id.toString(), options, function(notificationId) {
		createdNotifications.push(notificationId);
	});

}


/* Notification event handlers */
//Clicking the body of the notification shows it
chrome.notifications.onClicked.addListener(function(notificationId) {
	getHelpdeskTab(function(tab) {
		chrome.tabs.update(tab.id, { url: helpdeskUrl + "/helpdesk/tickets/" + notificationId.toString(), highlighted: true }, function(a) {});
	});
});

//Clicking the View button also shows it
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
	if (buttonIndex == 0) {
		//'View' button
		//Find the tab
		getHelpdeskTab(function(tab) {
			if (notificationId.toString().indexOf("chat") == 0) {
				//It's a chat notification; just show the window/tab
				chrome.tabs.update(tab.id, { highlighted: true }, function(a) {});
			} else
			{
				//Ticket notification; show the tab and load the ticket URL
				chrome.tabs.update(tab.id, { url: helpdeskUrl + "/helpdesk/tickets/" + notificationId.toString(), highlighted: true }, function(a) {});
			}
		});
		//Make sure window is shown
		getHelpdeskTab(function(tab) {
			chrome.windows.update(tab.windowId, { focused: true }, function(chromeWindow) {});
		});
	}
});

function intervalCheck() {
	AllTickets(function(tickets) {
		if (knownTickets.length == 0) {
			knownTickets = tickets.map(function(ticket) { return ticket.id });
		} else
		{
			//Find the tickets that aren't in knownTickets, do notification for each
			tickets.forEach(function(ticket) {
				//only show notification if we don't know about it yet, and if it's not assigned to an agent
				if (knownTickets.indexOf(ticket.id) == -1 && !ticket.responder_id) {
					knownTickets.push(ticket.id);
					ShowNotification(ticket);
				}
			});
		}
	});
}

function getHelpdeskTab(callback) {

	chrome.tabs.query({ url: helpdeskUrl + "/*" }, function(tabs) {
		if (tabs.length > 0) {
			callback(tabs[0]);
		}
	});
}

setInterval(intervalCheck, checkInterval);


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method == "new-chat") {

		//Only show notification if they're not on the tab or the window isn't focused
		getHelpdeskTab(function(tab) {
			//See if the chrome window is focused
			chrome.windows.get(tab.windowId, function(chromeWindow) {
				if (!chromeWindow.focused || !tab.active) {
					//Chrome window isn't focused, or they're on another tab. Notify
					var message = request.message;
					var options = {
						type: "basic",
						iconUrl: "freshdesk-logo.png",
						title: "New message from " + message.from,
						message: '"' + message.message + '"',
						eventTime: Date.now(),
						buttons: [{
							title: "View"
						},
						{
							title: "Ignore"
						}],
						isClickable: true
					}

					chrome.notifications.create("chat-" + Date.now().toString(), options, function(notificationId) {});
				}
			});
		});
		sendResponse({});
	} else if (request.method == "claim-ticket") {
		ClaimTicket(request.ticketPath, request.staff, function() {
		});
		sendResponse({success: true});
	}
});

