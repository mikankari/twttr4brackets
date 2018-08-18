

define (require, exports, module) ->
	
	NodeDomain = brackets.getModule "utils/NodeDomain"
	PreferencesManager = brackets.getModule "preferences/PreferencesManager"
	NativeApp = brackets.getModule "utils/NativeApp"
	WorkspaceManager = brackets.getModule "view/WorkspaceManager"
	ExtensionUtils = brackets.getModule "utils/ExtensionUtils"
	
	extension_id = "twttr4brackets"
	extension_path = ExtensionUtils.getModulePath module

	connect = ->
		createAlert "connecting..."
		domain.exec "load", "#{extension_path}config.json"
			.then ->
				domain.exec "load", {
					"request_options": {
						"proxy": PreferencesManager.get "proxy"
					}
				}
			.then ->
				domain.exec "connect"
			.done (user) ->
				$ "##{extension_id} .me img"
					.attr "src", user.profile_image_url
					.show()
					.siblings ".default-icon"
					.hide()
				$ "##{extension_id} .login"
					.text "Logout"
				createAlert "connected"
			.fail (error) ->
				$ "##{extension_id} .me img"
					.attr "src", ""
					.hide()
					.siblings ".default-icon"
					.show()
				$ "##{extension_id} .login"
					.text "Login"
				createAlert "connecting failed", error
	
	createIcon = ->
		$ "<a href=\"#\"></a>"
			.css {
				"backgroundImage": "url(\"#{extension_path}icon.svg\")"
				"backgroundPosition": "0 0"
				"backgroundSize": "100%"
			}
			.on "click", iconClicked
			.appendTo $ "#main-toolbar .buttons"
	
	iconClicked = ->
		panel.setVisible isvisible = not panel.isVisible()
		
		icon.css {
			"backgroundPosition": "0 #{if isvisible then "-48px" else "0"}"
		}
		
		if isvisible
			connect()
	
	createPanel = ->
		$ require "text!panel.html"
			.find ".close"
			.on "click", iconClicked
			.end()
	
	createLog = (message, error = null) ->
		level = if error? then "error" else "log"
		console[level] "[ext-#{level}] [#{extension_id}] #{message}"
		console[level] "[ext-#{level}] [#{extension_id}] #{JSON.stringify error}"
	
	createAlert = (message, error = null) ->
		$ "<div class=\"alert alert-#{if error? then "error" else "success"}\"></div>"
			.append $ "<div>#{message}</div>"
			.append $ "<div>#{if error? then JSON.stringify error else ""}</div>"
			.hide()
			.prependTo "##{extension_id} .timeline"
			.fadeIn()
	
	panel = WorkspaceManager.createBottomPanel "io.github.mikankari.twttr4brackets", createPanel(), 200
	
	tweetDivision = $ "##{extension_id} .tweet"
		.remove()
	
	icon = createIcon()
	
	ExtensionUtils.loadStyleSheet module, "panel.css"
	
	domain = new NodeDomain "#{extension_id}-streaming", "#{extension_path}domain"

	domain.on "data", (event, tweet) ->
		created_at_html = Intl.DateTimeFormat undefined, {
			"weekday": "short"
			"hour": "numeric"
			"hour12": false
			"minute": "2-digit"
		}
			.format new Date tweet.created_at
		created_at_html = "<a href=\"https://twitter.com/#{tweet.user.screen_name}/status/#{tweet.id_str}\" target=\"_blank\">#{created_at_html}</a>"

		entities_html = ""
		text_html = "<span>#{tweet.text}</span>"

		tweet.extended_entities ?= {}
		tweet.extended_entities.media ?= []
		for media in tweet.extended_entities.media
			entities_html += "<a href=\"#{media.expanded_url}\" target=\"_blank\"><img src=\"#{media.media_url}:thumb\"></a>"
			text_html = text_html.replace media.url, ""

		tweet.entities.urls ?= []
		for url in tweet.entities.urls when url.expanded_url?
			text_html = text_html.replace url.url, "<a href=\"#{url.expanded_url}\" target=\"_blank\">#{url.display_url}</a>"

		tweet.entities.hashtags ?= []
		for hashtag in tweet.entities.hashtags
			text_html = text_html.replace "##{hashtag.text}", "<a href=\"https://twitter.com/hashtag/#{encodeURIComponent hashtag.text}\" target=\"_blank\">##{hashtag.text}</a>"

		tweet.entities.user_mentions ?= []
		for user in tweet.entities.user_mentions
			text_html = text_html.replace "@#{user.screen_name}", "<a href=\"https://twitter.com/#{user.screen_name}\" target=\"_blank\">@#{user.screen_name}</a>"

		tweetDivision.clone()
			.find ".icon img"
				.attr "src", tweet.user.profile_image_url
				.end()
			.find ".content2 .name"
				.text tweet.user.name
				.append $ "<small>@#{tweet.user.screen_name}</small>"
				.end()
			.find ".content2 .time"
				.append $ created_at_html
				.end()
			.find ".content2 .text"
				.append $ text_html
				.end()
			.find ".content2 .attachment"
				.append entities_html
				.end()
			.hide()
			.prependTo "##{extension_id} .timeline"
			.fadeIn()

		oldest = $ "##{extension_id} .tweet:last-child"
		oldest.remove() if oldest.siblings().length >= 200
		
		$ "##{extension_id} .alert"
			.remove()
	
	domain.on "event", (event, other) ->
		createLog "stream event", other
	
	domain.on "error", (event, error) ->
		createAlert "getting timeline failed.", error
	
	domain.on "open_url", (event, url) ->
		NativeApp.openURLInDefaultBrowser url
	
	$ "##{extension_id} form"
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
	
	$ "##{extension_id} .login"
		.on "click", (event) ->
			domain.exec "authenticate"
				.then ->
					domain.exec "save", "#{extension_path}config.json"
				.done ->
					connect()
				.fail (error) ->
					createAlert "authentication failed", error
	
