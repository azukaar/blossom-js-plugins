import {BlossomConvertElement} from './index';
import HTMLEvents from './htmlevents.json';
let BlossomDocumentReady;

let _BlossomReady;
let BlossomReady = new Promise((resolve) => {
  _BlossomReady = resolve;
});

const unloaded = {};

if (typeof window !== 'undefined') {
  BlossomDocumentReady = window.__SERVERSIDE ? Promise.resolve() : new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => {
      resolve();
      setClassNames(document.body);
      setEventListener(document.body);
      BlossomConvertElement(document.body);
    });
  });
}

function getStackTrace(element, notFirst = false) {
  let stack = '';
  let Firststack = '';
  if (!notFirst) {
    Firststack = element.outerHTML;
  }

  if (element.parentElement) { stack = getStackTrace(element.parentElement, true); }

  return stack + (Firststack ? `\n   > ${Firststack}` : `\n   > ${element.tagName}`);
}

const hashCode = function hashCode() {
  let hash = 0;
  if (this.length === 0) {
    return hash;
  }
  for (let i = 0; i < this.length; i += 1) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash; // Convert to 32bit integer
  }
  return hash;
};

const BlossomCheckParentsAreLoaded = function BlossomCheckParentsAreLoaded(element) {
  if (unloaded[element.tagName.toLowerCase()]) return false;

  if (element.parentElement) return BlossomCheckParentsAreLoaded(element.parentElement);

  return true;
};

const BlossomRegister = function BlossomRegister(settings) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && (!settings || !settings.name)) {
    throw new Error('Error: please set setting.name.');
  }

  unloaded[settings.name] = true;

  BlossomDocumentReady.then(() => {
    const { element } = settings;
    // eslint-disable-next-line no-param-reassign
    delete settings.element;

    element.prototype.settings = settings;

    unloaded[settings.name] = false;

    customElements.define(settings.name, element, {});

    if (Object.values(unloaded).filter(e => e).length === 0) _BlossomReady();

    return element;
  });
};

