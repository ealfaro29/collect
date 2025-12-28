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

        this.init();
    }

    init() {
        this.img.onload = () => {
            this.setupCanvas();
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
        this.render();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.selectedCorner = null;
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
        // Create a new canvas for the cropped image
        const outputCanvas = document.createElement('canvas');
        const outputSize = 1000;
        outputCanvas.width = outputSize;
        outputCanvas.height = outputSize;
        const outputCtx = outputCanvas.getContext('2d');

        // Scale corners back to original image coordinates
        const scaleX = this.img.width / this.canvas.width;
        const scaleY = this.img.height / this.canvas.height;

        const srcCorners = this.corners.map(c => ({
            x: c.x * scaleX,
            y: c.y * scaleY
        }));

        const dstCorners = [
            { x: 0, y: 0 },
            { x: outputSize, y: 0 },
            { x: outputSize, y: outputSize },
            { x: 0, y: outputSize }
        ];

        // Apply perspective transform
        this.perspectiveTransform(
            this.img,
            srcCorners,
            outputCanvas,
            dstCorners
        );

        // Convert to data URL
        const croppedImage = outputCanvas.toDataURL('image/jpeg', 0.9);
        this.onComplete(croppedImage);
    }

    perspectiveTransform(srcImg, srcCorners, dstCanvas, dstCorners) {
        const dstCtx = dstCanvas.getContext('2d');
        const width = dstCanvas.width;
        const height = dstCanvas.height;

        // Calculate transformation matrix
        const matrix = this.getPerspectiveTransform(srcCorners, dstCorners);

        // Create temporary canvas with source image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = srcImg.width;
        tempCanvas.height = srcImg.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(srcImg, 0, 0);
        const srcData = tempCtx.getImageData(0, 0, srcImg.width, srcImg.height);

        // Create output image data
        const dstData = dstCtx.createImageData(width, height);

        // Apply transformation
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const src = this.transformPoint(x, y, matrix);

                if (src.x >= 0 && src.x < srcImg.width && src.y >= 0 && src.y < srcImg.height) {
                    const srcX = Math.floor(src.x);
                    const srcY = Math.floor(src.y);
                    const srcIdx = (srcY * srcImg.width + srcX) * 4;
                    const dstIdx = (y * width + x) * 4;

                    dstData.data[dstIdx] = srcData.data[srcIdx];
                    dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
                    dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
                    dstData.data[dstIdx + 3] = 255;
                }
            }
        }

        dstCtx.putImageData(dstData, 0, 0);
    }

    getPerspectiveTransform(src, dst) {
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

        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

            for (let k = i + 1; k < n; k++) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j <= n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }

        const x = new Array(n);
        for (let i = n - 1; i >= 0; i--) {
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
