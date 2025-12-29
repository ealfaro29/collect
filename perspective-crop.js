// Perspective Crop Tool
class PerspectiveCrop {
    constructor(imageData, onComplete) {
        this.imageData = imageData;
        this.onComplete = onComplete;
        this.corners = [];
        this.selectedCorner = null;
        this.isDragging = false;
        this.canvas = null;
        this.ctx = null;
        this.img = new Image();
        this.loupeCanvas = null;
        this.loupeCtx = null;
        this.loupeSize = 120;
        this.loupeZoom = 3;
        this.showLoupe = false;
        this.loupePos = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.img.onload = () => {
            this.setupCanvas();
            this.setupLoupe();
            this.initializeCorners();
            this.render();
        };
        this.img.src = this.imageData;
    }

    setupCanvas() {
        this.canvas = document.getElementById('cropCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size to fit container while maintaining aspect ratio
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = Math.min(500, window.innerHeight * 0.6);

        const imgRatio = this.img.width / this.img.height;
        const containerRatio = containerWidth / containerHeight;

        if (imgRatio > containerRatio) {
            this.canvas.width = containerWidth;
            this.canvas.height = containerWidth / imgRatio;
        } else {
            this.canvas.height = containerHeight;
            this.canvas.width = containerHeight * imgRatio;
        }

        this.scale = this.canvas.width / this.img.width;

        // Add event listeners
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
    }

    setupLoupe() {
        // Create loupe canvas
        this.loupeCanvas = document.createElement('canvas');
        this.loupeCanvas.width = this.loupeSize;
        this.loupeCanvas.height = this.loupeSize;
        this.loupeCanvas.style.position = 'absolute';
        this.loupeCanvas.style.border = '3px solid #ff4757';
        this.loupeCanvas.style.borderRadius = '50%';
        this.loupeCanvas.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.5)';
        this.loupeCanvas.style.pointerEvents = 'none';
        this.loupeCanvas.style.display = 'none';
        this.loupeCanvas.style.zIndex = '1000';
        this.loupeCtx = this.loupeCanvas.getContext('2d');

        // Add to container
        this.canvas.parentElement.appendChild(this.loupeCanvas);
    }

    initializeCorners() {
        const margin = 0.1;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.corners = [
            { x: w * margin, y: h * margin, label: 'TL' },
            { x: w * (1 - margin), y: h * margin, label: 'TR' },
            { x: w * (1 - margin), y: h * (1 - margin), label: 'BR' },
            { x: w * margin, y: h * (1 - margin), label: 'BL' }
        ];
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startDrag(pos);
    }

    handleTouchStart(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.startDrag(pos);
    }

    startDrag(pos) {
        const hitRadius = 30;

        for (let i = 0; i < this.corners.length; i++) {
            const corner = this.corners[i];
            const dx = pos.x - corner.x;
            const dy = pos.y - corner.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < hitRadius) {
                this.selectedCorner = i;
                this.isDragging = true;
                this.showLoupe = true;
                this.updateLoupe(corner.x, corner.y);
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.selectedCorner === null) return;

        const pos = this.getMousePos(e);
        this.updateCorner(pos);
    }

    handleTouchMove(e) {
        if (!this.isDragging || this.selectedCorner === null) return;

        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.updateCorner(pos);
    }

    updateCorner(pos) {
        this.corners[this.selectedCorner].x = Math.max(0, Math.min(this.canvas.width, pos.x));
        this.corners[this.selectedCorner].y = Math.max(0, Math.min(this.canvas.height, pos.y));
        this.updateLoupe(this.corners[this.selectedCorner].x, this.corners[this.selectedCorner].y);
        this.render();
    }

