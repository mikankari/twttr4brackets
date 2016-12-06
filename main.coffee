

define (require, exports, module) ->
	
	WorkspaceManager = brackets.getModule "view/WorkspaceManager"
	NodeDomain = brackets.getModule "utils/NodeDomain"
	ExtensionUtils = brackets.getModule "utils/ExtensionUtils"
	NativeApp = brackets.getModule "utils/NativeApp"
	Dialog = brackets.getModule "widgets/Dialogs"
	PreferencesManager = brackets.getModule "preferences/PreferencesManager"
	
	createLog = (message, error = null) ->
		level = if error? then "error" else "log"
		console[level] "[ext-#{level}] [twttr] #{message}"
		console[level] "[ext-#{level}] [twttr] #{JSON.stringify error}"
	
	createAlert = (message, error = null) ->
		$ "<div class=\"alert alert-#{if error? then "danger" else "success"}\"></div>"
			.append $ "<div>#{message}</div>"
			.append $ "<div>#{if error? then JSON.stringify error else ""}</div>"
			.hide()
			.prependTo "#io-github-mikankari-twttr4brackets .timeline"
			.fadeIn()
	
	configure = ->
		config = {}
		for value in ["proxy"]
			config[value] = PreferencesManager.get value
		
		domain.exec "configure", config, ExtensionUtils.getModulePath module, "config.json"
	
	connect = ->
		createAlert "connecting..."
		domain.exec "connect"
			.done (user) ->
				$ "#io-github-mikankari-twttr4brackets .me img"
					.attr "src", user.profile_image_url
				$ "#io-github-mikankari-twttr4brackets .login"
					.text "Logout"
				createAlert "connected"
			.fail (error) ->
				$ "#io-github-mikankari-twttr4brackets .me img"
					.attr "src", "#{ExtensionUtils.getModulePath module, "tweet-default-icon.png"}"
				$ "#io-github-mikankari-twttr4brackets .login"
					.text "Login"
				createAlert "connecting failed", error
	
	iconClicked = ->
		panel.setVisible isvisible = not panel.isVisible()
		
		icon.css {
			"backgroundPosition": "0 #{if isvisible then "-48px" else "0"}"
		}
		
		if isvisible
			configure()
			connect()
	
	createIcon = ->
		$ "<a href=\"#\"></a>"
			.css {
				"backgroundImage": "url(\"#{ExtensionUtils.getModulePath module, "icon.svg"}\")"
				"backgroundPosition": "0 0"
				"backgroundSize": "100%"
			}
			.on "click", iconClicked
			.appendTo $ "#main-toolbar .buttons"
	
	createPanel = ->
		$ require "text!panel.html"
			.find ".close"
			.on "click", iconClicked
			.end()
	
	panel = WorkspaceManager.createBottomPanel "io.github.mikankari.twttr4brackets", createPanel(), 200
	
	icon = createIcon()
	
	domain = new NodeDomain "io-github-mikankari-twttr4brackets-streaming", ExtensionUtils.getModulePath module, "domain"
	
	domain.on "data", (event, tweet) ->
		time = Intl.DateTimeFormat undefined, {
			"weekday": "short"
			"hour": "numeric"
			"hour12": false
			"minute": "2-digit"
		}
			.format new Date tweet.created_at
		tweetDivision.clone()
			.find ".icon img"
				.attr "src", tweet.user.profile_image_url
				.end()
			.find ".content2 .name"
				.text tweet.user.name
				.append $ "<small>@#{tweet.user.screen_name}</small>"
				.end()
			.find ".content2 .time"
				.text time
				.end()
			.find ".content2 .text"
				.text tweet.text
				.end()
			.hide()
			.prependTo "#io-github-mikankari-twttr4brackets .timeline"
			.fadeIn()

		oldest = $ "#io-github-mikankari-twttr4brackets .tweet:last-child"
		oldest.remove() if oldest.siblings().length >= 200
		
		$ "#io-github-mikankari-twttr4brackets .alert"
			.remove()
	
	domain.on "event", (event, other) ->
		createLog "stream event", other
	
	domain.on "error", (event, error) ->
		createLog "getting timeline failed.", error
		createAlert "getting timeline failed.", error
	
	domain.on "open_url", (event, url) ->
		NativeApp.openURLInDefaultBrowser url
	
#	apply config from file
	domain.exec "configure", null, ExtensionUtils.getModulePath module, "config.json"
		.done (config) ->
#			apply config from brackets preference
			configure()
	
	tweetDivision = $ "#io-github-mikankari-twttr4brackets .tweet"
		.remove()
	
	ExtensionUtils.loadStyleSheet module, "panel.css"
	
	$ "#io-github-mikankari-twttr4brackets form"
		.on "submit", (event) ->
			event.preventDefault()
			text = $ event.target
				.find "[name=text]"
				.val()
			domain.exec "post", text
				.done ->
					event.target.reset()
				.fail (error) ->
					createAlert "tweeting failed.", error
	
	$ "#io-github-mikankari-twttr4brackets .login"
		.on "click", (event) ->
			domain.exec "authenticate"
				.done ->
					configure()
					connect()
				.fail (error) ->
					createAlert "authentication failed", error
	
