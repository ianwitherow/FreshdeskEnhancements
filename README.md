**This is super old and no longer maintained.**

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
* Edit chrome-extension\backgroundscript.js
 * Set `helpdeskUrl` to your custom Freshdesk URL (if you don't have one, just set it to your https://domain.freshdesk.com URL)
 * Set `apiUrl` to your Freshdesk URL (https://domain.freshdesk.com)
 * Set `apiKey` to your Freshdesk API Key (found under Profile Settings within Freshdesk)
* Edit server\settings.json and choose a port for the server to run on
* Load the extension into Chrome (choose 'Load unpacked extension' and point it to the chrome-extension directory).
* run `npm install` from server directory
* Run the node server
* That should be it!
