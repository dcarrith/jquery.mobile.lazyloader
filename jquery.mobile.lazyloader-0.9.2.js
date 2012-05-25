(function( $, undefined ) {

    $.widget( "mobile.lazyloader", $.mobile.widget, {

        // The jQuery object containing the element to which the lazy loader instance will be attached
        $element :  null, 

        // The jQuery object containing the page element that contains the ul to be lazy loaded
        $page :     null,   
        
        // The jQuery object containing the ul element that is to be lazy loaded
        $ul :       null,  

        // Create some default options that can be extended in reinitialization
        _defaultOptions : {

            // threshold for how close to the bottom should we trigger a load of more items
            'threshold'     : 360,
            // this is the number of items to retrieve from server by default
            'retrieve'      : 20,
            // this is the number of items retrieved so far
            'retrieved'     : 20,
            // this is whether or not to display count bubbles in the retrieved list items
            'bubbles'       : false,
            // this is for specifying an offset into the list in the case where the client is not in sync with server
            'offset'        : 0,
            // This is for setting a jQuery transform for use as a json2html template so the lazyloader knows 
            // how to handle raw JSON responses.  If null at time of load, then lazyloader expects HTML
            'transform'     : ""
        },

        // the parameters enable user defined server variables to be posted along with the ajax call to get more items
        _defaultParameters : {

            // this is the number of items to retrieve from server by default
            'retrieve'      : 20,
            // this is the number of items retrieved so far
            'retrieved'     : 20,
            // this is for specifying an offset into the list in the case where the client is not in sync with server
            'offset'        : 0
        },

        // Create some default settings that can be extended in reinitialization
        _defaultSettings : {

            // The page id of the page on which the lazyloader widget instance will be running
            "pageId"        : "",
            // The id of the list which the lazyloader widget instance will lazy loading
            "ulId"          : "",
            // The id of the DIV that should contain the animated gif to indicate more items are being loaded
            "progressDivId" : "",
            // The url of the server side resource to which the lazy loader AJAX call should be directed
            "moreUrl"       : "",
            // The url of the server side resource responsible for clearing server-side session variables to maintain state
            "clearUrl"      : "" 
        },

        // Short circuit event toggles to prevent the handling of multiple events at the same time
        _handleScrollStartJustFired : false,
        _handleScrollStopJustFired : false,
        _mouseWheelEventJustFired : false,
        
        // Variables to store the id of the setTimeout of the short circuit event toggle that sets toggle back to false
        _handleScrollStartTimeoutId : null,
        _handleScrollStopTimeoutId : null,
        _mouseWheelTimeoutId : null,

        // This stores the _settings for the last time the widget instance was used by a particular page (keyed by pageId)
        _instances : {}, 

        // This stores the merged object containing _defaultOptions and any overriding options passed in
        //options : null, 

        // This stores the merged object containing _defaultParameters and any overriding options passed in
        parameters : null,

        // This stores the merged object containing _defaultSettings and any overriding settings passed in
        _settings : null,  

        // Timeout values used for varying some of the setTimeout values used in the widget
        timeoutOptions : {

            // Timeout to pass to load when it's called from the mousewheel handler
            'mousewheel'    : 400,
            // Timeout to pass to load when it's called from the scrollstart handler
            'scrollstart'   : 600,
            // Timeout to pass to load when it's called from the scrollstop handler
            'scrollstop'    : 60,
            // this is the timeout for how quickly to show the loading more items progress indicator at bottom
            'showprogress'  : 200,
            // this is the timeout for when there's a button to scroll down manually
            'scrolldown'	: 400,
            // this is the timeout used for when user clicks into search filter or something
            'immediately'	: 0
        },

        // The name of the widget
        _widgetName : "lazyloader",

        // Object to contain two possible widget states
        _widgetState : {

            // whether or not we are already retrieving items from server
            'busy'          : false,
            // this is to specify whether lazy loading is probably done, so we don't need to try anymore
            'done'          : false
        },

        // Runs automatically the first time this widget is called. Put the initial widget set-up code here. 
        _create : function( ) {

            // Initialize the widget using the options passed in by the widget constructor
            this._initialize( this._defaultOptions, this._defaultSettings, this._defaultParameters );

            // Bind events that are needed by this widget
            this._bind();

            /*alert(JSON.stringify(this.$element));
            alert(JSON.stringify(this.$page));
            alert(JSON.stringify(this.$ul));
            alert(JSON.stringify(this._widgetState));
            alert(JSON.stringify(this._defaultSettings));
            alert(JSON.stringify(this._settings));
            alert(JSON.stringify(this.options));
            alert(JSON.stringify(this.parameters));
            alert(JSON.stringify(this._instances));*/
        },

        _init : function () {
            // not used
        },

        _initialize : function( options, settings, parameters ) {

            if ((typeof options != 'undefined') && (options != '')) {

                this._widgetState.busy = false;
                this._widgetState.done = false;

                //alert(JSON.stringify(options));
                //alert(JSON.stringify(this._defaultOptions));

                // Get the defaultSettings and extend / merge / override them with user defined settings 
                this._settings = $.extend( true, this._settings, this._defaultSettings );

                this._settings = $.extend( true, this._settings, settings );

                //alert(JSON.stringify(settings));

                // Get the defaultParameters and extend / merge / override them with user defined parameters 
                this.parameters = $.extend( true, this.parameters, this._defaultParameters );

                this.parameters = $.extend( true, this.parameters, parameters );

                //alert("before merging anything: "+JSON.stringify(this.options));

                // Get any user defined settings and extend / merge / override them with defaultSettings
                this.options = $.extend( true, this.options, this._defaultOptions );

                //alert("after merging _defaultOptions: "+JSON.stringify(this.options));

                // Get any user defined settings and extend / merge / override them with defaultSettings
                this.options = $.extend( true, this.options, options );

                //alert("after merging passed in options: "+JSON.stringify(this.options));



                // Get any user defined settings and extend / merge / override them with defaultSettings
                //var newOptions = JSON.stringify($.extend(true, this._defaultOptions, options));
                //alert("newOptions: "+newOptions);
                // Get the pageId for the settings that were passed in by the user
                var newPageId = settings.pageId;

                // Make sure a pageId was passed in
                if ( ( typeof newPageId != 'undefined ') && ( newPageId != '' ) ) {

                    // First check to see if we are already tracking an instance for the page being re-initialized before storing the defaults
                    if (!this._instances[newPageId]) {

                        optionsAsString = JSON.stringify(this.options);

                        // Store the merged options object as a new instance for later modifications and retrieval
                        this._instances[newPageId] = $.parseJSON(optionsAsString);
                    }

                    //alert(JSON.stringify(this._instances[newPageId]));
                    // Get options that were stored for current page and set the options object so it references correct instance options
                    //this._instances[newPageId] $.extend(true, this.options, this._defaultOptions, this._instances[newPageId]);
                
                } else {

                    // This should only happen during creation. It will store default options by value in options
                    //this.options = $.parseJSON(newOptions);
                }

                // This is the jQuery object (the element on which the widget was called)
                this.$element = this.element;

                // This is the jQuery object containing the collection matched by the selector ":jqmData(role='page')"      
                this.$page = this.$element.parents(":jqmData(role='page')");
                
                // This is the jQuery object containing the collection matched by the selector ":jqmData(role='listview')"
                this.$ul = $(":jqmData(role='listview')");
            }
        },

        _bind : function () {

            $('body').bind("scrollstart", $.proxy( this._handleScrollStart, this ));
            $('body').bind("scrollstop", $.proxy( this._handleScrollStop, this ));

            if (/Firefox/i.test(navigator.userAgent)) {

                $(window).bind( "DOMMouseScroll", $.proxy( this._handleMouseWheelEvent, this ) );

            } else {
            
                if ($("#"+this._settings.ulId).attachEvent) {

                    $(window).bind( "onmousewheel", $.proxy( this._handleMouseWheelEvent, this ) );

                } else {

                    $(window).bind( "mousewheel", $.proxy( this._handleMouseWheelEvent, this ) );
                }
            }

            // bind if the element is destroyed
            //this.$element.bind( "destroyed", $.proxy( this._teardown, this ) );
        },

        _unbind : function () {

            $('body').unbind("scrollstart", this._handleScrollStart );
            $('body').unbind("scrollstop", this._handleScrollStop );

            if (/Firefox/i.test(navigator.userAgent)) {

                $(window).unbind( "DOMMouseScroll", this._handleMouseWheelEvent );

            } else {
            
                if ($("#"+this._settings.ulId).attachEvent) {

                    $(window).unbind( "onmousewheel", this._handleMouseWheelEvent );

                } else {

                    $(window).unbind( "mousewheel", this._handleMouseWheelEvent );
                }
            }
        },

        destroy : function () {

            // Unbind any events that were bound at _create
            this._unbind();

            // Null out all properties of this widget
            this.$element = null;
            this.$page = null;      
            this.$ul = null;  
            this._settings = null; 
            this.options = null;   
            this.parameters = null;
            this._instances = null;
            this._handleScrollStartJustFired = null;
            this._handleScrollStopJustFired = null;
            this._mouseWheelEventJustFired = null;
            this._handleScrollStartTimeoutId = null;
            this._handleScrollStopTimeoutId = null;
            this._mouseWheelTimeoutId = null;
            this._widgetState = null;
            this._defaultOptions = null;
            this._defaultSettings = null;
            this._defaultParameters = null;
            this.timeoutOptions = null;

            // For jQuery UI 1.8, destroy must be invoked from the base widget
            // For jQuery UI 1.9, define _destroy instead and don't worry about calling the base widget
            $.Widget.prototype.destroy.apply( this );
        },

        _check : function( threshold ) {

            threshold = this.options.threshold || threshold;

            var total_height, current_scroll, visible_height;

            if (document.documentElement.scrollTop) { 
                current_scroll = document.documentElement.scrollTop;
            } else { 
                current_scroll = document.body.scrollTop; 
            }

            // Uses the height of HTML document
            total_height = $("#"+this._settings.pageId).height();

            // Uses the height of browser viewport
            visible_height = $(window).height(); 

            //alert("current_scroll: "+current_scroll+"\ntotal_height: "+total_height+"\nvisible_height: "+visible_height);

            return ((total_height - threshold) <= (current_scroll + visible_height));
        },
        
        // Main lazy loader function
        _load : function( timeout ) { 

            //alert("inside _load");

            // make sure the plugin is not already lazy loading some items
            if ((!this._widgetState.busy) && (!this._widgetState.done)) {

                $that = this;

                setTimeout(function() {

                    //alert("threshold: "+$that.options.threshold);

                    // if the page scroll location is close to the bottom
                    if ($that._check($that.options.threshold) || (timeout === 0)) {

                        $("#"+$that._settings.progressDivId).show($that.timeoutOptions.showprogress, function() {

                            if ($that._instances[$that._settings.pageId]) {

                                $that.parameters.retrieve = $that._instances[$that._settings.pageId].retrieve;
                                $that.parameters.retrieved = $that._instances[$that._settings.pageId].retrieved;
                                $that.parameters.offset = $that._instances[$that._settings.pageId].offset;

                            } else {

                                $that.parameters.retrieve = $that.options.retrieve;
                                $that.parameters.retrieved = $that.options.retrieved;
                                $that.parameters.offset = $that.options.offset;
                            }

                            if ((typeof $that._settings.pageId != 'undefined') && ($that._settings.pageId != '')) {

                                var hidden_inputs = $("#"+$that._settings.pageId).find('[type="hidden"]');

                                for(i=0; i<hidden_inputs.length; i++) {
                                    
                                    var hidden_input = $(hidden_inputs).get(i);
                                    
                                    //alert($(hidden_input).attr('id'));

                                    if ((typeof $(hidden_input).attr('id') != 'undefined') && ($(hidden_input).attr('id') != '')) {

                                        $that.parameters[$(hidden_input).attr('id')] = escape($(hidden_input).val());
                                    }
                                }
                            }

                            //alert(JSON.stringify($that.parameters));

                            var query_string = "";
                            var count = 0;

                            for (var key in $that.parameters) {

                                if (count == 0) {
                                    query_string += (key + "=" + $that.parameters[key]);

                                } else {
                                    query_string += ("&" + key + "=" + $that.parameters[key]);
                                }

                                count = count+1;
                            }
                            
                            //alert("$that._settings.url: "+$that._settings.moreUrl+"\nquery_string: "+query_string);

                            $.ajax({
                                type: "POST",
                                url: $that._settings.moreUrl,
                                async: true,
                                data: query_string,
                                success: function(msg){
                                    
                                    //alert("msg: "+msg);
                                    // The JSON returned should be in the format:
                                    //  { "data" : [{ "count" : "20", "html" : "<html for the next number of items to retrieve>" } ] }
                                    var more                        = $.parseJSON(msg);
                                    var count                       = more.data[0].count;
                                    var html                        = "";
                                    var json                        = "";
                                    var transform                   = "";
                                    var mainElementSelector         = "";
                                    var singleItemElementSelector   = "";
                                    var bottomElementSelector       = "";
                                    var $bottomElement              = "";

                                    if (count > 0) {

                                        // TODO: Make these selectors configurable as a widget option
                                        mainElementSelector = "#"+$that._settings.ulId;
                                        singleItemElementSelector = "#"+$that._settings.ulId+' li';
                                        bottomElementSelector = '[data-role="list-divider"]';

                                        $bottomElement = $that._getBottomElement(mainElementSelector, bottomElementSelector);

                                        //alert("bottomElement: "+bottomElement);

                                        if ((typeof more.data[0].html != 'undefined') && (more.data[0].html != '')) {
                                        
                                            html = more.data[0].html;

                                            if ($bottomElement) {

                                                $( singleItemElementSelector ).last().before( html );

                                            } else {

                                                //$(singleItemElementSelector).last().append( html );
                                                //$( html ).appendTo( $(singleItemElementSelector).last() );
                                                $( mainElementSelector ).append( html );
                                            } 
                                        
                                        } else {

                                            json = more.data[0].json;

                                            if ((typeof json != 'undefined') && (json != '')) { 

                                                if ((typeof $that.options.transform != 'undefined') && ($that.options.transform != '')) {

                                                    transform = $that.options.transform;
                                                }

                                                //alert("transform: "+JSON.stringify(transform));
                                                if ($that._instances[$that._settings.pageId]) {

                                                    if ((typeof $that._instances[$that._settings.pageId].transform != 'undefined') && ($that._instances[$that._settings.pageId].transform != '')) {

                                                        transform = $that._instances[$that._settings.pageId].transform;
                                                        //alert("transform: "+JSON.stringify(transform));
                                                    }
                                                }

                                                // first make sure there was a bottom element to work around
                                                if ($bottomElement) {

                                                    // we need to remove the last li if it's a divider so we can append the retrieved li items
                                                    //$( "#"+$that._settings.ulId+' li' ).last().remove();
                                                    $bottomElement.remove();
                                                }

                                                //alert("template: "+JSON.stringify($that._instances[$that._settings.pageId].transform)+"\n\njson data: "+JSON.stringify(json));

                                                // Transform the retrieved json data into HTML using the transform template that was set at re-initialization for this page
                                                $( mainElementSelector ).json2html( json, $that._instances[$that._settings.pageId].transform );
                                                
                                                // first make sure there was a list-divider
                                                if ($bottomElement) {

                                                    // put the last li item back if it exists (it will exist if it was an list-divider)
                                                    $( singleItemElementSelector ).last().append( $bottomElement );
                                                }
                                            }
                                        }

                                        // Refresh the listview so it is re-enhanced by JQM
                                        $( mainElementSelector ).listview( 'refresh' );

                                        // Increment the stored retrieved count only by the number of items retrieved
                                        $that._instances[$that._settings.pageId].retrieved += parseInt(count);

                                        if ((count < $that.options.retrieve) || ($that.options.retrieve == "all")) {

                                            $that._widgetState.done = true;

                                            $that._trigger( "alldone", {        "type"      : "lazyloaderalldone",
                                                                                "function"  : "_load",
                                                                                "pageId"    : $that._settings.pageId, 
                                                                                "ulId"      : $that._settings.ulId, 
                                                                                "loaded"    : $that.options.retrieved } );
                                        }

                                    } else {

                                        $that._widgetState.done = true;

                                        $that._trigger( "alldone", {        "type"      : "lazyloaderalldone",
                                                                            "function"  : "_load",
                                                                            "pageId"    : $that._settings.pageId, 
                                                                            "ulId"      : $that._settings.ulId, 
                                                                            "loaded"    : $that.options.retrieved } );
                                    }

                                    $("#"+$that._settings.progressDivId).hide(250, function() {

                                        $that._widgetState.busy = false;
                                    }); 

                                    $that._trigger( "doneloading", {        "type"      : "lazyloaderdoneloading",
                                                                            "function"  : "_load",
                                                                            "pageId"    : $that._settings.pageId, 
                                                                            "ulId"      : $that._settings.ulId, 
                                                                            "loaded"    : $that.options.retrieved } );       
                                },
                                error: function(msg){

                                    $that._trigger( "error", {  "type"      : "lazyloadererror",
                                                                "function"  : "_load", 
                                                                "message"   : msg,  
                                                                "settings"  : $that._settings,
                                                                "options"   : $that.options,
                                                                "parameters": $that.parameters } );

                                    $("#"+$that._settings.progressDivId).hide(250, function() {

                                        $that._widgetState.busy = false;
                                    });    
                                }
                            });
                        });
                    }

                }, timeout );
            
            } else {
                
                //alert("$that._widgetState.busy: "+$that._widgetState.busy+"\n$that._widgetState.done: "+$that._widgetState.done);
            }
        },

        _getBottomElement : function (mainElementSelector, bottomElementSelector) {

            // we will be removing the last li if it's a divider, so we need to store it for later
            //$lastLi = $( "#"+$that._settings.ulId+' li' ).last();
            var $bottomElement = $( mainElementSelector ).find( bottomElementSelector );
            
            switch ($bottomElement.length) {

                case 2 :
                    $bottomElement = $bottomElement.last();
                    break;
                case 1 : // the assumption is that this must be the heading list-divider
                case 0 : // if there aren't any list-dividers, then nothing to remove
                default : // so, null it out so we know we don't need to remove anything
                    $bottomElement = null;
                    break;
            }

            // determine if there is a bottom element we need to worry about when appending the retrieved items
            if (    (typeof $bottomElement  != 'undefined') && 
                    (       $bottomElement  != null)        && 
                    (       $bottomElement  != '')          && 
                    (       $bottomElement  != 'null')  ) {

                return $bottomElement;

            } else {

                return false;
            }         
        },

        // Event Handlers
        _handleMouseWheelEvent : function() {

        	//alert("mousewheel event triggered");

            if ((!this._mouseWheelEventJustFired) && (!this._handleScrollStopJustFired) && (!this._handleScrollStartJustFired)) {

                this._mouseWheelEventJustFired = true;

                this._load(this.timeoutOptions.mousewheel);

                var $that = this;

                this._mouseWheelTimeoutId = setTimeout(function() {

                    $that._mouseWheelEventJustFired = false;

                }, 1000);
            }
        },

        _handleScrollStart : function() {

        	//alert("scrollstart event triggered");

            if ((!this._mouseWheelEventJustFired) && (!this._handleScrollStopJustFired) && (!this._handleScrollStartJustFired)) {

                this._handleScrollStartJustFired = true;

                this._load(this.timeoutOptions.scrollstart);

                var $that = this;

                this._handleScrollStartTimeoutId = setTimeout(function() {

                    $that._handleScrollStartJustFired = false;

                }, 1200);
            }
        },
        
        _handleScrollStop : function() {

        	//alert("scrollstop event triggered");

            if ((!this._mouseWheelEventJustFired) && (!this._handleScrollStopJustFired) && (!this._handleScrollStartJustFired)) {

                this._handleScrollStopJustFired = true;

                this._load(this.timeoutOptions.scrollstop);

                var $that = this;

                this._handleScrollStopTimeoutId = setTimeout(function() {

                    $that._handleScrollStopJustFired = false;

                }, 1200);
            }
        },

        loadMore : function ( timeout ) {

        	if (timeout === 0) {
        	
        		this._load(this.timeoutOptions.immediately);
        	
        	} else {

        		this._load(this.timeoutOptions.scrolldown);
        	}
        },

        _setOption: function( key, value ) {

            // we need to make sure the options record being tracked for this instance gets updated too
            if (this._instances[this._settings.pageId]) {

                if ( this._instances[this._settings.pageId][key] ) {

                    this._instances[this._settings.pageId][key] = value;
                }
            }

            // For UI 1.8, _setOption must be manually invoked from the base widget
            $.Widget.prototype._setOption.apply(this, arguments);
            // For UI 1.9 the _super method can be used instead
            // this._super( "_setOption", key, value );
        },

        refresh : function ( what ) {

        	//alert("what: "+what+"\n\narguments: "+JSON.stringify(arguments));

        	if (what == 'parameters') {
				
				if (typeof this.options != 'undefined') {

	            	for (var key in this.parameters) {

		            	if (typeof this.options[key] != 'undefined') {

		            		this.parameters[key] = this.options[key];
		            	}
	            	}
	            }
        	
        	} else if (what == 'parameter') {

        		var key = arguments[1];

            	if (typeof this.options[key] != 'undefined') {

            		this.parameters[key] = this.options[key];
            	}
        	
        	} else {

        		// whatever
        	}

            // Get any user defined settings and extend / merge / override them with defaultSettings
            var newParameters = JSON.stringify(this.parameters);

            this.parameters = $.parseJSON(newParameters);

        	//alert(JSON.stringify(this.parameters));
        },

        // Public functions
        reInitialize : function( options, settings, parameters ) {

            this._initialize( options, settings, parameters );
        },

        reset : function( pageId ) {

            var $that = this;

            // clear lazy loading session variables specific to albums (section=albums)
            $.ajax({

                type: "POST",
                url: $that._settings.clearUrl,
                async: true,
                data: "section="+pageId,
                success: function(msg){

                    if (parseInt(msg)) {

                        // reinitialize the lazy loader default retrieved value
                        $that.options.retrieved = $that._defaultOptions.retrieved;

                        $that._widgetState.done = false;

                        if (typeof $that._instances[pageId] != 'undefined') {
                            
                            //alert("deleting $that._instances["+pageId+"]: \n\n"+JSON.stringify($that._instances[pageId]));
                            delete $that._instances[pageId];
                        }

                        $that._trigger( "reset", {  "type"      : "lazyloaderreset",
                                                    "function"  : "reset",
                                                    "pageId"    : pageId, 
                                                    "settings"  : $that._settings,
                                                    "options"   : $that.options,
                                                    "parameters": $that.parameters } );
                    }
                },
                error: function(msg){

                    $that._trigger( "error", {  "type"      : "lazyloadererror", 
                                                "function"  : "reset", 
                                                "message"   : msg,  
                                                "settings"  : $that._settings,
                                                "options"   : $that.options,
                                                "parameters": $that.parameters } );

                    $("#"+$that._settings.progressDivId).hide(250, function() {

                        $that._widgetState.busy = false;
                    });    
                }
            });
        },

        resetAll : function () {

            var $that = this;

            // clear lazy loading session variables specific to albums (section=albums)
            $.ajax({

                type: "POST",
                url: $that._settings.clearUrl,
                async: true,
                data: "",
                success: function(msg){

                    //alert(msg);
                    if (parseInt(msg)) {

                        // loop through the array of settings that were saved each time the widget instance was used by a page
                        for (pageId in $that._instances) {

                            // Remove the instance object stored in _instances
                            if ($that._instances[pageId]) {
                                
                                //alert("deleting $that._instances["+pageId+"]: \n\n"+JSON.stringify($that._instances[pageId]));
                                delete $that._instances[pageId];
                            }
                        }

                        // reinitialize the lazy loader default retrieved value
                        $that.options.retrieved = $that._defaultOptions.retrieved;

                        $that._widgetState.done = false;
                        $that._widgetState.busy = false;

                        $that._trigger( "resetall", {   "type"          : "lazyloaderresetall",
                                                        "function"      : "resetAll",
                                                        "_widgetState"  : $that._widgetState, 
                                                        "_instances"    : $that._instances  } );
                    }
                }
            });
        }
    });

    //auto self-init widgets
    $( document ).bind( "pagecreate create", function( e ){
        $.mobile.lazyloader.prototype.enhanceWithin( e.target );
    });

})( jQuery );