### LazyLoader Widget for jQuery Mobile
Lazyloading (i.e. loading the content as it's needed during a scroll of a listview or similar control) is a great way to optimize the performance of any app that contains a list of 50 or more items.  With the LazyLoader Widget for jQuery Mobile, you can easily lazyload any listview without having to write a bunch of custom code to accomplish it.  The idea is to enable the widget on index pageinit, and then track instances of pages that contain listviews that can all be independently lazyloaded with the main widget instance.

Note: This is only the client-side part of the lazyloading solution.  It requires a server-side resource that returns a simple JSON formatted string.  Details and examples can be found below. 

### Requirements

* jQuery 1.7.x (although, jQuery 1.6.4 may work fine - it just hasn't been tested - and, the examples are tailored to jQuery 1.7.x)
* jQuery Mobile 1.1.x (1.0.x might work fine - it just hasn't been tested)
* Server-side code to handle the AJAX requests

### Using the LazyLoader widget

First, to use the widget, you must download the main JavaScript file into your JavaScript directory.  Then, simply include the widget file after the core jQuery Mobile JavaScript file:

```html
<script src="includes/js/jquery-1.7.2.min.js"></script>
<script src="includes/js/jquery.mobile-1.1.0.js"></script>
<script src="includes/js/jquery.mobile.lazyloader-0.9.js"></script>
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

    // Set up the variable options to pass to the lazyloader reinitialize function
    var options = { "threshold"     : 360,
                    "retrieve"      : 20,
                    "retrieved"     : 20,
                    "bubbles"       : true,
                    "offset"        : 0 };

    // Set up the page specific settings to pass to the lazyloader reinitialize function
    var settings = {    "pageId"        : "artists",
                        "ulId"          : "artistsList",
                        "progressDivId" : "lazyloaderProgressDiv",
                        "moreUrl"       : "/artists/more",
                        "clearUrl"      : "/home/clear_session" };

    // Set up the post parameters to pass to the lazyloader reinitialize function
    var parameters = {  "retrieve"      : options.retrieve,
                        "retrieved"     : options.retrieved,
                        "offset"        : options.offset };

    // Reinitialize the lazyloader so that it correctly handles the listview on the artists page
    $( "#index" ).lazyloader( "reInitialize", options, settings, parameters );
});

```

### Explanation of available options:
<table>
  <tr>
    <th>Option</th><th>Value</th><th>Purpose</th>
  </tr>
  <tr>
    <td>threshold</td><td>360</td><td>This specifies the threshold in pixels for how close to the bottom of the page should the widget get before making the call to the private function _load</td>
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
    <td>ulId</td><td>artistsList</td><td>This specifies the id of the ul element of the listview to lazyload</td>
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
</table>

### Explanation of available parameters:

The values of the parameters are taken from the values specified in the options object.  The parameters object is used in generating the POST variables for the AJAX call to the server-side resource for retrieving more li elements to lazy load.  Any items specified in the parameters will be complemented by any
hidden input elements that are on the same page as the listview element to lazyload.

Here's an example of how the lazyloader is reinitialized on the albums page.  Notice the higher threshold compared to the artists page and the lower retrieve and retrieved values.  That is because the albums list items are about twice the height of the artists li items because the albums have album art:

```JavaScript
$('body').on('pageinit', '#albums', function(evt, ui) {

    // Set up the variable options to pass to the lazyloader reinitialize function
    var options = { "threshold"     : 480,
                    "retrieve"      : 10,
                    "retrieved"     : 10,
                    "bubbles"       : true };

    // Set up the page specific settings to pass to the lazyloader reinitialize function
    var settings = {    "pageId"        : "albums",
                        "ulId"          : "albumsList",
                        "progressDivId" : "lazyloaderProgressDiv",
                        "moreUrl"       : "/albums/more",
                        "clearUrl"      : "/home/clear_session" };

    // Set up the post parameters to pass to the lazyloader reinitialize function
    var parameters = {  "retrieve"      : options.retrieve,
                        "retrieved"     : options.retrieved,
                        "offset"        : options.offset };

    // Reinitialize the lazyloader so that it correctly handles the listview on the artists page
    $( "#index" ).lazyloader( "reInitialize", options, settings, parameters );
});
```

### Clearing the server-side session variables

The server-side session variables can be cleared by calling the lazyloader reset or resetAll methods.  For example, I'm calling the resetAll in the index pageshow handler:

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

    //alert("lazyloadercreate called!\n\nevt.instances: "+JSON.stringify(evt));
});

$("body").on("lazyloaderdone", "#index", function ( evt ){

    //alert("lazyloaderdone called!\n\nevt.instances: "+JSON.stringify(evt));
});

$("body").on("lazyloadererror", "#index", function ( evt ){

    //alert("lazyloaderdestroy called!\n\nevt.instances: "+JSON.stringify(evt));
});

$("body").on("lazyloaderreset", "#index", function ( evt ){

    //alert("lazyloaderreset called!\n\nevt.instances: "+JSON.stringify(evt));
});

$("body").on("lazyloaderresetall", "#index", function ( evt ){

    //alert("lazyloaderresetall called!\n\nevt.instances: "+JSON.stringify(evt));
});
```