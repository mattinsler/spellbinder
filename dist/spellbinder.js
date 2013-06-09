(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  (function(exports) {
    var AttributeWriter, Binder, Binding, ChangeHandler, ElementWriter, Formatter, Writer, get_nested_value;
    get_nested_value = function(data, field) {
      var f, _i, _len, _ref;
      _ref = field.split('.');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        data = data[f];
        if (data == null) {
          return null;
        }
      }
      return data;
    };
    Binding = (function() {

      Binding.parse = function(binding_descriptor, view) {
        return binding_descriptor.split(';').map(function(b) {
          var attribute, bindings, expression, format, formatter, writer, x, _ref, _ref1;
          _ref = /^ *(\[([^\]]+)\] *)?(.*)$/.exec(b), x = _ref[0], x = _ref[1], attribute = _ref[2], expression = _ref[3];
          _ref1 = expression.split('->'), bindings = _ref1[0], format = _ref1[1];
          bindings = bindings.split(',');
          if (bindings.length > 1 && !(format != null)) {
            throw new Error('Multiple events require a formatter: ' + b);
          }
          bindings = bindings.map(function(e) {
            var global, obj, _ref2;
            e = e.trim();
            if (e[0] === '@') {
              global = true;
              obj = e.split(':')[0].slice(1);
              e = e.slice(obj.length + 2);
            } else {
              global = false;
              _ref2 = e.split(':'), obj = _ref2[0], e = _ref2[1];
              if (e == null) {
                e = obj;
                obj = 'model';
              }
            }
            return {
              global: global,
              object: obj,
              event: e,
              view: view
            };
          });
          formatter = new Formatter(bindings, format);
          writer = attribute != null ? new AttributeWriter(formatter, attribute) : new ElementWriter(formatter);
          return new Binding(bindings, writer);
        });
      };

      Binding.parse_element = function(el, view) {
        var binding, val;
        val = $(el).data().bind;
        $(el).attr('data-bind', null);
        binding = this.parse(val, view);
        binding.map(function(b) {
          return b.el = el;
        });
        return binding;
      };

      function Binding(bindings, writer) {
        this.bindings = bindings;
        this.writer = writer;
        _.extend(this, ChangeHandler);
      }

      Binding.prototype.bind = function(binder, view) {
        var b, _i, _len, _ref;
        if (this.bound_view != null) {
          return;
        }
        this.bound_view = view;
        _ref = this.bindings;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          b = _ref[_i];
          b.bound_object = get_nested_value((b.global ? window : view), b.object);
          binder.bind_to(b.bound_object);
        }
        return this.write();
      };

      Binding.prototype.unbind = function(binder) {
        var b, _i, _len, _ref;
        _ref = this.bindings != null;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          b = _ref[_i];
          binder.unbind_from(b.bound_object);
        }
        return this.bound_view = null;
      };

      Binding.prototype.is_changed = function(src, changes) {
        return _(this.bindings).any(function(b) {
          return b.bound_object === src && _(changes).any(function(c) {
            return b.bound_object.has(c);
          });
        });
      };

      Binding.prototype.handle_change = function() {
        return this.write();
      };

      Binding.prototype.write = function() {
        var values,
          _this = this;
        if (this.bound_view == null) {
          return;
        }
        values = _(this.bindings).inject(function(o, b) {
          o[b.event] = b.bound_object.get(b.event);
          return o;
        }, {});
        return this.writer.write(this.bound_view, this.el, values);
      };

      return Binding;

    })();
    Formatter = (function() {

      function Formatter(bindings, __format__) {
        var _this = this;
        this.bindings = bindings;
        if (__format__ == null) {
          this.format = (function(values) {
            return values[_this.bindings[0].event];
          });
          return this;
        }
        if (this.bindings.length === 1) {
          this.format = function(__values__) {
            var current_view, source, __method__;
            current_view = _this.bindings[0].view;
            source = _this.bindings[0].bound_object;
            __method__ = "(function(value, " + _this.bindings[0].event + "){return " + __format__ + "})(__values__['" + _this.bindings[0].event + "'], __values__['" + _this.bindings[0].event + "'])";
            if (_this.debug) {
              console.log(__method__);
            }
            try {
              return eval(__method__);
            } catch (e) {
              console.error(__method__);
              console.error(__values__);
              console.error(current_view);
              throw new Error('Could not format: [' + __format__ + '] ERROR: ' + e.message);
            }
          };
        } else {
          this.format = function(__values__) {
            var current_view, sources, __args__, __method__, __value_args__;
            current_view = _this.bindings[0].view;
            sources = _this.bindings.map(function(b) {
              return b.bound_object;
            });
            __args__ = _this.bindings.map(function(b) {
              return b.event;
            }).join(', ');
            __value_args__ = _this.bindings.map(function(b) {
              return "__values__['" + b.event + "']";
            }).join(', ');
            __method__ = "(function(" + __args__ + "){return " + __format__ + "})(" + __value_args__ + ")";
            if (_this.debug) {
              console.log(__method__);
            }
            try {
              return eval(__method__);
            } catch (e) {
              console.error(__method__);
              console.error(__values__);
              throw new Error('Could not format: [' + __format__ + '] ERROR: ' + e.message);
            }
          };
        }
      }

      return Formatter;

    })();
    Writer = (function() {

      function Writer() {}

      Writer.prototype.write = function(view, el, values) {
        var $el, a, bound_to;
        $el = $(el);
        bound_to = $el.attr('bound-to');
        a = (bound_to || '').split(' ').concat(_(values).keys()).filter(function(i) {
          return (i != null) && i !== '';
        });
        a = _(a).inject((function(o, i) {
          o[i] = 1;
          return o;
        }), {});
        return $el.attr('bound-to', _(a).keys().join(' '));
      };

      return Writer;

    })();
    ElementWriter = (function(_super) {

      __extends(ElementWriter, _super);

      function ElementWriter(formatter) {
        this.formatter = formatter;
      }

      ElementWriter.prototype.write = function(view, el, values) {
        ElementWriter.__super__.write.apply(this, arguments);
        return $(el).html(this.formatter.format(values));
      };

      return ElementWriter;

    })(Writer);
    AttributeWriter = (function(_super) {

      __extends(AttributeWriter, _super);

      function AttributeWriter(formatter, attribute) {
        this.formatter = formatter;
        this.attribute = attribute;
      }

      AttributeWriter.prototype.write = function(view, el, values) {
        var attr, formatted_value, o, scope, _ref;
        AttributeWriter.__super__.write.apply(this, arguments);
        formatted_value = this.formatter.format(values);
        _ref = this.attribute.split(':'), scope = _ref[0], attr = _ref[1];
        if (attr != null) {
          if (scope === 'css') {
            o = {};
            o[attr] = formatted_value;
            return $(el).css(o);
          } else if (scope === 'class') {
            if (formatted_value) {
              return $(el).addClass(attr);
            } else {
              return $(el).removeClass(attr);
            }
          } else if (scope === 'prop') {
            return $(el).prop(attr, formatted_value);
          }
        } else {
          return $(el).attr(this.attribute, formatted_value);
        }
      };

      return AttributeWriter;

    })(Writer);
    Binder = (function() {

      Binder.hooks = {};

      Binder.add_hook = function(name, method) {
        var _base, _ref;
        return ((_ref = (_base = this.hooks)[name]) != null ? _ref : _base[name] = []).push(method);
      };

      Binder.apply_hooks = function(name, scope) {
        if (this.hooks[name] == null) {
          return;
        }
        return this.hooks[name].forEach(function(hook) {
          return hook.call(scope);
        });
      };

      Binder.initialize = function(view, opts) {
        return view.__binder__ = new Binder(view, opts);
      };

      Binder.unbind = function(view) {
        if (view.__binder__ == null) {
          return;
        }
        return view.__binder__.destroy();
      };

      function Binder(view, opts) {
        var _ref,
          _this = this;
        this.view = view;
        if (opts == null) {
          opts = {};
        }
        _.extend(this, ChangeHandler);
        this.bound_events = [];
        this._render = this.view.render;
        this.view.render = this.render.bind(this);
        this._destroy = this.view.destroy;
        this.view.destroy = this.destroy.bind(this);
        this._unbind = this.view.unbind;
        this.view.unbind = this.unbind.bind(this);
        this.bindings = [];
        if (opts.attributes != null) {
          (_ref = this.bindings).push.apply(_ref, _(opts.attributes.map(function(a) {
            var binding;
            binding = Binding.parse("[" + a.set + "] " + a.from, _this.view);
            binding.map(function(b) {
              return b.el = _this.view.el;
            });
            return binding;
          })).flatten());
        }
        this.replace_el = opts.replace === true;
      }

      Binder.prototype.destroy = function() {
        var _ref;
        return (_ref = this._destroy) != null ? _ref.apply(this.view, arguments) : void 0;
      };

      Binder.prototype.unbind = function() {
        var b, e, _i, _j, _len, _len1, _ref, _ref1, _ref2;
        _ref = this.bindings;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          b = _ref[_i];
          b.unbind(this);
        }
        _ref1 = this.bound_events;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          e = _ref1[_j];
          $(e.el).off(e.event, e.callback);
        }
        return (_ref2 = this._unbind) != null ? _ref2.apply(this.view, arguments) : void 0;
      };

      Binder.prototype.bind = function(bindings) {
        var b, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = bindings.length; _i < _len; _i++) {
          b = bindings[_i];
          _results.push(b.bind(this, this.view));
        }
        return _results;
      };

      Binder.prototype.capture_data_bind_bindings = function($el) {
        var els, new_bindings, _ref,
          _this = this;
        els = $el.find('[data-bind]').toArray();
        if ($el.is('[data-bind]')) {
          els.push($el[0]);
        }
        new_bindings = _(els.map(function(el) {
          return Binding.parse_element(el, _this.view);
        })).flatten();
        (_ref = this.bindings).push.apply(_ref, new_bindings);
        return new_bindings;
      };

      Binder.prototype.render_template = function() {
        var rendered;
        if (this.view.template != null) {
          rendered = $(this.view.template({
            model: this.view.model
          }));
          if (this.replace_el) {
            this.view.$el.replaceWith(rendered);
            return this.view.setElement(rendered);
          } else {
            return this.view.$el.html(rendered);
          }
        }
      };

      Binder.prototype.render_data_event = function($el) {
        var els,
          _this = this;
        els = $el.find('[data-event]').toArray();
        if ($el.is('[data-event]')) {
          els.push($el[0]);
        }
        return els.forEach(function(el) {
          var callback, create_callback, event, event_descriptor, method, _i, _len, _ref, _ref1, _results;
          _ref = $(el).data('event').split(';');
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            event_descriptor = _ref[_i];
            _ref1 = event_descriptor.trim().split(':'), event = _ref1[0], method = _ref1[1];
            event = event.trim();
            method = method.trim();
            if (!((event != null) && (method != null))) {
              throw new Error('data-event must be formatted like "event_name: view_method_name"');
            }
            if (_this.view[method] == null) {
              throw new Error("[data-event] Method '" + method + "' does not exist in view");
            }
            create_callback = function(method) {
              return function() {
                return _this.view[method].apply(_this.view, arguments);
              };
            };
            callback = create_callback(method);
            $(el).off(event, callback);
            $(el).on(event, callback);
            _results.push(_this.bound_events.push({
              el: el,
              event: event,
              callback: callback
            }));
          }
          return _results;
        });
      };

      Binder.prototype.bind_to_dom = function(selector) {
        var $el, new_bindings;
        $el = $(selector);
        new_bindings = this.capture_data_bind_bindings($el);
        this.bind(new_bindings);
        return this.render_data_event($el);
      };

      Binder.prototype.render = function() {
        Binder.apply_hooks('before:render', this.view);
        this.render_template();
        this.bind_to_dom(this.view.$el);
        this._render.apply(this.view, arguments);
        Binder.apply_hooks('after:render', this.view);
        return this.view;
      };

      return Binder;

    })();
    ChangeHandler = {
      bind_to: function(obj) {
        obj.off('change', this.on_change, this);
        return obj.on('change', this.on_change, this);
      },
      unbind_from: function(obj) {
        return obj.off('change', this.on_change, this);
      },
      on_change: function(src, opts) {
        var b, bindings, changes, new_values, old_values, _base, _base1, _i, _len;
        changes = _(opts.changes || src.changes || src.changed).keys();
        bindings = this.bindings.filter(function(b) {
          return b.is_changed(src, changes);
        });
        if (bindings.length === 0) {
          return;
        }
        new_values = _(changes).inject((function(o, c) {
          o[c] = src.get(c);
          return o;
        }), {});
        old_values = _(changes).inject((function(o, c) {
          o[c] = src.previous(c);
          return o;
        }), {});
        if (typeof (_base = this.view).before_change === "function") {
          _base.before_change(new_values, old_values);
        }
        for (_i = 0, _len = bindings.length; _i < _len; _i++) {
          b = bindings[_i];
          b.handle_change();
        }
        return typeof (_base1 = this.view).after_change === "function" ? _base1.after_change(new_values, old_values) : void 0;
      }
    };
    return exports.Spellbinder = Binder;
  })((typeof module !== "undefined" && module !== null ? module.exports : void 0) || window);

}).call(this);
