function genAlertNode() {
    const element = document.createElement('p');
    element.innerHTML = '';

    element.style.display = 'inline-block';
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.right = '0';
    element.style.backgroundColor = 'rgba(0.8, 0.8, 0.8, 0.7)';
    element.style.borderRadius = '0.5em';
    element.style.color = 'white';
    element.style.fontFamily = 'sans-serif';
    element.style.fontWeight = '100';
    element.style.padding = '0.5em 1em';
    element.style.margin = '0.5em';
    element.style.fontSize = '80%';
    element.style.transition = 'opacity 0.7s';
    element.style.webkitTransition = element.style.transition;

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
}

class Color {
    constructor(r, g, b) {
        this.r = r? r:0;
        this.g = g? g:0;
        this.b = b? b:0;
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

class LowPolyGenerator {
    constructor(canvas, scale) {
        this.canvas = canvas;
        this.scale = scale;

        this.canvas.width = window.innerWidth * this.scale;
        this.canvas.height = window.innerHeight * this.scale;

        this.ctx = canvas.getContext('2d');

        this.colorRandomisation = 30;
        this.color = Color.random();

        this.polygons = [];
        this.polygonInProgress = new SemiPolygon(this.color.randomise(this.colorRandomisation));

        this.pointLocked = false;
        this.crossSize = 5 * this.scale;
        this.lockDistance = 10 * this.scale;

        this.moving = false;
        this.movingPoints = [];

        this.deleteMode = false;
        
        this.addEventListener('keydown', function(event) {
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
            }

            if (event.keyCode == 8) {
                if (this.polygons.length == 0) {
                    this.alert('<span style="color: #E74C3C">Error:</span> No polygons to delete!');
                    return;
                }

                this.polygons.splice(this.polygons.length - 1, 1);
                this.render();
                this.alert('Deleted last polygon');
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
                this.alert('Exporting to image...');

                const pointLocked = this.pointLocked;

                this.pointLocked = false;
                this.polygonInProgress = new SemiPolygon(new Color(0, 0, 0));

                this.render();

                download(this.canvas.toDataURL('image/png'), 'image/png', 'Polyfiller export');

                this.pointLocked = pointLocked;
            }
        });

        this.addEventListener('keyup', function(event) {
            if (event.keyCode == 16) {
                this.alert('Click to delete disabled');

                this.deleteMode = false;
            }
        });

        this.addEventListener('mousedown', function(event) {
            const point = this.convertPoint(event);

            if (this.deleteMode) {
                for (var i = this.polygons.length - 1; i >= 0; i--) {
                    const polygon = this.polygons[i];
                    if (polygon.intersects(point)) {
                        this.polygons.splice(i, 1);
                        this.render();
                        return;
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
                

                return;
            }

            if (this.pointLocked) {
                for (const existingPoint of this.getAllPoints()) {
                    if (existingPoint.distanceTo(point) <= this.lockDistance) {
                        point.moveTo(existingPoint);
                        break;
                    }
                }
            }

            this.polygonInProgress.nextPoint(point);

            if (this.polygonInProgress.isTriangle()) {
                this.polygons.push(this.polygonInProgress.toPolygon());
                this.polygonInProgress = new SemiPolygon(this.color.randomise(this.colorRandomisation));
            }

            this.render();
        });

        this.addEventListener('mousemove', function(event) {
            const point = this.convertPoint(event);

            if (this.moving) {
                for (const secondPoint of this.movingPoints) {
                    secondPoint.moveTo(point);
                }
            } else this.polygonInProgress.mouseMove(point);

            this.render();
        });

        this.addEventListener('mouseup', function(event) {
            if (this.moving) this.movingPoints = [];
        });

        this.alertNode = genAlertNode();
        this.alertTransition = null;

        this.colorPicker = genColorPicker();
        this.addEventListener('input', function() {
            this.color = Color.fromHex(this.colorPicker.value);
            this.polygonInProgress.color = this.color.randomise(this.colorRandomisation);
            this.render();
        }, this.colorPicker);

        this.alert('Loaded! Canvas size: ' + canvas.width + 'px * ' + canvas.height + 'px');

        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.alert('<span style="color: #E67E22">Warning:</span> Mobile device detected, this app will not work on mobile');
        }
    }

    alert(text) {
        this.alertNode.innerHTML = text;
        this.alertNode.style.opacity = '1';

        if (this.alertTransition != null) {
            window.clearTimeout(this.alertTransition);
        }

        const self = this;
        this.alertTransition = setTimeout(function() {
            self.alertNode.style.opacity = '0';
        }, 1500);
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
        return new Point(event.clientX * this.scale, event.clientY * this.scale);
    }

    addEventListener(type, callback, element) {
        const self = this;

        return (element == null? document:element).addEventListener(type, function(event) {
            callback.call(self, event);
        })
    }
}