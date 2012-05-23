(function( $, undefined ) {

	$.widget( "mobile.lazyloader", $.mobile.widget, {

		// The jQuery object containing the element to which the lazy loader instance will be attached
		$element : 	null, 

		// The jQuery object containing the page element that contains the ul to be lazy loaded
		$page : 	null,  	
		
		// The jQuery object containing the ul element that is to be lazy loaded
		$ul : 		null,  


		// Short circuit event toggles to prevent the handling of multiple events at the same time
		_handle_scrollstart_just_fired : false,
		_handle_scrollstop_just_fired : false,
		_mousewheel_event_just_fired : false,
		
		// Variables to store the id of the setTimeout of the short circuit event toggle that sets toggle back to false
		_handle_scrollstart_timeout_id : null,
		_handle_scrollstop_timeout_id : null,
		_mousewheel_timeout_id : null,


		// Object to contain two possible widget states
		_widgetState : {

			// whether or not we are already retrieving items from server
			'busy' 		   	: false,
			// this is to specify whether lazy loading is probably done, so we don't need to try anymore
			'done'			: false
		},

	    // Create some default settings that can be extended in reinitialization
		_defaultSettings : {

			// The page id of the page on which the lazyloader widget instance will be running
			"pageId" 		: "",
			// The id of the list which the lazyloader widget instance will lazy loading
			"ulId"			: "",
			// The id of the DIV that should contain the animated gif to indicate more items are being loaded
			"progressDivId" : "",
			// The url of the server side resource to which the lazy loader AJAX call should be directed
			"moreUrl"		: "",
			// The url of the server side resource responsible for clearing server-side session variables to maintain state
			"clearUrl" 		: "" 
		},

	    // Create some default options that can be extended in reinitialization
		_defaultOptions : {

			// threshold for how close to the bottom should we trigger a load of more items
			'threshold'		: 360,
			// this is the number of items to retrieve from server by default
			'retrieve'		: 20,
			// this is the number of items retrieved so far
			'retrieved'		: 20,
			// this is whether or not to display count bubbles in the retrieved list items
			'bubbles'		: false,
			// this is for specifying an offset into the list in the case where the client is not in sync with server
			'offset'		: 0
		},

		// the parameters enable user defined server variables to be posted along with the ajax call to get more items
		_defaultParameters : {

			// this is the number of items to retrieve from server by default
			'retrieve'		: 20,
			// this is the number of items retrieved so far
			'retrieved' 	: 20,
			// this is for specifying an offset into the list in the case where the client is not in sync with server
			'offset'		: 0
		},


		// This stores the merged object containing _defaultSettings and any overriding settings passed in
		_settings : null, 	

		// This stores the merged object containing _defaultOptions and any overriding options passed in
		_options : null, 

		// This stores the merged object containing _defaultParameters and any overriding options passed in
		_parameters : null,

		// This stores the _settings for the last time the widget instance was used by a particular page (keyed by pageId)
		_instances : new Object(),


		// Timeout values used for varying some of the setTimeout values used in the widget
		timeoutOptions : {

			// Timeout to pass to load when it's called from the mousewheel handler
			'mousewheel'	: 400,
			// Timeout to pass to load when it's called from the scrollstart handler
			'scrollstart'	: 600,
			// Timeout to pass to load when it's called from the scrollstop handler
			'scrollstop'	: 60,
			// this is the timeout for how quickly to show the loading more items progress indicator at bottom
			'showprogress'	: 200
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
		    alert(JSON.stringify(this._instances));
		    alert(JSON.stringify(this._settings));*/
		},

		_init : function () {
			// not used
		},

		_initialize : function( options, settings, parameters ) {

			if ((typeof options != 'undefined') && (options != '')) {

				this._widgetState.busy = false;
				this._widgetState.done = false;

				// Get the defaultSettings and extend / merge / override them with user defined settings 
				this._settings = $.extend(true, this._defaultSettings, settings);

				// Get the defaultParameters and extend / merge / override them with user defined parameters 
				this._parameters = $.extend(true, this._defaultParameters, parameters);

				// Get any user defined settings and extend / merge / override them with defaultSettings
				var newOptions = JSON.stringify($.extend(true, this._defaultOptions, options));

				// Get the pageId for the settings that were passed in by the user
	            var newPageId = settings.pageId;

	            // Make sure a pageId was passed in
	            if ( ( typeof newPageId != 'undefined ') && ( newPageId != '' ) ) {

	            	// First check to see if we are already tracking an instance for the page being re-initialized before storing the defaults
	            	if (!this._instances[newPageId]) {

	            		// Store the merged options object as a new instance for later modifications and retrieval
		            	this._instances[newPageId] = $.parseJSON(newOptions);
	            	}

	            	// Get options that were stored for current page and set the _options object so it references correct instance options
	            	this._options = $.extend(true, this._defaultOptions, this._instances[newPageId]);
	        	
	        	} else {

            		// This should only happen during creation. It will store default options by value in _options
            		this._options = $.parseJSON(newOptions);
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

			$('body').bind("scrollstart", $.proxy( this._handle_scrollstart, this ));
			$('body').bind("scrollstop", $.proxy( this._handle_scrollstop, this ));

			if (/Firefox/i.test(navigator.userAgent)) {

			    $(window).bind( "DOMMouseScroll", $.proxy( this._handle_mousewheel_event, this ) );

			} else {
			
				if ($("#"+this._settings.ulId).attachEvent) {

				    $(window).bind( "onmousewheel", $.proxy( this._handle_mousewheel_event, this ) );

				} else {

					$(window).bind( "mousewheel", $.proxy( this._handle_mousewheel_event, this ) );
				}
			}

			// bind if the element is destroyed
        	//this.$element.bind( "destroyed", $.proxy( this._teardown, this ) );
		},

		_unbind : function () {

			$('body').unbind("scrollstart", this._handle_scrollstart );
			$('body').unbind("scrollstop", this._handle_scrollstop );

			if (/Firefox/i.test(navigator.userAgent)) {

			    $(window).unbind( "DOMMouseScroll", this._handle_mousewheel_event );

			} else {
			
				if ($("#"+this._settings.ulId).attachEvent) {

				    $(window).unbind( "onmousewheel", this._handle_mousewheel_event );

				} else {

					$(window).unbind( "mousewheel", this._handle_mousewheel_event );
				}
			}
		},

		_teardown : function () {

			// Unbind any events that were bound at _create
			this._unbind();

			// Null out all properties of this widget
			this.$element = null;
			this.$page = null;  	
			this.$ul = null;  
			this._settings = null; 
			this._options = null; 	
			this._parameters = null;
			this._instances = null;
			this._handle_scrollstart_just_fired = null;
			this._handle_scrollstop_just_fired = null;
			this._mousewheel_event_just_fired = null;
			this._handle_scrollstart_timeout_id = null;
			this._handle_scrollstop_timeout_id = null;
			this._mousewheel_timeout_id = null;
			this._widgetState = null;
			this._defaultOptions = null;
			this._defaultSettings = null;
			this._defaultParameters = null;
			this.timeoutOptions = null;

		    // For jQuery UI 1.8, destroy must be invoked from the base widget
		    // For jQuery UI 1.9, define _destroy instead and don't worry about calling the base widget
		    $.Widget.prototype.destroy.call(this);
		},

		_check : function( threshold ) {

			threshold = this._options.threshold || threshold;

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

		    return ((total_height - threshold) <= (current_scroll + visible_height));
		},
		
		// Main lazy loader function
		_load : function( timeout ) { 

		    // make sure the plugin is not already lazy loading some items
		    if ((!this._widgetState.busy) && (!this._widgetState.done)) {

		    	$that = this;

				setTimeout(function() {

			        // if the page scroll location is close to the bottom
			        if ($that._check($that._options.threshold)) {

						$("#"+$that._settings.progressDivId).show($that.timeoutOptions.showprogress, function() {

							if ($that._instances[$that._settings.pageId]) {

					        	$that._parameters.retrieve = $that._instances[$that._settings.pageId].retrieve;
					        	$that._parameters.retrieved = $that._instances[$that._settings.pageId].retrieved;
					        	$that._parameters.offset = $that._instances[$that._settings.pageId].offset;

							} else {

					        	$that._parameters.retrieve = $that._options.retrieve;
					        	$that._parameters.retrieved = $that._options.retrieved;
					        	$that._parameters.offset = $that._options.offset;
					        }

					        if ((typeof $that._settings.pageId != 'undefined') && ($that._settings.pageId != '')) {

					        	var hidden_inputs = $("#"+$that._settings.pageId).find('[type="hidden"]');

					        	for(i=0; i<hidden_inputs.length; i++) {
					        		
					        		var hidden_input = $(hidden_inputs).get(i);
					        		
					        		//alert($(hidden_input).attr('id'));

					        		if ((typeof $(hidden_input).attr('id') != 'undefined') && ($(hidden_input).attr('id') != '')) {

				        				$that._parameters[$(hidden_input).attr('id')] = escape($(hidden_input).val());
					        		}
					        	}
					        }

					        //alert(JSON.stringify($that._parameters));

				        	var query_string = "";
				        	var count = 0;

				        	for (var key in $that._parameters) {

				        		if (count == 0) {
				        			query_string += (key + "=" + $that._parameters[key]);

				        		} else {
				        			query_string += ("&" + key + "=" + $that._parameters[key]);
				        		}

				        		count = count+1;
				        	}

				        	console.log($that._settings.url);
				        	console.log(query_string);
				        	//alert("$that._settings.url: "+$that._settings.url+"\nquery_string: "+query_string);

				            $.ajax({
				                type: "POST",
				                url: $that._settings.moreUrl,
				                async: true,
				                data: query_string,
				                success: function(msg){
				                    
				                    // The JSON returned should be in the format:
				                    //  { "data" : [{ "count" : "20", "html" : "<html for the next number of items to retrieve>" } ] }
				                    more    = $.parseJSON(msg);
				                    count   = more.data[0].count;
				                    html    = more.data[0].html;
				                    
				                    if (count > 0) {
				                    
				                        $("#"+$that._settings.ulId+' li').last().before(html);
				                        $("#"+$that._settings.ulId).listview('refresh');

				                        // Increment the stored retrieved count only by the number of items retrieved
				                        $that._instances[$that._settings.pageId].retrieved += parseInt(count);

				                        if (count < $that._options.retrieve) {

				                        	$that._widgetState.done = true;

				                        	$that._trigger( "doneloading", { 	"type" 		: "lazyloaderdone",
					                        									"function" 	: "_load",
					                        									"pageId" 	: $that._settings.pageId, 
						                        								"ulId" 		: $that._settings.ulId, 
						                        								"loaded" 	: $that._options.retrieved } );
				                        }

				                    } else {

				                    	$that._widgetState.done = true;

			                        	$that._trigger( "doneloading", { 	"type" 		: "lazyloaderdone",
					                        								"function" 	: "_load",
					                        								"pageId" 	: $that._settings.pageId, 
					                        								"ulId" 		: $that._settings.ulId, 
					                        								"loaded" 	: $that._options.retrieved } );
				                    }

				                    $("#"+$that._settings.progressDivId).hide(250, function() {

				                    	$that._widgetState.busy = false;
				                    });            
				                },
				                error: function(msg){

		                        	$that._trigger( "error", { 	"type" 		: "lazyloadererror",
		                        								"function" 	: "_load", 
		                        								"message" 	: msg,  
		                        								"settings" 	: $that._settings,
		                        								"options" 	: $that._options,
		                        								"parameters": $that._parameters } );

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

		// Event Handlers
		_handle_mousewheel_event : function() {

			if ((!this._mousewheel_event_just_fired) && (!this._handle_scrollstop_just_fired) && (!this._handle_scrollstart_just_fired)) {

	    		this._mousewheel_event_just_fired = true;

	    		this._load(this.timeoutOptions.mousewheel);

	    		var $that = this;

				this._mousewheel_timeout_id = setTimeout(function() {

					$that._mousewheel_event_just_fired = false;

				}, 1000);
		    }
		},

		_handle_scrollstart : function() {

			if ((!this._mousewheel_event_just_fired) && (!this._handle_scrollstop_just_fired) && (!this._handle_scrollstart_just_fired)) {

	    		this._handle_scrollstart_just_fired = true;

		    	this._load(this.timeoutOptions.scrollstart);

	    		var $that = this;

				this._handle_scrollstart_timeout_id = setTimeout(function() {

					$that._handle_scrollstart_just_fired = false;

				}, 1200);
		    }
		},
		
		_handle_scrollstop : function() {

			if ((!this._mousewheel_event_just_fired) && (!this._handle_scrollstop_just_fired) && (!this._handle_scrollstart_just_fired)) {

	    		this._handle_scrollstop_just_fired = true;

		    	this._load(this.timeoutOptions.scrollstop);

	    		var $that = this;

				this._handle_scrollstop_timeout_id = setTimeout(function() {

					$that._handle_scrollstop_just_fired = false;

				}, 1200);
		    }
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
						$that._options.retrieved = $that._defaultOptions.retrieved;

						$that._widgetState.done = false;

						if (typeof $that._instances[pageId] != 'undefined') {
							
							//alert("deleting $that._instances["+pageId+"]: \n\n"+JSON.stringify($that._instances[pageId]));
							delete $that._instances[pageId];
						}

                    	$that._trigger( "reset", { 	"type" 		: "lazyloaderreset",
                    								"function" 	: "reset",
                    								"pageId" 	: pageId, 
                    								"settings" 	: $that._settings,
		                        					"options" 	: $that._options,
		                        					"parameters": $that._parameters } );
					}
				},
                error: function(msg){

                	$that._trigger( "error", { 	"type" 		: "lazyloadererror", 
                								"function" 	: "reset", 
                								"message" 	: msg,  
                    							"settings" 	: $that._settings,
		                        				"options" 	: $that._options,
		                        				"parameters": $that._parameters } );

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
						$that._options.retrieved = $that._defaultOptions.retrieved;

						$that._widgetState.done = false;
						$that._widgetState.busy = false;

						$that._trigger( "resetall", { 	"type" 			: "lazyloaderresetall",
														"function" 		: "resetAll",
														"_widgetState" 	: $that._widgetState, 
														"_instances" 	: $that._instances 	} );
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