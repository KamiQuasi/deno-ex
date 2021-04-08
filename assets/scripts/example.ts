class SampleWC extends HTMLElement {
    static tag = 'sample-wc';
    get html() {
        return `
        <style>
        :host { display: block; background-color: #e00; }
        h4 { color: white; }
        </style>
        <slot></slot>
        <h4>Sample Web Component w/ Shadow DOM</h4>
        `
    }
    tmpl = document.createElement('template');

    constructor() {
        super();
        let shadowRoot = this.attachShadow({mode: 'open'});
        this.tmpl.innerHTML = this.html;
        shadowRoot.appendChild(this.tmpl.content.cloneNode(true));
    }

    connectedCallback() {

    }

    
}

window.customElements.define(SampleWC.tag, SampleWC);