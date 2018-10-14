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

function download(data, type, name) {
    var dlLink = document.createElement('a');
    dlLink.download = name;
    dlLink.href = data;
    dlLink.dataset.downloadurl = [type, dlLink.download, dlLink.href].join(':');

    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
}

function getParameterByName(name) {
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
 	results = regex.exec(window.location.href);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

class Polygon {
    constructor(color, points) {
        this.color = color;
        this.points = points == null? []:points;
    }

    nextPoint(position) {
        this.points.push(position);
    }

    isTriangle() {
        return this.points.length == 3;
    }

    isEmpty() {
        return this.points.length == 0;
    }

    render(ctx) {
        if (this.isEmpty()) return;

        ctx.fillStyle = this.color.toString();
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (var i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    intersects(point) {
        var x = point.x, y = point.y;

        var inside = false;
        for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            var xi = this.points[i].x, yi = this.points[i].y;
            var xj = this.points[j].x, yj = this.points[j].y;

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }
}

class SemiPolygon extends Polygon {
    constructor(color) {
        super(color);

        this.tempPoint = {x: 0, y: 0};
    }

    mouseMove(point) {
        this.tempPoint = point;
    }

    toPolygon() {
        return new Polygon(this.color, this.points);
    }

    render(ctx) {
        if (this.isEmpty()) return;

        ctx.fillStyle = this.color.toString();
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;
        
        ctx.beginPath();

        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (var i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);

        if (!this.tempPoint.isOrigin()) ctx.lineTo(this.tempPoint.x, this.tempPoint.y);

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    distanceTo(point2) {
        return Math.sqrt(((point2.x - this.x) ** 2) + ((point2.y - this.y) ** 2));
    }

    moveTo(point) {
        this.x = point.x;
        this.y = point.y;
    }

    renderCross(ctx, size) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(this.x - size, this.y - size);
        ctx.lineTo(this.x + size, this.y + size);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.x + size, this.y - size);
        ctx.lineTo(this.x - size, this.y + size);
        ctx.closePath();
        ctx.stroke();
    }

    isOrigin() {
        return this.x == 0 && this.y == 0;
    }

    toArray() {
        return [this.x, this.y];
    }
}

Point.fromArray = function(array) {
    return new Point(array[0], array[1]);
}

class Color {
    constructor(r, g, b) {
        this.r = r? r:0;
        this.g = g? g:0;
        this.b = b? b:0;
    }

    toArray() {
        return [this.r, this.g, this.b];
    }

    randomise(scale) {
        const color = new Color(this.r, this.g, this.b);

        color.r += parseInt((Math.random() * scale) - (scale / 2));
        color.g += parseInt((Math.random() * scale) - (scale / 2));
        color.b += parseInt((Math.random() * scale) - (scale / 2));

        return color;
    }

    toString(hex) {
        if (hex) {
            return '#' + toHex(this.r) + toHex(this.g) + toHex(this.b);
        }
        return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
    }
}

Color.fromHex = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result? new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)): null;
}

Color.random = function() {
    return new Color(128, 128, 128).randomise(50);
}

Color.fromArray = function(array) {
    return new Color(array[0], array[1], array[2]);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

class Animation {
    constructor(polygons) {
        this.polygons = polygons;
        this.speed = 50;
    }

    async show(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);

        for (var i = 0; i < this.polygons.length; i++) {
            for (var j = 0; j < i + 1; j++) {
                this.polygons[j].render(ctx);
            }

            await sleep(this.speed);
        }
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
            this.load = this.getExisting().length;

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
                this.pointLocked = this.moving;

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

                download(this.canvas.toDataURL('image/png'), 'image/png', 'Polyfiller export');

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
                this.genAnimation().show(this.ctx, this.canvas.width, this.canvas.height);
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
        return new Animation(this.polygons);
    }

    getExisting() {
        return JSON.parse(localStorage.creations == null? '[]':localStorage.creations);
    }

    delete() {
        if (confirm('Are you sure you want to delete this?')) {
            const existing = this.getExisting();

            existing[this.load] = null;

            localStorage.creations = JSON.stringify(existing);
            window.location.replace('app.html');
        }
    }

    save() {
        const existing = this.getExisting();
        
        const current = {
            size: [this.width, this.height],
            polygons: []
        };

        for (const polygon of this.polygons) {
            const data = [polygon.color.toArray(), []];
            for (const point of polygon.points) {
                data[1].push(point.toArray());
            }
            current.polygons.push(data);
        }

        if (existing.length < this.load) {
            existing.push(current);
        } else {
            existing[this.load] = current;
        }

        localStorage.creations = JSON.stringify(existing);
    }

    loadFromLocalstorage() {
        const existing = this.getExisting();
        const toLoad = existing[this.load];

        if (toLoad == null) {
            this.alert('<span style="color: #E74C3C">Error:</span> No save at this position!', 10000);
            throw new Error('No save.');
        }

        this.width = toLoad.size[0];
        this.height = toLoad.size[1];

        for (const polygon of toLoad.polygons) {
            const created = new Polygon(Color.fromArray(polygon[0]));

            for (const point of polygon[1]) {
                created.points.push(Point.fromArray(point));
            }

            this.polygons.push(created);
        }
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const polygon of this.polygons) polygon.render(this.ctx);

        this.polygonInProgress.render(this.ctx);

        if (this.pointLocked) {
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