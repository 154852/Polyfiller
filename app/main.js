function genAlertNode() {
    const element = document.createElement('p');
    element.classList.add('alert-node');
    element.innerHTML = '';

    element.style.opacity = '0';

    document.body.appendChild(element);
    return element;
}

function genLargeAlertNode() {
    const element = document.createElement('h1');
    element.classList.add('large-alert-node');
    element.innerHTML = '';

    element.style.opacity = '0';

    document.body.appendChild(element);
    return element;
}

function genColorPicker() {
    const node = document.createElement('input');
    node.setAttribute('type', 'color');

    node.style.display = 'none';

    node.show = function() {
        node.click();
    }

    return node;
}

function toHex(number) {
    var string = number.toString(16);
    if (string.length < 2) {
        string = '0' + string;
    }
    return string;
}

class Animation {
    constructor(polygons, speed, endCallback) {
        this.polygons = polygons;
        this.speed = speed;
        this.endCallback = endCallback;
    }

    async show(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);

        for (var i = 0; i < this.polygons.length; i++) {
            for (var j = 0; j < i + 1; j++) {
                this.polygons[j].render(ctx);
            }

            await sleep(this.speed);
        }

        if (this.endCallback != null) this.endCallback.call();
    }
}

class LowPolyGenerator {
    constructor(canvas, scale) {
        this.canvas = canvas;
        this.canvas.parentNode.style.backgroundColor = 'black';
        this.scale = scale;

        this.polygons = [];

        this.alertNode = genAlertNode();
        this.alertTransition = null;

        this.largeAlertNode = genLargeAlertNode();
        this.largeAlertTransition = null;

        this.load = getParameterByName('load');
        if (this.load != null) {
            this.load = parseInt(this.load);

            this.loadFromLocalstorage();
        } else {
            this.load = APP.getExisting().length;

            var size = getParameterByName('size');
            size = size == null? null:size.split(',');

            this.width = size == null? window.innerWidth:parseInt(size[0]),
            this.height = size == null? window.innerHeight:parseInt(size[1]);
        }

        this.displayScale = Math.min(window.innerHeight / this.height, window.innerWidth / this.width);

        this.canvas.style.width = (this.width * this.displayScale) + 'px';
        this.canvas.style.height = (this.height * this.displayScale) + 'px';

        this.canvas.width = this.width * this.scale;
        this.canvas.height = this.height * this.scale;

        this.ctx = canvas.getContext('2d');

        this.colorRandomisation = 30;
        this.color = Color.random();

        this.polygonInProgress = new SemiPolygon(this.color.randomise(this.colorRandomisation));

        this.pointLocked = false;
        this.crossSize = 3 * this.scale;
        this.lockDistance = 15 * this.scale;

        this.moving = false;
        this.movingPoints = [];

        this.deleteMode = false;
        this.insertMode = false;
        this.recolorMode = false;

        this.tooltips = true;
        this.keyTooltips = false;

        this.sides = 3;

        this.animation = false;
        this.animationSpeed = 40;
        
        this.addEventListener('keydown', function(event) {
            this.largeAlert('Key Down: <b>' + event.key.toUpperCase() + '</b>');

            if (event.keyCode == 81) { 
                this.pointLocked = !this.pointLocked;
                this.alert((this.pointLocked? 'Enabled':'Disabled') + ' point locking');

                this.render();

                return;
            }

            if (event.keyCode == 38) {
                event.preventDefault();

                this.colorRandomisation = Math.min(this.colorRandomisation + 2, 100);
                this.alert('Set color randomisation scale to ' + this.colorRandomisation);

                this.polygonInProgress.color = this.color.randomise(this.colorRandomisation);

                this.render();

                return;
            }

            if (event.keyCode == 40) {
                event.preventDefault();

                this.colorRandomisation = Math.max(0, this.colorRandomisation - 2);
                this.alert('Set color randomisation scale to ' + this.colorRandomisation);

                this.polygonInProgress.color = this.color.randomise(this.colorRandomisation);

                this.render();

                return;
            }

            if (event.keyCode == 67) {
                this.colorPicker.value = this.color.toString(true);
                this.colorPicker.show();

                this.alert('Opened color picker');
            }

            if (event.keyCode == 27) {
                this.polygonInProgress = new SemiPolygon(this.color.randomise(this.colorRandomisation));
                this.render();
                this.alert('Deleted half-done polygon');

                this.save();
            }

            if (event.keyCode == 8) {
                if (this.polygons.length == 0) {
                    this.alert('<span style="color: #E74C3C">Error:</span> No polygons to delete!', 3000);
                    return;
                }

                this.polygons.splice(this.polygons.length - 1, 1);
                this.render();
                this.alert('Deleted last polygon');

                this.save();
            }
            
            if (event.keyCode == 65) {
                this.moving = !this.moving;
                this.alert((this.moving? 'Enabled':'Disabled') + ' move mode');

                this.render();
            }

            if (event.keyCode == 16) {
                this.alert('Click to delete enabled');

                this.deleteMode = true;
            }

            if (event.keyCode == 69) {
                this.alert('Exporting to image...', 3000);

                const pointLocked = this.pointLocked;

                this.pointLocked = false;
                this.polygonInProgress = new SemiPolygon(new Color(0, 0, 0));

                this.render();

                APP.download(this.canvas);

                this.pointLocked = pointLocked;
            }

            if (event.keyCode == 76) {
                this.delete();
            }

            if (event.keyCode == 73) { // Display info
                this.alert('Size: <b>' + this.width + '</b>px * <b>' + this.height + '</b>px' + 
                            '<br />Load index: <b>' + this.load + '</b>' + 
                            '<br />Polygons: <b>' + this.polygons.length + '</b>' + 
                            '<br />Active color: <b>' + this.color.toString() + '</b>' + 
                            '<br />Color randomisation degree: <b>' + this.colorRandomisation + '</b>' +
                            '<br />Sides per polygon: <b>' + this.sides + '<b>',
                            7500
                );
            }

            if (event.keyCode == 9) {
                this.insertMode = true;
                this.alert('Click to insert point inside polygon');

                event.preventDefault();
            }

            if (event.keyCode == 82) {
                this.recolorMode = true;
                this.alert('Click to re-color');
            }

            if (event.keyCode == 187) {
                this.sides += 1;

                this.alert('Set sides count to ' + this.sides);
            }

            if (event.keyCode == 189) {
                this.sides = Math.max(3, this.sides - 1);

                this.alert('Set sides count to ' + this.sides);
            }

            if (event.keyCode == 68) {
                const newTab = window.open();
                newTab.document.body.style.backgroundColor = 'black';
                newTab.document.body.innerHTML = '<img src="' + this.canvas.toDataURL('image/png') + '" width="' + this.width + 'px" height="' + this.height + 'px">';
            }

            if (event.keyCode == 89) { 
                this.tooltips = !this.tooltips;
                this.alert((this.tooltips? 'Enabled':'Disabled') + ' tooltips');
                
                return;
            }

            if (event.keyCode == 85) { 
                this.keyTooltips = !this.keyTooltips;
                this.alert((this.keyTooltips? 'Enabled':'Disabled') + ' key tooltips');
                
                return;
            }

            if (event.keyCode == 75) {
                const animation = this.genAnimation();
                if (animation != null) {
                    animation.show(this.ctx, this.canvas.width, this.canvas.height);
                    this.alert('Started animation');
                }
            }

            if (event.keyCode == 74) {
                this.animationSpeed += 5;
                this.alert('Set animation speed to ' + this.animationSpeed);
            }

            if (event.keyCode == 72) {
                this.animationSpeed = Math.max(0, this.animationSpeed - 5);
                this.alert('Set animation speed to ' + this.animationSpeed);
            }
        });

        this.addEventListener('keyup', function(event) {
            if (event.keyCode == 16) {
                this.largeAlert('Key Up: <b>' + event.key.toUpperCase() + '</b>');
                this.alert('Click to delete disabled');

                this.deleteMode = false;
            }

            if (event.keyCode == 9) {
                this.largeAlert('Key Up: <b>' + event.key.toUpperCase() + '</b>');

                this.insertMode = false;
                this.alert('Click to insert point disabled');
            }

            if (event.keyCode == 82) {
                this.largeAlert('Key Up: <b>' + event.key.toUpperCase() + '</b>');

                this.recolorMode = false;
                this.alert('Click to re-color disabled');
            }
        });

        this.addEventListener('mousedown', function(event) {
            this.largeAlert('Mouse Down: <b>' + event.button + '</b>', 500);

            const point = this.convertPoint(event);

            if (this.recolorMode) {
                for (var i = this.polygons.length - 1; i >= 0; i--) {
                    const polygon = this.polygons[i];
                    if (polygon.intersects(point)) {
                        polygon.color = this.color.randomise(this.colorRandomisation);

                        this.render();
                        this.save();
                        break;
                    }
                }
                return;
            }

            if (this.insertMode) {
                for (var i = this.polygons.length - 1; i >= 0; i--) {
                    const polygon = this.polygons[i];
                    if (polygon.intersects(point)) {
                        this.polygons.splice(i, 1);

                        for (var i = 0; i < polygon.points.length; i++) {
                            const newPolygon = new Polygon(this.color.randomise(this.colorRandomisation));

                            newPolygon.points.push(polygon.points[i]);
                            newPolygon.points.push(polygon.points[(i + 1) % polygon.points.length]);
                            newPolygon.points.push(point);

                            this.polygons.push(newPolygon);
                        }

                        this.render();
                        this.save();
                        break;
                    }
                }
                return;
            }

            if (this.deleteMode) {
                for (var i = this.polygons.length - 1; i >= 0; i--) {
                    const polygon = this.polygons[i];
                    if (polygon.intersects(point)) {
                        this.polygons.splice(i, 1);
                        this.render();
                        this.save();
                        break;
                    }
                }
                return;
            }

            if (this.moving) {    
                for (const existingPoint of this.getAllPoints()) {
                    if (existingPoint.distanceTo(point) <= this.lockDistance) {
                        this.movingPoints.push(existingPoint);
                    }
                }
                
                this.save();
                return;
            }

            if (this.pointLocked) {
                for (const existingPoint of this.getAllPoints()) {
                    if (existingPoint.distanceTo(point) <= this.lockDistance) {
                        point.moveTo(existingPoint);
                        this.save();
                        break;
                    }
                }
            }

            if (event.button == 2) {
                event.preventDefault();

                this.polygons.push(this.polygonInProgress.toPolygon());
                this.polygonInProgress = new SemiPolygon(this.color.randomise(this.colorRandomisation));
            } else {
                this.polygonInProgress.nextPoint(point);
            }

            if (this.polygonInProgress.points.length == this.sides || event.button == 2) {
                this.polygons.push(this.polygonInProgress.toPolygon());
                this.polygonInProgress = new SemiPolygon(this.color.randomise(this.colorRandomisation));
            }

            this.save();
            this.render();
        }, this.canvas);

        this.addEventListener('contextmenu', function(event) {
            event.preventDefault();
        });

        this.addEventListener('mousemove', function(event) {
            const point = this.convertPoint(event);

            if (this.moving) {
                for (const secondPoint of this.movingPoints) {
                    secondPoint.moveTo(point);
                }
                this.save();
            } else this.polygonInProgress.mouseMove(point);

            this.render();
        }, this.canvas);

        this.addEventListener('mouseup', function(event) {
            if (this.moving) this.movingPoints = [];
        }, this.canvas);

        this.colorPicker = genColorPicker();
        this.addEventListener('input', function() {
            this.color = Color.fromHex(this.colorPicker.value);
            this.polygonInProgress.color = this.color.randomise(this.colorRandomisation);
            this.render();
        }, this.colorPicker);

        this.render();
        this.alert('Loaded! Canvas size: ' + this.width + 'px * ' + this.height + 'px, saving to ' + this.load + (this.width * this.height > 25000000? '<br /><span style="color: #E67E22">Warning:</span> Large canvas detected':''));

        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.alert('<span style="color: #E67E22">Warning:</span> Mobile device detected, this app will not work on mobile', 10000);
        }

