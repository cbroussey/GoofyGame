class GoofyGame {
    #originUrl = "";
    #htmlContent = null;
    #jsContent = [];
    #headContent = [];
    #refs = [];
    #oldRefs = [];
    #modules = [];
    #eventListeners = [];
    #timeouts = [];
    #intervals = [];

    constructor(accessor = "gg") {
        if (accessor != '') {
            if (typeof window[accessor] !== 'undefined') throw new Error("Accessor variable already taken");
            window[accessor] = this;
        }
        if (typeof window._ === 'undefined') window._ = {};
    }

    async #importScript(str) {
        if (globalThis.URL.createObjectURL) {
            const blob = new Blob([str], { type: 'text/javascript' })
            const url = URL.createObjectURL(blob)
            const module = await import(url)
            URL.revokeObjectURL(url) // GC objectURLs
            return module
        }
        
        const url = "data:text/javascript;base64," + window.btoa(moduleData)
        return await import(url)
    }

    async #fetchHtml(url, type) {
        return fetch(url).then(function(response) {
            return response.text();
        }).then(async (text) => {
            return new DOMParser().parseFromString(text, type);
        });
    }

    async load(url, type = "text/html") {
        this.#oldRefs = this.#refs;
        this.#refs = [];
        this.#jsContent = [];
        this.#headContent = [];
        this.#originUrl = url;
        if (type === "text/javascript") {
            let j = document.createElement('script');
            j.src = url;
            this.#jsContent.push(j);
        } else if (type === "text/css") {
            let l = document.createElement('link');
            l.rel = "stylesheet";
            l.href = url;
            this.#headContent.push(l);
        } else {
            this.#htmlContent = await this.#fetchHtml(url, type);   
        }
    }

    #reference(element) {
        if (element.nodeName === "SCRIPT") {
            if (!element.src || !this.#jsContent.map(s => s.src).includes(element.src)) {
                this.#jsContent.push(document.importNode(element, true));
            }
        } else if (["LINK", "STYLE", "META", "TITLE", "BASE"].includes(element.nodeName)) {
            if (!element.href || !this.#headContent.map(l => l.href).includes(element.href)) {
                this.#headContent.push(document.importNode(element, true));
            }
        } else {
            //if (!element.id || !document.getElementById(element.id)) {
                this.#refs.push(document.importNode(element, true));
            //} else if (element.id) {
            //    this.#reference(element);
            //}
        }
    }

    async apply(waitForLoad = false) {
        if (!this.#htmlContent && !this.#jsContent.length) {
            throw new Error("No HTML content loaded");
        }
        if (this.#refs.length || this.#modules.length) {
            throw new Error("Unload content first");
        }

        if (this.#htmlContent) {
            this.#htmlContent.head.childNodes.forEach(e => {
                this.#reference(e);
            })
            this.#htmlContent.body.childNodes.forEach(e => {
                this.#reference(e);
            })
        }

        this.#refs.forEach(r => {
            if (!["#text", "#comment"].includes(r.nodeName)) {
                Object.values(r.getElementsByTagName('SCRIPT')).forEach(s => {
                    this.#reference(s);
                    s.remove();
                });
            }
        });

        let g = document.createElement('goofy');
        g.style.display = "none";
        this.#refs.forEach(e => {
            g.appendChild(e);
        });
        document.body.appendChild(g);

        this.#headContent.forEach(e => {
            e.style.display = "none";
            if (e.nodeName === "TITLE" || e.nodeName === "BASE") {
                Object.values(document.getElementsByTagName(e.nodeName.toLowerCase())).forEach(t => { t.remove(); });
            }
            this.#refs.push(document.head.appendChild(e));
        });

        if (this.#oldRefs.length) {
            this.#oldRefs.forEach(e => {
                e.remove();
            });
        }

        this.#headContent.forEach(e => {
            e.style.display = "";
        });

        while(g.childNodes.length){
            g.before(g.childNodes[0]);
        }
        g.remove();

        let jsCopy = this.#jsContent.map(e => e);
        for (const script of jsCopy) {
            if (script.src) {
                let m = await import(script.src)
                this.#modules.push(m);
            } else {
                await this.#importScript(script.innerText).then((m) => {
                    this.#modules.push(m);
                });
            }
        };

        this.#modules.forEach(m => {
            if (typeof m.default !== 'undefined') {
                m.default(this);
            }
        });
    
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    registerEventListener(target, event, callback, options = {}) {
        target.addEventListener(event, callback, options);
        this.#eventListeners.push([target, event, callback]);
    }

    unregisterEventListener(target, event, callback) {
        this.#eventListeners = this.#eventListeners.filter(([t, e, c]) => t !== target || e !== event || c !== callback);
        target.removeEventListener(event, callback);
    }

    registerTimeout(ID) {
        this.#timeouts.push(ID);
    }

    unregisterTimeout(ID) {
        this.#timeouts = this.#timeouts.filter(e => e !== ID);
        clearTimeout(ID);
    }

    registerInterval(ID) {
        this.#intervals.push(ID);
    }

    unregisterInterval(ID) {
        this.#intervals = this.#intervals.filter(e => e !== ID);
        clearInterval(ID);
    }

    remove() {
        if (!this.#refs && !this.#oldRefs && !this.#modules) {
            throw new Error("Nothing was applied");
        }

        this.#modules = [];
        this.#jsContent = [];
        
        this.#timeouts.forEach(ID => {
            clearTimeout(ID);
        });
        this.#timeouts = [];
        
        this.#intervals.forEach(ID => {
            clearInterval(ID);
        });
        this.#intervals = [];
        
        document.dispatchEvent(new Event('GoofyUnload'));

        this.#eventListeners.forEach(([target, event, callback]) => {
            target.removeEventListener(event, callback);
        });
        this.#eventListeners = [];

        this.#oldRefs.forEach(e => {
            e.remove();
        });
        this.#oldRefs = [];

        this.#refs.forEach(e => {
            e.remove();
        });
        this.#refs = [];

        this.#headContent = [];

        Object.keys(window._).forEach(k => {
            delete window._[k];
        });
    }

    getOriginUrl() {
        return this.#originUrl;
    }

    html() {
        return this.#htmlContent;
    }

    toString() {
        return this.#htmlContent ? this.#htmlContent.documentElement.outerHTML : "";
    }
}