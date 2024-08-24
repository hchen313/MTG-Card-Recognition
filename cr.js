const cv = require('opencv4nodejs'); 
const screenshot = require('screenshot-desktop'); 
const ioHook = require('iohook')
const Tesseract = require('tesseract.js')


ioHook.on('mouseclick', (event) => {
    // 900 x 1440
    console.log(event)
    if (event.clicks == 2) {
        capture(event.x, event.y); 
    }
})

ioHook.start()

const capture = (mouseX, mouseY) => {
    screenshot().then((img) => {
        // 1800 x 2880 
        const image = cv.imdecode(img).resize(900, 1440); // reads image 
        const gray = image.bgrToGray(); // grayscale 
        //const gray = image.bitwiseNot();
        const edges = gray.canny(50, 100); // find edges 
        const contours = edges.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE); // find contours 
        const filteredContours = filterContourBySize(contours); 
        const filteredRect = removeBoxedInRect(filteredContours);
        const centroid = getCentroid(filteredRect); 
        const rect = filteredRect[getClosestPoint(centroid, mouseX, mouseY)];
        image.drawRectangle(new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), new cv.Vec(0, 255, 0), 2);
        cv.imwrite("edges.png", image); 

        // method 1 - text 
        const roi = image.getRegion(rect);
    
        cv.imwrite("region.png", roi); 
        
        const title = roi.getRegion(
            new cv.Rect(
                0, 
                0,
                rect.width, 
                50)
        ).bgrToGray().resize(200, 500);

        

        cv.imwrite("title.png", title)

        Tesseract.recognize("title.png", 'eng', {
            logger:m => console.log(m)
        }).then(({data: {text}}) => console.log(`${text.match(/\b\w+\b/g)}`));
    })
}
 
const getClosestPoint = (lst, x, y) => {
    let minDistance = Infinity;
    let index = -1; 
    for (let i = 0; i < lst.length; i++) {
        const distance = Math.sqrt(Math.pow((x - lst[i].x), 2) + Math.pow((y - lst[i].y), 2)); 
        if (distance < minDistance) {
            minDistance = distance; 
            index = i; 
        }
    }
    return index;
}


const getCentroid = (rectangles) => {
    let res = []; 
    rectangles.forEach(rect =>{
        res.push(new Point(rect.x + (rect.width / 2), rect.y + (rect.height / 2)));
    });
    return res; 
}

// returns Rect
const filterContourBySize = (contours) => {
    let res = []; 
    contours.forEach(contour => {
        const rect = contour.boundingRect();
        if (rect.width * rect.height >= 50000 && rect.width * rect.height <= 100000) {
            res.push(rect);
        }
    })
    return res; 
}

/**
 * if a rect is within another rect, filter it out 
 */
const removeBoxedInRect = (rectangles) => {
    res = []; 
    rectangles.forEach(rect => {
        let inside = false; 
        for (let i = 0; i < res.length; i++) {
            if (boxedRect(res[i], rect)) {
                res[i] = rect; 
                inside = true;
            }
        }
        if (inside == false) {
            res.push(rect); 
        }
    });
    return res;
}

/**
 * determine whether one rect1 is inside rect2 
 * if is, return true 
 * if equal return true 
 * else return false 
 */
const boxedRect = (rect1, rect2) => {
    if (
        rect1.x >= rect2.x 
        && rect1.x + rect1.width <= rect2.x + rect2.width
        && rect1.y >= rect2.y
        && rect1.y + rect1.height <= rect2.y + rect2.height
    ) {
        return true;
    } 
    return false; 
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y; 
    }

    getPoint() {
        return {x: this.x, y: this.y};
    }
}

