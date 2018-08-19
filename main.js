(function() {
  define(function(require, exports, module) {
    var ExtensionUtils, NativeApp, NodeDomain, PreferencesManager, WorkspaceManager, connect, createAlert, createIcon, createLog, createPanel, domain, extension_id, extension_path, icon, iconClicked, panel, tweetDivision;
    NodeDomain = brackets.getModule("utils/NodeDomain");
    PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    NativeApp = brackets.getModule("utils/NativeApp");
    WorkspaceManager = brackets.getModule("view/WorkspaceManager");
    ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    extension_id = "twttr4brackets";
    extension_path = ExtensionUtils.getModulePath(module);
    connect = function() {
      createAlert("connecting...");
      return domain.exec("load", "" + extension_path + "config.json").then(function() {
        return domain.exec("load", {
          "request_options": {
            "proxy": PreferencesManager.get("proxy")
          }
        });
      }).then(function() {
        return domain.exec("connect");
      }).done(function(user) {
        $("#" + extension_id + " .me img").attr("src", user.profile_image_url).show().siblings(".default-icon").hide();
        $("#" + extension_id + " .login").text("Logout");
        createAlert("connected");
        return window.setTimeout(function() {
          return domain.exec("get");
        }, 3000);
      }).fail(function(error) {
        $("#" + extension_id + " .me img").attr("src", "").hide().siblings(".default-icon").show();
        $("#" + extension_id + " .login").text("Login");
        return createAlert("connecting failed", error);
      });
    };
    createIcon = function() {
      return $("<a href=\"#\"></a>").css({
        "backgroundImage": "url(\"" + extension_path + "icon.svg\")",
        "backgroundPosition": "0 0",
        "backgroundSize": "100%"
      }).on("click", iconClicked).appendTo($("#main-toolbar .buttons"));
    };
    iconClicked = function() {
      var isvisible;
      panel.setVisible(isvisible = !panel.isVisible());
      icon.css({
        "backgroundPosition": "0 " + (isvisible ? "-48px" : "0")
      });
      if (isvisible) {
        return connect();
      }
    };
    createPanel = function() {
      return $(require("text!panel.html")).find(".close").on("click", iconClicked).end();
    };
    createLog = function(message, error) {
      var level;
      if (error == null) {
        error = null;
      }
      level = error != null ? "error" : "log";
      console[level]("[ext-" + level + "] [" + extension_id + "] " + message);
      return console[level]("[ext-" + level + "] [" + extension_id + "] " + (JSON.stringify(error)));
    };
    createAlert = function(message, error) {
      if (error == null) {
        error = null;
      }
      return $("<div class=\"alert alert-" + (error != null ? "error" : "success") + "\"></div>").append($("<div>" + message + "</div>")).append($("<div>" + (error != null ? JSON.stringify(error) : "") + "</div>")).hide().prependTo("#" + extension_id + " .timeline").fadeIn();
    };
    panel = WorkspaceManager.createBottomPanel("io.github.mikankari.twttr4brackets", createPanel(), 200);
    tweetDivision = $("#" + extension_id + " .tweet").remove();
    icon = createIcon();
    ExtensionUtils.loadStyleSheet(module, "panel.css");
    domain = new NodeDomain("" + extension_id + "-streaming", "" + extension_path + "domain");
    domain.on("data", function(event, tweet) {
      var created_at_html, entities_html, hashtag, media, oldest, text_html, url, user, _base, _base1, _base2, _base3, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3;
      created_at_html = Intl.DateTimeFormat(void 0, {
        "weekday": "short",
        "hour": "numeric",
        "hour12": false,
        "minute": "2-digit"
      }).format(new Date(tweet.created_at));
      created_at_html = "<a href=\"https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str + "\" target=\"_blank\">" + created_at_html + "</a>";
      entities_html = "";
      text_html = "<span>" + tweet.text + "</span>";
      if (tweet.extended_entities == null) {
        tweet.extended_entities = {};
      }
      if ((_base = tweet.extended_entities).media == null) {
        _base.media = [];
      }
      _ref = tweet.extended_entities.media;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        media = _ref[_i];
        entities_html += "<a href=\"" + media.expanded_url + "\" target=\"_blank\"><img src=\"" + media.media_url + ":thumb\"></a>";
        text_html = text_html.replace(media.url, "");
      }
      if ((_base1 = tweet.entities).urls == null) {
        _base1.urls = [];
      }
      _ref1 = tweet.entities.urls;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        url = _ref1[_j];
        if (url.expanded_url != null) {
          text_html = text_html.replace(url.url, "<a href=\"" + url.expanded_url + "\" target=\"_blank\">" + url.display_url + "</a>");
        }
      }
      if ((_base2 = tweet.entities).hashtags == null) {
        _base2.hashtags = [];
      }
      _ref2 = tweet.entities.hashtags;
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        hashtag = _ref2[_k];
        text_html = text_html.replace("#" + hashtag.text, "<a href=\"https://twitter.com/hashtag/" + (encodeURIComponent(hashtag.text)) + "\" target=\"_blank\">#" + hashtag.text + "</a>");
      }
      if ((_base3 = tweet.entities).user_mentions == null) {
        _base3.user_mentions = [];
      }
      _ref3 = tweet.entities.user_mentions;
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        user = _ref3[_l];
        text_html = text_html.replace("@" + user.screen_name, "<a href=\"https://twitter.com/" + user.screen_name + "\" target=\"_blank\">@" + user.screen_name + "</a>");
      }
      tweetDivision.clone().find(".icon img").attr("src", tweet.user.profile_image_url).end().find(".content2 .name").text(tweet.user.name).append($("<small>@" + tweet.user.screen_name + "</small>")).end().find(".content2 .time").append($(created_at_html)).end().find(".content2 .text").append($(text_html)).end().find(".content2 .attachment").append(entities_html).end().hide().prependTo("#" + extension_id + " .timeline").fadeIn();
      oldest = $("#" + extension_id + " .tweet:last-child");
      if (oldest.siblings().length >= 200) {
        oldest.remove();
      }
      return $("#" + extension_id + " .alert").remove();
    });
    domain.on("event", function(event, other) {
      return createLog("stream event", other);
    });
    domain.on("error", function(event, error) {
      return createAlert("getting timeline failed.", error);
    });
    domain.on("open_url", function(event, url) {
      return NativeApp.openURLInDefaultBrowser(url);
    });
    $("#" + extension_id + " form").on("submit", function(event) {
      var text;
      event.preventDefault();
      text = $(event.target).find("[name=text]").val();
      return domain.exec("post", text).done(function() {
        event.target.reset();
        return domain.exec("get");
      }).fail(function(error) {
        return createAlert("tweeting failed.", error);
      });
    });
    return $("#" + extension_id + " .login").on("click", function(event) {
      return domain.exec("authenticate").then(function() {
        return domain.exec("save", "" + extension_path + "config.json");
      }).done(function() {
        return connect();
      }).fail(function(error) {
        return createAlert("authentication failed", error);
      });
    });
  });

}).call(this);
