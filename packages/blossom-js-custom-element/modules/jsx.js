import {serialise} from './serialise';

const processProp = function (index, value) {
  let realIndex = index;
  let realValue = value;

  switch (index) {
    case 'className':
      realIndex = 'class';
    break;
    case 'cssFor':
      realIndex = 'for';
    break;
    case 'style': {
      let string = '';

      for (let key in value) { 
        let styleValue = value[key];
   
        key = key.replace(/[A-Z]/g, function(m) {
          return '-' + m.toLowerCase();
        });

        string += (string ? ' ' : '') + key + ': ' + styleValue + ';';
      }

      realValue = string;
    }
    default: realIndex = realIndex.toLowerCase();
  }

  return `${realIndex}="${serialise(realValue)}"`;
}

const createElement = function (tag, props = {}, ...children) {
  let propsString = '';

  for( let index in props) {
    propsString += processProp(index, props[index]) + ' ';
  }

  return `<${tag} ${propsString}>${children.join('')}</${tag}>`;
}


export default createElement;
