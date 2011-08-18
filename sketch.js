(function(context) {
    var sketch = function(options) {
        options = options || {};
        var po = org.polymaps,
          sketch = {},
          map,
          mode = null,
          modes = {},
          pen = {},
          isdrawing,
          layer = po.geoJson(),
          feature = {},
          features = [],
          container;

        pen = {
          'fill': 'none',
          'stroke': options.stroke || '#E49000',
          'strokeWidth': options.width || 10
        };

        // From LeafletJS via Modest Maps
        var getFrame = function() {
          return function(callback) {
            (window.requestAnimationFrame  ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function (callback) {
              window.setTimeout(function () {
                callback(+new Date());
              }, 10);
            })(callback);
          };
        }();

        // TODO: push into line only
        function addPosition(e) {
          var location = map.pointLocation(map.mouse(e));
          sketch.dispatch({
            type: 'featurePush',
            feature: feature,
            delta: [location.lon, location.lat]
            });
        }

        function cancel(e) {
          e.stopPropagation();
          e.preventDefault();
          return false;
        }

        function removeFeature(id) {
          var features = layer.features();
          for (var i = 0; i < features.length; i++) {
            if (features[i].id == id) {
              sketch.dispatch({
                type: 'featureRemove',
                feature: features.splice(i, 1)[0]
              });
              return layer.features(features);
            }
          }
        }

        // Just clone pen.
        function currentStyle() {
          var r = {};
          for (var i in pen) { r[i] = pen[i]; }
          return r;
        }

        function mouseOrTouch(e) {
          if (e.type.match(/^touch/)) {
              return e.touches[0];
          } else {
              return e;
          }
        }

        modes.eraser = {
          add: function() {
            _savedStyle = {};
            layer.on('feature-click',     modes.eraser.click);
            layer.on('feature-mouseover', modes.eraser.mouseover);
            layer.on('feature-mouseout',  modes.eraser.mouseout);
          },

          remove: function() {
            _savedStyle = null;
            layer.off('feature-click',     modes.eraser.click);
            layer.off('feature-mouseover', modes.eraser.mouseover);
            layer.off('feature-mouseout',  modes.eraser.mouseout);
          },

          mouseover: function(e) {
            _savedStyle[e.feature.data.id] = e.feature.element.style.cssText;
            e.feature.element.style.stroke = '#f00';
          },

          mouseout: function(e) {
            e.feature.element.style.cssText = _savedStyle[e.feature.data.id];
            _savedStyle[e.feature.data.id] = null;
          },

          click: function(e) {
            removeFeature(e.feature.data.id);
          }
        };

        modes.pen = {
          add: function() {
            window.addEventListener('mousemove', modes.pen.mousemove, false);
            window.addEventListener('mouseup',   modes.pen.mouseup, false);
            container.addEventListener('mouseup',   modes.pen.mouseup, false);
            container.addEventListener('mousedown', modes.pen.mousedown, false);
            container.addEventListener('dragstart', cancel, false);

            container.addEventListener('touchstart', modes.pen.mousedown, false);
            window.addEventListener('touchmove', modes.pen.mousemove, false);
            window.addEventListener('touchend', modes.pen.mouseup, false);
          },

          remove: function() {
            window.removeEventListener('mousemove', modes.pen.mousemove, false);
            window.removeEventListener('mouseup',   modes.pen.mouseup, false);
            container.removeEventListener('mousedown', modes.pen.mousedown, false);
            container.removeEventListener('mouseup', modes.pen.mouseup, false);
            container.removeEventListener('dragstart', cancel, false);

            container.removeEventListener('touchstart', modes.pen.mousedown, false);
            window.removeEventListener('touchmove', modes.pen.mousemove, false);
            window.removeEventListener('touchend', modes.pen.mouseup, false);
          },

          mousemove: function(e) {
            cancel(e);
            getFrame(function() {
                if (!isdrawing) return;
                e = mouseOrTouch(e);
                addPosition(e);
                layer.features(features);
            });
          },

          mouseup: function(e) {
            if (!isdrawing) return;
            isdrawing = null;
            feature.geometry.coordinates = simplify(
              feature.geometry.coordinates,
              30);
            sketch.dispatch({
                type: 'featureReplace',
                feature: feature
            });
            layer.features(features);
          },

          mousedown: function(e) {
            e = mouseOrTouch(e);
            if (e.which && e.which == 3) return;
            isdrawing = true;
            feature = {
              'geometry': {
                'coordinates': [],
                'type': 'LineString'
              },
              'type': 'Feature',
              'id': uuid(),
              'properties':  currentStyle()
            };
            sketch.dispatch({
              type: 'featureNew',
              feature: feature
            });
            addPosition(e);
            map.pointLocation(map.mouse(e));
          }
        };

        modes.text = {
          add: function() {
            container.addEventListener('mousedown',  modes.text.mousedown, false);
            container.addEventListener('touchstart', modes.text.mousedown, false);
          },

          remove: function() {
            container.removeEventListener('mousedown',  modes.text.mousedown, false);
            container.removeEventListener('touchstart', modes.text.mousedown, false);
          },

          mousedown: function(e) {
            e = mouseOrTouch(e);
            var l = map.pointLocation(map.mouse(e));
            var content = prompt('Label:');
            if (!content) return;
            feature = {
              'geometry': {
                'coordinates': [l.lon, l.lat],
                'type': 'Point'
              },
              'type': 'Feature',
              'id': uuid(),
              'properties':  {
                  'content': content
              }
            };
            sketch.dispatch({
              type: 'featureNew',
              feature: feature
            });
          }
        };


        sketch.dispatch = po.dispatch(sketch);

        sketch.on('featureNew', function(f) {
            features.push(feature = f.feature);
            layer.features(features);
        });

        sketch.on('featurePush', function(f) {
           feature.geometry.coordinates.push([
               f.delta[0], f.delta[1]]);
            layer.features(features);
        });

        sketch.mode = function(x) {
          if (!arguments.length) return mode;
          if (mode) mode.remove();
          mode = null;
          if (x) {
              mode = modes[x];
              mode.add();
          }
        };

        sketch.pen = function(p, x) {
          if (x === undefined) return pen[p];
          pen[p] = x;
          return this;
        };

        sketch.geojson = function(x) {
          if (!arguments.length) {
            return {
              type: "FeatureCollection",
              features: features
            };
          }
          layer.features(features = x.features);
        };


        layer.on('load', function(e) {
          for (var i = 0; i < e.features.length; i++) {

            // Style each feature with the styles it has
            // defined in its properties
            var f = e.features[i];

            if (f.data.geometry.type == 'LineString') {
                for (var j in f.data.properties) {
                  f.element.style[j] = f.data.properties[j];
                }
            } else if (f.data.geometry.type == 'Point') {
                var t = po.svg('text');
                t.setAttribute('transform', f.element.getAttribute('transform'));
                t.setAttribute('dy', 10);
                t.setAttribute('dx', 15);
                t.appendChild(document.createTextNode(f.data.properties.content));

                f.element.parentNode.insertBefore(t, f.element);

                var t2 = po.svg('text');
                t2.setAttribute('transform', f.element.getAttribute('transform'));
                t2.setAttribute('dy', 10);
                t2.setAttribute('dx', 15);
                t2.setAttribute('class', 'shadow-text');
                t2.appendChild(document.createTextNode(f.data.properties.content));

                f.element.parentNode.insertBefore(t2, t);
            }

            // This should be customized when we also have
            // text and other elements - otherwise this line prevents
            // the invisible fill area from triggering hovers and clicks.
            f.element.setAttribute('pointer-events', 'visibleStroke');

            // Polymaps only gives you the elements on `.load()` events,
            // so we bind all interesting events to a dispatch on the layer.
            var events = ['mouseover', 'mouseout', 'click'];
            for (var k = 0; k < events.length; k++) {
              f.element.addEventListener(events[k], (function(f, t) {
                return function(evt) {
                  layer.dispatch({
                    type: 'feature-' + t,
                    feature: f
                  });
                };
              })(f, events[k]), false);
            }
          }
        });

        sketch.map = function(x) {
          if (!arguments.length) return map;
          if (map) {
            mode.remove();
            container = null;
          }
          if (map = x) {
            container = map.container();
            mode = modes.pen;
            mode.add();
            map.add(layer);
          }
          return sketch;
        };

        return sketch;
    };
    context.sketch = sketch;
})(this);
