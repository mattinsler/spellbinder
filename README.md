# Spellbinder

View only model/view binding for backbone.js

## Getting Started
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/mattinsler/spellbinder/master/dist/spellbinder.min.js
[max]: https://raw.github.com/mattinsler/spellbinder/master/dist/spellbinder.js

In your web page:

```html
<script src="backbone.min.js"></script>
<script src="spellbinder.min.js"></script>
<script>
// Spellbinder will automatically render a view's templates if it defines one
var MyView = Backbone.View.extend({
  template: EJS.compile('Hello <b data-bind="name"></b>'),
  initialize: function() {
    Spellbinder.initialize(this);
  }
});

var user = new User({name: 'Matt Insler'});
var view = new MyView(user).render();

// Change the user's name after a few seconds and watch it update live
setTimeout(function() {
  user.set({name: 'Peyton Manning'});
}, 5000);
</script>
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## License
Copyright (c) 2012 Matt Insler  
Licensed under the MIT license.