    updateLoupe(x, y) {
        if (!this.showLoupe) return;

        // Clear loupe
        this.loupeCtx.clearRect(0, 0, this.loupeSize, this.loupeSize);

        // Apply circular clip
        this.loupeCtx.save();
        this.loupeCtx.beginPath();
        this.loupeCtx.arc(this.loupeSize / 2, this.loupeSize / 2, this.loupeSize / 2, 0, Math.PI * 2);
        this.loupeCtx.clip();

        // Fill with white background first to ensure opacity
        this.loupeCtx.fillStyle = 'white';
        this.loupeCtx.fillRect(0, 0, this.loupeSize, this.loupeSize);

        // Calculate source coordinates in the original image
        // Convert canvas coordinates to image coordinates
        const imgX = (x / this.canvas.width) * this.img.width;
        const imgY = (y / this.canvas.height) * this.img.height;

        // Size of the area to show (in image coordinates)
        const sourceSize = (this.loupeSize / this.loupeZoom) * (this.img.width / this.canvas.width);
        const sourceX = imgX - sourceSize / 2;
        const sourceY = imgY - sourceSize / 2;

        // Draw zoomed portion of ORIGINAL image (not the canvas with markers)
        this.loupeCtx.drawImage(
            this.img,
            sourceX, sourceY, sourceSize, sourceSize,
            0, 0, this.loupeSize, this.loupeSize
        );

        // Draw crosshair
        this.loupeCtx.strokeStyle = '#ff4757';
        this.loupeCtx.lineWidth = 2;
        this.loupeCtx.beginPath();
        this.loupeCtx.moveTo(this.loupeSize / 2 - 10, this.loupeSize / 2);
        this.loupeCtx.lineTo(this.loupeSize / 2 + 10, this.loupeSize / 2);
        this.loupeCtx.moveTo(this.loupeSize / 2, this.loupeSize / 2 - 10);
        this.loupeCtx.lineTo(this.loupeSize / 2, this.loupeSize / 2 + 10);
        this.loupeCtx.stroke();

        this.loupeCtx.restore();

        // Position loupe - offset to not cover the finger
        const canvasRect = this.canvas.getBoundingClientRect();
        const loupeOffset = 80;

        // Position above and to the left of the touch point
        let loupeX = canvasRect.left + x - this.loupeSize - 20;
        let loupeY = canvasRect.top + y - this.loupeSize - loupeOffset;

        // Adjust if goes off screen
        if (loupeX < canvasRect.left) {
            loupeX = canvasRect.left + x + 20; // Switch to right side
        }
        if (loupeY < canvasRect.top) {
            loupeY = canvasRect.top + y + 20; // Switch to below
        }

        this.loupeCanvas.style.left = loupeX + 'px';
        this.loupeCanvas.style.top = loupeY + 'px';
        this.loupeCanvas.style.display = 'block';
    }

