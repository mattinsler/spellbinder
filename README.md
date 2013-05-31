# Spellbinder

Real-time view/model binding for backbone.js

Wouldn't you rather write this:

```html
<p data-bind="count; [class:high-value] count > 100; [class:low-value] count < 50"></p>
```

Rather than this:

```javascript
$(function() {
  some_model.on('change:count', function() {
    var count = some_model.get('count')
      , $el = $('.some-selector');
    
    $el.html(count);
    $el.toggleClass('high-value', count > 100);
    $el.toggleClass('low-value', count < 50);
  });
});
```

## Basic Idea

The basic idea is to have as much of the binding and manipulation located in the markup rather than in the view code.
This allows easier maintenance of the presentation code rather than having to search for that spot where jquery references
some DOM element by some selector... Why go through all of that?

With spellbinder, all you do is call Spellbinder.initialize on the view and it will automatically render the view's template,
make the model available to the template, bind and live update all of the bindings in the DOM.

Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/mattinsler/spellbinder/master/dist/spellbinder.min.js
[max]: https://raw.github.com/mattinsler/spellbinder/master/dist/spellbinder.js

## Usage

Spellbinder is mostly used in the HTML. It looks through the html for the view and processes all `data-bind` and `data-event`
attributes.

The following code is a complete example using Spellbinder. It will create a new view called CountView, render it onto the
page, and then show a count that changes 10 times every second, and show/hide an element based on the value of that count.
It will also bind the click event of the flickering element to the on_click method on the view.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .hidden {display:none;}
  </style>
  
  <!-- Dependencies -->
  <script src="jquery.min.js"></script>
  <script src="lodash.min.js"></script>
  <script src="backbone.min.js"></script>
  
  <script src="ejs.min.js"></script>
  <script src="spellbinder.min.js"></script>
  
  <script>
    var CountView = Backbone.View.extend({
      template: EJS.compile($('#templates [name="count"]').html()),
      initialize: function() {
        Spellbinder.initialize(this);
      },
      
      on_click: function(event) {
        alert('The current count is ' + this.model.get('count'));
      }
    });
  
    var model = new Backbone.Model({name: 'My Count test', count: 0});
    new CountView({el: $('#content'), model: model}).render();
    
    setInterval(function() {
      model.set({count: 1000 * Math.random()});
    }, 100);
  </script>
</head>
<body>
  <div id="content"></div>
  
  <div id="templates" style="display:none;">
    <script name="count" type="text/x-ejs-template">
      <h1><%= model.get('name') %></h1>
      
      <h3>Count: <span data-bind="count"></span></h3>
      
      <p data-bind="[class:hidden] count -> count > 100" data-event="click: on_click">
        This is visible until model.get('count') is greater than 100.
      </p>
    </script>
  </div>
</body>
</html>
```

### `data-bind` Attribute

This attribute is used to bind values from the parent view's `model` into view elements.

The `data-bind` language consists of 2 parts: the target and the expression. The target is either blank or is in brackets.

For example:

```html

<!-- target: HTML, expression: count -->
<div data-bind="count"></div>

<!-- target: name attribute, expression: count -> 'foo-' + count -->
<div data-bind="[name] count -> 'foo-' + count"></div>