        this.canvas.parentNode.style.backgroundColor = 'white';
    }

    genAnimation() {
        if (this.animation) {
            this.alert('<span style="color: #E74C3C">Error:</span> Animation already playing.', 2000);
            return;
        }
        this.animation = true;

        const self = this;
        return new Animation(this.polygons, this.animationSpeed, function() {
            self.animation = false;
        });
    }

    delete() {
        if (confirm('Are you sure you want to delete this?')) {
            APP.delete(this.load);
            window.location.replace('../gallery/gallery.html');
        }
    }

    save() {
        APP.save(this, this.load);
    }

    loadFromLocalstorage() {
        const existing = APP.getExisting();
        const toLoad = existing[this.load];

        if (toLoad == null) {
            this.alert('<span style="color: #E74C3C">Error:</span> No save at this position!', 10000);
            throw new Error('No save.');
        }

        const data = APP.loadJSON(toLoad);

        this.width = data.width;
        this.height = data.height;
        this.polygons = data.polygons;
    }

    alert(text, time) {
        if (!this.tooltips) return;

        this.alertNode.innerHTML = text;
        this.alertNode.style.opacity = '1';

        if (this.alertTransition != null) {
            window.clearTimeout(this.alertTransition);
        }

        const self = this;
        this.alertTransition = setTimeout(function() {
            self.alertNode.style.opacity = '0';
        }, time == null? 1500:time);
    }

    largeAlert(text, time) {
        if (!this.keyTooltips) return;

        this.largeAlertNode.innerHTML = text;
        this.largeAlertNode.style.opacity = '1';

        if (this.largeAlertTransition != null) {
            window.clearTimeout(this.largeAlertTransition);
        }

        const self = this;
        this.largeAlertTransition = setTimeout(function() {
            self.largeAlertNode.style.opacity = '0';
        }, time == null? 1500:time);
    }

    render() {
        if (this.animation) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const polygon of this.polygons) polygon.render(this.ctx);

        this.polygonInProgress.render(this.ctx);

        if (this.pointLocked || this.moving) {
            for (const point of this.getAllPoints()) point.renderCross(this.ctx, this.crossSize);
        }
    }

    getAllPoints() {
        const points = [];
        for (const polygon of this.polygons) Array.prototype.push.apply(points, polygon.points);
        Array.prototype.push.apply(points, this.polygonInProgress.points);

        return points;
    }

    convertPoint(event) {
        return new Point((event.offsetX * this.scale) / this.displayScale, (event.offsetY * this.scale) / this.displayScale);
    }

    addEventListener(type, callback, element) {
        const self = this;

        return (element == null? document:element).addEventListener(type, function(event) {
            callback.call(self, event);
        })
    }
}