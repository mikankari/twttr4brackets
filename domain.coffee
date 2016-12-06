Twitter = require "twitter"
HTTP = require "http"
URL = require "url"
FileSystem = require "fs"

_domainManager = null
_twitter = null
_stream = null
_server = null
_config = {
	"consumer_key": "EW5z6GixlmldAlo0l6gLItYOT",
	"consumer_secret": "nqRsY1s27De4zsG9IoFsAGpCp8i4mq3wmUXXmyjQH9Urox8suK",
	"token_key": ""
	"token_secret": ""
	"proxy": ""
}

_createLog = (message, error = null) ->
	level = if error? then "error" else "log"
	console[level] "[twttr] #{message}"
	console.error "[twttr] #{JSON.stringify error}" if level is "error"

_connect = (callback) ->
	_twitter = new Twitter {
		"consumer_key": _config.consumer_key
		"consumer_secret": _config.consumer_secret
		"access_token_key": _config.token_key
		"access_token_secret": _config.token_secret
		"request_options": {
			"proxy": _config.proxy
		}
	}
	
	if _stream?
		_twitter.get "account/verify_credentials", (error, user, response) ->
			if error?
				_stream.destroy()
				_stream = null
			
			callback error, user
	else
		_twitter.get "account/verify_credentials", (error, user, response) ->
			if not error?
				_twitter.stream "user", (stream) ->
					stream.on "data", (tweet) ->
						type = if tweet.text? then "data" else "event"
						_domainManager.emitEvent "io-github-mikankari-twttr4brackets-streaming", type, tweet
					stream.on "error", (error) ->
						_domainManager.emitEvent "io-github-mikankari-twttr4brackets-streaming", "error", error
						_stream = null
					stream.on "end", ->
						_domainManager.emitEvent "io-github-mikankari-twttr4brackets-streaming", "event", {"disconnect":{}}
						_stream = null
					_stream = stream;
			
			callback error, user

_get = (callback) ->
	_twitter.get "statuses/home_timeline", {
		"count": 200
	}, (error, tweets, response) ->
		callback error
		if not error?
			tweets.reverse()
			_domainManager.emitEvent "io-github-mikankari-twttr4brackets-streaming", "data", value for value in tweets

_post = (text, callback) ->
	_twitter.post "statuses/update", {
		"status": text
	}, (error, tweet, response) ->
		callback error

_authenticate = (callback) ->
	if _stream?
		_config.token_key = ""
		_config.token_secret = ""
		callback null
	else
		server = HTTP.createServer (request, response) ->
			response.writeHead 200, {"Content-Type": "text/html"}
			response.end("<p>this window will close.</p><script> window.setTimeout(function(){ window.open(\"about:blank\", \"_self\").close(); }, 3000) </script>")

			param = URL.parse request.url, true
				.query
			_twitter.post "oauth/access_token", param, (error, data, response) ->
				if not error?
					_config.token_key = data.oauth_token
					_config.token_secret = data.oauth_token_secret
				callback error

			server.close()
		server.listen 0
		info = server.address()

		_twitter.post "oauth/request_token", {
			"oauth_callback": "http://localhost:#{info.port}/"
		}, (error, data, response) ->
			if not error?
				url = [
					"https://api.twitter.com/oauth/authorize?"
					"oauth_token=#{data.oauth_token}"
				].join ""
				_domainManager.emitEvent "io-github-mikankari-twttr4brackets-streaming", "open_url", url

_configure = (config, filename, callback) ->
	if config?
		_config.proxy = config.proxy if config.proxy?
		
		if filename?
			data = JSON.stringify _config
			FileSystem.writeFile filename, data, (error) ->
				callback error
		else
			callback null
	else
		createConfig = ->
			{
				"proxy": _config.proxy
			}
		
		if filename?
			FileSystem.readFile filename, (error, data) ->
				_config = JSON.parse data
				callback error, createConfig()
		else
			callback null, createConfig()


exports.init = (DomainManager) ->
	if not DomainManager.hasDomain "io-github-mikankari-twttr4brackets-streaming"
		DomainManager.registerDomain "io-github-mikankari-twttr4brackets-streaming", {
			"major": 0, "minor": 1
		}
	_domainManager = DomainManager
	
	DomainManager.registerCommand "io-github-mikankari-twttr4brackets-streaming",
		"connect",
		_connect,
		true,
		"connect stream for getting tweets of home_timeline. tweets and errors send as events",
		[],
		[
			{
				"name": "user"
				"type": "object"
				"description": "object of an authenticated user"
			}
		]
	DomainManager.registerCommand "io-github-mikankari-twttr4brackets-streaming",
		"get",
		_get,
		true,
		"get 200 tweets of home_timeline. tweets send as the event",
		[],
		[]
	DomainManager.registerCommand "io-github-mikankari-twttr4brackets-streaming",
		"post",
		_post,
		true,
		"post a tweet",
		[
			{
				"name": "text"
				"type": "string"
				"description": "text of a tweet"
			}
		],
		[]
	DomainManager.registerCommand "io-github-mikankari-twttr4brackets-streaming",
		"authenticate",
		_authenticate,
		true,
		"authenticate user",
		[],
		[]
	DomainManager.registerCommand "io-github-mikankari-twttr4brackets-streaming",
		"configure",
		_configure,
		true,
		"configure for connection",
		[
			{
				"name": "config"
				"type": "object"
			}
			{
				"name": "filename"
				"type": "string"
			}
		],
		[
			{
				"name": "config"
				"type": "object"
			}
		]
	
	DomainManager.registerEvent "io-github-mikankari-twttr4brackets-streaming",
		"data",
		[
			{
				"name": "tweet"
				"type": "object"
				"description": "object of a tweet"
			}
		]
	DomainManager.registerEvent "io-github-mikankari-twttr4brackets-streaming",
		"event",
		[
			{
				"name": "other"
				"type": "object"
				"description": "object of events"
			}
		]
	DomainManager.registerEvent "io-github-mikankari-twttr4brackets-streaming",
		"error",
		[
			{
				"name": "error"
				"type": "object"
				"description": "object of a error"
			}
		]
	DomainManager.registerEvent "io-github-mikankari-twttr4brackets-streaming",
		"open_url",
		[
			{
				"name": "url"
				"type": "string"
			}
		]
