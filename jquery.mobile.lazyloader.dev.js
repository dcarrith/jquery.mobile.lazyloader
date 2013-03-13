( function( $, undefined ) {

    $.widget( "mobile.lazyloader", $.mobile.widget, {

        // Create some default options that can be extended in reinitialization
        _defaultOptions : {

            // threshold for how close to the bottom should we trigger a load of more items - default to height of viewport
            'threshold'     : $( window ).height(),
            // this is the number of items to retrieve from server by default
            'retrieve'      : 20,
            // this is the number of items retrieved so far
            'retrieved'     : 20,
            // this is whether or not to display count bubbles in the retrieved list items
            'bubbles'       : false,
            // this is for specifying an offset into the list in the case where the client is not in sync with server
            'offset'        : 0,
            // this is for setting a limit on how many items can be lazy loaded
            'limit'         : 0
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
            "pageId"                : "",
            // The type of template to be used for transforming JSON to HTML
            "templateType"          : "",
            // Flag to indicate whether or not the template has been pre-compiled
            "templatePrecompiled"   : false,
            // The id of the script element for the current page on which the lazyloader has been initialized
            "templateId"            : "",
            // The template to use for transformation to HTML
            "template"              : "",
            // The id of the main wrapper element which the lazyloader widget instance will be lazy loading
            "mainId"                : "",
            // The id of the DIV that should contain the animated gif to indicate more items are being loaded
            "progressDivId"         : "",
            // The url of the server side resource to which the lazy loader AJAX call should be directed
            "moreUrl"               : "",
            // The url of the server side resource responsible for clearing server-side session variables to maintain state
            "clearUrl"              : "",
            // This will allow for cross-domain loading with JSONP - if false, lazyloader will use $.ajax POST
            "JSONP"                 : false,
            // This is the callback that the server resourse needs for wrapping the returned JSON
            "JSONPCallback"         : ""
        },

        // Create the default selectors that can be overridden during reinitialization
        _defaultSelectors : {

            // This is the selector of the main element (e.g. the <ul> in the case of a listview)
            "main"      : 'ul',
            // This is the selector for a single element of things that are being lazyloaded (e.g. the <li> in the case of a listview)
            "single"    : 'ul li',
            // This is the selector for the bottom element that may need to be removed and added back post lazyloading in certain cases
            "bottom"    : '[data-role="list-divider"]'
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

        _moreOutstandingPageId : null,

        // This stores the merged object containing _defaultParameters and any overriding options passed in
        _parameters : null,

        // This stores the merged object containing _defaultSettings and any overriding settings passed in
        _settings : null,

        // This stores the merged object containing _defaultSelectors and any overriding selectors passed in
        _selectors : null,

        // Timeout values used for varying some of the setTimeout values used in the widget
        timeoutOptions : {

            // Timeout to pass to load when it's called from the mousewheel handler
            'mousewheel'    : 350,
            // Timeout to pass to load when it's called from the scrollstart handler
            'scrollstart'   : 500,
            // Timeout to pass to load when it's called from the scrollstop handler
            'scrollstop'    : 50,
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
            'busy'  : false,
            // this is to specify whether lazy loading is probably done, so we don't need to try anymore
            'done'  : false,
            // this is to specify that the lazy loader has reached the limit of items that can be loaded
            'limit' : false
        },

        // Runs automatically the first time this widget is called. Put the initial widget set-up code here. 
        _create : function( ) {

            // Initialize the widget using the options passed in by the widget constructor
            this._initialize( this._defaultOptions, this._defaultSettings, this._defaultParameters, this._defaultSelectors );

            // Bind events that are needed by this widget
            this._bind();
        },

        _init : function () {
            // not used
        },

        _initialize : function( options, settings, parameters, selectors ) {

            if ( ( typeof options != 'undefined' ) && ( options != '' ) ) {

                this._widgetState.busy = false;
                this._widgetState.done = false;
                this._widgetState.limit = false;

                // Get the defaultSettings and extend / merge / override them with user defined settings 
                this._settings = $.extend( true, this._settings, this._defaultSettings );
                this._settings = $.extend( true, this._settings, settings );

                if ( ( typeof this._settings.mainId !== 'undefined' ) && ( this._settings.mainId !== "") ) {

                    this._defaultSelectors.main = '#'+this._settings.mainId;
                    this._defaultSelectors.single = '#'+this._settings.mainId+' li';
                    this._defaultSelectors.bottom = '[data-role="list-divider"]';
                }

                if ( ( typeof this._settings.pageId !== 'undefined' ) && ( this._settings.pageId !== "") ) {
                
                    this._settings.totalHeight = $( "#"+this._settings.pageId ).height();
                }

                // Get the defaultSelectors and extend / merge / override them with user defined selectors 
                this._selectors = $.extend( true, this._selectors, this._defaultSelectors );
                this._selectors = $.extend( true, this._selectors, selectors );

                // Get the defaultParameters and extend / merge / override them with user defined parameters 
                this._parameters = $.extend( true, this._parameters, this._defaultParameters );
                this._parameters = $.extend( true, this._parameters, parameters );

                // Get any user defined settings and extend / merge / override them with defaultSettings
                this.options = $.extend( true, this.options, this._defaultOptions );
                this.options = $.extend( true, this.options, options );

                // Get the pageId for the settings that were passed in by the user
                var newPageId = settings.pageId;

                // Make sure a pageId was passed in
                if ( ( typeof newPageId != 'undefined ') && ( newPageId != '' ) ) {

                    // First check to see if we are already tracking an instance for the page being re-initialized before storing the defaults
                    if ( !this._instances[newPageId] ) {

                        // Only try to retrieve the template from the DOM if it has not already been set externally by the user
                        if ( ( typeof this._settings.template == 'undefined' ) || ( this._settings.template == '' ) ) {

                            // retrieve the template from the DOM so we can store it along with the instance 
                            if ( ( typeof this._settings.templateId != 'undefined' ) && ( this._settings.templateId != '') ) {

                                // retrieve the template from the DOM
                                var template = $( "#"+this._settings.templateId ).html();

                                var templateType = "";

                                var templatePrecompiled = this._settings.templatePrecompiled;

                                if (( typeof this._settings.templateType != 'undefined' ) && ( this._settings.templateType != '') ) {

                                    templateType = this._settings.templateType;
                                }

                                // Dust templates seem to be the only ones that can be pre-compiled at initialization and then loaded when needed at runtime
                                if ( ( templateType === "dust" ) && ( template !== "" ) && ( !templatePrecompiled ) ) {

                                    // add the pre-compiled template to the settings object
                                    this._settings.template = dust.compile( template, this._settings.templateId );                        

                                } else {

                                    // add it to the settings object
                                    this._settings.template = template;
                                }
                            }
                        }

                        // initialize a new object for this newPageId
                        this._instances[newPageId] = [];

                        // Store the merged options object as a new instance for later modifications and retrieval
                        this._instances[newPageId]['options'] = $.extend( true, {}, this.options );

                        // Store the merged settings object as a new instance for later retrieval
                        this._instances[newPageId]['settings'] = $.extend( true, {}, this._settings );

                        // Store the merged selectors object as a new instance for later retrieval
                        this._instances[newPageId]['selectors'] = $.extend( true, {}, this._selectors );

                        if ( this._instances[newPageId]['options'].limit > 0 ) {
                        
                            // Check to make sure retrieved is less than limit, if it isn't then set limit to true and trigger an error
                            if ( this._instances[newPageId]['options'].limit < this._instances[newPageId]['options'].retrieved ) {

                                this._widgetState.done = true;
                                this._widgetState.limit = true;

                                message = "Limit must be greater than the number of items listed by default (i.e. 'retrieved' by default)";

                                this._triggerEvent( "error", "_load", message );
                            }
                        }
                    }
                }
            }
        },

        _bind : function () {

            $( 'body' ).bind( "scrollstart", $.proxy( this._handleScrollStart, this ) );
            $( 'body' ).bind( "scrollstop", $.proxy( this._handleScrollStop, this ) );

            if ( /Firefox/i.test( navigator.userAgent ) ) {

                $( window ).bind( "DOMMouseScroll", $.proxy( this._handleMouseWheelEvent, this ) );

            } else {
            
                if ( ( typeof this._selectors != 'undefined' ) && ( this._selectors != null) && ( this._selectors != '' ) ) {

                    if ( typeof this._selectors.main != 'undefined' ) {

                        if ( $( this._selectors.main ).attachEvent ) {

                            $( window ).bind( "onmousewheel", $.proxy( this._handleMouseWheelEvent, this ) );

                        } else {

                            $( window ).bind( "mousewheel", $.proxy( this._handleMouseWheelEvent, this ) );
                        }
                    }
                }
            }

            // bind if the element is destroyed
            //this.$element.bind( "destroyed", $.proxy( this._teardown, this ) );
        },

        _unbind : function () {

            $( 'body' ).unbind( "scrollstart", this._handleScrollStart );
            $( 'body' ).unbind( "scrollstop", this._handleScrollStop );

            if ( /Firefox/i.test( navigator.userAgent ) ) {

                $( window ).unbind( "DOMMouseScroll", this._handleMouseWheelEvent );

            } else {

                if ( ( typeof this._selectors != 'undefined' ) && ( this._selectors != null ) && ( this._selectors != '' ) ) {

                    if ( typeof this._selectors.main != 'undefined' ) {
                    
                        if ( $( this._selectors.main ).attachEvent ) {

                            $( window ).unbind( "onmousewheel", this._handleMouseWheelEvent );

                        } else {

                            $( window ).unbind( "mousewheel", this._handleMouseWheelEvent );
                        }
                    }
                }
            }
        },

        destroy : function () {

            // Unbind any events that were bound at _create
            this._unbind();

            // Null out all properties of this widget
            this.options = null; 
            this.timeoutOptions = null;
            this._settings = null;   
            this._parameters = null;
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

            // For jQuery UI 1.8, destroy must be invoked from the base widget
            // For jQuery UI 1.9, define _destroy instead and don't worry about calling the base widget
            $.Widget.prototype.destroy.apply( this );
        },

        _check : function( threshold ) {

            threshold = this.options.threshold || threshold;

            var totalHeight, singleItemHeight, currentScroll, visibleHeight;

            if ( document.documentElement.scrollTop ) {

                currentScroll = document.documentElement.scrollTop;
            
            } else { 
            
                currentScroll = document.body.scrollTop; 
            }

            if ( this._instances[this._settings.pageId] ) {

                totalHeight = this._instances[this._settings.pageId]['settings'].totalHeight;

                singleItemHeight = this._instances[this._settings.pageId]['settings'].singleItemHeight;

            } else {

                totalHeight = this._settings.totalHeight;

                singleItemHeight = this._settings.singleItemHeight;
            }

            // Uses the height of browser viewport
            visibleHeight = $( window ).height(); 

            return ( ( totalHeight - threshold ) <= ( currentScroll + visibleHeight ) );
        },
        
        // Main lazy loader function
        _load : function( timeout ) { 

            if ( ( typeof this._settings.pageId != undefined ) && ( this._settings.pageId != '' ) ) {
            
                // we only want to proceed with this function logic if the lazyloader is currently initialized for the active page
                if ( $( '.ui-page-active' ).attr( 'id' ) == this._settings.pageId ) {

                    // Set the variable that can be used to make sure the outstanding request for more is for the same instance of the lazyloader
                    this._moreOutstandingPageId = this._settings.pageId;

                    // Save a reference to this that can be used inside the setTimeout callback
                    $that = this;

                    // Don't try to load anything until the scroll is given some time to get closer to the bottom
                    setTimeout( function() {

                        // make sure the plugin is not already lazy loading some items
                        if ( ( !$that._widgetState.busy ) && ( !$that._widgetState.done ) && ( !$that._widgetState.limit ) ) {

                            // Make sure the request for more is still for the current page instance of the lazyloader 
                            // before wasting any time building the _parameters and query string and then making the request
                            if ( $that._moreOutstandingPageId == $that._settings.pageId ) {

                                // if the page scroll location is close to the bottom
                                if ( $that._check( $that.options.threshold ) || ( timeout === 0 ) ) {

                                    $( "#"+$that._settings.progressDivId ).show( $that.timeoutOptions.showprogress, function() {

                                        // Default the moreUrl to be the current instance
                                        moreUrl = $that._settings.moreUrl;

                                        var requestType = "POST";
                                        var dataType = "json";
                                        var postData = "";

                                        // JSONP parameters
                                        var JSONP = false;
                                        var JSONPCallback = "";

                                        var count = 0;

                                        if ( $that._instances[ $that._settings.pageId ] ) {

                                            $that._parameters.retrieve = $that._instances[ $that._settings.pageId ][ 'options' ].retrieve;
                                            $that._parameters.retrieved = $that._instances[ $that._settings.pageId ][ 'options' ].retrieved;
                                            $that._parameters.offset = $that._instances[ $that._settings.pageId ][ 'options' ].offset;

                                            //alert( "retrieved + retrieve = "+( $that._instances[$that._settings.pageId]['options'].retrieved + $that._instances[ $that._settings.pageId ][ 'options' ].retrieve )+"\nlimit: "+$that._instances[$that._settings.pageId]['options'].limit );

                                            if ( $that._instances[$that._settings.pageId]['options'].limit > 0 ) {

                                                // If there is a limit set on the number of items that can be lazy loaded, we need to enforce it here
                                                if ( ( $that._instances[$that._settings.pageId]['options'].retrieved + $that._instances[ $that._settings.pageId ][ 'options' ].retrieve ) >= $that._instances[$that._settings.pageId]['options'].limit ) {

                                                    if ( $that._instances[$that._settings.pageId]['options'].limit >= $that._instances[$that._settings.pageId]['options'].retrieved ) {

                                                        $that._parameters.retrieve = ( $that._instances[$that._settings.pageId]['options'].limit - $that._instances[$that._settings.pageId]['options'].retrieved );
            
                                                    } else {
            
                                                        $that._parameters.retrieve = 0;
                                                    }
                                                }
                                            }

                                            if ( ( $that._instances[ $that._settings.pageId ][ 'settings' ].JSONP ) ) {

                                                JSONP = true;
                                                JSONPCallback = $that._instances[ $that._settings.pageId ][ 'settings' ].JSONPCallback;
                                            }

                                        } else {

                                            $that._parameters.retrieve = $that.options.retrieve;
                                            $that._parameters.retrieved = $that.options.retrieved;
                                            $that._parameters.offset = $that.options.offset;

                                            if ( $that.options.limit > 0 ) {

                                                // If there is a limit set on the number of items that can be lazy loaded, we need to enforce it here
                                                if ( ( $that.options.retrieve + $that.options.retrieved ) >= $that.options.limit ) {

                                                    if ( $that.options.limit >= $that.options.retrieve ) {
                                                    
                                                        $that._parameters.retrieve = ( $that.options.limit - $that.options.retrieve );
                                                    
                                                    } else {
                                                    
                                                        $that._parameters.retrieve = 0;
                                                    }
                                                }
                                            }
                                        }

                                        if ( ( typeof $that._settings.pageId != 'undefined' ) && ( $that._settings.pageId != '' ) ) {

                                            var hidden_inputs = $( "#"+$that._settings.pageId ).find( '[type="hidden"]' );

                                            for( i=0; i<hidden_inputs.length; i++ ) {
                                                
                                                var hidden_input = $(hidden_inputs).get(i);
                                                
                                                if ( (typeof $( hidden_input ).attr( 'id' ) != 'undefined' ) && ( $( hidden_input ).attr( 'id' ) != '' ) ) {

                                                    $that._parameters[$( hidden_input ).attr( 'id' )] = escape( $( hidden_input ).val() );
                                                }
                                            }
                                        }

                                        if ( !JSONP ) {

                                            for ( var key in $that._parameters ) {

                                                if ( count == 0 ) {

                                                    postData += ( key + "=" + $that._parameters[key] );

                                                } else {

                                                    postData += ( "&" + key + "=" + $that._parameters[key] );
                                                }

                                                count = count+1;
                                            }

                                        } else {

                                            requestType = "GET";
                                            dataType = "jsonp";

                                            var JSONPParameters = "";

                                            for ( var key in $that._parameters ) {

                                                if (count == 0) {

                                                    JSONPParameters += '"' + key + '"' + ': "'+$that._parameters[key]+'"';

                                                } else {

                                                    JSONPParameters += ', ' + '"' + key + '"' + ': "'+$that._parameters[key]+'"';
                                                }

                                                count = count+1;
                                            }

                                            // Create a JSON object out of the JSONParameters string
                                            postData = $.parseJSON( "{ "+JSONPParameters+" }" );
                                        }

                                        //alert(JSON.stringify(postData));

                                        $.ajax( {

                                            type: requestType,
                                            url: moreUrl,
                                            dataType: dataType,
                                            jsonpCallback: JSONPCallback,
                                            data: postData,
                                            success: function( data ){

                                                more = data;

                                                if ( typeof data === 'object' ) {
                                                    
                                                    // we should be good then
                                                
                                                } else {

                                                    try {

                                                        // it seems the response can also be received as a string even though we specified json as dataType
                                                        more = $.parseJSON( data ); 

                                                    } catch ( err ) {

                                                        // trigger an event to announce that an error occurred during the _load
                                                        $that._triggerEvent( "error", "_load", err.message );

                                                        $( "#"+$that._settings.progressDivId ).hide( 250, function() {

                                                            $that._widgetState.busy = false;
                                                        } ); 

                                                        return false;   
                                                    }
                                                }

                                                try {

                                                    var count                       = more.data[0].count;
                                                    var html                        = "";
                                                    var json                        = "";
                                                    var template                    = "";
                                                    var templateId                  = "";
                                                    var templateType                = "";
                                                    var templatePrecompiled         = false; 
                                                    var mainElementSelector         = "";
                                                    var singleItemElementSelector   = "";
                                                    var bottomElementSelector       = "";
                                                    var $bottomElement              = "";

                                                    if ( count > 0 ) {

                                                        mainElementSelector = $that._selectors.main;
                                                        singleItemElementSelector = $that._selectors.single;
                                                        bottomElementSelector = $that._selectors.bottom;

                                                        $bottomElement = $that._getBottomElement( mainElementSelector, bottomElementSelector );

                                                        if ( ( typeof more.data[0].html != 'undefined' ) && ( more.data[0].html != '' ) ) {
                                                        
                                                            html = more.data[0].html;

                                                            if ( $bottomElement ) {

                                                                $( singleItemElementSelector ).last().before( html );

                                                            } else {

                                                                $( mainElementSelector ).append( html );
                                                            } 
                                                        
                                                        } else {

                                                            // Check to see if there is already an instance of this page in memory
                                                            if ( $that._instances[$that._settings.pageId] ) {

                                                                // If a templateId isn't set, then there's no need to do the other two checks
                                                                if ( ( typeof $that._instances[$that._settings.pageId]['settings'].templateId != 'undefined' ) && ( $that._instances[$that._settings.pageId]['settings'].templateId != '' ) ) {

                                                                    templateId = $that._instances[$that._settings.pageId]['settings'].templateId;
                                                                
                                                                    if ( ( typeof $that._instances[$that._settings.pageId]['settings'].templateType != 'undefined' ) && ( $that._instances[$that._settings.pageId]['settings'].templateType != '' ) ) {

                                                                        templateType = $that._instances[$that._settings.pageId]['settings'].templateType;
                                                                    }

                                                                    if ( ( typeof $that._instances[$that._settings.pageId]['settings'].template != 'undefined' ) && ( $that._instances[$that._settings.pageId]['settings'].template != '' ) ) {

                                                                        template = $that._instances[$that._settings.pageId]['settings'].template;
                                                                    }
                                                                }

                                                                templatePrecompiled = $that._instances[$that._settings.pageId]['settings'].templatePrecompiled;
                                                            
                                                            } else { // This should never happen ... but, just in case

                                                                if ( ( typeof $that._settings.templateId != 'undefined' ) && ( $that._settings.templateId != '') ) {

                                                                    templateId = $that._settings.templateId;

                                                                    if ( ( typeof $that._settings.templateType != 'undefined' ) && ( $that._settings.templateType != '') ) {

                                                                        templateType = $that._settings.templateType;
                                                                    }

                                                                    if ( ( typeof $that._settings.template != 'undefined' ) && ( $that._settings.template != '') ) {

                                                                        template = $that._settings.template;
                                                                    }
                                                                }

                                                                templatePrecompiled = $that._settings.templatePrecompiled;
                                                            }

                                                            // Just to make sure we got something
                                                            if ( ( templateType !== "" ) && ( templateId !== "" ) && ( template !== "" ) ) {

                                                                // First check to see if json2html is being used since it needs special handling
                                                                if ( templateType === "json2html" ) {

                                                                    json = more.data[0].json;

                                                                    // first make sure there was a bottom element to work around
                                                                    if ( $bottomElement ) {

                                                                        // we need to remove the last li if it's a divider so we can append the retrieved li items
                                                                        $bottomElement.remove();
                                                                    }

                                                                    // Transform the retrieved json data into HTML using the transform template that was set at re-initialization for this page
                                                                    $( mainElementSelector ).json2html( json, template );

                                                                    // first make sure there was a list-divider
                                                                    if ( $bottomElement ) {

                                                                        // put the last li item back if it exists (it will exist if it was an list-divider)
                                                                        $( singleItemElementSelector ).last().append( $bottomElement );
                                                                    }

                                                                } else {

                                                                    json = more.data[0];

                                                                    switch( templateType ) {

                                                                        case 'handlebars' :

                                                                            if ( templatePrecompiled ) {

                                                                                template = Handlebars.templates[templateId + '.tmpl']; // your template minus the .js
                    
                                                                                html = template( json );

                                                                            } else {

                                                                                template = Handlebars.compile( template );

                                                                                html = template( json );
                                                                            }

                                                                            break;

                                                                        case 'icanhaz' :

                                                                            // Add the icanhaz template for this page
                                                                            ich.addTemplate( "listitem", template );

                                                                            // Convert the json record to HTML with icanhaz
                                                                            html = ich.listitem( json, true );

                                                                            // Clear the icanhaz cache 
                                                                            ich.clearAll();

                                                                            break;

                                                                        case 'dust' :

                                                                            if ( templatePrecompiled ) {

                                                                                // Should be no need to load the template source here since it's pre-compiled externally

                                                                                dust.render( templateId, json, function( err, result ) {
                                                                                    // Append the item HTML onto the main HTML string
                                                                                    html = result;
                                                                                } );

                                                                            } else {

                                                                                // Even if Dust templates aren't pre-compiled in an external script, they are still pre-compiled during initialization
                                                                                dust.loadSource( template );

                                                                                dust.render( templateId, json, function( err, result ) {
                                                                                    // Append the item HTML onto the main HTML string
                                                                                    html = result;
                                                                                } );
                                                                            }

                                                                            break;

                                                                        case 'dot' :

                                                                            template = doT.template( template );

                                                                            // Convert the json data to html with doT.js 
                                                                            html = template( json );

                                                                            break;

                                                                        default : 

                                                                            // Not sure if it makes sense to have a default here - we should probably raise an error instead
                                                                            break;
                                                                    }

                                                                    // First check for the bottom element to see if we need to insert the html before it
                                                                    if ( $bottomElement ) {

                                                                        $( singleItemElementSelector ).last().before( html );

                                                                    } else { // we can just append it

                                                                        $( mainElementSelector ).append( html );
                                                                    }
                                                                }

                                                            } else {

                                                                // raise an error
                                                            }
                                                        }

                                                        // Refresh the listview so it is re-enhanced by JQM
                                                        $( mainElementSelector ).listview( 'refresh' );

                                                        // initialize this to zero for now
                                                        var singleItemHeight = 0;

                                                        count = parseInt( count );

                                                        if ( $that._instances[$that._settings.pageId] ) {

                                                            var totalHeight = $that._instances[$that._settings.pageId]['settings'].totalHeight;

                                                            if ( typeof $that._instances[$that._settings.pageId]['settings'].singleItemHeight !== 'undefined' ) {

                                                                // retrieve the value of singleItemHeight for the current instance of the lazyloader
                                                                singleItemHeight = $that._instances[$that._settings.pageId]['settings'].singleItemHeight;

                                                            } else {

                                                                // We only need to calculate the singleItemHeight for the current instance of the lazyloader once
                                                                singleItemHeight = $( singleItemElementSelector ).first().next().height();

                                                                // let's store the singleItemHeight for later so we don't have to recalculate it every time
                                                                $that._instances[$that._settings.pageId]['settings'].singleItemHeight = singleItemHeight;
                                                            }

                                                            // Adjust the total height based on the number of items that were just lazyloaded
                                                            $that._instances[$that._settings.pageId]['settings'].totalHeight = ( totalHeight + ( singleItemHeight * count ) );

                                                        } else {

                                                            if ( typeof $that._settings.singleItemHeight !== 'undefined' ) {

                                                                // retrieve the value of singleItemHeight for the current instance of the lazyloader
                                                                singleItemHeight = $that._settings.singleItemHeight;

                                                            } else {

                                                                // We only need to calculate the singleItemHeight for the current instance of the lazyloader once
                                                                singleItemHeight = $( singleItemElementSelector ).first().next().height();

                                                                // let's store the singleItemHeight for later so we don't have to recalculate it every time
                                                                $that._settings.singleItemHeight = singleItemHeight;
                                                            }

                                                            $that._settings.totalHeight = ( $that._settings.totalHeight + ( $that._settings.singleItemHeight * count ) );
                                                        }

                                                        // Increment the stored retrieved count only by the number of items retrieved
                                                        $that._instances[$that._settings.pageId]['options'].retrieved += count;

                                                        //alert( "retrieved: "+$that._instances[$that._settings.pageId]['options'].retrieved+"\nlimit: "+$that._instances[$that._settings.pageId]['options'].limit );

                                                        if ( $that._instances[$that._settings.pageId]['options'].limit > 0 ) {

                                                            if ( $that._instances[$that._settings.pageId]['options'].retrieved == $that._instances[$that._settings.pageId]['options'].limit ) {

                                                                $that._widgetState.limit = true;

                                                                // trigger an event to announce that the lazyloader has reached the set limit
                                                                $that._triggerEvent( "limitreached", "_load" );
                                                            }
                                                        }

                                                        if ( ( count < $that._instances[$that._settings.pageId]['options'].retrieve ) || ( $that._instances[$that._settings.pageId]['options'].retrieve == "all" ) ) {

                                                            $that._widgetState.done = true;

                                                            // trigger an event to announce that the lazyloader is done loading this page
                                                            $that._triggerEvent( "alldone", "_load" );
                                                        }

                                                    } else {

                                                        $that._widgetState.done = true;

                                                        // trigger an event to announce that the lazyloader is done loading this page
                                                        $that._triggerEvent( "alldone", "_load" );
                                                    }

                                                    $( "#"+$that._settings.progressDivId ).hide( 250, function() {

                                                        $that._widgetState.busy = false;
                                                    } ); 

                                                    // trigger an event to announce that the lazyloader is done loading that chunk
                                                    $that._triggerEvent( "doneloading", "_load" );

                                                } catch ( err ) {

                                                    // trigger an event to announce that an error occurred during the _load
                                                    $that._triggerEvent( "error", "_load", err.message );

                                                    $( "#"+$that._settings.progressDivId ).hide( 250, function() {

                                                        $that._widgetState.busy = false;
                                                    } ); 

                                                    return false;   
                                                }
                                            },
                                            error: function( msg ) {

                                                // trigger an event to announce that an error occurred during the _load
                                                $that._triggerEvent( "error", "_load", msg );

                                                $( "#"+$that._settings.progressDivId ).hide( 250, function() {

                                                    $that._widgetState.busy = false;
                                                } );    
                                            },
                                            complete: function( msg ) { 
                                                // this might be useful for something someday 
                                            }
                                        });
                                    });
                                }
                            }

                        } else {

                            if ( $that._widgetState.done ) {

                                // trigger an event to announce that the lazyloader is done loading this page
                                $that._triggerEvent( "alldone", "_load" );

                                if ( $that._widgetState.limit ) {
                                    // trigger an event to announce that the lazyloader has been limited and that limit has been reached
                                    $that._triggerEvent( "limited", "_load" );
                                }

                            } else if ( $that._widgetState.busy ) {

                                // trigger an event to announce that the lazyloader is currently busy loading
                                $that._triggerEvent( "busy", "_load" );

                            } else {

                                // what happened?
                            }
                        }

                    }, timeout );

                } else {

                    $( "#"+this._settings.progressDivId ).hide( 250, function() {

                        if ( typeof this._widgetState != 'undefined' ) {
                            
                            this._widgetState.busy = false;
                        }
                    } );
                }
            }
        },

        _getBottomElement : function ( mainElementSelector, bottomElementSelector ) {

            // we will be removing the last li if it's a divider, so we need to store it for later
            var $bottomElement = $( mainElementSelector ).last().find( bottomElementSelector );
            
            switch ( $bottomElement.length ) {

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
            if ( ( typeof $bottomElement  != 'undefined' ) && 
                 (        $bottomElement  != null )        && 
                 (        $bottomElement  != '' )          && 
                 (        $bottomElement  != 'null' ) ) {

                return $bottomElement;

            } else {

                return false;
            }         
        },

        // Event Handlers
        _handleMouseWheelEvent : function() {

            if ( ( !this._mouseWheelEventJustFired ) && ( !this._handleScrollStopJustFired ) && ( !this._handleScrollStartJustFired ) ) {

                this._mouseWheelEventJustFired = true;

                this._load( this.timeoutOptions.mousewheel );

                var $that = this;

                this._mouseWheelTimeoutId = setTimeout( function() {

                    $that._mouseWheelEventJustFired = false;

                }, 1000 );
            }
        },

        _handleScrollStart : function() {

            if ( ( !this._mouseWheelEventJustFired ) && ( !this._handleScrollStopJustFired ) && ( !this._handleScrollStartJustFired ) ) {

                this._handleScrollStartJustFired = true;

                this._load( this.timeoutOptions.scrollstart );

                var $that = this;

                this._handleScrollStartTimeoutId = setTimeout( function() {

                    $that._handleScrollStartJustFired = false;

                }, 1200 );
            }
        },
        
        _handleScrollStop : function() {

            if ( ( !this._mouseWheelEventJustFired ) && ( !this._handleScrollStopJustFired ) && ( !this._handleScrollStartJustFired ) ) {

                this._handleScrollStopJustFired = true;

                this._load( this.timeoutOptions.scrollstop );

                var $that = this;

                this._handleScrollStopTimeoutId = setTimeout( function() {

                    $that._handleScrollStopJustFired = false;

                }, 1200 );
            }
        },

        loadMore : function ( timeout ) {

        	if ( timeout === 0 ) {
        	
        		this._load( this.timeoutOptions.immediately );
        	
        	} else {

        		this._load( this.timeoutOptions.scrolldown );
        	}
        },

        _setOption: function( key, value ) {

            // we need to make sure the options record being tracked for this instance gets updated too
            if ( this._instances[this._settings.pageId] ) {

                if ( this._instances[this._settings.pageId]['options'][key] ) {

                    this._instances[this._settings.pageId]['options'][key] = value;
                }
            }

            // For UI 1.8, _setOption must be manually invoked from the base widget
            $.Widget.prototype._setOption.apply( this, arguments );
            // For UI 1.9 the _super method can be used instead
            // this._super( "_setOption", key, value );
        },

        refresh : function ( what ) {

        	if ( what == 'parameters' ) {
				
				if ( typeof this.options != 'undefined' ) {

	            	for ( var key in this._parameters ) {

		            	if ( typeof this.options[key] != 'undefined' ) {

		            		this._parameters[key] = this.options[key];
		            	}
	            	}
	            }
        	
        	} else if ( what == 'parameter' ) {

        		var key = arguments[1];

            	if ( typeof this.options[key] != 'undefined' ) {

            		this._parameters[key] = this.options[key];
            	}
        	
        	} else {

        		// whatever
        	}

            // Get any user defined settings and extend / merge / override them with defaultSettings
            var newParameters = JSON.stringify( this._parameters );

            this._parameters = $.parseJSON( newParameters );
        },

        // Public functions
        reInitialize : function( options, settings, parameters, selectors ) {

            options = "" || options;
            settings = "" || settings;
            parameters = "" || parameters;
            selectors = "" || selectors;

            this._initialize( options, settings, parameters, selectors );
        },

        reset : function( pageId ) {

            var $that = this;

            // clear lazy loading session variables specific to albums (section=albums)
            $.ajax( {

                type: "POST",
                url: $that._settings.clearUrl,
                async: true,
                data: "section="+pageId,
                success: function( msg ){

                    if ( parseInt( msg ) ) {

                        // reinitialize the lazy loader default retrieved value
                        $that.options.retrieved = $that._defaultOptions.retrieved;

                        $that._widgetState.done = false;
                        $that._widgetState.limit = false;

                        if ( typeof $that._instances[ pageId ] != 'undefined' ) {
                            
                            delete $that._instances[pageId];
                        }

                        // this is the message to be sent out along with the triggerred event below
                        var announcement = "All session variables for the '"+pageId+"' page and the lazyloader instance variables have been cleared.";

                        // trigger an event to announce that the reset has completed successfully
                        $that._triggerEvent( "reset", "reset", announcement );
                    }
                },
                error: function( msg ){

                    // trigger an event to announce that an error occurred during the reset
                    $that._triggerEvent( "error", "reset", msg );

                    $( "#"+$that._settings.progressDivId ).hide( 250, function() {

                        $that._widgetState.busy = false;
                    } );    
                }
            });
        },

        resetAll : function () {

            // save a local reference to the this object
            var $that = this;

            //alert( "clearUrl: "+$that._settings.clearUrl );

            // clear lazy loading session variables for all pages currently being tracked as lazyloader instances
            $.ajax( {

                type: "POST",
                url: $that._settings.clearUrl,
                async: true,
                data: "",
                success: function( msg ){

                    if ( parseInt( msg ) ) {

                        // loop through the array of settings that were saved each time the widget instance was used by a page
                        for ( pageId in $that._instances ) {

                            // Remove the instance object stored in _instances
                            delete $that._instances[ pageId ];
                        }

                        // reinitialize the lazy loader default retrieved value
                        $that.options.retrieved = $that._defaultOptions.retrieved;

                        // reset the _widgetState variables
                        $that._widgetState.done = false;
                        $that._widgetState.busy = false;
                        $that._widgetState.limit = false;

                        // this is the message to be sent out along with the triggerred event below
                        var announcement = "All session variables for all pages currently being tracked by the lazyloader have been cleared.";

                        // trigger an event to announce that the resetAll has been successfully completed
                        $that._triggerEvent( "resetall", "resetAll", announcement );
                    }
                }
            });
        },

        _triggerEvent : function ( type, caller, message ) {

            message = message || "";

            switch( type ) {

                case 'error' :
                case 'resetall' :

                    this._trigger( type, {  "type"      : "lazyloader"+type, 
                                            "function"  : caller, 
                                            "message"   : message,
                                            "settings"  : this._settings,
                                            "options"   : this.options,
                                            "parameters": this._parameters } );
                    break;

                default : // alldone, limitreached, limited, busy, doneloading, reset - all send out the same data 

                    this._trigger( type, {  "type"      : "lazyloader"+type,
                                            "function"  : caller,
                                            "message"   : message,
                                            "pageId"    : this._settings.pageId, 
                                            "mainId"    : this._settings.mainId, 
                                            "loaded"    : this.options.retrieved } );
                    break;
            }
        }
    });

    //auto self-init widgets
    $( document ).bind( "pagecreate create", function( e ){
        $.mobile.lazyloader.prototype.enhanceWithin( e.target );
    });

} )( jQuery );