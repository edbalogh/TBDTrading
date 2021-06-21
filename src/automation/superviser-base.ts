// webservice that should be running anytime a bot is running, responsibilities include:
//      1. managing all bots including rules for disconnection (ie exit positions immediately, wait for x hours, or ??)
//      2. monitoring and restarting provider connections/webservices
//      3. all bots and connections register and report to this service
//      4. possibly act as a hub for the UI to interact with live strategies