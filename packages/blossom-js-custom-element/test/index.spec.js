/**
 * @jest-environment node
 */

require('../../blossom-js-server-side/src/index');
const {BlossomComponent, BlossomRegister} = require('../src/index');

class IfComponent extends BlossomComponent {
    render() {
        if(this.state['l-cond']) {
            return this.state.children;
        }
        else return '';
    }
};

BlossomRegister({
    name : "l-if",
    element: IfComponent,
    attributes : [
        "l-cond"
    ]
});

describe('Create component', () => {
    test('Component should exist', () => {
        const ifComponent = document.createElement('l-if');

        expect(ifComponent.innerHTML).not.toBeUndefined();
        expect(ifComponent.refresh).not.toBeUndefined();
        expect(ifComponent.connectedCallback).not.toBeUndefined();
    });

    test('Component should register', () => {
        const element = document.createElement('l-if');
        element.setAttribute('l-cond', 'true');
        element.innerHTML = 'I am displayed';

        element.connectedCallback();

        expect(element.innerHTML).toBe('I am displayed');
    });

    test('Component should render recursively', () => {
        template = `
            <l-if l-cond="true">
                I am displayed
                <l-if l-cond="false">
                    not me
                </l-if>
            </l-if>
        `;

        const rendered = BlossomRender(template);

        expect(rendered.children[0].textContent).toMatch(/I am displayed/);
        expect(rendered.children[0].textContent).not.toMatch(/not me/);
    });


    test('Component should read upper scope', () => {
        template = `
            <div l-scope='{"someBool": false, "someBool2": true}'>
                <l-if l-cond="someBool">
                    I am not displayed
                </l-if>
                <l-if l-cond="someBool2">
                    I am displayed
                </l-if>
            </l-if>
        `;

        const rendered = BlossomRender(template);

        expect(rendered.children[0].textContent).toMatch(/I am displayed/);
        expect(rendered.children[0].textContent).not.toMatch(/I am not displayed/);
    });

    test('Component should update class names', () => {
        template = `
            <l-if l-class='"blue"' l-cond="true">
                <div l-class='"red"'>I am displayed</div>
            </l-if>
        `;

        const rendered = BlossomRender(template);

        expect(rendered.children[0].className).toMatch(/^blue$/);
        expect(rendered.querySelector('div').className).toMatch(/^red$/);
    });

    test('Allow scoped scope names', () => {
        const element = document.createElement('l-if');
        expect(element.scopeString('bar', 'foo')).toContain('foo');
        expect(element.scopeString('bar')).toContain('value');
        element.setAttribute('l-alias', 'testing')
        expect(element.scopeString('bar', 'foo')).toContain('testing');
    });
})


