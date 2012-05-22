### LazyLoader Widget for jQuery Mobile
Lazyloading (i.e. loading the content as it's needed during a scroll of a listview or similar control) is a great way to optimize the performance of any app that contains a list of 50 or more items.  With the LazyLoader Widget for jQuery Mobile, you can easily lazyload any listview without having to write a bunch of custom code to accomplish it.  The idea is to enable the widget on index pageinit, and then track instances of pages that contain listviews that can all be independently lazyloaded with the main widget instance.

Note: This is only the client-side part of the lazyloading solution.  It requires a server-side resource that returns a simple JSON formatted string.  Details and examples can be found below. 

### Requirements

jQuery 1.7.x (although, jQuery 1.6.4 may work fine - it just hasn't been tested - and, the examples are tailored to jQuery 1.7.x)
jQuery Mobile 1.1.x (1.0.x might work fine - it just hasn't been tested)
Server-side code to handle the AJAX requests

### Using the LazyLoader widget

First, to use the widget, you must download the main JavaScript file into your JavaScript directory.  Then, simply include the widget file after the core jQuery Mobile JavaScript file:

```html
<script type="text/javascript" src="includes/js/jquery.mobile-1.1.0.js"></script>
<script type="text/javascript" src="includes/js/jquery.mobile.lazyloader-0.9.js"></script>
```

Then, to instantiate the widget instance, add a pageinit for your main page (in my case the main data-role="page" has an id="index"):  

```JavaScript
$('body').on('pageinit', '#index', function( evt, ui ) {

    // Initialize the lazyloader widget
    $("#index").lazyloader();

    // Set some default options for the lazyloader - these set the timeout value for when the widget should 
    // check the current scroll position relative to page height to decide whether or not to load more yet
    $.mobile.lazyloader.prototype.timeoutOptions.mousewheel = 300;
    $.mobile.lazyloader.prototype.timeoutOptions.scrollstart = 700;
    $.mobile.lazyloader.prototype.timeoutOptions.scrollstop = 100;
    $.mobile.lazyloader.prototype.timeoutOptions.showprogress = 100;
});

```




