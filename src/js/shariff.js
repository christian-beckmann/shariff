'use strict';

var $ = require('jquery');

var _Shariff = function (element, options) {
    var self = this;

    // the DOM element that will contain the buttons
    this.element = element;

    this.options = $.extend({}, this.defaults, options, $(element).data());

    // available services. /!\ Browserify can't require dynamically by now.
    var availableServices = [
        require('./services/facebook'),
        require('./services/googleplus'),
        require('./services/twitter'),
        require('./services/whatsapp'),
        require('./services/mail'),
        require('./services/info')
    ];

    // initialisiere nur benoetigte Services
    if (this.options.theme === 'custom') {
        this.options.services = $.map($('.deputy-shariff [data-share-service]'), function ($serviceLink) {
            var serviceName = $($serviceLink).attr('data-share-service');
            return serviceName ? serviceName : null;
        });
    }


    // filter available services to those that are enabled and initialize them
    this.services = $.map(this.options.services, function (serviceName) {
        var service;
        availableServices.forEach(function (availableService) {
            availableService = availableService(self);
            if (availableService.name === serviceName) {
                service = availableService;
                return null;
            }
        });
        return service;
    });

    if (this.options.theme !== 'custom') {
        this._addButtonList();
    } else {
        //initialize custom html links
        this._initCustomButtons();
    }

    if (this.options.backendUrl !== null) {
        this.getShares().then($.proxy(this._updateCounts, this));
    }

};

