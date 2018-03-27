const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><body></body></html>`);
global.window = dom.window;
global.document = window.document;
global.HTMLElement = class {
    attachShadow() {
        return document.createElement('div');
    }

    __servermock() {}
};

document._registerElementCache = {};
global.customElements = {
    define(name, element, setting) {
        document._registerElementCache[name] = element;
    }
};

function manualExtends(obj) {
    var props = {};
    do {
        if(Object.getOwnPropertyNames(obj)[1] === '__servermock') break;
        Object.getOwnPropertyNames(obj).map((name) => {
            props[name] = obj[name];
        })
    } while (obj = Object.getPrototypeOf(obj));
    return props;
}

document._createElement = document.createElement;

document.createElement = (element) => {
    if(document._registerElementCache[element]) {
        const o = document._createElement(element);
        o.tagName = element;
        Object.assign(o, manualExtends(new document._registerElementCache[element]()));
        return o;
    }
    else {
        let domElement = document._createElement(element);
        return domElement;
    }
}


global.BlossomRender = function (template) {
    const domNodes = document.createElement('div');
    domNodes.innerHTML = template;


    function brelement(domNodes) {
        Array.from(domNodes.children).forEach(function(element) {
            if(document._registerElementCache[element.tagName.toLowerCase()]) {
                let newElement = document.createElement(element.tagName.toLowerCase());
                Array.from(element.attributes).map((attr) => {
                    newElement.setAttribute(attr.name, element.getAttribute(attr.name))
                })
                newElement.innerHTML = element.innerHTML;
                domNodes.replaceChild(newElement, element);
                newElement.connectedCallback();

                brelement(newElement);
            }
            else {
                brelement(element);
            }
        });

        return domNodes;
    }

    return brelement(domNodes);
}