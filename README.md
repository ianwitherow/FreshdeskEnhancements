# Freshdesk Enhancements

Freshdesk Enhancements is a Chrome extension that adds functionality to Freshdesk.

## Requires
* NodeJS
* Chrome

## Features
* Desktop Notifications
* Agent collision - See if other agents are viewing the same ticket
* Chat - Chat with other agents from any page

### Installation

* Edit chrome-extension\contentscript.js and modify the serverName and port variables to match your environment
* Edit chrome-extension\backgroundscript.js and set the helpdeskUrl to your Freshdesk URL
* Edit server\settings.json and choose a port for the server to run on
* Load the extension into Chrome (choose 'Load unpacked extension' and point it to the chrome-extension directory).
* run `npm install` from server directory
* Run the node server
* That should be it!
