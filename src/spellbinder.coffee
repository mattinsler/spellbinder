# 
# spellbinder
# https://github.com/mattinsler/spellbinder
# 
# Copyright (c) 2012 Matt Insler
# Licensed under the MIT, GPL licenses.
# 

((exports) ->
  get_nested_value = (data, field) ->
    for f in field.split('.')
      data = data[f]
      return null unless data?
    data

  class Binding
    @parse: (binding_descriptor, view) ->
      # @app:current_page:recent_comments -> recent_comments
      # @app.clock:time -> moment(time).format('')
      # [src] attachment -> value.icon
      # created_time -> moment(value).format('MMM D h:mm a')
      # engaged_users, impressions_unique -> format('#0.0', 100 * engaged_users / impressions_unique) + '%'
      # [css:background-color] score -> rgb(score, 0 , 0)

      binding_descriptor.split(';').map (b) ->
        [x, x, attribute, expression] = /^ *(\[([^\]]+)\] *)?(.*)$/.exec(b)

        [bindings, format] = expression.split('->')
        bindings = bindings.split(',')

        throw new Error('Multiple events require a formatter: ' + b) if bindings.length > 1 and !format?

        bindings = bindings.map (e) ->
          e = e.trim()
          if e[0] is '@'
            global = true
            obj = e.split(':')[0].slice(1)
            e = e.slice(obj.length + 2)
          else
            global = false
            [obj, e] = e.split(':')
            unless e?
              e = obj
              obj = 'model'
          {
            global: global
            object: obj
            event: e
            view: view
          }

        formatter = new Formatter(bindings, format)
        writer = if attribute? then new AttributeWriter(formatter, attribute) else new ElementWriter(formatter)
        new Binding(bindings, writer)

    @parse_element: (el, view) ->
      val = $(el).data().bind
      $(el).attr('data-bind', null)

      binding = @parse(val, view)
      binding.map (b) -> b.el = el
      binding

    constructor: (@bindings, @writer) ->
      _.extend(@, ChangeHandler)

    bind: (binder, view) ->
      return if @bound_view?
      @bound_view = view

      for b in @bindings
        b.bound_object = get_nested_value((if b.global then window else view), b.object)
        binder.bind_to(b.bound_object)
      @write()

    unbind: (binder) ->
      binder.unbind_from(b.bound_object) for b in @bindings?
      @bound_view = null

    is_changed: (src, changes) ->
      _(@bindings).any (b) ->
        b.bound_object is src and _(changes).any((c) -> b.bound_object.has(c))

    handle_change: ->
      @write()

    write: ->
      return unless @bound_view?

      values = _(@bindings).inject (o, b) =>
        o[b.event] = b.bound_object.get(b.event)
        o
      , {}

      @writer.write(@bound_view, @el, values)

  class Formatter
    constructor: (@bindings, __format__) ->
      unless __format__?
        @format = ((values) => values[@bindings[0].event])
        return @

      if @bindings.length is 1
        @format = (__values__) =>
          current_view = @bindings[0].view
          source = @bindings[0].bound_object
          __method__ = "(function(value, #{@bindings[0].event}){return #{__format__}})(__values__['#{@bindings[0].event}'], __values__['#{@bindings[0].event}'])"
          console.log __method__ if @debug
          try
            eval(__method__)
          catch e
            console.error(__method__)
            console.error(__values__)
            console.error(current_view)
            throw new Error('Could not format: [' + __format__ + '] ERROR: ' + e.message)
      else
        @format = (__values__) =>
          # all views should be the same
          current_view = @bindings[0].view
          sources = @bindings.map((b) -> b.bound_object)
          __args__ = @bindings.map((b) -> b.event).join(', ')
          __value_args__ = @bindings.map((b) -> "__values__['#{b.event}']").join(', ')
          __method__ = "(function(#{__args__}){return #{__format__}})(#{__value_args__})"
          console.log __method__ if @debug
          try
            eval(__method__)
          catch e
            console.error(__method__)
            console.error(__values__)
            throw new Error('Could not format: [' + __format__ + '] ERROR: ' + e.message)

  class Writer
    write: (view, el, values) ->
      $el = $(el)
      bound_to = $el.attr('bound-to')
      a = (bound_to || '').split(' ').concat(_(values).keys()).filter (i) -> i? and i isnt ''
      a = _(a).inject ((o, i) -> o[i] = 1; o), {}
      $el.attr('bound-to', _(a).keys().join(' '))

  class ElementWriter extends Writer
    constructor: (@formatter) ->

    write: (view, el, values) ->
      super
      $(el).html(@formatter.format(values))

  class AttributeWriter extends Writer
    constructor: (@formatter, @attribute) ->

    write: (view, el, values) ->
      super
      formatted_value = @formatter.format(values)

      [scope, attr] = @attribute.split(':')
      if attr?
        if scope is 'css'
          o = {}
          o[attr] = formatted_value
          $(el).css(o)
        else if scope is 'class'
          if formatted_value
            $(el).addClass(attr)
          else
            $(el).removeClass(attr)
        else if scope is 'prop'
          $(el).prop(attr, formatted_value)
      else
        $(el).attr(@attribute, formatted_value)

  class Binder
    @hooks: {}
    @add_hook: (name, method) ->
      (@hooks[name] ?= []).push(method)
    @apply_hooks: (name, scope) ->
      return unless @hooks[name]?
      @hooks[name].forEach (hook) ->
        hook.call(scope)

    @initialize: (view, opts) ->
      view.__binder__ = new Binder(view, opts)

    @unbind: (view) ->
      return unless view.__binder__?
      view.__binder__.destroy()

    constructor: (@view, opts = {}) ->
      _.extend(@, ChangeHandler)
      @bound_events = []

      @_render = @view.render
      @view.render = @render.bind(@)
      @_destroy = @view.destroy
      @view.destroy = @destroy.bind(@)
      @_unbind = @view.unbind
      @view.unbind = @unbind.bind(@)

      @bindings = []
      if opts.attributes?
        @bindings.push(
          _(opts.attributes.map (a) =>
            binding = Binding.parse("[#{a.set}] #{a.from}", @view)
            binding.map (b) => b.el = @view.el
            binding
          ).flatten()...
        )
      
      @replace_el = opts.replace is true

    destroy: ->
      @_destroy?.apply(@view, arguments)

    unbind: ->
      b.unbind(@) for b in @bindings
      $(e.el).off(e.event, e.callback) for e in @bound_events
      @_unbind?.apply(@view, arguments)

    bind: (bindings) ->
      b.bind(@, @view) for b in bindings

    capture_data_bind_bindings: ($el) ->
      els = $el.find('[data-bind]').toArray()
      els.push($el[0]) if $el.is('[data-bind]')
      new_bindings = _(els.map(
        (el) => Binding.parse_element(el, @view)
      )).flatten()
      @bindings.push(new_bindings...)
      new_bindings

    render_template: ->
      if @view.template?
        rendered = $(@view.template(model: @view.model))
        if @replace_el
          @view.$el.replaceWith(rendered)
          @view.setElement(rendered)
        else
          @view.$el.html(rendered)
    
    render_data_event: ($el) ->
      els = $el.find('[data-event]').toArray()
      els.push($el[0]) if $el.is('[data-event]')
      
      els.forEach (el) =>
        for event_descriptor in $(el).data('event').split(';')
          [event, method] = event_descriptor.trim().split(':')
          event = event.trim()
          method = method.trim()
          throw new Error('data-event must be formatted like "event_name: view_method_name"') unless event? and method?
          throw new Error("[data-event] Method '#{method}' does not exist in view") unless @view[method]?

          create_callback = (method) =>
            => @view[method].apply(@view, arguments)

          callback = create_callback(method)
          $(el).off(event, callback)
          $(el).on(event, callback)
          @bound_events.push({el: el, event: event, callback: callback})

    bind_to_dom: (selector) ->
      $el = $(selector)
      new_bindings = @capture_data_bind_bindings($el)
      @bind(new_bindings)
      @render_data_event($el)

    render: ->
      Binder.apply_hooks('before:render', @view)

      @render_template()
      @bind_to_dom(@view.$el)
      @_render.apply(@view, arguments)

      Binder.apply_hooks('after:render', @view)

      @view

  ChangeHandler = {
    bind_to: (obj) ->
      obj.off('change', @on_change, @)
      obj.on('change', @on_change, @)

    unbind_from: (obj) ->
      obj.off('change', @on_change, @)

    on_change: (src, opts) ->
      changes = _(opts.changes or src.changes or src.changed).keys()
      bindings = @bindings.filter (b) -> b.is_changed(src, changes)
      return if bindings.length is 0

      new_values = _(changes).inject ((o, c) -> o[c] = src.get(c); o), {}
      old_values = _(changes).inject ((o, c) -> o[c] = src.previous(c); o), {}

      @view.before_change?(new_values, old_values)
      b.handle_change() for b in bindings
      @view.after_change?(new_values, old_values)
  }
  
  exports.Spellbinder = Binder
)(module?.exports or window)
