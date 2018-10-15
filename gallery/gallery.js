function createElement(type, data, callback) {
    const element = document.createElement(type);

    if ('html' in data) {
        element.innerHTML = data.html;
    }

    if ('text' in data) {
        element.innerHTML = data.text;
    }

    if ('parent' in data) {
        data.parent.appendChild(element);
    }

    if ('children' in data) {
        if (data.children.constructor.name == 'Array') {
            for (const child of data.children) element.appendChild(child)
        } else element.appendChild(data.children);
    }

    if ('class' in data) {
        if (data['class'].constructor.name == 'Array') {
            for (const className of data['class']) element.classList.add(className)
        } else element.className = data['class'];
    }

    if ('attr' in data) {
        for (const key in data.attr) {
            element.setAttribute(key, data.attr[key]);
        }
    }

    if ('listeners' in data) {
        for (const item in data.listeners) {
            element.addEventListener(item, data.listeners[item]);
        }
    }

    if ('css' in data) {
        var string = '';
        for (const item in data.css) {
            string += item + ':' + data.css[item] + ';';
        }
        element.setAttribute('style', (element.hasAttribute('style')? element.getAttribute('style'):'') + string);
    }

    if (callback != null) callback.call(element);

    return element;
}

class GalleryLoader {
    constructor(insertElement, leftElement, rightElement, scale) {
        this.insertElement = insertElement;

        this.leftElement = leftElement;
        this.rightElement = rightElement;

        this.scale = scale;

        this.index = 0;
        this.data = [];

        const items = APP.getExisting();

        if (items.length == 0) {
            // console.log()
            this.insertElement.appendChild(
                createElement('p', {
                    text: 'You don\'t seem to have made anything yet! You can create your first project by clicking \'Create New\' in the top-left corner.',
                    css: {
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'gray',
                        width: '70%'
                    }
                })
            );
        } else {
            for (var i = 0; i < items.length; i++) {
                if (items[i] == null) continue;
                const json = APP.loadJSON(items[i]);

                this.data.push(this.generateItemNode(json, i));
            }
            this.insertElement.appendChild(this.data[0]);

            this.addEventListener('click', function() {
                this.insertElement.removeChild(this.data[this.index]);

                this.index = Math.max(this.index - 1, 0);
                this.insertElement.appendChild(this.data[this.index]);
            }, this.leftElement);

            this.addEventListener('click', function() {
                this.insertElement.removeChild(this.data[this.index]);

                this.index = Math.min(this.index + 1, this.data.length - 1);
                this.insertElement.appendChild(this.data[this.index]);
            }, this.rightElement);
        }
    }

    addEventListener(type, callback, element) {
        const self = this;

        (element == null? document:element).addEventListener(type, function(event) {
            callback.call(self, event);
        })
    }

    generateItemNode(json, id) {
        const self = this;

        const div = createElement('div', {
            class: 'item',
            children: [
                createElement('p', {text: 'Item at load position ' + id}),
                createElement('h1', {
                    html: json.name,
                    attr: {contenteditable: true},
                    listeners: {
                        keyup: function() {
                            APP.save({
                                width: json.width,
                                height: json.height,
                                polygons: json.polygons,
                                name: this.innerText
                            }, id);
                        }
                    }
                }),
                createElement('canvas', {
                    attr: {
                        width: json.width * this.scale,
                        height: json.height * this.scale
                    },
                    listeners: { click: function() { this.parentElement.open() } }
                }, function() {
                    const ctx = this.getContext('2d');

                    for (const polygon of json.polygons) polygon.render(ctx);
                }),
                createElement('div', {
                    class: 'edit-buttons',
                    children: [
                        createElement('div', {
                            class: 'button', text: 'Delete',
                            listeners: { click: function() { this.parentElement.parentElement.delete() } }
                        }),
                        createElement('div', {
                            class: 'button', text: 'Edit',
                            listeners: { click: function() { this.parentElement.parentElement.open() } }
                        })
                    ]
                })
            ]
        }, function() {
            this.open = function() {
                window.open('../app/app.html?load=' + id);
            }

            this.delete = function() {
                APP.delete(id);
                
                self.insertElement.removeChild(self.data[self.index]);

                self.data.splice(self.index, 1);

                self.index = Math.max(self.index - 1, 0);
                self.insertElement.appendChild(self.data[self.index]);
            }
        });

        return div;
    }
}