/* Globals */

// Set these to the hostname and port where the node server is running
var serverName = "http://browskers.com";
var port = 4357;

var currentPath = location.pathname;
var usersOnPage = [];
var socket, me, staffId;
var initialized = false;
/* End of globals */

function init() {
	//Make sure we don't initialize twice
	if (initialized) return;
	socket = io(serverName + ":" + port);

	//Currently logged in user
	me = {
		name: jQuery(".user.info>span").text(),
		avatar: jQuery(".preview_pic>img").data("src"),
		path: location.pathname
	}

	socket.on("connect", function() {
		console.log("Connected to the server!");

		//Tell the server WHO. WE. AAAARRREEE!
		socket.emit("register", me);

		setInterval(updateUsersOnPage, 300);

		if (jQuery("#helpdesk-chat").length == 0) {

			//Add barebones chat markup
			var chatMarkup = '<div id="helpdesk-chat">'
			+ '<div class="helpdesk-chat-container">'
			+ '<div class="helpdesk-chat-window">'
			+ '<div class="chat-window-header clearfix">'
			+ '<h3 class="agent-name"></h3>'
			+ '<a href="#" class="close">&times;</a>'
			+ '</div>'  //.chat-window-header.clearfix
			+ '<div class="chat-input">'
			+ '<div class="input-group">'
			+ '<input type="text" id="helpdesk-chat-input" class="form-control">'
			+ '<span class="input-group-btn">'
			+ '<a class="btn btn-primary" href="#">Send</a>'
			+ '</span>' // .input-group-btn
			+ '</div>'  // .input-group
			+ '</div>'  // .chat-input
			+ '</div>'  // .helpdesk-chat-window
			+ '<div class="helpdesk-users">'
			+ '<ul></ul>'
			+ '</div>'  //.helpdesk-users
			+ '</div>'  // .helpdesk-chat-container
			+ '</div>'; // #helpdesk-chat

			jQuery("body").append(chatMarkup);

			//Event handlers
			jQuery("body").on("click", ".helpdesk-users ul li a", function (e) {
				e.preventDefault();
				var agentName = jQuery(this).parents("li").data("agent-name");
				OpenChat(agentName);
			});
			jQuery("body").on("click", ".agent-collision-user", function (e) {
				var agentName = jQuery(this).data("agent-name");
				OpenChat(agentName);
			});

			jQuery("body").on("click", ".chat-messages", function(e) {
				//don't focus the input if click event was on a .message-text (so you can copy pasta without it buggin ya)
				if (!jQuery(e.srcElement).hasClass("message-text") && !jQuery(e.srcElement).hasClass("message")) {
					jQuery(".chat-input input").focus();
				}
			});
			jQuery("body").on("click", ".chat-window-header .close", function (e) {
				e.preventDefault();
				jQuery(".helpdesk-chat-window").hide();
				jQuery(".helpdesk-users li.active").removeClass("active");
			});
			jQuery("body").on("click", ".chat-input .btn", function(e) {
				e.preventDefault();
				var agentName = jQuery(this).parents("#helpdesk-chat").data("send-to");
				var message = jQuery(".chat-input input").val();
				jQuery(".chat-input input").val('');
				var msg = {
					to: agentName,
					from: me.name,
					fromAvatar: me.avatar,
					message: message
				}
				socket.emit("sendMessage",  msg);
			});
			jQuery("body").on("keydown", ".chat-input input", function(e) {
				if (e.which == 13) {
					//Send the message
					jQuery(".chat-input .btn").click();
				}
			});

		}

	});

	socket.on("disconnect", function()
	{
		console.log("Lost connection to chat server!");
		jQuery("#helpdesk-chat").remove();
	});

	socket.on("users", function(users) {
		usersOnPage = users.filter(function(user) {
			return user.path == location.pathname && user.name != me.name;
		});
		//Make sure everyone is accounted for in chat
		//Make sure they have a chat window to put messages into
		users.forEach(function(user) {
			if ( user.name == me.name ) return;
			var chatWindow = jQuery(".chat-messages[data-agent-name='" + user.name + "']");
			if (chatWindow.length == 0) {
				chatWindow = jQuery("<div class='chat-messages agent-online' data-agent-name='" + user.name + "' data-avatar='" + user.avatar + "'>")
				chatWindow.insertAfter(jQuery("#helpdesk-chat .chat-window-header"));
			} else
			{
				chatWindow.removeClass("agent-offline").addClass("agent-online");
			}

			//Make sure they're in the list of available users
			var userListing = jQuery(".helpdesk-users ul li[data-agent-name='" + user.name + "']");
			if (userListing.length == 0) {
				userListing = "<li title='" + user.name + "' data-agent-name='" + user.name + "' class='agent-online'>"
				+ "<a href=''>"
				+ "<img src='" + user.avatar + "' />"
				+ "<span class='offline'></span>"
				+ "<span class='online'></span>"
				+ "</a>"
				+ "</li>";
				jQuery(".helpdesk-users>ul").append(userListing);
			} else
			{
				userListing.removeClass("agent-offline").addClass("agent-online");
			}
		});

		//If a user has disconnected, show them as offline
		jQuery(".helpdesk-users ul li").each(function() {
			var agentName = jQuery(this).data("agent-name");
			if (users.propIndexOf("name", agentName) == -1) {
				//They're offline!
				jQuery(this).removeClass("agent-online").addClass("agent-offline");
				jQuery(".chat-messages[data-agent-name='" + agentName + "']").removeClass("agent-online").addClass("agent-offline");
			}
		});

	});

	socket.on("sendMessage", function(msg) {
		if (msg.to == me.name || msg.to == "Everyone" || msg.from == me.name) {
			//It involves me!
			AppendMessage(msg);
		}
	});
	socket.on("messageCatchup", function(messages) {
		messages.forEach(function(message) {
			//See if we're involved in this message
			if (message.to == me.name || message.to == "Everyone" || message.from == me.name) {
				AppendMessage(message, true);
			} 
		});
	});

	initialized = true;
}


