const APP = {};

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


function genRandom(list) {
    return list[parseInt(Math.random() * list.length)];
}

APP.genTitle = function() {
    return genRandom(['Mars', 'Saturn', 'Pluto', 'Mercury', 'Jupiter', 'Kepler22b', 'Naptune', 'Denmark', 'Norway', 'Sweden', 'Lichtenstein', 'Canada', 'Andora', 'Cyprus']) + ' ' + genRandom(['is', 'was', 'will be', 'might be', 'could be']) + ' ' + genRandom(['epic', 'cool', 'out of this world', 'green', 'purple', 'shiny', 'fluffy']);
}

APP.getExisting = function() {
    return JSON.parse(localStorage.creations == null? '[]':localStorage.creations);
}

APP.loadJSON = function(json) {
    const data = {
        width: json.size[0],
        height: json.size[1],
        polygons: [],
        name: json.name == null? this.genTitle():json.name
    };

    for (const polygon of json.polygons) {
        const created = new Polygon(Color.fromArray(polygon[0]));

        for (const point of polygon[1]) {
            created.points.push(Point.fromArray(point));
        }

        data.polygons.push(created);
    }

    return data;
}

APP.download = function(canvas) {
    download(canvas.toDataURL('image/png'), 'image/png', 'Polyfiller export');
}

APP.compress = function(polygons) {
    const array = [];

    for (const polygon of polygons) {
        const data = [polygon.color.toArray(), []];
        for (const point of polygon.points) {
            data[1].push(point.toArray());
        }

        array.push(data);
    }

    return array;
}

APP.save = function(handler, id) {
    const existing = APP.getExisting();
        
    const current = {
        size: [handler.width, handler.height],
        polygons: APP.compress(handler.polygons),
        name: handler.name
    };

    if (existing.length < id) {
        existing.push(current);
    } else {
        existing[id] = current;
    }

    localStorage.creations = JSON.stringify(existing);
}

APP.delete = function(id) {
    const existing = APP.getExisting();

    existing[id] = null;

    localStorage.creations = JSON.stringify(existing);
}