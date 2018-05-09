import { BlossomComponent, BlossomRegister } from 'blossom-js-custom-element';

class ElifComponent extends BlossomComponent {
  updateChildren(children) {
    if (children.length) {
      this.props.children = children;
    }
  }
  render() {
    function canDraw(element) {
      if (element.previousElementSibling && element.previousElementSibling.tagName === 'L-IF') {
        if (!element.previousElementSibling.props.cond) {
          return true;
        }
        return false;
      } else if (element.previousElementSibling && element.previousElementSibling.tagName === 'L-ELIF') {
        if (!element.previousElementSibling.props.cond) {
          return canDraw(element.previousElementSibling);
        }
        return false;
      } else if (element.previousElementSibling) {
        throw new Error(`You can only use L-ELSE after L-IF or L-ELIF, and at least one L-IF, ${element.previousElementSibling.tagName} found instead`);
      }
    }

    if (canDraw(this)) {
      return this.props.children;
    }

    return '';
  }
}

BlossomRegister({
  name: 'l-elif',
  element: ElifComponent,
});