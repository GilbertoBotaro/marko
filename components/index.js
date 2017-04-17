'use strict';

var warp10 = require('warp10');
var escapeEndingScriptTagRegExp = /<\//g;

function flattenHelper(components, flattened, typesArray, typesLookup) {
    for (var i = 0, len = components.length; i < len; i++) {
        var componentDef = components[i];
        var id = componentDef.id;
        var component = componentDef.$__component;
        var rerenderInBrowser = componentDef.$__willRerenderInBrowser;
        var state = component.state;
        var input = component.input;
        var typeName = component.typeName;
        var customEvents = component.$__customEvents;
        var scope = component.$__scope;
        var bubblingDomEvents = component.$__bubblingDomEvents;

        component.$__state = undefined; // We don't use `delete` to avoid V8 deoptimization
        component.$__input = undefined; // We don't use `delete` to avoid V8 deoptimization
        component.typeName = undefined;
        component.id = undefined;
        component.$__customEvents = undefined;
        component.$__scope = undefined;
        component.$__bubblingDomEvents = undefined;
        component.$__bubblingDomEventsExtraArgsCount = undefined;

        if (!typeName) {
            continue;
        }

        var typeIndex = typesLookup[typeName];
        if (typeIndex === undefined) {
            typeIndex = typesArray.length;
            typesArray.push(typeName);
            typesLookup[typeName] = typeIndex;
        }

        var children = componentDef.$__children;

        if (children !== null) {
            // Depth-first search (children should be initialized before parent)
            flattenHelper(children, flattened, typesArray, typesLookup);
            componentDef.$__children = null;
        }

        var hasProps = false;

        let componentKeys = Object.keys(component);
        for (let i=0, len=componentKeys.length; i<len; i++) {
            let key = componentKeys[i];

            if (component[key] !== undefined) {
                hasProps = true;
                break;
            }
        }

        var undefinedPropNames;

        if (state) {
            // Update state properties with an `undefined` value to have a `null`
            // value so that the property name will be serialized down to the browser.
            // This ensures that we add the proper getter/setter for the state property.

            let stateKeys = Object.keys(state);
            for (let i=0, len=stateKeys.length; i<len; i++) {
                let key = stateKeys[i];

                if (state[key] === undefined) {
                    if (undefinedPropNames) {
                        undefinedPropNames.push(key);
                    } else {
                        undefinedPropNames = [key];
                    }
                }
            }
        }

        var extra = {
            b: bubblingDomEvents,
            d: componentDef.$__domEvents,
            e: customEvents,
            p: customEvents && scope, // Only serialize scope if we need to attach custom events
            r: componentDef.$__roots,
            s: state,
            u: undefinedPropNames,
            w: hasProps ? component : undefined,
            _: rerenderInBrowser ? 1 : undefined
        };

        flattened.push([
            id,                  // 0 = id
            typeIndex,           // 1 = type
            input,               // 2 = input
            extra                // 3
        ]);
    }
}

function getRenderedComponents(out, shouldIncludeAll) {
    var componentDefs;
    var globalComponentsContext;
    var outGlobal = out.global;

    if (shouldIncludeAll === true) {
        globalComponentsContext = outGlobal.components;

        if (globalComponentsContext === undefined) {
            return undefined;
        }
    } else {
        let componentsContext = out.data.components;
        if (componentsContext === undefined) {
            return undefined;
        }
        let rootComponentDef = componentsContext.$__componentStack[0];
        componentDefs = rootComponentDef.$__children;

        if (componentDefs === null) {
            return undefined;
        }

        rootComponentDef.$__children = null;
    }

    var flattened = [];
    var typesLookup = {};
    var typesArray = [];
    var serializedGlobals;

    if (shouldIncludeAll === true) {
        let roots = globalComponentsContext.$__roots;
        for (let i=0, len=roots.length; i<len; i++) {
            let root = roots[i];
            let children = root.$__children;
            if (children !== null) {
                flattenHelper(children, flattened, typesArray, typesLookup);
            }
        }

        var serializedGlobalsLookup = outGlobal.serializedGlobals;
        if (serializedGlobalsLookup) {
            serializedGlobals = {};
            var keys = Object.keys(serializedGlobalsLookup);
            for (let i=0, len=keys.length; i<len; i++) {
                let key = keys[i];
                if (serializedGlobalsLookup[key] === true) {
                    serializedGlobals[key] = outGlobal[key];
                }
            }
        }
    } else {
        flattenHelper(componentDefs, flattened, typesArray, typesLookup);
    }

    if (flattened.length === 0) {
        return undefined;
    }

    return {w: flattened, t: typesArray, g: serializedGlobals};
}

function writeInitComponentsCode(out, shouldIncludeAll) {
    var renderedComponents = getRenderedComponents(out, shouldIncludeAll);
    if (renderedComponents === undefined) {
        return;
    }

    var cspNonce = out.global.cspNonce;
    var nonceAttr = cspNonce ? ' nonce='+JSON.stringify(cspNonce) : '';

    out.write('<script' + nonceAttr + '>' +
        '(function(){var w=window;w.$components=(w.$components||[]).concat(' +
        warp10.stringify(renderedComponents).replace(escapeEndingScriptTagRegExp, '\\u003C/') +
         ')||w.$components})()</script>');
}

exports.writeInitComponentsCode = writeInitComponentsCode;

/**
 * Returns an object that can be sent to the browser using JSON.stringify. The parsed object should be
 * passed to require('marko-components').initComponents(...);
 *
 * @param  {ComponentsContext|AsyncWriter} componentsContext A ComponentsContext or an AsyncWriter
 * @return {Object} An object with information about the rendered components that can be serialized to JSON. The object should be treated as opaque
 */
exports.getRenderedComponents = function(out) {
    var renderedComponents = getRenderedComponents(out, true);
    return warp10.stringifyPrepare(renderedComponents);
};

exports.r = require('./renderer');

exports.c = function() { /* no op for defining a component on teh server */ };

// registerComponent is a no-op on the server.
// Fixes https://github.com/marko-js/marko-components/issues/111
exports.rc = function(typeName) { return typeName; };