_Shariff.prototype = {

    // Defaults may be over either by passing "options" to constructor method
    // or by setting data attributes.
    defaults: {
        theme: 'color',

        // URL to backend that requests social counts. null means "disabled"
        backendUrl: null,

        // Link to the "about" page
        infoUrl: 'http://ct.de/-2467514',

        // localisation: "de" or "en"
        lang: 'de',

        // horizontal/vertical
        orientation: 'horizontal',


        // a string to suffix current URL
        referrerTrack: null,

        // services to be enabled in the following order
        services: ['facebook', 'twitter', 'googleplus', 'info'],

        shareText: '',

        twitterVia: null,

        // build URI from rel="canonical" or document.location
        url: function () {
            var url = global.document.location.href;
            var canonical = $('link[rel=canonical]').attr('href') || this.getMeta('og:url') || '';

            if (canonical.length > 0) {
                if (canonical.indexOf('http') < 0) {
                    canonical = global.document.location.protocol + '//' + global.document.location.host + canonical;
                }
                url = canonical;
            }

            return url;
        }
    },

    $socialshareElement: function () {
        return $(this.element);
    },

    getLocalized: function (data, key) {
        if (typeof data[key] === 'object') {
            return data[key][this.options.lang];
        } else if (typeof data[key] === 'string') {
            return data[key];
        }
        return undefined;
    },

    // returns content of <meta name="" content=""> tags or '' if empty/non existant
    getMeta: function (name) {
        var metaContent = $('meta[name="' + name + '"],[property="' + name + '"]').attr('content');
        return metaContent || '';
    },

    getInfoUrl: function () {
        return this.options.infoUrl;
    },

    getURL: function () {
        var url = this.options.url;
        return ( typeof url === 'function' ) ? $.proxy(url, this)() : url;
    },

    /**
     * Change Share-Url on the fly, even DOM links.
     * @param url
     */
    setURL: function (url) {
        var me = this;
        me.options.url = url ? url : me.options.url;
        $.map(me.services, function (service) {
            if (typeof service.setShareUrl === 'function') {
                service.setShareUrl(url);
                me.$socialshareElement().find('[data-share-service=' + service.name + ']').attr('href', service.shareUrl);
            }
        });

        return me;
    },

    getReferrerTrack: function () {
        return this.options.referrerTrack || '';
    },

    // returns shareCounts of document
    getShares: function () {
        return $.getJSON(this.options.backendUrl + '?url=' + encodeURIComponent(this.getURL()));
    },

    // add value of shares for each service
    _updateCounts: function (data) {
        var self = this;
        $.each(data, function (key, value) {
            if (value >= 1000) {
                value = Math.round(value / 1000) + 'k';
            }
            $(self.element).find('.' + key + ' a').append('<span class="share_count">' + value);
        });
    },

    // add html for button-container
    _addButtonList: function () {
        var self = this;

        var $socialshareElement = this.$socialshareElement();

        var themeClass = 'theme-' + this.options.theme;
        var orientationClass = 'orientation-' + this.options.orientation;

        var $buttonList = $('<ul>').addClass(themeClass).addClass(orientationClass);

        // add html for service-links
        this.services.forEach(function (service) {
            var $li = $('<li class="shariff-button">').addClass(service.name);
            var $shareText = '<span class="share_text">' + self.getLocalized(service, 'shareText');

            var $shareLink = $('<a>')
                .attr('href', service.shareUrl)
                .attr('data-share-service', service.name)
                .append($shareText);

            if (typeof service.faName !== 'undefined') {
                $shareLink.prepend('<span class="fa ' + service.faName + '">');
            }

            if (service.popup) {
                $shareLink.attr('rel', 'popup');
            } else {
                $shareLink.attr('target', '_blank');
            }
            $shareLink.attr('title', self.getLocalized(service, 'title'));

            $li.append($shareLink);

            $buttonList.append($li);
        });

        // event delegation
        $buttonList.on('click', '[rel="popup"]', function (e) {
            e.preventDefault();

            var url = $(this).attr('href');
            var windowName = $(this).attr('title');
            var windowSizeX = '600';
            var windowSizeY = '460';
            var windowSize = 'width=' + windowSizeX + ',height=' + windowSizeY;

            global.window.open(url, windowName, windowSize);

        });

        $socialshareElement.append($buttonList);
    },

    _initCustomButtons: function () {
        var self = this;

        var $socialshareElement = self.$socialshareElement();
        var $shareLinks = $socialshareElement.find('a[data-share-service]');

        //Share Links anpassen
        self.services.forEach(function (service) {
            //Service-Name
            var $shareLink = $shareLinks.filter('[data-share-service=' + service.name + ']');
            if ($shareLink.length) {
                $shareLink.attr('href', service.shareUrl)
                    .attr('data-share-service', service.name);

                if (service.popup) {
                    $shareLink.attr('rel', 'popup');
                } else {
                    $shareLink.attr('target', '_blank');
                }
                $shareLink.attr('title', self.getLocalized(service, 'title'));
            }
        });

        // event delegation
        $shareLinks.on('click', function (e) {
            e.preventDefault();

            var url = $(this).attr('href');
            var windowName = $(this).attr('title');
            var windowSizeX = '600';
            var windowSizeY = '460';
            var windowSize = 'width=' + windowSizeX + ',height=' + windowSizeY;

            global.window.open(url, windowName, windowSize);
        });

        return self;
    },

    // abbreviate at last blank before length and add "\u2026" (horizontal ellipsis)
    abbreviateText: function (text, length) {
        var abbreviated = $('<div/>').html(text).text();
        if (abbreviated.length <= length) {
            return text;
        }

        var lastWhitespaceIndex = abbreviated.substring(0, length - 1).lastIndexOf(' ');
        abbreviated = encodeURIComponent(abbreviated.substring(0, lastWhitespaceIndex)) + '\u2026';

        return abbreviated;
    },

    // create tweet text from content of <meta name="DC.title"> and <meta name="DC.creator">
    // fallback to content of <title> tag
    getShareText: function () {
        if (this.options.shareText !== '') {
            return encodeURIComponent(this.abbreviateText(this.options.shareText, 120));
        }

        var title = this.getMeta('DC.title');
        var creator = this.getMeta('DC.creator');

        if (title.length > 0 && creator.length > 0) {
            title += ' - ' + creator;
        } else {
            title = $('title').text();
        }
        // 120 is the max character count left after twitters automatic url shortening with t.co
        return encodeURIComponent(this.abbreviateText(title, 120));
    },

    /**
     * override share text
     * expects utf8
     * @param _text
     */
    setShareText: function (_text) {
        var me = this;
        me.options.shareText = _text;
        me.setURL(me.getURL());

        return me;
    }
};

module.exports = _Shariff;

// initialize .shariff elements
$('.shariff').each(function() {
    if (!this.hasOwnProperty('shariff')) {
        this.shariff = new _Shariff(this);
    }
});

//for everyone
global.window.Shariff = _Shariff;