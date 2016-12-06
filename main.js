define(function(require, exports, module) {
  var Dialog, ExtensionUtils, NativeApp, NodeDomain, PreferencesManager, WorkspaceManager, configure, connect, createAlert, createIcon, createLog, createPanel, domain, icon, iconClicked, panel, tweetDivision;
  WorkspaceManager = brackets.getModule("view/WorkspaceManager");
  NodeDomain = brackets.getModule("utils/NodeDomain");
  ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
  NativeApp = brackets.getModule("utils/NativeApp");
  Dialog = brackets.getModule("widgets/Dialogs");
  PreferencesManager = brackets.getModule("preferences/PreferencesManager");
  createLog = function(message, error) {
    var level;
    if (error == null) {
      error = null;
    }
    level = error != null ? "error" : "log";
    console[level]("[ext-" + level + "] [twttr] " + message);
    return console[level]("[ext-" + level + "] [twttr] " + (JSON.stringify(error)));
  };
  createAlert = function(message, error) {
    if (error == null) {
      error = null;
    }
    return $("<div class=\"alert alert-" + (error != null ? "danger" : "success") + "\"></div>").append($("<div>" + message + "</div>")).append($("<div>" + (error != null ? JSON.stringify(error) : "") + "</div>")).hide().prependTo("#io-github-mikankari-twttr4brackets .timeline").fadeIn();
  };
  configure = function() {
    var config, value, _i, _len, _ref;
    config = {};
    _ref = ["proxy"];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      value = _ref[_i];
      config[value] = PreferencesManager.get(value);
    }
    return domain.exec("configure", config, ExtensionUtils.getModulePath(module, "config.json"));
  };
  connect = function() {
    createAlert("connecting...");
    return domain.exec("connect").done(function(user) {
      $("#io-github-mikankari-twttr4brackets .me img").attr("src", user.profile_image_url);
      $("#io-github-mikankari-twttr4brackets .login").text("Logout");
      return createAlert("connected");
    }).fail(function(error) {
      $("#io-github-mikankari-twttr4brackets .me img").attr("src", "" + (ExtensionUtils.getModulePath(module, "tweet-default-icon.png")));
      $("#io-github-mikankari-twttr4brackets .login").text("Login");
      return createAlert("connecting failed", error);
    });
  };
  iconClicked = function() {
    var isvisible;
    panel.setVisible(isvisible = !panel.isVisible());
    icon.css({
      "backgroundPosition": "0 " + (isvisible ? "-48px" : "0")
    });
    if (isvisible) {
      configure();
      return connect();
    }
  };
  createIcon = function() {
    return $("<a href=\"#\"></a>").css({
      "backgroundImage": "url(\"" + (ExtensionUtils.getModulePath(module, "icon.svg")) + "\")",
      "backgroundPosition": "0 0",
      "backgroundSize": "100%"
    }).on("click", iconClicked).appendTo($("#main-toolbar .buttons"));
  };
  createPanel = function() {
    return $(require("text!panel.html")).find(".close").on("click", iconClicked).end();
  };
  panel = WorkspaceManager.createBottomPanel("io.github.mikankari.twttr4brackets", createPanel(), 200);
  icon = createIcon();
  domain = new NodeDomain("io-github-mikankari-twttr4brackets-streaming", ExtensionUtils.getModulePath(module, "domain"));
  domain.on("data", function(event, tweet) {
    var oldest, time;
    time = Intl.DateTimeFormat(void 0, {
      "weekday": "short",
      "hour": "numeric",
      "hour12": false,
      "minute": "2-digit"
    }).format(new Date(tweet.created_at));
    tweetDivision.clone().find(".icon img").attr("src", tweet.user.profile_image_url).end().find(".content2 .name").text(tweet.user.name).append($("<small>@" + tweet.user.screen_name + "</small>")).end().find(".content2 .time").text(time).end().find(".content2 .text").text(tweet.text).end().hide().prependTo("#io-github-mikankari-twttr4brackets .timeline").fadeIn();
    oldest = $("#io-github-mikankari-twttr4brackets .tweet:last-child");
    if (oldest.siblings().length >= 200) {
      oldest.remove();
    }
    return $("#io-github-mikankari-twttr4brackets .alert").remove();
  });
  domain.on("event", function(event, other) {
    return createLog("stream event", other);
  });
  domain.on("error", function(event, error) {
    createLog("getting timeline failed.", error);
    return createAlert("getting timeline failed.", error);
  });
  domain.on("open_url", function(event, url) {
    return NativeApp.openURLInDefaultBrowser(url);
  });
  domain.exec("configure", null, ExtensionUtils.getModulePath(module, "config.json")).done(function(config) {
    return configure();
  });
  tweetDivision = $("#io-github-mikankari-twttr4brackets .tweet").remove();
  ExtensionUtils.loadStyleSheet(module, "panel.css");
  $("#io-github-mikankari-twttr4brackets form").on("submit", function(event) {
    var text;
    event.preventDefault();
    text = $(event.target).find("[name=text]").val();
    return domain.exec("post", text).done(function() {
      return event.target.reset();
    }).fail(function(error) {
      return createAlert("tweeting failed.", error);
    });
  });
  return $("#io-github-mikankari-twttr4brackets .login").on("click", function(event) {
    return domain.exec("authenticate").done(function() {
      configure();
      return connect();
    }).fail(function(error) {
      return createAlert("authentication failed", error);
    });
  });
});
