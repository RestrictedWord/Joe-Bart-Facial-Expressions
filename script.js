const imageModal = document.getElementById('imageMsh');
const modalImg = document.getElementById('modalImg');
const videoModal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const videoThumbnails = document.getElementById('videoThumbnails');
const reportModal = document.getElementById('reportModal');

function getYouTubeThumbnail(url) {
    const m = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/maxresdefault.jpg` : null;
}

async function loadData() {
    let data = localStorage.getItem('facesDataCache');
    if (data) data = JSON.parse(data);
    else {
        const res = await fetch('./data/expressions.json', { cache: "force-cache" });
        data = await res.json();
        localStorage.setItem('facesDataCache', JSON.stringify(data));
    }

    const tableBody = document.getElementById('tableBody');
    const datalist = document.getElementById('faceIds');

    const expressions = Object.fromEntries(data.expressions.map(e => [e.id, e]));
    const fragmentTable = document.createDocumentFragment();
    const fragmentOptions = document.createDocumentFragment();

    data.faces.forEach(face => {
        const expr = expressions[face.expression_id] || {};
        const cutout = face.images.find(img => img.type === 'cutout')?.path;

        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td>${face.id}</td>
                <td>${expr.label || face.expression_id}</td>
                <td>${expr.description || ''}</td>
                <td>${Object.entries(face.features).map(([k, v]) => `${k}: ${v}`).join('<br>')}</td>
                <td>${cutout ? `<img src="${cutout}" class="cutout" loading="lazy">` : ''}</td>
                <td><div class="video-carousel"></div></td>
            `;

        const carousel = tr.querySelector('.video-carousel');
        if (face.source_videos.length > 0) {
            const first = face.source_videos[0];
            const firstThumb = getYouTubeThumbnail(first);
            if (firstThumb) {
                const container = document.createElement('div');
                container.className = 'video-wrapper';

                const img = document.createElement('img');
                img.src = firstThumb;
                img.loading = "lazy";
                img.onclick = () => openVideoGallery(face.source_videos, first);
                container.appendChild(img);

                if (face.source_videos.length > 1) {
                    const badge = document.createElement('div');
                    badge.className = 'video-badge';
                    badge.textContent = `+${face.source_videos.length - 1}`;
                    badge.onclick = () => openVideoGallery(face.source_videos, first);
                    container.appendChild(badge);
                }
                carousel.appendChild(container);
            }
        }

        fragmentTable.appendChild(tr);

        const opt = document.createElement('option');
        opt.value = face.id;
        fragmentOptions.appendChild(opt);
    });

    tableBody.appendChild(fragmentTable);
    datalist.appendChild(fragmentOptions);
}

function closeAllModals() {
    imageModal.style.display = 'none';
    videoModal.style.display = 'none';
    reportModal.style.display = 'none';

    const modalVideoFrame = document.getElementById('modalVideoFrame');
    modalVideoFrame.src = '';
}

document.getElementById('closeImage').onclick = () => imageModal.style.display = 'none';
imageModal.onclick = e => { if (e.target === imageModal) imageModal.style.display = 'none'; }

function openVideoGallery(videos, currentUrl) {
    closeAllModals();

    const toEmbed = currentUrl.replace("watch?v=", "embed/");
    const modalVideoFrame = document.getElementById('modalVideoFrame');
    modalVideoFrame.src = toEmbed;

    videoThumbnails.innerHTML = '';

    videos.forEach(url => {
        const thumb = getYouTubeThumbnail(url);
        if (!thumb) return;
        const img = document.createElement('img');
        img.src = thumb;
        img.loading = "lazy";
        img.style.height = '50px';
        img.style.cursor = 'pointer';
        img.onclick = () => {
            modalVideoFrame.src = url.replace("watch?v=", "embed/");
        };
        videoThumbnails.appendChild(img);
    });

    videoModal.style.display = 'flex';
}


document.getElementById('closeVideo').onclick = () => closeAllModals();
videoModal.onclick = e => { if (e.target === videoModal) closeAllModals(); }

document.getElementById('reportBtn').onclick = () => { closeAllModals(); reportModal.style.display = 'flex'; }
document.getElementById('closeReport').onclick = () => reportModal.style.display = 'none';
reportModal.onclick = e => { if (e.target === reportModal) reportModal.style.display = 'none'; }

document.getElementById('tableBody').addEventListener('click', e => {
    if (e.target.classList.contains('cutout')) {
        modalImg.src = e.target.src;
        imageModal.style.display = 'flex';
        return;
    }
});

document.getElementById('searchInput').addEventListener('input', e => {
    const text = e.target.value.toLowerCase();
    document.querySelectorAll('#tableBody tr').forEach(tr =>
        tr.style.display = tr.textContent.toLowerCase().includes(text) ? '' : 'none'
    );
});

document.getElementById('reportForm').addEventListener('submit', async e => {
    e.preventDefault();
    const faceId = document.getElementById('faceId').value;
    const issueType = document.getElementById('issueType').value;
    const comments = document.getElementById('comments').value;
    const cutoutUrl = document.getElementById('reportCutout').src;

    const payload = {
        embeds: [{
            title: 'Face Data Report',
            color: 16711680,
            fields: [
                { name: 'Face ID', value: faceId },
                { name: 'Issue Type', value: issueType },
                { name: 'Comments', value: comments || 'None' }
            ],
            image: { url: cutoutUrl || '' },
            timestamp: new Date()
        }]
    };
    // Don't abuse me; I'm all shy and vulnerable. 😳
    await fetch('https://discord.com/api/webhooks/1437190866673471699/nLLJUt_wNG7boLg2lLelr3tBOc_Onfw5Prvun4womTfKk5wkukVuC8G8-5xc_4yM09sU', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });

    reportModal.style.display = 'none';
    e.target.reset();
});

document.getElementById('tableBody').addEventListener('click', e => {
    const row = e.target.closest('tr');
    if (!row) return;

    if (
        e.target.classList.contains('cutout') ||
        e.target.closest('.video-carousel') ||
        e.target.closest('.video-wrapper') ||
        e.target.classList.contains('video-badge')
    ) {
        return;
    }

    const faceId = row.cells[0].textContent;
    const cutoutImg = row.querySelector('.cutout');

    document.getElementById('faceId').value = faceId;
    document.getElementById('reportCutout').src = cutoutImg ? cutoutImg.src : '';

    closeAllModals();
    reportModal.style.display = 'flex';
});

loadData();