function OpenChat(agent) {
	jQuery(".helpdesk-users ul li").removeClass("active");
	jQuery(".helpdesk-users ul li[data-agent-name='" + agent + "']").addClass("active");
	jQuery("#helpdesk-chat").data("send-to", agent);
	jQuery(".helpdesk-chat-window").show();
	jQuery(".helpdesk-chat-window .agent-name").html(agent);
	jQuery(".chat-messages").hide();
	jQuery(".chat-messages[data-agent-name='" + agent + "']").show().scrollTop(9999999);
	jQuery(".chat-input input").focus();

}

function AppendMessage(message, catchup) {
	if (typeof socket == 'undefined') {
		return;
	}
	var toMe = (message.to == me.name);
	var toEveryone = message.to == "Everyone";

	var direction = (toMe) ? "from" : "to";
	var chattingWith = (toMe) ? message.from : message.to;
	
	//Special handling of 'everyone' messages
	if (toEveryone) {
		chattingWith = message.to;
		direction = "to";
	}

	var chatWindow = jQuery(".chat-messages[data-agent-name='" + chattingWith + "']");

	var avatar = (toMe || toEveryone) ? message.fromAvatar : me.avatar;
	var messageEntry = "<div class='message clearfix'>"
	+ "<div class='message-" + direction + "'>"
	+ "<img src='" + avatar + "' />"
	+ "<div class='message-text'>" + message.message + "</div>"
	+ "</div>"
	+ "</div>";
	chatWindow.append(messageEntry);
	chatWindow.scrollTop(99999);

	if ((toMe || (toEveryone && !(message.from == me.name))) && !catchup) {
		//It was a message to us, show it yo!
		//Check for catchup flag. It's used when catching up on messages after connecting.
		//We don't want to open the chat unless it was just sent to us
		OpenChat(chattingWith);
		RequestChatNotification(message);
	}
}

function RequestChatNotification(message) {
	chrome.runtime.sendMessage({method: "new-chat", message: message}, null, function(response) {
	});

}

//See if the user has changed location. If so, tell the server
var checkLocation = function() {
	if (typeof socket == 'undefined') {
		return;
	}
	if (currentPath != location.pathname) {
		//Navigated somewhere else; tell the server
		currentPath = location.pathname;
		socket.emit("hashchange", { path: location.pathname });
		socket.emit("getUsers");
	}
}

var updateUsersOnPage = function() {
	var agentCollision = jQuery("#agent_collision_placeholder");
	if (agentCollision.length > 0) {
		var userList = usersOnPage.map(function(user) { return "<div class=\"text-danger agent-collision-user\" title=\"This user is also checkin' out this ticket\" data-agent-name=\"" + user.name + "\">" + user.name + "</div>"});
		if (agentCollision.html() != userList.join("")) {
			agentCollision.html(userList.join(""));
		}
	}
}

Array.prototype.propIndexOf = function(property, value) {
	for (var i = 0; i < this.length; i++) {
		if (this[i][property] == value) {
			return i;
		}
	}
	return -1;
}

//Start things up
jQuery(function() {
	//Give things time to settle yo
	//Excessive? maybe.
	setTimeout(function() {
		init();
	}, 1500);

	staffId = jQuery(".user.info").next().attr("href").replace(/[^\d]/g, '');
	var bindScript = 'jQuery(document).on("pjax:complete", function() { window.postMessage("pjax:complete", "http://helpdesk.sourceot.com"); });';
	var s = document.createElement("script");
	s.innerHTML = bindScript;
	document.head.appendChild(s);

	window.addEventListener("message", pjaxComplete);
	//Run once on initial page load
	pjaxComplete();


});


function pjaxComplete() {
	checkLocation();

	//Claim button stuff
	setTimeout(function() {
		if (jQuery("#ticket-display-id").length > 0) {
			//On a ticket details page
			if (jQuery("#helpdesk_ticket_responder_id").val() != staffId) {
				//Ticket isn't assigned to me; show 'Claim' button
				var claimBtnLi = jQuery("<li class='ticket-btns hide_on_collapse'></li>");
				var claimBtn = jQuery("<a class='btn'>Claim</a>");
				claimBtn.click(function() {
					var ticketPath = location.pathname; //+ ";
					chrome.runtime.sendMessage({ method: "claim-ticket", ticketPath: ticketPath, staff: staffId }, null, function(result) {
						if (result.success) {
							location.reload(true);
						}
					});
				});
				claimBtnLi.append(claimBtn);
				//Put it before the 'Merge' button
				jQuery("#ticket_merge_btn").parents("li:first").before(claimBtnLi);
			}
		}
	}, 500);

	//When entering a new ticket, set the Status dropdown to 'Open'
	if (location.pathname == "/helpdesk/tickets/new") {
		$("#helpdesk_ticket_status").val("2");
	}
}

//If jQuery's document.ready takes forever (unavailable resource blocking it), just init anyways after 5 seconds
setTimeout(function() {
	init();
}, 5000);
