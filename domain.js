(function() {
  var FileSystem, HTTP, Twitter, URL, _authenticate, _config, _configure, _connect, _createLog, _domainManager, _get, _post, _server, _stream, _twitter;

  Twitter = require("twitter");

  HTTP = require("http");

  URL = require("url");

  FileSystem = require("fs");

  _domainManager = null;

  _twitter = null;

  _stream = null;

  _server = null;

  _config = {
    "consumer_key": "EW5z6GixlmldAlo0l6gLItYOT",
    "consumer_secret": "nqRsY1s27De4zsG9IoFsAGpCp8i4mq3wmUXXmyjQH9Urox8suK",
    "token_key": "",
    "token_secret": "",
    "proxy": ""
  };

  _createLog = function(message, error) {
    var level;
    if (error == null) {
      error = null;
    }
    level = error != null ? "error" : "log";
    console[level]("[twttr] " + message);
    if (level === "error") {
      return console.error("[twttr] " + (JSON.stringify(error)));
    }
  };

  _connect = function(callback) {
    _twitter = new Twitter({
      "consumer_key": _config.consumer_key,
      "consumer_secret": _config.consumer_secret,
      "access_token_key": _config.token_key,
      "access_token_secret": _config.token_secret,
      "request_options": {
        "proxy": _config.proxy
      }
    });
    if (_stream != null) {
      return _twitter.get("account/verify_credentials", function(error, user, response) {
        if (error != null) {
          _stream.destroy();
          _stream = null;
        }
        return callback(error, user);
      });
    } else {
      return _twitter.get("account/verify_credentials", function(error, user, response) {
        if (error == null) {
          _twitter.stream("user", function(stream) {
            stream.on("data", function(tweet) {
              var type;
              type = tweet.text != null ? "data" : "event";
              return _domainManager.emitEvent("io-github-mikankari-twttr4brackets-streaming", type, tweet);
            });
            stream.on("error", function(error) {
              _domainManager.emitEvent("io-github-mikankari-twttr4brackets-streaming", "error", error);
              return _stream = null;
            });
            stream.on("end", function() {
              _domainManager.emitEvent("io-github-mikankari-twttr4brackets-streaming", "event", {
                "disconnect": {}
              });
              return _stream = null;
            });
            return _stream = stream;
          });
        }
        return callback(error, user);
      });
    }
  };

  _get = function(callback) {
    return _twitter.get("statuses/home_timeline", {
      "count": 200
    }, function(error, tweets, response) {
      var value, _i, _len, _results;
      callback(error);
      if (error == null) {
        tweets.reverse();
        _results = [];
        for (_i = 0, _len = tweets.length; _i < _len; _i++) {
          value = tweets[_i];
          _results.push(_domainManager.emitEvent("io-github-mikankari-twttr4brackets-streaming", "data", value));
        }
        return _results;
      }
    });
  };

  _post = function(text, callback) {
    return _twitter.post("statuses/update", {
      "status": text
    }, function(error, tweet, response) {
      return callback(error);
    });
  };

  _authenticate = function(callback) {
    var info, server;
    if (_stream != null) {
      _config.token_key = "";
      _config.token_secret = "";
      return callback(null);
    } else {
      server = HTTP.createServer(function(request, response) {
        var param;
        response.writeHead(200, {
          "Content-Type": "text/html"
        });
        response.end("<p>this window will close.</p><script> window.setTimeout(function(){ window.open(\"about:blank\", \"_self\").close(); }, 3000) </script>");
        param = URL.parse(request.url, true).query;
        _twitter.post("oauth/access_token", param, function(error, data, response) {
          if (error == null) {
            _config.token_key = data.oauth_token;
            _config.token_secret = data.oauth_token_secret;
          }
          return callback(error);
        });
        return server.close();
      });
      server.listen(0);
      info = server.address();
      return _twitter.post("oauth/request_token", {
        "oauth_callback": "http://localhost:" + info.port + "/"
      }, function(error, data, response) {
        var url;
        if (error == null) {
          url = ["https://api.twitter.com/oauth/authorize?", "oauth_token=" + data.oauth_token].join("");
          return _domainManager.emitEvent("io-github-mikankari-twttr4brackets-streaming", "open_url", url);
        }
      });
    }
  };

  _configure = function(config, filename, callback) {
    var createConfig, data;
    if (config != null) {
      if (config.proxy != null) {
        _config.proxy = config.proxy;
      }
      if (filename != null) {
        data = JSON.stringify(_config);
        return FileSystem.writeFile(filename, data, function(error) {
          return callback(error);
        });
      } else {
        return callback(null);
      }
    } else {
      createConfig = function() {
        return {
          "proxy": _config.proxy
        };
      };
      if (filename != null) {
        return FileSystem.readFile(filename, function(error, data) {
          _config = JSON.parse(data);
          return callback(error, createConfig());
        });
      } else {
        return callback(null, createConfig());
      }
    }
  };

  exports.init = function(DomainManager) {
    if (!DomainManager.hasDomain("io-github-mikankari-twttr4brackets-streaming")) {
      DomainManager.registerDomain("io-github-mikankari-twttr4brackets-streaming", {
        "major": 0,
        "minor": 1
      });
    }
    _domainManager = DomainManager;
    DomainManager.registerCommand("io-github-mikankari-twttr4brackets-streaming", "connect", _connect, true, "connect stream for getting tweets of home_timeline. tweets and errors send as events", [], [
      {
        "name": "user",
        "type": "object",
        "description": "object of an authenticated user"
      }
    ]);
    DomainManager.registerCommand("io-github-mikankari-twttr4brackets-streaming", "get", _get, true, "get 200 tweets of home_timeline. tweets send as the event", [], []);
    DomainManager.registerCommand("io-github-mikankari-twttr4brackets-streaming", "post", _post, true, "post a tweet", [
      {
        "name": "text",
        "type": "string",
        "description": "text of a tweet"
      }
    ], []);
    DomainManager.registerCommand("io-github-mikankari-twttr4brackets-streaming", "authenticate", _authenticate, true, "authenticate user", [], []);
    DomainManager.registerCommand("io-github-mikankari-twttr4brackets-streaming", "configure", _configure, true, "configure for connection", [
      {
        "name": "config",
        "type": "object"
      }, {
        "name": "filename",
        "type": "string"
      }
    ], [
      {
        "name": "config",
        "type": "object"
      }
    ]);
    DomainManager.registerEvent("io-github-mikankari-twttr4brackets-streaming", "data", [
      {
        "name": "tweet",
        "type": "object",
        "description": "object of a tweet"
      }
    ]);
    DomainManager.registerEvent("io-github-mikankari-twttr4brackets-streaming", "event", [
      {
        "name": "other",
        "type": "object",
        "description": "object of events"
      }
    ]);
    DomainManager.registerEvent("io-github-mikankari-twttr4brackets-streaming", "error", [
      {
        "name": "error",
        "type": "object",
        "description": "object of a error"
      }
    ]);
    return DomainManager.registerEvent("io-github-mikankari-twttr4brackets-streaming", "open_url", [
      {
        "name": "url",
        "type": "string"
      }
    ]);
  };

}).call(this);
