// Remove Splash Loader when page is fully loaded
window.addEventListener('load', function() {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 600);
    }, 800);
});

// Theme Toggle Functionality
function toggleTheme() {
    const body = document.documentElement;
    const themeBtn = document.getElementById('themeBtn');
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeBtn.innerHTML = '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    }
}

// Live Clock
function updateClock() {
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    document.getElementById('liveClock').innerText = now.toLocaleString('en-US', options);
}
setInterval(updateClock, 1000);
updateClock();

let cropperFront = null;
let cropperBack = null;

function getRequiredRatio() {
    let mode = document.getElementById('docMode').value;
    if (mode === 'id') return 85.6 / 54.0;
    else if (mode === 'custom') {
        let w = parseFloat(document.getElementById('cWidth').value) || 100;
        let h = parseFloat(document.getElementById('cHeight').value) || 100;
        return w / h;
    } else return NaN; 
}

function changeMode() {
    let mode = document.getElementById('docMode').value;
    let customDiv = document.getElementById('customDimensions');
    customDiv.style.display = (mode === 'custom') ? 'flex' : 'none';
    let ratio = getRequiredRatio();
    if (cropperFront) cropperFront.setAspectRatio(ratio);
    if (cropperBack) cropperBack.setAspectRatio(ratio);
}

function initCrop(input, imgId, containerId, controlsId, side) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(imgId);
            img.src = e.target.result;
            document.getElementById(containerId).style.display = 'block';
            document.getElementById(controlsId).style.display = 'block';

            let ratio = getRequiredRatio();

            if (side === 1) {
                if (cropperFront) cropperFront.destroy();
                cropperFront = new Cropper(img, { aspectRatio: ratio, viewMode: 1, dragMode: 'move' });
                document.getElementById('frontStraightenVal').innerText = "0°";
            } else {
                if (cropperBack) cropperBack.destroy();
                cropperBack = new Cropper(img, { aspectRatio: ratio, viewMode: 1, dragMode: 'move' });
                document.getElementById('backStraightenVal').innerText = "0°";
            }
            checkReady();
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Geometry Tools
function rotateImage(side) {
    if (side === 1 && cropperFront) cropperFront.rotate(90);
    else if (side === 2 && cropperBack) cropperBack.rotate(90);
}

function straightenImage(side, degree) {
    if (side === 1 && cropperFront) {
        document.getElementById('frontStraightenVal').innerText = degree + "°";
        cropperFront.rotateTo(degree);
    } else if (side === 2 && cropperBack) {
        document.getElementById('backStraightenVal').innerText = degree + "°";
        cropperBack.rotateTo(degree);
    }
}

function checkReady() {
    if (cropperFront || cropperBack) document.getElementById('previewBtn').disabled = false;
}

// Generate Final A4 Canvas with Filters
function generateA4Canvas() {
    let drawCanvas = document.createElement('canvas');
    drawCanvas.width = 2480; // A4 300dpi width
    drawCanvas.height = 3508; // A4 300dpi height
    let ctx = drawCanvas.getContext('2d');
    
    // Background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

    // Apply selected Filter globally to context
    const currentFilter = document.getElementById('globalFilter').value;
    if (currentFilter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
    } else if (currentFilter === 'bw') {
        ctx.filter = 'grayscale(100%) contrast(250%) brightness(120%)';
    } else {
        ctx.filter = 'none';
    }

    const ppmm = 11.811; 
    let mode = document.getElementById('docMode').value;
    let docs = [];
    
    // Grab high-quality cropped regions
    if (cropperFront) docs.push(cropperFront.getCroppedCanvas({imageSmoothingEnabled: true, imageSmoothingQuality: 'high'}));
    if (cropperBack) docs.push(cropperBack.getCroppedCanvas({imageSmoothingEnabled: true, imageSmoothingQuality: 'high'}));

    if (mode === 'id' || mode === 'custom') {
        let w = (mode === 'id') ? 85.6 : (parseFloat(document.getElementById('cWidth').value) || 100);
        let h = (mode === 'id') ? 54.0 : (parseFloat(document.getElementById('cHeight').value) || 100);
        
        let cardW = w * ppmm;
        let cardH = h * ppmm;
        let centerX = (drawCanvas.width - cardW) / 2;
        let yOffset = 15 * ppmm;
        let gap = 15 * ppmm;

        for (let i = 0; i < docs.length; i++) {
            ctx.drawImage(docs[i], centerX, yOffset, cardW, cardH);
            yOffset += cardH + gap;
        }
    } else if (mode === 'general') {
        let maxWidth = 190 * ppmm; 
        let maxHeight = 277 * ppmm; 
        let gap = 10 * ppmm;

        if (docs.length === 1) {
            let c = docs[0];
            let scale = Math.min(maxWidth / c.width, maxHeight / c.height);
            let drawW = c.width * scale;
            let drawH = c.height * scale;
            let centerX = (drawCanvas.width - drawW) / 2;
            ctx.drawImage(c, centerX, 10 * ppmm, drawW, drawH);
        } else if (docs.length === 2) {
            let maxH = (maxHeight / 2) - (gap / 2);
            let yOffset = 10 * ppmm;
            
            for (let i = 0; i < docs.length; i++) {
                let c = docs[i];
                let scale = Math.min(maxWidth / c.width, maxH / c.height);
                let drawW = c.width * scale;
                let drawH = c.height * scale;
                let centerX = (drawCanvas.width - drawW) / 2;
                ctx.drawImage(c, centerX, yOffset, drawW, drawH);
                yOffset += drawH + gap;
            }
        }
    }

    // Reset filter 
    ctx.filter = 'none';

    return drawCanvas;
}

