/*
 * Leaflet.TextPath - Shows text along a polyline
 * Inspired by Tom Mac Wright article :
 * http://mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
 */

(function () {

var __onAdd = L.Polyline.prototype.onAdd,
    __onRemove = L.Polyline.prototype.onRemove,
    __updatePath = L.Polyline.prototype._updatePath,
    __bringToFront = L.Polyline.prototype.bringToFront;


var PolylineTextPath = {

    onAdd: function (map) {
        __onAdd.call(this, map);
        this._textRedraw();
    },

    onRemove: function (map) {
        map = map || this._map;
        if (map && this._textNodes && this._textNodes.length && map._renderer._container)
            for (i = 0; i < this._textNodes.length; i++) {
                map._renderer._container.removeChild(this._textNodes[i]);
            }
        __onRemove.call(this, map);
    },

    bringToFront: function () {
        __bringToFront.call(this);
        this._textRedraw();
    },

    _updatePath: function () {
        __updatePath.call(this);
        this._textRedraw();
    },

    _textRedraw: function () {
        var text = this._text,
            options = this._textOptions;
        if (text && text.length) {
            for (i = 0; i < text.length; i++) {
                this.setText(text[i], options[i]);
            };
        }
    },

    setText: function (text, options) {
        if (!this._text){
            this._text  = [];
            this._textOptions = [];
            this._textNodes = [];
        }
        if (!this._text.includes(text) || !this._textOptions.includes(options)){
            this._text.push(text);
            this._textOptions.push(options);
        }
        /* If not in SVG mode or Polyline not added to map yet return */
        /* setText will be called by onAdd, using value stored in this._text */
        if (!L.Browser.svg || typeof this._map === 'undefined') {
          return this;
        }

        var defaults = {
            repeat: false,
            fillColor: 'black',
            attributes: {},
            below: false,
        };
        options = L.Util.extend(defaults, options);

        /* If empty text, hide */
        if (!text) {
            if (this._textNodes && this._textNodes.length) {
                for (i = 0; i < this._textNodes.length; i++) {
                    if(this._textNodes[i].parentNode) {
                        this._map._renderer._container.removeChild(this._textNodes[i]);
                    }
                }
                /* delete the node, so it will not be removed a 2nd time if the layer is later removed from the map */
                delete this._textNodes;
                delete this._text;
            }
            return this;
        }

        text = text.replace(/ /g, '\u00A0');  // Non breakable spaces
        var id = 'pathdef-' + L.Util.stamp(this);
        var svg = this._map._renderer._container;
        this._path.setAttribute('id', id);

        if (options.repeat) {
            /* Compute single pattern length */
            var pattern = L.SVG.create('text');
            for (var attr in options.attributes)
                pattern.setAttribute(attr, options.attributes[attr]);
            pattern.appendChild(document.createTextNode(text));
            svg.appendChild(pattern);
            var alength = pattern.getComputedTextLength();
            svg.removeChild(pattern);

            /* Create string as long as path */
            text = new Array(Math.ceil(isNaN(this._path.getTotalLength() / alength) ? 0 : this._path.getTotalLength() / alength)).join(text);
        }

        /* Put it along the path using textPath */
        var textNode = L.SVG.create('text'),
            textPath = L.SVG.create('textPath');

        var dy = options.offset || this._path.getAttribute('stroke-width');

        textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", '#'+id);
        textNode.setAttribute('dy', dy);
        for (var attr in options.attributes)
            textNode.setAttribute(attr, options.attributes[attr]);
        textPath.appendChild(document.createTextNode(text));
        textNode.appendChild(textPath);

        if (this._textNodes && !this._textNodes.includes(textNode)) {
            this._textNodes.push(textNode);
        }

        if (options.below) {
            svg.insertBefore(textNode, svg.firstChild);
        }
        else {
            svg.appendChild(textNode);
        }

        /* Center text according to the path's bounding box */
        if (options.center) {
            var textLength = textNode.getComputedTextLength();
            var pathLength = this._path.getTotalLength();
            /* Set the position for the left side of the textNode */
            textNode.setAttribute('dx', ((pathLength / 2) - (textLength / 2)));
        }
        if (options.offsetX){
            textNode.setAttribute('dx', options.offsetX);
        }

        /* Change label rotation (if required) */
        if (options.orientation) {
            var rotateAngle = 0;
            switch (options.orientation) {
                case 'flip':
                    rotateAngle = 180;
                    break;
                case 'perpendicular':
                    rotateAngle = 90;
                    break;
                default:
                    rotateAngle = options.orientation;
            }

            var rotatecenterX = (textNode.getBBox().x + textNode.getBBox().width / 2);
            var rotatecenterY = (textNode.getBBox().y + textNode.getBBox().height / 2);
            textNode.setAttribute('transform','rotate(' + rotateAngle + ' '  + rotatecenterX + ' ' + rotatecenterY + ')');
        }

        /* Initialize mouse events for the additional nodes */
        if (this.options.interactive) {
            if (L.Browser.svg || !L.Browser.vml) {
                textPath.setAttribute('class', 'leaflet-interactive');
            }

            var events = ['click', 'dblclick', 'mousedown', 'mouseover',
                          'mouseout', 'mousemove', 'contextmenu'];
            for (var i = 0; i < events.length; i++) {
                L.DomEvent.on(textNode, events[i], this.fire, this);
            }
        }

        return this;
    }
};

L.Polyline.include(PolylineTextPath);

L.LayerGroup.include({
    setText: function(text, options) {
        for (var layer in this._layers) {
            if (typeof this._layers[layer].setText === 'function') {
                this._layers[layer].setText(text, options);
            }
        }
        return this;
    }
});



})();
