Twitter = require "twitter"
HTTP = require "http"
URL = require "url"
FileSystem = require "fs"

_domainManager = null
_twitter = null
_stream = null
_config = {
	"consumer_key": ""
	"consumer_secret": ""
	"access_token_key": ""
	"access_token_secret": ""
	"request_options": {
		"proxy": ""
	}
}
_domain_id = "twttr4brackets-streaming"

_connect = (callback) ->
	_twitter = new Twitter _config
	
	_stream?.destroy()

	_twitter.get "account/verify_credentials", (error, user, response) ->
		if not error?
			_twitter.stream "user", (stream) ->
				stream.on "data", (tweet) ->
					type = if tweet.text? then "data" else "event"
					_domainManager.emitEvent _domain_id, type, tweet
				stream.on "error", (error) ->
					_domainManager.emitEvent _domain_id, "error", error
					_stream = null
				stream.on "end", ->
					_domainManager.emitEvent _domain_id, "event", {"disconnect": true}
					_stream = null
				_stream = stream;
		else
			_stream = null

		callback error, user

_get = (callback) ->
	_twitter.get "statuses/home_timeline", {
		"count": 200
	}, (error, tweets, response) ->
		callback error
		if not error?
			tweets.reverse()
			_domainManager.emitEvent _domain_id, "data", value for value in tweets

_post = (text, callback) ->
	_twitter.post "statuses/update", {
		"status": text
	}, (error, tweet, response) ->
		callback error

_authenticate = (callback) ->
	if _stream?
		_config.access_token_key = ""
		_config.access_token_secret = ""
		callback null
	else
		server = HTTP.createServer (request, response) ->
			response.writeHead 200, {
				"Content-Type": "text/html"
				"Connection": "close"
			}
			response.write "<p>see brackets. this window will close.</p><script> window.setTimeout(function(){ window.open(\"about:blank\", \"_self\").close(); }, 3000) </script>"
			response.end()

			param = URL.parse request.url, true
				.query
			_twitter.post "oauth/access_token", param, (error, data, response) ->
				if not error?
					_config.access_token_key = data.oauth_token
					_config.access_token_secret = data.oauth_token_secret
				callback error
		server.on "connection", ->
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
				_domainManager.emitEvent _domain_id, "open_url", url

_load = (config, callback) ->
	if typeof config is "string"
		FileSystem.readFile config, (error, data) ->
			if not error?
				try
					data = JSON.parse data
				catch catched
					error = catched
					data = {}
			else
				data = {}

			_load data, -> callback error
	else if typeof config is "object"
		_config[key] = value for key, value of config when _config[key]?

		callback null

_save = (filename, callback) ->
	data = JSON.stringify _config
	FileSystem.writeFile filename, data, (error) ->
		callback error

_createLog = (message, error = null) ->
	level = if error? then "error" else "log"
	console[level] "[#{_domain_id}] #{message}"
	console.error "[#{_domain_id}] #{JSON.stringify error}" if level is "error"


exports.init = (DomainManager) ->
	if not DomainManager.hasDomain _domain_id
		DomainManager.registerDomain _domain_id, {
			"major": 0, "minor": 1
		}
	_domainManager = DomainManager
	
	DomainManager.registerCommand _domain_id,
		"connect",
		_connect,
		true,
		"connect stream for getting tweets of home_timeline. tweets and errors send as events",
		[],
		[
			{
				"name": "user"
				"type": "object"
				"description": "an authenticated user"
			}
		]
	DomainManager.registerCommand _domain_id,
		"get",
		_get,
		true,
		"get 200 tweets of home_timeline. tweets send as the event",
		[],
		[]
	DomainManager.registerCommand _domain_id,
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
	DomainManager.registerCommand _domain_id,
		"authenticate",
		_authenticate,
		true,
		"authenticate an user. fire the open-url event",
		[],
		[]
	DomainManager.registerCommand _domain_id,
		"load",
		_load,
		true,
		"apply config or load from file for connection",
		[
			{
				"name": "config"
				"type": "object"
				"description": "configure to apply. if type of config is file path string, file to load config"
			}
		],
		[]
	DomainManager.registerCommand _domain_id,
		"save",
		_save,
		true,
		"save to file",
		[
			{
				"name": "filename"
				"type": "string"
				"description": "file to save config"
			}
		]
	
	DomainManager.registerEvent _domain_id,
		"data",
		[
			{
				"name": "tweet"
				"type": "object"
				"description": "a tweet"
			}
		]
	DomainManager.registerEvent _domain_id,
		"event",
		[
			{
				"name": "other"
				"type": "object"
				"description": "timeline events"
			}
		]
	DomainManager.registerEvent _domain_id,
		"error",
		[
			{
				"name": "error"
				"type": "object"
				"description": "getting tweet error"
			}
		]
	DomainManager.registerEvent _domain_id,
		"open_url",
		[
			{
				"name": "url"
				"type": "string"
				"description": "url to open in browser"
			}
		]