function showPreview() {
    if (!cropperFront && !cropperBack) return;
    
    const a4Canvas = generateA4Canvas();
    const previewDataUrl = a4Canvas.toDataURL('image/jpeg', 0.5);
    document.getElementById('finalPreviewImg').src = previewDataUrl;
    
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('previewSection').classList.add('fade-in-up');
    
    document.getElementById('pdfBtn').style.display = 'flex';
    document.getElementById('jpgBtn').style.display = 'flex';
    document.getElementById('printBtn').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Print functionality
function printDocument() {
    const dataUrl = document.getElementById('finalPreviewImg').src;
    if(!dataUrl) return;

    let windowContent = '<!DOCTYPE html>';
    windowContent += '<html><head><title>Print Scanned Document</title></head>';
    windowContent += '<body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#525659;">';
    windowContent += '<img src="' + dataUrl + '" style="max-width:100%;max-height:100%;box-shadow:0 0 10px rgba(0,0,0,0.5);">';
    windowContent += '</body></html>';
    
    const printWin = window.open('', '', 'width=900,height=900');
    printWin.document.open();
    printWin.document.write(windowContent);
    printWin.document.close();
    printWin.focus();
    
    setTimeout(() => {
        printWin.print();
        printWin.close();
    }, 250);
}

// File Compression Logic
async function compressToTargetKB(sourceCanvas, targetKB) {
    return new Promise((resolve) => {
        let quality = 0.9;
        let scale = 1.0;
        let dataUrl = sourceCanvas.toDataURL('image/jpeg', quality);
        let currentKB = Math.round((dataUrl.length * 0.75) / 1024);

        if (currentKB <= targetKB) { resolve(dataUrl); return; }

        let tempCanvas = document.createElement('canvas');
        let ctx = tempCanvas.getContext('2d');

        const compressLoop = setInterval(() => {
            if (currentKB <= targetKB || scale <= 0.2) {
                clearInterval(compressLoop);
                resolve(dataUrl);
                return;
            }
            if (quality > 0.3) quality -= 0.1; 
            else { scale -= 0.1; quality = 0.8; }

            tempCanvas.width = sourceCanvas.width * scale;
            tempCanvas.height = sourceCanvas.height * scale;
            ctx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
            
            dataUrl = tempCanvas.toDataURL('image/jpeg', quality);
            currentKB = Math.round((dataUrl.length * 0.75) / 1024);
        }, 10);
    });
}

function getSmartFileName(extension) {
    let userInput = document.getElementById('customFileName').value.trim();
    let baseName = userInput ? userInput : "Smart_Print_Doc";
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const timeStr = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    baseName = baseName.replace(/[^a-z0-9_\-]/gi, '_').replace(/ /g, '_');
    return `${baseName}_${dateStr}_${timeStr}.${extension}`;
}

async function processDownload(type) {
    if (!cropperFront && !cropperBack) return;

    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('pdfBtn').disabled = true;
    document.getElementById('jpgBtn').disabled = true;
    document.getElementById('printBtn').disabled = true;

    const targetKB = parseFloat(document.getElementById('targetKB').value) || 200;
    const drawCanvas = generateA4Canvas();

    let finalCompressedImage = await compressToTargetKB(drawCanvas, targetKB);
    const finalFileName = getSmartFileName(type);

    if (type === 'jpg') {
        let link = document.createElement('a');
        link.download = finalFileName;
        link.href = finalCompressedImage;
        link.click();
    } 
    else if (type === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.addImage(finalCompressedImage, 'JPEG', 0, 0, 210, 297);
        doc.save(finalFileName);
    }

    document.getElementById('loadingMsg').style.display = 'none';
    document.getElementById('pdfBtn').disabled = false;
    document.getElementById('jpgBtn').disabled = false;
    document.getElementById('printBtn').disabled = false;
}

