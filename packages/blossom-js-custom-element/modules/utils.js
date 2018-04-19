import {BlossomConvertElement} from './index';
let documentReady;
const unloaded = {};

if (typeof window !== 'undefined') {
  documentReady = window.__SERVERSIDE ? Promise.resolve() : new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => {
      resolve();
      setClassNames(document.body);
      setEventListener(document.body);
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

  documentReady.then(() => {
    const { element } = settings;
    // eslint-disable-next-line no-param-reassign
    delete settings.element;

    element.prototype.settings = settings;

    customElements.define(settings.name, element, {});

    unloaded[settings.name] = false;

    return element;
  });
};

const BlossomResolveScope = function BlossomResolveScope(element, preventRecursion) {
  let scope = new Proxy({
    realScope: {},
    setFunctions: {},
  }, {
    ownKeys: (target) => Reflect.ownKeys(target.realScope),
    deleteProperty(target, attr) {
      // TODO
      return true;
    },
    getOwnPropertyDescriptor: (target, attr) => {
      if (attr === 'setFunctions' || attr === 'realScope') {
        return {
          value: target[attr],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      } else if (typeof attr === 'string' && attr.length > 0) {
        return {
          value: target.realScope[attr],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
    },
    get: (target, attr) => {
      if (attr === 'setFunctions' || attr === 'realScope') {
        return target[attr];
      }
      return target.realScope[attr];
    },
    /* eslint-disable no-param-reassign */
    set: (target, attr, value) => {
      target.realScope[attr] = value;
      if (!target.setFunctions[attr]) {
        target.setFunctions[attr] = () => BlossomConvertElement(element).setScope(attr, value);
      }
      target.setFunctions[attr](value);
      return true;
    },
  });

  if (element.parentElement && !preventRecursion) {
    scope = BlossomResolveScope(element.parentElement);
  }
  if (element.getAttribute('l-scope')) {
    const elementScope = JSON.parse(element.getAttribute('l-scope'));

    // getScopeProxySetFunction(element)

    /* eslint-disable no-inner-declarations, guard-for-in, no-restricted-syntax, no-eval */
    function searchFunctions(current) {
      for (const index in current) {
        if (current[index] && current[index].match && current[index].match(/^__FUNCTION__/)) {
          let tostring = current[index].slice(12);

          if (!tostring.match(/^\s*function/)) {
            tostring = `(function${tostring}})`;
            tostring = tostring.replace('=>', '{return ');
          }

          current[index] = eval(tostring);
          current[index].bind(element.__scope);
        }

        if (current[index] !== null && typeof (current[index]) === 'object') {
          searchFunctions(current[index]);
        }
      }
    }
    /* eslint-enable no-inner-declarations, guard-for-in, no-restricted-syntax, no-eval */

    searchFunctions(elementScope);

    Object.keys(elementScope).forEach(va => {
      scope.realScope[va] = elementScope[va];
      scope.setFunctions[va] = (value) => {
        BlossomConvertElement(element).setScope(va, value);
      };
    });
  }

  return scope;
};
/* eslint-enable no-param-reassign */

const BlossomInterpolate = function BlossomInterpolate(str, scope = {}, from) {
  /* eslint-disable no-console, no-eval,  no-new-func */
  try {
    const func = new Function(`return ${str}`).bind(scope);
    return func();
  } catch (e) {
    if (from) {
      console.error('Tried to evaluate : ', str);
      console.error(e.message, '\n', 'STACKTRACE', getStackTrace(from));
    } else {
      console.error('Tried to evaluate : ', str);
      console.error(e.message, 'but no stacktrace available, provide target element to BlossomInterpolate as a third argument to display DOM position');
    }
    return undefined;
  }
  /* eslint-enable no-console, no-eval,  no-new-func */
};


const setClassNamesParents = function setClassNamesParents(element) {
  if (element.getAttribute && element.getAttribute('l-class')) {
    const scope = BlossomResolveScope(element);
    element.setAttribute('class', BlossomInterpolate(element.getAttribute('l-class'), scope, element));
  }

  if (element.parentElement) setClassNamesParents(element.parentElement);
};

const setClassNames = function setClassNames(element) {
  if (element.getAttribute('l-class')) {
    const scope = BlossomResolveScope(element);
    element.setAttribute('class', BlossomInterpolate(element.getAttribute('l-class'), scope, element));
  }

  Array.from(element.querySelectorAll('*[l-class]')).forEach((subElement) => {
    if (subElement.parentElement && !BlossomCheckParentsAreLoaded(subElement.parentElement)) {
      return false;
    }
    if (subElement.getAttribute('l-class')) {
      const scope = BlossomResolveScope(subElement);
      subElement.setAttribute('class', BlossomInterpolate(subElement.getAttribute('l-class'), scope, subElement));
    }
  });
};

const setEventListener = function setEventListener(element) {
  if (element.getAttribute('l-onclick')) {
    element.addEventListener('click', () => {
      const scope = BlossomResolveScope(element);
      BlossomInterpolate(element.getAttribute('l-onclick'), scope, element);
    }, false);
  }

  Array.from(element.querySelectorAll('*[l-onclick]')).forEach((subElement) => {
    if (subElement.parentElement && !BlossomCheckParentsAreLoaded(subElement.parentElement)) {
      return false;
    }
    if (subElement.getAttribute('l-onclick')) {
      subElement.addEventListener('click', () => {
        const scope = BlossomResolveScope(subElement);
        BlossomInterpolate(subElement.getAttribute('l-onclick'), scope, subElement);
      }, false);
    }
  });
};

function getPropProxy(mainElement) {
  return new Proxy({}, {
    ownKeys: () => {
      const attrs = [];

      Array.from(mainElement.attributes)
        .filter(e => e.name !== 'children' && e.name !== 'scope' && e.name !== 'l-scope' &&
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
      if (attr !== 'scope' && typeof attr === 'string') {
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
      if (attr === 'scope') {
        return mainElement.__scope;
      } else if (attr === 'children') return mainElement.getAttribute('children');
      else if (typeof attr === 'string' && attr.length > 0) {
        if (mainElement.getAttribute(`l-${attr}`)) {
          const result = BlossomInterpolate(mainElement.getAttribute(`l-${attr}`), mainElement.__scope, mainElement);
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
      if (attr === 'scope') {
        const needRefresh = JSON.stringify(mainElement.__scope) !== JSON.stringify(value);

        mainElement.__scope = value;
        if (needRefresh) mainElement.refresh();
      } else if (typeof attr === 'string') {
        mainElement.setAttribute(attr, typeof value !== 'string' ? JSON.stringify(value) : value);
      }
      return true;
    },
    /* eslint-enable no-param-reassign */
  });
}

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
  BlossomResolveScope,
  BlossomInterpolate,
  BlossomCheckParentsAreLoaded,
};
