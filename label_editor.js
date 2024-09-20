let img = null;
let image = new Image();


/**
 * Compute the scale factor to fit the image into the canvas
 * @param {number} width - Width of the image
 * @param {number} height - Height of the image
 * @param {number} maxWidth - Maximum width of the canvas
 * @param {number} maxHeight - Maximum height of the canvas
 * @returns {number} - Scale factor to fit the image into the canvas
 */
function computeScaleFactor(width,
                            height,
                            maxWidth,
                            maxHeight) {

    if (width > height) {
        return maxWidth / width;
    }
    return maxHeight / height;
}

/**
 * Run the label editor
 * @param {string} imageSrc - Source of the image
 * @param {Array} initialPolygons - Initial polygons
 * @param {Function} callback_save - Callback function when save button is clicked
 * @param {Function} callback_close - Callback function when close button is clicked
 * @param {Object} options - Options for the label editor. Default values are: { scale: 1, borderWidth: 2, borderColor: '#FF0000', backgroundColor: 'rgba(255, 0, 0, 0.5)', polygonCloseThreshold: 10 }
 */
function run_label_editor(imageSrc,
                          initialPolygons = [],
                          callback_save,
                          callback_close,
                          options = {}) {

    let polygons = initialPolygons;
    image = new Image();

    // Default values for options
    let { scale = 1, borderWidth = 2, borderColor = '#FF0000', backgroundColor = 'rgba(255, 0, 0, 0.5)', polygonCloseThreshold = 10 } = options;


    // Get the overlay and container elements
    const overlay = document.querySelector('.overlay');
    const container = document.querySelector('.canvas-container');
    const polygonList = container.querySelector('.object-list');
    const canvas = document.getElementById('image-canvas');
    const saveButton = document.getElementById('save-button');
    const closeButton = document.getElementById('close-button');
    const ctx = canvas.getContext('2d');

    // Show the overlay
    overlay.classList.remove('d-none');

    // Clear the polygon list
    polygonList.innerHTML = '';

    // Initialize the variables
    let isDrawing = false; // Flag to indicate if a polygon is being drawn
    let currentPolygon = []; // Current polygon being drawn
    let startX, startY; // Start coordinates of the polygon
    let tempLineStart = null; // Start coordinates of the temporary line

    const percentage_width_of_canvas = 80; // Percentage of the width of the canvas in the parent element
    const percentage_height_of_canvas = 80; // Percentage of the height of the canvas in the parent element

    // Compute the width and height of the canvas
    const max_width = canvas.parentElement.clientWidth * percentage_width_of_canvas / 100;
    const max_height = canvas.parentElement.clientHeight * percentage_height_of_canvas / 100;

    // Set the width and height of the canvas
    image.onload = () => {
        options.scale = computeScaleFactor(image.width, image.height, max_width, max_height);
        canvas.width = image.width * options.scale;
        canvas.height = image.height * options.scale;

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        drawAllPolygons(ctx, polygons, scale, borderWidth, borderColor);
    };

    image.src = imageSrc;


    // Add event listeners to the canvas
    canvas.addEventListener('mousedown', (e) => {
        const x = e.offsetX;
        const y = e.offsetY;


        // Check if the click is inside the canvas
        if (isDrawing) {
            if (currentPolygon.length > 0) {
                // Check if the click is close to the start point
                const distanceToStart = Math.hypot(currentPolygon[0].x - x / scale, currentPolygon[0].y - y / scale);
                if (distanceToStart < polygonCloseThreshold) {
                    // Close the polygon
                    currentPolygon.push({ x: x / scale, y: y / scale });
                    polygons.push({ vertices: currentPolygon, borderWidth, borderColor, backgroundColor });
                    currentPolygon = [];
                    isDrawing = false;
                    drawCanvas(); // Finalize drawing
                } else {
                    // Add new point and draw line
                    currentPolygon.push({ x: x / scale, y: y / scale });
                    drawCanvas(); // Draw temporary line and points
                }
            }
        } else {
            // Start drawing new polygon
            isDrawing = true;
            startX = x;
            startY = y;
            currentPolygon = [{ x: x / scale, y: y / scale }];
            tempLineStart = { x: x, y: y };
            drawCanvas(); // Initial drawing
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            const x = e.offsetX;
            const y = e.offsetY;

            // Clear the canvas and redraw everything
            drawCanvas();

            if (tempLineStart) {
                // Draw the temporary line
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = borderWidth;
                ctx.beginPath();
                ctx.moveTo(tempLineStart.x, tempLineStart.y);
                ctx.lineTo(x, y);
                ctx.stroke();

                // Check if closing condition is met
                const distanceToStart = Math.hypot(currentPolygon[0].x * scale - x, currentPolygon[0].y * scale - y);
                if (distanceToStart < polygonCloseThreshold) {
                    ctx.strokeStyle = '#00FF00'; // Change color to indicate closure
                    ctx.lineWidth = borderWidth;
                    ctx.beginPath();
                    ctx.moveTo(currentPolygon[currentPolygon.length - 1].x * scale, currentPolygon[currentPolygon.length - 1].y * scale);
                    ctx.lineTo(currentPolygon[0].x * scale, currentPolygon[0].y * scale);
                    ctx.stroke();
                }
            }
        }
    });
    canvas.addEventListener('mouseup', (e) => {
        if (isDrawing) {
            const x = e.offsetX;
            const y = e.offsetY;

            if (tempLineStart) {
                tempLineStart = null;
                const newPoint = { x: x / scale, y: y / scale };
                if (currentPolygon.length > 0) {
                    currentPolygon.push(newPoint);
                }

                // Redraw the canvas
                drawCanvas();
            }
        }
    });

    // Add event listener to the canvas to cancel polygon creation
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (isDrawing) {
            // Cancel polygon creation
            isDrawing = false;
            currentPolygon = [];
            drawCanvas();
        }
    });

    /**
     * Draw the canvas with the image and polygons
     */
    function drawCanvas() {

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Draw all polygons
        drawAllPolygons(ctx, polygons, scale, borderWidth, borderColor);

        // Draw the current polygon if it is being drawn
        if (currentPolygon.length > 0) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.beginPath();
            ctx.moveTo(currentPolygon[0].x * scale, currentPolygon[0].y * scale);

            // Draw the lines
            currentPolygon.forEach((point, index) => {
                if (index > 0) {
                    ctx.lineTo(point.x * scale, point.y * scale);
                }
            });
            // Draw the temporary line
            if (isDrawing && tempLineStart) {
                ctx.lineTo(tempLineStart.x, tempLineStart.y);
            }

            ctx.stroke();

            // Draw the points
            ctx.fillStyle = borderColor;
            currentPolygon.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x * scale, point.y * scale, 5, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    }

    /**
     * Draw all polygons on the canvas
     * @param ctx - Canvas context
     * @param polygons - List of polygons to draw
     * @param scale - Scale factor to fit the image into the canvas
     * @param borderWidth - Border width to draw the polygons
     * @param borderColor - Border color to draw the polygons
     */

    function drawAllPolygons(ctx, polygons, scale, borderWidth, borderColor) {
        const objectList = document.querySelector('.object-list');

        // Clear the polygon list
        objectList.innerHTML = '';

        // Draw all polygons
        polygons.forEach((polygon, index) => {
            // Draw background
            ctx.fillStyle = polygon.backgroundColor;

            // Draw the polygon
            ctx.strokeStyle = borderColor;

            // Draw the border
            ctx.lineWidth = borderWidth;
            
            ctx.beginPath();
            ctx.moveTo(polygon.vertices[0].x * scale, polygon.vertices[0].y * scale);

            // Draw the lines
            polygon.vertices.forEach((vertex, i) => {
                if (i === polygon.vertices.length - 1) {
                    ctx.lineTo(polygon.vertices[0].x * scale, polygon.vertices[0].y * scale);
                } else {
                    ctx.lineTo(vertex.x * scale, vertex.y * scale);
                }
            });

            // Close the polygon
            ctx.closePath();
            ctx.fill(); // Fill the polygon with background color
            ctx.stroke(); // Draw the border

            // Draw the polygon label
            ctx.font = "16px Arial Black";
            ctx.fillStyle = "#FF0000";
            ctx.fillText("Line " + (index + 1), polygon.vertices[0].x * scale, polygon.vertices[0].y * scale + 30);


            addPolygonToList(polygon, index, polygons, scale, borderWidth, borderColor);
        });
    }

    /**
     * Add a polygon to the list of polygons in the UI
     * @param polygon - Polygon to add to the list
     * @param index - Index of the polygon in the list
     * @param polygons - List of polygons
     * @param scale - Scale factor to fit the image into the canvas
     * @param borderWidth - Border width
     * @param borderColor - Border color
     */
    function addPolygonToList(polygon, index, polygons, scale, borderWidth, borderColor) {

        // Create the polygon item and delete button
        const polygonList = document.querySelector('.object-list');
        const polygonItem = document.createElement('div');
        const deleteButton = document.createElement('button');

        // Add class and content to the delete button
        deleteButton.className = "delete-button";
        deleteButton.innerHTML = '<span class="text">Delete</span><span class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"></path></svg></span>';

        // Add class and content to the polygon item
        polygonItem.classList.add('object-item');
        polygonItem.innerHTML = `<h4>Line ${index + 1}</h4>`;

        // Add event listener to delete button
        deleteButton.addEventListener('click', () => deletePolygon(index, polygons, scale, borderWidth, borderColor));

        // Append the delete button to the polygon item
        polygonItem.appendChild(deleteButton);
        polygonList.appendChild(polygonItem);
    }


    /**
     * Delete a polygon from the list of polygons
     * @param index - Index of the polygon to delete
     * @param polygons - List of polygons
     * @param scale - Scale factor
     * @param borderWidth - Border
     * @param borderColor - Border color
     */
    function deletePolygon(index, polygons, scale, borderWidth, borderColor) {

        // Get the polygon list and canvas
        const polygonList = document.querySelector('.object-list');
        const canvas = document.getElementById('image-canvas');
        const ctx = canvas.getContext('2d');

        // Remove the polygon from the list
        polygons.splice(index, 1);

        // Clear the polygon list
        polygonList.innerHTML = '';

        // Add all polygons to the list
        polygons.forEach((polygon, i) => addPolygonToList(polygon, i, polygons, scale, borderWidth, borderColor));

        // Redraw the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the image and polygons
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Draw all polygons
        drawAllPolygons(ctx, polygons, scale, borderWidth, borderColor);
    }


    // Add event listeners to the save and close buttons
    saveButton.addEventListener('click', () => {
        callback_save(polygons);
        overlay.classList.add('d-none');
    });

    closeButton.addEventListener('click', () => {
        overlay.classList.add('d-none');
        callback_close();
    });
}

function run() {
    run_label_editor(img);
}

function open_image() {
    const input = document.getElementById('open_image');
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function() {
        img = reader.result;
    }
    reader.readAsDataURL(file);
}
