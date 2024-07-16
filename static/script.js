let images = [];
let currentIndex = 0;
let currentPage = 1;
const itemsPerPage = 10;
let totalImages = 0;
let annotatedCount = 0;
let firstUnannotatedIndex = -1;

function fetchImages(page = 1) {
    fetch(`/images?page=${page}&per_page=${itemsPerPage}`)
        .then(response => response.json())
        .then(data => {
            images = data.images;
            totalImages = data.total;
            annotatedCount = data.annotated_count;
            const firstUnannotatedUrl = data.first_unannotated;
            renderImageList();
            if (firstUnannotatedUrl) {
                firstUnannotatedIndex = images.findIndex(image => image.url === firstUnannotatedUrl);
                if (firstUnannotatedIndex !== -1) {
                    currentIndex = firstUnannotatedIndex;
                } else {
                    currentIndex = 0;
                }
            } else {
                currentIndex = 0;
            }
            showImage(currentIndex);
            updateProgressBar();
        });
}

function renderImageList() {
    const imageList = document.getElementById('image-list');
    imageList.innerHTML = '';
    images.forEach((image, index) => {
        const div = document.createElement('div');
        div.textContent = `(${image.label})${image.id}`; // 显示格式 "($label)$ID"
        div.className = 'image-item';
        if (image.clqk == 5) { // 使用CLQK字段判断是否标注
            div.classList.add('annotated');
        }
        if (index === currentIndex) {
            div.classList.add('selected');
        }
        div.onclick = () => {
            showImage(index);
        };
        imageList.appendChild(div);
    });
}

function showImage(index) {
    if (index < 0 || index >= images.length) {
        console.error("Index out of range.");
        return;
    }
    currentIndex = index;
    const image = images[index];
    if (!image) {
        console.error("Image data not found.");
        return;
    }
    document.getElementById('image').src = image.url;
    document.getElementById('caption-input').value = image.label || '';
    document.getElementById('caption-input').focus();
    renderImageList();
}

function submitAnnotation() {
    const captionInput = document.getElementById('caption-input');
    const label = captionInput.value;
    const image = images[currentIndex];

    fetch('/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: image.url, label })
    })
    .then(response => response.json())
    .then(data => {
        image.label = label;
        image.clqk = 5; // 更新本地数据中的CLQK字段
        annotatedCount++;
        renderImageList();
        showToast('已保存');
        updateProgressBar();
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    progressBar.textContent = `${annotatedCount}/${totalImages}`;
}

function nextPage() {
    if ((currentPage * itemsPerPage) < totalImages) {
        currentPage++;
        fetchImages(currentPage);
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        fetchImages(currentPage);
    }
}

function showNextImage() {
    if (currentIndex < images.length - 1) {
        currentIndex++;
        showImage(currentIndex);
    } else if ((currentPage * itemsPerPage) < totalImages) {
        nextPage();
    }
}

function showPreviousImage() {
    if (currentIndex > 0) {
        currentIndex--;
        showImage(currentIndex);
    } else if (currentPage > 1) {
        previousPage();
    }
}

document.getElementById('caption-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        submitAnnotation();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'ArrowDown') {
        showNextImage();
    } else if (e.ctrlKey && e.key === 'ArrowUp') {
        showPreviousImage();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault(); // 防止默认保存行为
        submitAnnotation();
    }
});

// 拖动调整左侧列表宽度
const resizer = document.getElementById('dragMe');
const leftSide = document.getElementById('image-list-container');
const rightSide = document.getElementById('image-viewer');

resizer.addEventListener('mousedown', function(e) {
    e.preventDefault();
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    const dx = e.clientX - resizer.getBoundingClientRect().left;
    leftSide.style.width = (leftSide.offsetWidth + dx) + 'px';
    resizer.style.left = (leftSide.offsetWidth + dx) + 'px';
}

function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}

fetchImages(currentPage);