```

### Targets

#### HTML target

HTML targets are the default. If there is no target specified, it is assumed to be HTML.

```html
<div data-bind="foo"></div>
```

#### Attribute target

Attribute targets are specified by putting the attribute name in brackets.

```html
<div data-bind="[name] foo"></div>
```

This will set the `name` attribute to be the value of `model.get('foo')` and update the `name` attribute as the value of
foo changes.

#### CSS target

CSS targets are used to set a specific style value on an element.

Class targets are specified by putting the class name in brackets after the prefix `css:`.

```html
<div data-bind="[css:font-size] foo"></div>
```

This will set the `font-size` value in the style attribute to be the value of `model.get('foo')` and update that as the 
value of foo changes.

#### Class target

Class targets are used to turn classes on and off and require expressions that evaluate to true or false.

Class targets are specified by putting the class name in brackets after the prefix `class:`.

```html
<div data-bind="[class:show-name] foo -> foo === 'bar'"></div>
```

This will add the `show-name` class to the current element when the value of `model.get('foo')` is equal to `bar` and will 
remove the `show-name` class from the current element when that is no longer true.

#### Property target

Property targets are used to turn properties on and off and require expressions that evaluate to true or false.

Property targets are specified by putting the class name in brackets after the prefix `prop:`.

```html
<div data-bind="[prop:disabled] foo -> foo > 3"></div>
```

This will add the `disabled` property to the current element when the value of `model.get('foo')` is greater than 3 and will
remove the `disabled` property from the current element when that is no longer true.

### Expressions

Expressions consist of a listing of the model attributes to bind to, and optional javascript code to mutate that attribute
either for presentation or to create a true/false value for certain targets.

The model attributes to bind to are a comma-separated list on the left side of the `->` symbol.

```html
<div data-bind="foo, bar -> foo + ' - ' + bar"></div>
```

In this case, any time that the foo or bar attributes change on the current view's model, the following javascript method
will be run:

```javascript
function(value, current_view, foo, bar) {
  return foo + ' - ' + bar;
}
```

There are other variables available to you within your binding expression, besides the current attributes. These are
- `value` or `values` - the value or array of values of the bound attributes in the order specified
- `current_view` - the view that this template is being rendered for

#### Advanced Attribute Selectors

Attribute names are assumed to be local to the `model` attribute of the parent view.

However we can also target both sub-objects and objects at the `window` level.

#### Sub-Object Selector

Sub-objects can be seleted using the `.` and `:` notation. The `:` tells spellbinder to look for change events on the 
property immediately following the colon, and the `.` tells spellbinder to traverse the object tree using that key.

For instance:

```html
<div data-bind="scope.clowns:count"></div>
```

This says to look at the parent view's scope object, traverse to the clowns property, and treat that as a Backbone Model,
binding to the `count` property. This is functionally the same as:

```javascript
Backbone.View.extend({
  initialize: function() {
    var _this = this;
    this.scope.clowns.on('change:count', function() {
      var count = _this.get('count');
      this.$('.some-selector').html(count);
    });
  }
});
```

#### Global Object Selector

Sometimes you need to reference an application-wide model. In this case, we can use the `@` notation to make spellbinder
look at window-level objects.

For instance, let's say that I had a `clock` model at the window level that looked like this:

```javascript
window.clock = Backbone.Model.extend({
  initialize: function() {
    var _this = this;
    
    this.set({time: new Date()});
    setInterval(function() {
      _this.set({time: new Date()});
    }, 1000);
  }
});
```

Now I want to have a ticking clock on my page and format the time with [momentjs](http://momentjs.com/).

```html
<p class="current-time" data-bind="@clock:time -> moment(time).format('h:mm:ss a')"></p>
```

### Multiple bindings

To specify multiple bindings on the same DOM element, just separate the binding expressions with a semi-colon.

```html
<input type="checkbox" data-bind="[css:height] count -> (count * 10) + 'px' ; [prop:disabled] count -> count < 4">
```

This example will set the height of the checkbox to the value of `model.get('count')` as it changes, and disable the 
checkbox when the count is less than 4.

### `data-event` Attribute

This attribute is used to bind events from the parent view's code to raw elements. This is functionally the same as
specifying an [events](http://backbonejs.org/#View-delegateEvents) hash in the view class, but you don't need to worry about
jquery selectors and proper method scoping.

For example:

```html
<button data-event="event: click_button">Click me!</button>
<p data-event="mouseover: on_mouseover">Move your mouse over me</p>
```

It's just that easy!

## License
Copyright (c) 2012 Matt Insler  
Licensed under the MIT license.