const BlossomResolveCtx = function BlossomResolveCtx(element, preventRecursion) {
  let ctx = new Proxy({
    realCtx: {},
    setFunctions: {}
  }, {
    ownKeys: (target) => Reflect.ownKeys(target.realCtx),
    deleteProperty(target, attr) {
      // TODO
      return true;
    },
    getOwnPropertyDescriptor: (target, attr) => {
      if (attr === 'setFunctions' || attr === 'realCtx' || attr === 'originalElement') {
        return {
          value: target[attr],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      } else if (typeof attr === 'string' && attr.length > 0) {
        return {
          value: target.realCtx[attr],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
    },
    get: (target, attr) => {
      if (attr === 'setFunctions' || attr === 'realCtx' || attr === 'originalElement') {
        return target[attr];
      }
      return target.realCtx[attr];
    },
    /* eslint-disable no-param-reassign */
    set: (target, attr, value) => {
      if (attr === 'setFunctions' || attr === 'realCtx' || attr === 'originalElement') {
        target[attr] = value;
        return true;
      }
      target.realCtx[attr] = value;
      if (!target.setFunctions[attr]) {
        target.setFunctions[attr] = () => BlossomConvertElement(target.originalElement).setCtx(attr, value);
      }
      target.setFunctions[attr](value);
      return true;
    },
  });

  if (element.parentElement && !preventRecursion) {
    ctx = BlossomResolveCtx(element.parentElement);
  }

  ctx.originalElement = element;

  if (element.getAttribute('l-ctx')) {
    const elementCtx = JSON.parse(element.getAttribute('l-ctx'));

    /* eslint-disable no-inner-declarations, guard-for-in, no-restricted-syntax, no-eval */
    function searchFunctions(current) {
      for (const index in current) {
        if (current[index] && current[index].match && current[index].match(/^__FUNCTION__/)) {
          let tostring = current[index].slice(12);

          if (!tostring.match(/^\s*function/)) {
            tostring = `(function${tostring}})`;
            tostring = tostring.replace('=>', '{return ');
          }
          // NEED DELETE ? 
          BlossomConvertElement(element);
          current[index] = eval(tostring).bind(element);
        }

        if (current[index] !== null && typeof (current[index]) === 'object') {
          searchFunctions(current[index]);
        }
      }
    }
    /* eslint-enable no-inner-declarations, guard-for-in, no-restricted-syntax, no-eval */

    searchFunctions(elementCtx);

    Object.keys(elementCtx).forEach(va => {
      ctx.realCtx[va] = elementCtx[va];
      ctx.setFunctions[va] = (value) => {
        BlossomConvertElement(element).setCtx(va, value);
      };
    });
  }

  return ctx;
};
/* eslint-enable no-param-reassign */

const BlossomInterpolate = function BlossomInterpolate(str, from) {
  /* eslint-disable no-console, no-eval,  no-new-func */
  try {
    if (from && typeof from.nodeName !== 'undefined' && typeof from.nodeType !== 'undefined' && from.nodeType === 1) {
      BlossomConvertElement(from);
      from.resolveCtx();
    }

    const func = new Function(`return ${str}`).bind(from);
    return func();
  } catch (e) {
    if (from) {
      console.error('Tried to evaluate : ', str);
      console.error(e.message, '\n', 'STACKTRACE', from.parentElement ? getStackTrace(from) : from);
    } else {
      console.error('Tried to evaluate : ', str);
      console.error(e.message, 'but no stacktrace available, provide target element to BlossomInterpolate as a third argument to display DOM position');
    }
    return undefined;
  }
  /* eslint-enable no-console, no-eval,  no-new-func */
};

function getPropProxy(mainElement) {
  return new Proxy({}, {
    ownKeys: () => {
      const attrs = [];

      Array.from(mainElement.attributes)
        .filter(e => e.name !== 'children' && e.name !== 'ctx' && e.name !== 'l-ctx' &&
                e.name !== 'l-class' && e.name !== 'class' &&
                e.name !== 'l-style' && e.name !== 'style')
        .forEach(e => {
          if (e.name.match(/^l-/)) {
            const realName = e.name.slice(2);
            if (attrs.indexOf(realName === -1)) attrs.push(realName);
          } else if (attrs.indexOf(e.name) === -1) {
            attrs.push(e.name);
          }
        });

      return attrs;
    },
    deleteProperty(target, attr) {
      if (attr !== 'ctx' && typeof attr === 'string') {
        if (mainElement.hasAttribute(attr)) {
          mainElement.removeAttribute(attr);
        }
        if (mainElement.hasAttribute(`l-${attr}`)) {
          mainElement.removeAttribute(`l-${attr}`);
        }
      }
      mainElement.refresh();
      return true;
    },

    getOwnPropertyDescriptor: (oTarget, sKey) => ({
      value: mainElement.props[sKey],
      writable: true,
      enumerable: true,
      configurable: true,
    }),

    get: (obj, attr) => {
      if (attr === 'spread') {
        return (filterin) => {
          const attrs = [];

          Array.from(mainElement.attributes)
            .filter(e => e.name !== 'children' && e.name !== 'ctx' && e.name !== 'l-ctx' &&
                    e.name !== 'l-class' && e.name !== 'class' &&
                    e.name !== 'l-style' && e.name !== 'style')
            .forEach(e => {
              if (e.name.match(/^l-/)) {
                const realName = e.name.slice(2);
                if (attrs.indexOf(realName === -1)) attrs[realName] = mainElement.props[realName];
              } else if (attrs.indexOf(e.name) === -1) {
                attrs[e.name] = mainElement.props[e.name];
              }
            });

          if (filterin) {
            Object.keys(attrs).forEach(att => {
              if (filterin.indexOf(att) === -1) {
                delete attrs[att];
              }
            });
          }

          return Object.keys(attrs).map((key) => `${key}="${attrs[key]}"`).join(' ');
        };
      } else if (attr === 'ctx') {
        return mainElement.ctx;
      } else if (attr === 'children') return mainElement.getAttribute('children');
      else if (typeof attr === 'string' && attr.length > 0) {
        if (mainElement.getAttribute(`l-${attr}`)) {
          const result = BlossomInterpolate(mainElement.getAttribute(`l-${attr}`), mainElement);
          mainElement.setAttribute(attr, typeof result !== 'string' ? JSON.stringify(result) : result);
          return result;
        }

        if (mainElement.getAttribute(attr)) {
          const result = mainElement.getAttribute(attr);
          if (result === 'true') return true;
          else if (result === 'false') return false;
          else if (result.match(/^[\{\[]/) && result.match(/[\}\]]$/)) {
            try {
              return JSON.stringify(result);
            } catch (e) {
              return result;
            }
          } else if (typeof result === 'number') return Number(result);
          return result;
        }

        return '';
      }
    },
    /* eslint-disable no-param-reassign */
    set: (obj, attr, value) => {
      if (attr === 'ctx') {
        const needRefresh = JSON.stringify(mainElement.ctx) !== JSON.stringify(value);

        mainElement.ctx = value;
        if (needRefresh) mainElement.refresh();
      } else if (attr === 'children') {
        mainElement.setAttribute(attr, typeof value !== 'string' ? JSON.stringify(value) : value);
      } else if (typeof attr === 'string') {
        const needRefresh = mainElement.getAttribute(attr) !== value.toString ? value.toString :
          JSON.stringify(value);

        mainElement.setAttribute(attr, typeof value !== 'string' ? JSON.stringify(value) : value);
        if (needRefresh) mainElement.refresh();
      }
      return true;
    },
    /* eslint-enable no-param-reassign */
  });
}

const setClassNamesParents = function setClassNamesParents(element) {
  if (element.getAttribute && element.getAttribute('l-class')) {
    element.setAttribute('class', BlossomInterpolate(element.getAttribute('l-class'), element));
  }

  if (element.parentElement) setClassNamesParents(element.parentElement);
};

const setClassNames = function setClassNames(element) {
  if (element.getAttribute('l-class')) {
    element.setAttribute('class', BlossomInterpolate(element.getAttribute('l-class'), element));
  }

  Array.from(element.querySelectorAll('*[l-class]')).forEach((subElement) => {
    if (subElement.parentElement && !BlossomCheckParentsAreLoaded(subElement.parentElement)) {
      return false;
    }
    if (subElement.getAttribute('l-class')) {
      subElement.setAttribute('class', BlossomInterpolate(subElement.getAttribute('l-class'), subElement));
    }
  });
};

const setEventListener = function setEventListener(element) {
  HTMLEvents.forEach(event => {
    if (element.getAttribute('l-on'+event)) {
      element.addEventListener(event, () => {
        BlossomInterpolate(element.getAttribute('l-on'+event), element);
      }, false);
    }

    Array.from(element.querySelectorAll('*[l-on'+event+']')).forEach((subElement) => {
      if (subElement.parentElement && !BlossomCheckParentsAreLoaded(subElement.parentElement)) {
        return false;
      }
      if (subElement.getAttribute('l-on'+event)) {
        subElement.addEventListener(event, () => {
          BlossomInterpolate(subElement.getAttribute('l-on'+event), subElement);
        }, false);
      }
    });
  });
};

function refreshParentChildren(element) {
  if (element.parentElement) {
    if (element.parentElement._updateChildren) {
      element.parentElement._updateChildren(element.parentElement.innerHTML);
    }

    refreshParentChildren(element.parentElement);
  }
}


export {
  getStackTrace,
  hashCode,
  setClassNamesParents,
  setClassNames,
  setEventListener,
  refreshParentChildren,
  getPropProxy,
  BlossomRegister,
  BlossomResolveCtx,
  BlossomInterpolate,
  BlossomCheckParentsAreLoaded,
  BlossomReady,
};
