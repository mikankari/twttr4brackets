(function() {
  var FileSystem, HTTP, Twitter, URL, _authenticate, _config, _connect, _count, _createLog, _disconnect, _domainManager, _domain_id, _get, _load, _post, _save, _since_id, _stream, _twitter;

  Twitter = require("twitter");

  HTTP = require("http");

  URL = require("url");

  FileSystem = require("fs");

  _domainManager = null;

  _twitter = null;

  _stream = null;

  _since_id = 1;

  _count = 20;

  _config = {
    "consumer_key": "",
    "consumer_secret": "",
    "access_token_key": "",
    "access_token_secret": "",
    "request_options": {
      "proxy": ""
    }
  };

  _domain_id = "twttr4brackets-streaming";

  _connect = function(callback) {
    _twitter = new Twitter(_config);
    return _twitter.get("account/verify_credentials", function(error, user, response) {
      if (error == null) {
        _stream = global.setInterval(function() {
          return _get(function(error) {});
        }, 2 * 60000);
      } else {
        _stream = null;
      }
      return callback(error, user);
    });
  };

  _disconnect = function(callback) {
    global.clearInterval(_stream);
    _count = 20;
    return callback();
  };

  _get = function(callback) {
    return _twitter.get("statuses/home_timeline", {
      "since_id": _since_id,
      "count": _count
    }, function(error, tweets, response) {
      var value, _i, _len, _results;
      callback(error);
      if (error == null) {
        if (tweets.length > 0) {
          _since_id = tweets[0].id_str;
          _count = 200;
        }
        tweets.reverse();
        _results = [];
        for (_i = 0, _len = tweets.length; _i < _len; _i++) {
          value = tweets[_i];
          _results.push(_domainManager.emitEvent(_domain_id, "data", value));
        }
        return _results;
      } else {
        return _domainManager.emitEvent(_domain_id, "error", tweets || error);
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
    var port, server;
    if (_stream != null) {
      _config.access_token_key = "";
      _config.access_token_secret = "";
      return callback(null);
    } else {
      server = HTTP.createServer(function(request, response) {
        var param;
        response.writeHead(200, {
          "Content-Type": "text/html",
          "Connection": "close"
        });
        response.write("<p>see brackets. this window will close.</p><script> window.setTimeout(function(){ window.open(\"about:blank\", \"_self\").close(); }, 3000) </script>");
        response.end();
        param = URL.parse(request.url, true).query;
        return _twitter.post("oauth/access_token", param, function(error, data, response) {
          if (error == null) {
            _config.access_token_key = data.oauth_token;
            _config.access_token_secret = data.oauth_token_secret;
          }
          return callback(error);
        });
      });
      server.on("connection", function() {
        return server.close();
      });
      server.on("error", function(error) {
        if (error != null) {
          return callback(error);
        }
      });
      server.listen(port = 53939);
      return _twitter.post("oauth/request_token", {
        "oauth_callback": "http://localhost:" + port + "/"
      }, function(error, data, response) {
        var url;
        if (error == null) {
          url = ["https://api.twitter.com/oauth/authorize?", "oauth_token=" + data.oauth_token].join("");
          return _domainManager.emitEvent(_domain_id, "open_url", url);
        } else {
          server.close();
          return callback(data || error);
        }
      });
    }
  };

  _load = function(config, callback) {
    var key, value;
    if (typeof config === "string") {
      return FileSystem.readFile(config, function(error, data) {
        var catched;
        if (error == null) {
          try {
            data = JSON.parse(data);
          } catch (_error) {
            catched = _error;
            error = catched;
            data = {};
          }
        } else {
          data = {};
        }
        return _load(data, function() {
          return callback(error);
        });
      });
    } else if (typeof config === "object") {
      for (key in config) {
        value = config[key];
        if (_config[key] != null) {
          _config[key] = value;
        }
      }
      return callback(null);
    }
  };

  _save = function(filename, callback) {
    var data;
    data = JSON.stringify(_config);
    return FileSystem.writeFile(filename, data, function(error) {
      return callback(error);
    });
  };

  _createLog = function(message, error) {
    var level;
    if (error == null) {
      error = null;
    }
    level = error != null ? "error" : "log";
    console[level]("[" + _domain_id + "] " + message);
    if (level === "error") {
      return console.error("[" + _domain_id + "] " + (JSON.stringify(error)));
    }
  };

  exports.init = function(DomainManager) {
    if (!DomainManager.hasDomain(_domain_id)) {
      DomainManager.registerDomain(_domain_id, {
        "major": 0,
        "minor": 1
      });
    }
    _domainManager = DomainManager;
    DomainManager.registerCommand(_domain_id, "connect", _connect, true, "connect stream for getting tweets of home_timeline. tweets and errors send as events", [], [
      {
        "name": "user",
        "type": "object",
        "description": "an authenticated user"
      }
    ]);
    DomainManager.registerCommand(_domain_id, "disconnect", _disconnect, true, "disconnect stream", [], []);
    DomainManager.registerCommand(_domain_id, "get", _get, true, "get 200 tweets of home_timeline. tweets send as the event", [], []);
    DomainManager.registerCommand(_domain_id, "post", _post, true, "post a tweet", [
      {
        "name": "text",
        "type": "string",
        "description": "text of a tweet"
      }
    ], []);
    DomainManager.registerCommand(_domain_id, "authenticate", _authenticate, true, "authenticate an user. fire the open-url event", [], []);
    DomainManager.registerCommand(_domain_id, "load", _load, true, "apply config or load from file for connection", [
      {
        "name": "config",
        "type": "object",
        "description": "configure to apply. if type of config is file path string, file to load config"
      }
    ], []);
    DomainManager.registerCommand(_domain_id, "save", _save, true, "save to file", [
      {
        "name": "filename",
        "type": "string",
        "description": "file to save config"
      }
    ]);
    DomainManager.registerEvent(_domain_id, "data", [
      {
        "name": "tweet",
        "type": "object",
        "description": "a tweet"
      }
    ]);
    DomainManager.registerEvent(_domain_id, "event", [
      {
        "name": "other",
        "type": "object",
        "description": "timeline events"
      }
    ]);
    DomainManager.registerEvent(_domain_id, "error", [
      {
        "name": "error",
        "type": "object",
        "description": "getting tweet error"
      }
    ]);
    return DomainManager.registerEvent(_domain_id, "open_url", [
      {
        "name": "url",
        "type": "string",
        "description": "url to open in browser"
      }
    ]);
  };

}).call(this);
