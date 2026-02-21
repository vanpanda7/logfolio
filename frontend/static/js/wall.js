/**
 * 成就墙：按用户分类展示封面拼贴（不规则大小、深色主题）
 */
(function () {
    let categories = [];
    let currentCategoryId = null;
    let currentCategoryName = '';

    function getGridSizeClass(index, total) {
        if (total <= 0) return 'wall-cell-size-1';
        var r = (index * 7 + 11) % 12;
        if (r < 1) return 'wall-cell-size-2';   // 约 8% 大块（2x2），避免空洞过多
        if (r < 4) return 'wall-cell-size-1-2'; // 约 25% 竖高（1x2），便于 dense 填缝
        return 'wall-cell-size-1';
    }

    function renderWall(items) {
        const grid = document.getElementById('wall-grid');
        const empty = document.getElementById('wall-empty');
        const statCount = document.getElementById('wall-stat-count');
        const statLabel = document.getElementById('wall-stat-label');

        if (!grid) return;

        if (statCount) statCount.textContent = items.length;
        if (statLabel) statLabel.textContent = currentCategoryName || '';

        if (items.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';

        grid.innerHTML = '';
        items.forEach(function (item, index) {
            const cell = document.createElement('div');
            cell.className = 'wall-cell ' + getGridSizeClass(index, items.length);
            const imgUrl = (item.image_webp || item.image) || '/static/images/placeholder.svg';
            cell.innerHTML =
                '<img src="' + imgUrl + '" loading="lazy" alt="' + (item.title || '').replace(/"/g, '&quot;') + '" onerror="this.src=\'/static/images/placeholder.svg\'">' +
                '<div class="wall-cell-overlay"><span class="wall-cell-title">' + (item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
            cell.addEventListener('click', function () {
                openFullscreen(item);
            });
            grid.appendChild(cell);
        });
    }

    function openFullscreen(item) {
        const el = document.getElementById('wall-fullscreen');
        const img = document.getElementById('wall-fullscreen-img');
        const title = document.getElementById('wall-fullscreen-title');
        if (!el || !img) return;
        img.src = item.image || '';
        img.alt = item.title || '';
        if (title) title.textContent = item.title || '';
        el.classList.add('wall-fullscreen-show');
    }

    function closeFullscreen() {
        const el = document.getElementById('wall-fullscreen');
        if (el) el.classList.remove('wall-fullscreen-show');
    }

    window.closeWallFullscreen = closeFullscreen;

    function exportWallAsImage() {
        var wrapper = document.getElementById('wall-page');
        if (!wrapper) return;
        var btn = document.getElementById('wall-export-btn');
        var grid = document.getElementById('wall-grid');
        if (grid && grid.querySelectorAll('.wall-cell').length === 0) {
            if (typeof showMessage === 'function') showMessage('当前没有可导出的内容', 'error');
            return;
        }
        if (typeof showMessage === 'function') showMessage('正在生成图片…', 'info');
        if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }

        if (typeof html2canvas === 'undefined') {
            if (btn) { btn.disabled = false; btn.textContent = '📷 保存为图片'; }
            if (typeof showMessage === 'function') showMessage('请稍候再试或刷新页面', 'error');
            return;
        }

        var imgs = grid ? grid.querySelectorAll('.wall-cell img[src]') : [];
        var blobUrls = [];
        var originals = [];

        function restoreImages() {
            for (var i = 0; i < imgs.length; i++) {
                if (originals[i]) imgs[i].src = originals[i];
                if (blobUrls[i]) URL.revokeObjectURL(blobUrls[i]);
            }
        }

        function doCapture() {
            var opts = {
                useCORS: true,
                allowTaint: false,
                scale: 2,
                logging: false,
                backgroundColor: '#0f0f1a',
                imageTimeout: 15000,
                onclone: function (clonedDoc, clonedNode) {
                    if (clonedNode && clonedNode.style) {
                        clonedNode.style.background = '#0f0f1a';
                        clonedNode.style.backgroundImage = 'none';
                    }
                    var clones = clonedNode.querySelectorAll ? clonedNode.querySelectorAll('.wall-cell img[src]') : [];
                    for (var k = 0; k < clones.length && k < blobUrls.length; k++) {
                        if (blobUrls[k]) clones[k].src = blobUrls[k];
                    }
                    var statVal = clonedNode.querySelector ? clonedNode.querySelector('.wall-stat-value') : null;
                    if (statVal && statVal.style) {
                        statVal.style.webkitTextFillColor = '#a78bfa';
                        statVal.style.backgroundClip = 'unset';
                        statVal.style.color = '#a78bfa';
                    }
                }
            };

            html2canvas(wrapper, opts).then(function (canvas) {
                restoreImages();
                var maxH = 16384;
                var w = canvas.width, h = canvas.height;
                if (h > maxH) {
                    var scale = maxH / h;
                    var c2 = document.createElement('canvas');
                    c2.width = Math.round(w * scale);
                    c2.height = maxH;
                    var ctx = c2.getContext('2d');
                    ctx.drawImage(canvas, 0, 0, w, h, 0, 0, c2.width, c2.height);
                    canvas = c2;
                }
                function doDownload(mime, ext, quality) {
                    canvas.toBlob(function (blob) {
                        if (!blob) {
                            if (mime === 'image/png') {
                                if (typeof showMessage === 'function') showMessage('生成失败', 'error');
                                if (btn) { btn.disabled = false; btn.textContent = '📷 保存为图片'; }
                                return;
                            }
                            doDownload('image/png', '.png', 1);
                            return;
                        }
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = 'logfolio-achievement-wall-' + (new Date().toISOString().slice(0, 10)) + ext;
                        a.click();
                        URL.revokeObjectURL(url);
                        if (typeof showMessage === 'function') showMessage('图片已保存', 'success');
                        if (btn) { btn.disabled = false; btn.textContent = '📷 保存为图片'; }
                    }, mime, quality);
                }
                doDownload('image/webp', '.webp', 0.85);
            }).catch(function (err) {
                restoreImages();
                if (typeof showMessage === 'function') showMessage('生成失败: ' + (err.message || ''), 'error');
                if (btn) { btn.disabled = false; btn.textContent = '📷 保存为图片'; }
            });
        }

        if (imgs.length === 0) {
            doCapture();
            return;
        }

        var loaded = 0;
        var needLoad = imgs.length;
        function checkDone() {
            loaded++;
            if (loaded >= needLoad) doCapture();
        }

        for (var i = 0; i < imgs.length; i++) {
            var img = imgs[i];
            var src = (img.getAttribute('src') || img.src || '').trim();
            originals[i] = img.src || src;
            blobUrls[i] = null;
            if (!src || src.indexOf('data:') === 0 || src.indexOf('blob:') === 0) {
                checkDone();
                continue;
            }
            var isSameOrigin = false;
            try {
                var u = new URL(src, window.location.origin);
                isSameOrigin = u.origin === window.location.origin;
            } catch (e) {}
            if (isSameOrigin) {
                if (img.complete) checkDone();
                else { img.onload = function () { checkDone(); }; img.onerror = function () { checkDone(); }; }
                continue;
            }
            (function (idx) {
                fetch(src, { mode: 'cors', credentials: 'omit' })
                    .then(function (r) { return r.blob(); })
                    .then(function (blob) {
                        var blobU = URL.createObjectURL(blob);
                        blobUrls[idx] = blobU;
                        var im = imgs[idx];
                        im.onload = function () { checkDone(); };
                        im.onerror = function () { checkDone(); };
                        im.src = blobU;
                    })
                    .catch(function () {
                        checkDone();
                    });
            })(i);
        }
    }

    function loadWall() {
        const grid = document.getElementById('wall-grid');
        if (grid) grid.innerHTML = '<div class="wall-loading">加载中...</div>';

        ItemsAPI.getAchievementWall(currentCategoryId)
            .then(function (res) {
                const items = (res && res.items) ? res.items : [];
                renderWall(items);
            })
            .catch(function (err) {
                if (typeof showMessage === 'function') showMessage('加载成就墙失败: ' + (err.message || ''), 'error');
                renderWall([]);
            });
    }

    function renderTabs() {
        var container = document.getElementById('wall-tabs');
        if (!container) return;
        container.innerHTML = '';
        if (!categories.length) {
            container.innerHTML = '<span class="wall-tabs-empty">暂无分类，请先<a href="/categories">添加分类</a></span>';
            return;
        }
        categories.forEach(function (cat) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wall-tab' + (cat.id === currentCategoryId ? ' active' : '');
            btn.setAttribute('data-category-id', cat.id);
            btn.textContent = cat.name || ('分类 ' + cat.id);
            btn.addEventListener('click', function () {
                var id = parseInt(this.getAttribute('data-category-id'), 10);
                if (id === currentCategoryId) return;
                currentCategoryId = id;
                currentCategoryName = (categories.find(function (c) { return c.id === id; }) || {}).name || '';
                document.querySelectorAll('.wall-tab').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                loadWall();
            });
            container.appendChild(btn);
        });
    }

    function initWall() {
        CategoriesAPI.getAll()
            .then(function (list) {
                categories = list || [];
                if (categories.length && currentCategoryId == null) {
                    currentCategoryId = categories[0].id;
                    currentCategoryName = categories[0].name || '';
                }
                renderTabs();
                loadWall();
            })
            .catch(function () {
                categories = [];
                renderTabs();
                loadWall();
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof window.renderHeader === 'function') window.renderHeader('wall');
        initWall();

        var exportBtn = document.getElementById('wall-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportWallAsImage);

        var fs = document.getElementById('wall-fullscreen');
        if (fs) {
            fs.addEventListener('click', function (e) {
                if (e.target === fs || e.target.closest('.wall-fullscreen-close')) closeFullscreen();
            });
            var closeBtn = document.querySelector('.wall-fullscreen-close');
            if (closeBtn) closeBtn.addEventListener('click', closeFullscreen);
        }
    });
})();