    handleMouseUp() {
        this.isDragging = false;
        this.selectedCorner = null;
        this.showLoupe = false;
        if (this.loupeCanvas) {
            this.loupeCanvas.style.display = 'none';
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image
        this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);

        // Draw overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw selected area
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.moveTo(this.corners[0].x, this.corners[0].y);
        for (let i = 1; i < this.corners.length; i++) {
            this.ctx.lineTo(this.corners[i].x, this.corners[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Draw border
        this.ctx.strokeStyle = '#ff4757';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.corners[0].x, this.corners[0].y);
        for (let i = 1; i < this.corners.length; i++) {
            this.ctx.lineTo(this.corners[i].x, this.corners[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        // Draw corners
        this.corners.forEach((corner, index) => {
            const isSelected = this.selectedCorner === index;

            // Outer circle
            this.ctx.fillStyle = isSelected ? '#ffd93d' : '#ff4757';
            this.ctx.beginPath();
            this.ctx.arc(corner.x, corner.y, isSelected ? 18 : 15, 0, Math.PI * 2);
            this.ctx.fill();

            // Inner circle
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(corner.x, corner.y, isSelected ? 10 : 8, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    async applyCrop() {
        // Scale corners back to original image coordinates
        const scaleX = this.img.width / this.canvas.width;
        const scaleY = this.img.height / this.canvas.height;

        const srcCorners = this.corners.map(c => ({
            x: c.x * scaleX,
            y: c.y * scaleY
        }));

        // Calculate dimensions based on corner distances
        // Width: use the average of top and bottom edges
        const topWidth = Math.sqrt(
            Math.pow(srcCorners[1].x - srcCorners[0].x, 2) +
            Math.pow(srcCorners[1].y - srcCorners[0].y, 2)
        );
        const bottomWidth = Math.sqrt(
            Math.pow(srcCorners[2].x - srcCorners[3].x, 2) +
            Math.pow(srcCorners[2].y - srcCorners[3].y, 2)
        );
        const outputWidth = Math.round((topWidth + bottomWidth) / 2);

        // Height: use the average of left and right edges
        const leftHeight = Math.sqrt(
            Math.pow(srcCorners[3].x - srcCorners[0].x, 2) +
            Math.pow(srcCorners[3].y - srcCorners[0].y, 2)
        );
        const rightHeight = Math.sqrt(
            Math.pow(srcCorners[2].x - srcCorners[1].x, 2) +
            Math.pow(srcCorners[2].y - srcCorners[1].y, 2)
        );
        const outputHeight = Math.round((leftHeight + rightHeight) / 2);

        // Limit max dimensions to prevent performance issues and save localStorage space
        // For 100+ decks, we need to keep images very small
        const maxDimension = 400;
        let finalWidth = outputWidth;
        let finalHeight = outputHeight;

        if (outputWidth > maxDimension || outputHeight > maxDimension) {
            const scale = maxDimension / Math.max(outputWidth, outputHeight);
            finalWidth = Math.round(outputWidth * scale);
            finalHeight = Math.round(outputHeight * scale);
        }

        // Create output canvas with calculated dimensions
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = finalWidth;
        outputCanvas.height = finalHeight;

        const dstCorners = [
            { x: 0, y: 0 },
            { x: finalWidth, y: 0 },
            { x: finalWidth, y: finalHeight },
            { x: 0, y: finalHeight }
        ];

        // Apply perspective transform
        this.perspectiveTransform(
            this.img,
            srcCorners,
            outputCanvas,
            dstCorners
        );

        // Convert to data URL with very low quality to maximize storage capacity
        // Quality 0.5 allows storing 100+ decks while maintaining readability
        const croppedImage = outputCanvas.toDataURL('image/jpeg', 0.5);
        this.onComplete(croppedImage);
    }

    perspectiveTransform(srcImg, srcCorners, dstCanvas, dstCorners) {
        const dstCtx = dstCanvas.getContext('2d');
        const width = dstCanvas.width;
        const height = dstCanvas.height;

        // Create temporary canvas with source image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = srcImg.width;
        tempCanvas.height = srcImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(srcImg, 0, 0);
        const srcData = tempCtx.getImageData(0, 0, srcImg.width, srcImg.height);

        // Create output image data
        const dstData = dstCtx.createImageData(width, height);

        // Calculate the inverse transformation matrix (dst -> src)
        const matrix = this.getInversePerspectiveTransform(dstCorners, srcCorners);

        // Apply transformation using bilinear interpolation
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const src = this.transformPoint(x, y, matrix);

                if (src.x >= 0 && src.x < srcImg.width - 1 && src.y >= 0 && src.y < srcImg.height - 1) {
                    // Bilinear interpolation
                    const x0 = Math.floor(src.x);
                    const y0 = Math.floor(src.y);
                    const x1 = x0 + 1;
                    const y1 = y0 + 1;

                    const fx = src.x - x0;
                    const fy = src.y - y0;

                    const w1 = (1 - fx) * (1 - fy);
                    const w2 = fx * (1 - fy);
                    const w3 = (1 - fx) * fy;
                    const w4 = fx * fy;

                    const idx00 = (y0 * srcImg.width + x0) * 4;
                    const idx10 = (y0 * srcImg.width + x1) * 4;
                    const idx01 = (y1 * srcImg.width + x0) * 4;
                    const idx11 = (y1 * srcImg.width + x1) * 4;

                    const dstIdx = (y * width + x) * 4;

                    dstData.data[dstIdx] =
                        srcData.data[idx00] * w1 +
                        srcData.data[idx10] * w2 +
                        srcData.data[idx01] * w3 +
                        srcData.data[idx11] * w4;

                    dstData.data[dstIdx + 1] =
                        srcData.data[idx00 + 1] * w1 +
                        srcData.data[idx10 + 1] * w2 +
                        srcData.data[idx01 + 1] * w3 +
                        srcData.data[idx11 + 1] * w4;

                    dstData.data[dstIdx + 2] =
                        srcData.data[idx00 + 2] * w1 +
                        srcData.data[idx10 + 2] * w2 +
                        srcData.data[idx01 + 2] * w3 +
                        srcData.data[idx11 + 2] * w4;

                    dstData.data[dstIdx + 3] = 255;
                }
            }
        }

        dstCtx.putImageData(dstData, 0, 0);
    }

    getInversePerspectiveTransform(src, dst) {
        // Calculate transformation from src to dst
        const A = [];
        const b = [];

        for (let i = 0; i < 4; i++) {
            A.push([src[i].x, src[i].y, 1, 0, 0, 0, -dst[i].x * src[i].x, -dst[i].x * src[i].y]);
            A.push([0, 0, 0, src[i].x, src[i].y, 1, -dst[i].y * src[i].x, -dst[i].y * src[i].y]);
            b.push(dst[i].x);
            b.push(dst[i].y);
        }

        const h = this.solveLinearSystem(A, b);
        return [...h, 1];
    }

    solveLinearSystem(A, b) {
        const n = b.length;
        const augmented = A.map((row, i) => [...row, b[i]]);

        // Gaussian elimination with partial pivoting
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }

            // Swap rows
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

            // Check for singular matrix
            if (Math.abs(augmented[i][i]) < 1e-10) {
                continue;
            }

            // Eliminate column
            for (let k = i + 1; k < n; k++) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j <= n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }

        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            if (Math.abs(augmented[i][i]) < 1e-10) {
                x[i] = 0;
                continue;
            }

            x[i] = augmented[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= augmented[i][j] * x[j];
            }
            x[i] /= augmented[i][i];
        }

        return x;
    }

    transformPoint(x, y, matrix) {
        const w = matrix[6] * x + matrix[7] * y + matrix[8];
        return {
            x: (matrix[0] * x + matrix[1] * y + matrix[2]) / w,
            y: (matrix[3] * x + matrix[4] * y + matrix[5]) / w
        };
    }

    cancel() {
        this.onComplete(null);
    }
}
