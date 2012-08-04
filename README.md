### LazyLoader Widget for jQuery Mobile

Official Site: http://dcarrith.github.com/jquery.mobile.lazyloader

Lazyloading (i.e. loading the content as it's needed during a scroll of a listview or similar control) is a great way to optimize the performance of any app that contains a list of 50 or more items.  With the LazyLoader Widget for jQuery Mobile, you can easily lazyload any listview without having to write a bunch of custom code to accomplish it.  The idea is to enable the widget on index pageinit, and then track instances of pages that contain listviews that can all be independently lazyloaded with the main widget instance.

Note: This is only the client-side part of the lazyloading solution.  It requires a server-side resource that returns a simple JSON formatted string.  Details and examples can be found below. 

### Requirements

* jQuery 1.7.x (although, jQuery 1.6.4 may work fine - it just hasn't been tested - and, the examples are tailored to jQuery 1.7.x)
* jQuery Mobile 1.1.x (1.0.x might work fine - it just hasn't been tested)
* jquery.json2html-3.0.js - if using json2html JSON transform templates
* ICanHaz.js - if using ICanHaz templates
* handlebars-1.0.0.beta.6.js - if using standard Handlebars templates
* handlebars.runtime.js - if using pre-compiled Handlebars templates
* dust-full-1.0.0.js - if using Dust templates - note: this is the version maintained by LinkedIn
* dust-core-1.0.0.js - if using pre-compiled Dust templates - note: this is the version maintained by LinkedIn
* doT.js - if using doT templates (optimized fork of Underscore.js)
* Server-side code to handle the AJAX requests

### Using the LazyLoader widget

First, to use the widget, you must download the main JavaScript file into your JavaScript directory.  Then, simply include the widget file after the core jQuery Mobile JavaScript file and the other dependencies:

```html
<script src="includes/js/jquery-1.7.2.min.js"></script>

<!-- Template library or libraries can probably go here -->

<script src="includes/js/jquery.mobile-1.1.0.js"></script>
<script src="includes/js/jquery.mobile.lazyloader.js"></script>
```

Then, to instantiate the widget instance, add a pageinit for your main page (in my case the main data-role="page" has an id="index"):  

```JavaScript
$('body').on('pageinit', '#index', function( evt, ui ) {

    // Initialize the lazyloader widget
    $("#index").lazyloader();

    /* Set some default options for the lazyloader
     *   the first three set the timeout value for when the widget should check
     *   the current scroll position relative to page height to decide whether
     *   or not to load more yet.  The showprogress option is to specify the
     *   duration of the fadeIn animation for the lazyloaderProgressDiv.
     */
    $.mobile.lazyloader.prototype.timeoutOptions.mousewheel = 300;
    $.mobile.lazyloader.prototype.timeoutOptions.scrollstart = 700;
    $.mobile.lazyloader.prototype.timeoutOptions.scrollstop = 100;
    $.mobile.lazyloader.prototype.timeoutOptions.showprogress = 100;
});

```

Now, the rest of this documentation will use examples specific to the application
for which this widget was originally developed (www.mpdtunes.com).  Using a music
app as the model will provide good use-case scenarios to be explained.  

For any pages that contain listviews that you want to lazyload, you have to add a 
pageinit handler such as the one used below for the artists page:

```JavaScript
$('body').on('pageinit', '#artists', function(evt, ui) {

    /* Reset the lazy loader instance for the albums page
     *   This resets the widget instance variables for the albums page    
     *   This is done here because the artists page is one level up
     *   from the albums page, so it needs to be reset in case the user
     *   selects a different artist who will have their own albums that
     *   will need to be lazy loaded
     *   
     *   Note: in this example, "reset" is the function and "albums" is
     *      the pageId of the albums page 
     */
    $( "#index" ).lazyloader( "reset", "albums" );

    // Use an automatic threshold that's a function of the height of the viewport
    threshold = $( window ).height();

    // Set up the variable options to pass to the lazyloader reinitialize function
    var options = {   "threshold"   : threshold,
                      "retrieve"    : 20,
                      "retrieved"   : 20,
                      "bubbles"     : true,
                      "offset"      : 0 };

    // Set up the page specific settings to pass to the lazyloader reinitialize function
    var settings = {  "pageId"                : "artists",
                      "templateType"          : "dust",
                      "templateId"            : "artists",
                      "templatePrecompiled"   : true,
                      "mainId"                : "artistsList",
                      "progressDivId"         : "lazyloaderProgressDiv",
                      "moreUrl"               : "/artists/more",
                      "clearUrl"              : "/home/clear_session" };

    // Set up the post parameters to pass to the lazyloader reinitialize function
    var parameters = {  "retrieve"    : options.retrieve,
                        "retrieved"   : options.retrieved,
                        "offset"      : options.offset };

    // Reinitialize the lazyloader so that it correctly handles the listview on the artists page
    $( "#index" ).lazyloader( "reInitialize", options, settings, parameters );
});

```

Here's an example of how the lazyloader is reinitialized on the albums page.  Notice the higher threshold compared to the artists page and the lower retrieve and retrieved values.  That is because the albums list items are about twice the height of the artists li items because the albums have album art:

```JavaScript
$('body').on('pageinit', '#albums', function(evt, ui) {

    // Use an automatic threshold that's a function of the height of the viewport
    threshold = $( window ).height();

    // Set up the variable options to pass to the lazyloader reinitialize function
    var options = { "threshold"   : threshold,
                    "retrieve"    : 10,
                    "retrieved"   : 10,
                    "bubbles"     : true };

    // Set up the page specific settings to pass to the lazyloader reinitialize function
    var settings = {  "pageId"                : "albums",
                      "templateType"          : "dust",
                      "templateId"            : "albums",
                      "templatePrecompiled"   : true,
                      "mainId"                : "albumsList",
                      "progressDivId"         : "lazyloaderProgressDiv",
                      "moreUrl"               : "/albums/more",
                      "clearUrl"              : "/home/clear_session" };

    // Set up the post parameters to pass to the lazyloader reinitialize function
    var parameters = {  "retrieve"    : options.retrieve,
                        "retrieved"   : options.retrieved,
                        "offset"      : options.offset };

    // Reinitialize the lazyloader so that it correctly handles the listview on the artists page
    $( "#index" ).lazyloader( "reInitialize", options, settings, parameters );
});
```

### What to do when a listview also has a search filter?

When a listvew is being lazy loaded and also has a search filter (which kind of requires all items to be shown so they can be filtered properly) the trick is to just pull the rest of the listview items onfocus to the search filter.  Here's an example of how to do that:

```JavaScript
$('body').on('focusin', 'input[data-type="search"]', function(evt, ui) {

    // Set the retrieve option to all so it pulls the rest of the items to lazy load
    $( "#index" ).lazyloader( "option", "retrieve", "all" );

    // Refresh the corresponding parameter with the option that was just set
    $( "#index" ).lazyloader( "refresh", "parameter", "retrieve" );

    // Manually make a call to the public version of the _load function and override the default timeout
    $( "#index" ).lazyloader( "loadMore", 0 );
});
```

Basically, the first line sets the option "retrieve" to the value "all".  The refresh method is then called and the "retrieve" parameter is updated with the value of the option that was just set.  Then, the loadMore function is called using the internal options and parameters stored for the particular page on which the listview and search filter exist.  

### What to do when there is a button that manually scrolls the page down (and therefore doesn't use scrollstart, scrollstop or mousewheel)?

It's easy, just call loadMore, which will use whatever options, settings and parameters the lazyloader widget was re-initialized with:

```JavaScript
function scrollDown(section) {
    
    // do whatever
    ...

    // Manually make a call to the public version of the _load function
    $( "#index" ).lazyloader( "loadMore" );
}
```

### Explanation of available options:
<table>
  <tr>
    <th>Option</th><th>Value</th><th>Purpose</th>
  </tr>
  <tr>
    <td>threshold</td><td>$( window ).height()</td><td>This specifies the threshold in pixels for how close to the bottom of the page should the widget get before making the call to the private function _load.  It now defaults to $( window ).height() but can be overridden with a static value or any function of $( window ).height() (e.g. 2 * $( window ).height() if you want)</td>
  </tr>
  <tr>
    <td>retrieve</td><td>20</td><td>This specifies how many items should be retrieved with each lazy loading ajax call</td>
  </tr>
  <tr>
    <td>retrieved</td><td>20</td><td>This specifies the number of items that are initially loaded on the server-side</td>
  </tr>
  <tr>
    <td>bubbles</td><td>true</td><td>This specifies whether or not to calculate the count bubbles in the list item markup that get's loaded dynamically</td>
  </tr>
  <tr>
    <td>offset</td><td>0</td><td>This is for specifying an offset into the query for more items.  For example, this is used in the queue page in case tracks are deleted from the queue while there are still items to lazy load.</td>
  </tr>
</table>

### Explanation of available settings:
<table>
  <tr>
    <th>Setting</th><th>Value</th><th>Purpose</th>
  </tr>
  <tr>
    <td>pageId</td><td>artists</td><td>This specifies the id of the data-role="page" div element of the page containing the listview to lazyload</td>
  </tr>
  <tr>
    <td>templateType</td><td>dust</td><td>This specifies the template library type to use.  Possible values are <a href="http://json2html.com/">json2html</a>, <a href="http://handlebarsjs.com/">handlebars</a>, <a href="http://icanhazjs.com/">icanhaz</a>, <a href="http://akdubya.github.com/dustjs/">dust</a> and <a href="http://olado.github.com/doT/">dot</a></td>
  </tr>
  <tr>
    <td>templateId</td><td>artists</td><td>This specifies the id of the &lt;script&gt; element containing the template.  If templates are loaded externally as pre-compiled templates, then the templateId should be the same name that was assigned to the template when compiled - both internal name (e.g. with Dust) and/or actual filename (e.g. with Handlebars).  Note: only Handlebars and Dust templates are supported as pre-compiled templates.  All other templates should be defined with a &lt;script&gt; element with an id equal to whatever you want to use for templateId.</td>
  </tr>
  <tr>
    <td>templatePrecompiled</td><td>true</td><td>This a boolean that indicates whether the lazyloader should expect pre-compiled templates for the templateType in use (Note: only Handlebars and Dust templates are supported as pre-compiled templates)</td>
  </tr>
  <tr>
    <td>mainId</td><td>artistsList</td><td>This specifies the id of the ul element of the listview to lazyload</td>
  </tr>
  <tr>
    <td>progressDivId</td><td>lazyloaderProgressDiv</td><td>This specifies the id of the div element containing the lazyloading progress indicator animated gif or whatever</td>
  </tr>
  <tr>
    <td>moreUrl</td><td>/artists/more</td><td>This specifies the URL of the server-side resource to which the AJAX post should be sent</td>
  </tr>
  <tr>
    <td>clearUrl</td><td>/home/clear_session</td><td>This specifies the URL of the server-side resource to which the AJAX post to clear the server-side session variables should be sent</td>
  </tr>
  <tr>
    <td>JSONP</td><td>true</td><td>This is a boolean to indicate whether or not JSONP should be used for crossdomain lazyloading</td>
  </tr>
  <tr>
    <td>JSONPCallback</td><td>callback</td><td>This specifies the name of the callback to use</td>
  </tr>
</table>

### Explanation of available parameters:

The values of the parameters are taken from the values specified in the options object.  The parameters object is used in generating the POST variables for the AJAX call to the server-side resource for retrieving more li elements to lazy load.  Any items specified in the parameters will be complemented by any
hidden input elements that are on the same page as the listview element to lazyload.

### The AJAX call to the server-side resource

First, the lazyloader widget makes a call to fadeIn the lazyloaderProgressDiv which contains the animated gif to indicate that more items are being loaded.  The HTML for the lazyloaderProgressDiv looks like this:

```HTML
<div id="lazyloaderProgressDiv" class="width-hundred-percent display-none">
    <div class="width-two-hundred-pixels center-element align-center">
        <img src="/images/loading_more_bar.gif" />
    </div>
</div>
<br class="clear" />
```

The CSS for those classes is as follows:

```CSS
.width-hundred-percent {
    width:100% !important;
}
.display-none {
    display:none;
}
.width-two-hundred-pixels {
    width:200px;
}
.center-element {
    margin-right: auto; 
    margin-left: auto;
}
.align-center {
    text-align: center;
}
```

Taking the moreUrl (with value "/albums/more") setting above as an example, and the parameters object to generate the POST variables, here's what it might look like.  Because we also need to know which artist to use when retrieving albums, we set a hidden input in the albums page:

```HTML
<input type="hidden" id="param_one" name="param_one" value="<?php echo $artist_name; ?>" />
```

The lazyloader widget will automatically build the string to use for the POST data for the $.ajax request by usng the parameters passed in at initialization as well as the hidden input item so that POST data string will look like this:

```HTML
retrieve=10&retrieved=10&offset=0&param_one=Gentleman
```

The server-side resource will then take those parameters and build the JSON response (which contains ready-made HTML in this case) that would look something like below.  For example, if 10 Gentleman albums out of 12 were already showing, then this would be the server response with the last 2 albums:

```JavaScript
{ "data" : 
    [{  "count" : "2", 
        "html" : "  <li class='ui-li-has-thumb'>
                        <a href='/artist/Gentleman/album/On%2Bwe%2Bgo/tracks' data-transition='slide'>
                            <img src='/path/to/album/art.jpeg' class='ui-li-thumb album-art-img' />
                            <h3 class='ui-li-heading'>On we go</h3>
                            <span class='ui-li-count ui-btn-up-k ui-btn-corner-all'>4</span>
                        </a>
                    </li>
                    <li class='ui-li-has-thumb'>
                        <a href='/artist/Gentleman/album/trodin%2Bon/tracks' data-transition='slide'>
                            <img src='/path/to/album/art.jpeg' class='ui-li-thumb album-art-img' />
                            <h3 class='ui-li-heading'>trodin on</h3>
                            <span class='ui-li-count ui-btn-up-k ui-btn-corner-all'>14</span>
                        </a>
                    </li>" 
    }] 
}
```

The count is used to increment the instance specific count of how many items were "retrieved".  

The html is used in the below two lines of the lazyloader widget _load function which appends them to the end of the li items just before the last li (which is likely the divider).  If there is no "bottomElement" such as a list-divider li, then the html is appended into the mainSelector (in this case, #albumsList, which is the ul element):

```JavaScript
if ($bottomElement) {

    $( singleItemElementSelector ).last().before( html );

} else {

    $( mainElementSelector ).append( html );
} 
```

If using raw JSON as the server response (rather than including ready-made HTML) the response might look something like this:

```JavaScript
{ "data" : 
    [{  "count" : "2", 
        "json" : [
                    {   "href" : "/artist/Gentleman/album/On%2Bwe%2Bgo/tracks",
                        "art":"/cache/art/master/9b455cabc0b2c022f4ebde2241ed9d361ae350fc.jpeg", 
                        "transition":"slide", 
                        "name":"On we go", 
                        "theme_buttons":"k", 
                        "count_bubble_value":"4" 
                    },{ 
                        "href" : "/artist/Gentleman/album/trodin%2Bon/tracks",
                        "art":"/cache/art/master/f6b8215b788379fab5dffc0c172aa99cba20d121.jpeg",
                        "transition":"slide", 
                        "name":"trodin on", 
                        "theme_buttons":"k", 
                        "count_bubble_value":"14" 
                    }
                ] 
    }] 
}
```

The count is used to increment the instance specific count of how many items were "retrieved".  The inner JSON piece is then passed to a user-defined template for transformation to HTML.  

Pre-compiled Dust templates are the recommended method of rendering since they are very fast and the template files can be concatonated and minified along with the rest of your site's JavaScript.  Additionally, only the dust core is needed by the client, so overall script size is reduced (the compiler, which is a big chunk of the code, is not needed).  

Here's an example of the Dust template for the albums page (before being pre-compiled into usable JavaScript).  The file is stored as albums.tmpl.

```JavaScript
{#json}
    <li class='ui-li-has-thumb'>
        <a href='{href}' class='ui-link-inherit' data-transition='{transition}'>
            <img src='{art}' class='ui-li-thumb album-art-img' />
            <h3 class='ui-li-heading album-name-heading'>{name}</h3>
            <span class='ui-li-count ui-btn-up-{theme_buttons} ui-btn-corner-all'>{count_bubble_value}</span>
            <p class='ui-li-aside ui-li-desc'>{total_length}</p>
        </a>
    </li>
{/json}
```

For instructions on pre-compiling Dust templates, see the LinkedIn github page: http://linkedin.github.com/dustjs/ 

Here's the pre-compiled Dust template for the albums page which is stored in an external file named albums.tmpl.js:

```JavaScript
(function(){dust.register("albums",body_0);function body_0(chk,ctx){return chk.section(ctx.get("json"),ctx,{"block":body_1},null);}function body_1(chk,ctx){return chk.write("<li class='ui-li-has-thumb'><a href='").reference(ctx.get("href"),ctx,"h").write("' class='ui-link-inherit' data-transition='").reference(ctx.get("transition"),ctx,"h").write("'><img src='").reference(ctx.get("art"),ctx,"h").write("' class='ui-li-thumb album-art-img' /><h3 class='ui-li-heading album-name-heading'>").reference(ctx.get("name"),ctx,"h").write("</h3><span class='ui-li-count ui-btn-up-").reference(ctx.get("theme_buttons"),ctx,"h").write(" ui-btn-corner-all'>").reference(ctx.get("count_bubble_value"),ctx,"h").write("</span><p class='ui-li-aside ui-li-desc'>").reference(ctx.get("total_length"),ctx,"h").write("</p></a></li>");}return body_0;})();
```

That albums.tmpl.js file should then be concatonated and minified and gzipped along with the rest of the site's JavaScript.  

### Resetting instance variables and clearing the server-side session variables

Any values specific to a particular instance of the lazy loader and any server-side session variables can be cleared by calling the lazyloader reset or resetAll methods.  For example, I'm calling the resetAll in the index pageshow handler:

```JavaScript
$('body').on('pageshow', '#index', function(evt, ui) {

    $( "#index" ).lazyloader( "resetAll" );
});
```

The resetAll method uses the clearUrl that was specified when the lazyloader for the page in question was reinitialized.

### Listening for events triggered by the lazyloader widget

The lazyloader triggers several events during certain operations.  Here are examples of how to listen for the events:

```JavaScript
$("body").on("lazyloadercreate", "#index", function ( evt ){

});

$("body").on("lazyloaderbeforecreate", "#index", function ( evt ){

});

$("body").on("lazyloaderdestroy", "#index", function ( evt ){

});

$("body").on("lazyloaderdoneloading", "#index", function ( evt ){

});

$("body").on("lazyloaderalldone", "#index", function ( evt ){

});

$("body").on("lazyloaderbusy", "#index", function ( evt ){

});

$("body").on("lazyloadererror", "#index", function ( evt ){

});

$("body").on("lazyloaderreset", "#index", function ( evt ){

});

$("body").on("lazyloaderresetall", "#index", function ( evt ){

});
```
