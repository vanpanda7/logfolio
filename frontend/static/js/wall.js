/**
 * 成就墙：按用户分类展示封面拼贴（不规则大小、深色主题）
 */
(function () {
    let categories = [];
    let currentCategoryId = null;
    let currentCategoryName = '';
    var wallItems = [];
    var _wallLoading = false;

    var defaultSettings = {
        bg: 'default',
        cols: 6,
        gap: 10,
        radius: 10,
        fullwidth: false,
        scrollSpeed: 3
    };
    var settings = Object.assign({}, defaultSettings);
    var itemSizes = {};

    function loadItemSizes() {
        try {
            var saved = localStorage.getItem('wall-item-sizes');
            if (saved) {
                itemSizes = JSON.parse(saved) || {};
            }
        } catch (e) {
            itemSizes = {};
        }
    }

    function saveItemSizes() {
        try {
            localStorage.setItem('wall-item-sizes', JSON.stringify(itemSizes));
        } catch (e) {}
    }

    function setItemSize(itemId, size) {
        if (size === '1x1') {
            delete itemSizes[itemId];
        } else {
            itemSizes[itemId] = size;
        }
        saveItemSizes();
    }

    function getItemSize(itemId) {
        if (itemSizes[itemId]) {
            return itemSizes[itemId];
        }
        var sizes = ['1x1', '1x1', '1x1', '1x1', '2x2'];
        var size = sizes[Math.floor(Math.random() * sizes.length)];
        itemSizes[itemId] = size;
        saveItemSizes();
        return size;
    }

    function loadSettings() {
        try {
            var saved = localStorage.getItem('wall-settings');
            if (saved) {
                var parsed = JSON.parse(saved);
                settings = Object.assign({}, defaultSettings, parsed);
            }
        } catch (e) {}
    }

    function saveSettings() {
        try {
            localStorage.setItem('wall-settings', JSON.stringify(settings));
        } catch (e) {}
    }

    function applySettings() {
        var wrapper = document.getElementById('wall-page');
        var grid = document.getElementById('wall-grid');
        if (!wrapper || !grid) return;

        if (settings.bg === 'default') {
            wrapper.style.background = '';
        } else {
            wrapper.style.background = settings.bg;
        }

        var cols = settings.cols;
        var gap = settings.gap;
        var radius = settings.radius;
        var fullwidth = settings.fullwidth;

        grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        grid.style.gridAutoRows = 'minmax(100px, auto)';
        grid.style.gap = gap + 'px';

        if (fullwidth) {
            grid.style.maxWidth = 'none';
            grid.style.paddingLeft = '16px';
            grid.style.paddingRight = '16px';
        } else {
            grid.style.maxWidth = '1200px';
            grid.style.paddingLeft = '';
            grid.style.paddingRight = '';
        }

        var cells = grid.querySelectorAll('.wall-cell');
        cells.forEach(function(cell) {
            cell.style.borderRadius = radius + 'px';
        });

        updateSettingsUI();
    }

    function updateSettingsUI() {
        var bgBtns = document.querySelectorAll('.wall-color-btn');
        bgBtns.forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-bg') === settings.bg);
        });
        var customBg = document.getElementById('wall-custom-bg');
        if (customBg && settings.bg !== 'default' && !settings.bg.startsWith('linear')) {
            customBg.value = settings.bg;
        }

        var colsInput = document.getElementById('wall-cols');
        var colsValue = document.getElementById('wall-cols-value');
        if (colsInput) {
            colsInput.value = settings.cols;
            if (colsValue) colsValue.textContent = settings.cols;
        }

        var gapInput = document.getElementById('wall-gap');
        var gapValue = document.getElementById('wall-gap-value');
        if (gapInput) {
            gapInput.value = settings.gap;
            if (gapValue) gapValue.textContent = settings.gap + 'px';
        }

        var radiusInput = document.getElementById('wall-radius');
        var radiusValue = document.getElementById('wall-radius-value');
        if (radiusInput) {
            radiusInput.value = settings.radius;
            if (radiusValue) radiusValue.textContent = settings.radius + 'px';
        }

        var fullwidthCheckbox = document.getElementById('wall-fullwidth');
        if (fullwidthCheckbox) {
            fullwidthCheckbox.checked = settings.fullwidth;
        }

        var scrollSpeedInput = document.getElementById('wall-scroll-speed');
        var scrollSpeedValue = document.getElementById('wall-scroll-speed-value');
        if (scrollSpeedInput) {
            scrollSpeedInput.value = settings.scrollSpeed;
            if (scrollSpeedValue) scrollSpeedValue.textContent = settings.scrollSpeed;
        }
    }

    function initSettingsPanel() {
        loadSettings();
        loadItemSizes();
        applySettings();

        var settingsBtn = document.getElementById('wall-settings-btn');
        var panel = document.getElementById('wall-settings-panel');
        var closeBtn = panel ? panel.querySelector('.wall-settings-close') : null;

        if (settingsBtn && panel) {
            settingsBtn.addEventListener('click', function() {
                panel.classList.add('open');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                panel.classList.remove('open');
            });
        }

        document.addEventListener('click', function(e) {
            if (panel && panel.classList.contains('open')) {
                if (!panel.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
                    panel.classList.remove('open');
                }
            }
        });

        var bgBtns = document.querySelectorAll('.wall-color-btn');
        bgBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                settings.bg = this.getAttribute('data-bg');
                saveSettings();
                applySettings();
            });
        });

        var customBg = document.getElementById('wall-custom-bg');
        if (customBg) {
            customBg.addEventListener('input', function() {
                settings.bg = this.value;
                saveSettings();
                applySettings();
            });
        }

        var colsInput = document.getElementById('wall-cols');
        var colsValue = document.getElementById('wall-cols-value');
        if (colsInput) {
            colsInput.addEventListener('input', function() {
                settings.cols = parseInt(this.value, 10);
                if (colsValue) colsValue.textContent = settings.cols;
                saveSettings();
                applySettings();
            });
        }

        var gapInput = document.getElementById('wall-gap');
        var gapValue = document.getElementById('wall-gap-value');
        if (gapInput) {
            gapInput.addEventListener('input', function() {
                settings.gap = parseInt(this.value, 10);
                if (gapValue) gapValue.textContent = settings.gap + 'px';
                saveSettings();
                applySettings();
            });
        }

        var radiusInput = document.getElementById('wall-radius');
        var radiusValue = document.getElementById('wall-radius-value');
        if (radiusInput) {
            radiusInput.addEventListener('input', function() {
                settings.radius = parseInt(this.value, 10);
                if (radiusValue) radiusValue.textContent = settings.radius + 'px';
                saveSettings();
                applySettings();
            });
        }

        var resetBtn = document.getElementById('wall-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                settings = Object.assign({}, defaultSettings);
                saveSettings();
                applySettings();
            });
        }

        var fullwidthCheckbox = document.getElementById('wall-fullwidth');
        if (fullwidthCheckbox) {
            fullwidthCheckbox.addEventListener('change', function() {
                settings.fullwidth = this.checked;
                saveSettings();
                applySettings();
            });
        }

        var scrollSpeedInput = document.getElementById('wall-scroll-speed');
        var scrollSpeedValue = document.getElementById('wall-scroll-speed-value');
        if (scrollSpeedInput) {
            scrollSpeedInput.addEventListener('input', function() {
                settings.scrollSpeed = parseInt(this.value, 10);
                if (scrollSpeedValue) scrollSpeedValue.textContent = settings.scrollSpeed;
                saveSettings();
            });
        }

        var reshuffleBtn = document.getElementById('wall-reshuffle-btn');
        if (reshuffleBtn) {
            reshuffleBtn.addEventListener('click', function() {
                itemSizes = {};
                saveItemSizes();
                loadWall();
                if (typeof showMessage === 'function') showMessage('已重新随机布局', 'success');
            });
        }

        var displayModeBtn = document.getElementById('wall-display-mode-btn');
        if (displayModeBtn) {
            displayModeBtn.addEventListener('click', enterDisplayMode);
        }
    }

    var displayModeItems = [];
    var displayModePaused = false;

    function enterDisplayMode() {
        var panel = document.getElementById('wall-settings-panel');
        if (panel) panel.classList.remove('open');

        var displayMode = document.getElementById('wall-display-mode');
        if (!displayMode) return;

        displayModeItems = wallItems.map(function(item) {
            return {
                image: item.image_webp || item.image || '/static/images/placeholder.svg',
                title: item.title || ''
            };
        });

        if (displayModeItems.length === 0) {
            if (typeof showMessage === 'function') showMessage('没有可展示的内容', 'error');
            return;
        }

        renderDisplayMode();
        displayMode.classList.add('active');
        document.body.style.overflow = 'hidden';
        displayModePaused = false;
        updateDisplayPauseBtn();
    }

    function exitDisplayMode() {
        var displayMode = document.getElementById('wall-display-mode');
        if (displayMode) {
            displayMode.classList.remove('active');
        }
        document.body.style.overflow = '';
    }

    function toggleDisplayPause() {
        displayModePaused = !displayModePaused;
        var columns = document.querySelectorAll('.wall-display-column');
        columns.forEach(function(col) {
            if (displayModePaused) {
                col.classList.add('paused');
            } else {
                col.classList.remove('paused');
            }
        });
        updateDisplayPauseBtn();
    }

    function updateDisplayPauseBtn() {
        var btn = document.getElementById('wall-display-pause');
        if (btn) {
            btn.textContent = displayModePaused ? '▶' : '⏸';
            btn.title = displayModePaused ? '继续' : '暂停';
        }
    }

    function renderDisplayMode() {
        var container = document.getElementById('wall-display-columns');
        if (!container) return;

        const fragment = document.createDocumentFragment();

        var columnCount = Math.min(6, Math.max(3, Math.ceil(displayModeItems.length / 10)));
        var columns = [];
        for (var i = 0; i < columnCount; i++) {
            columns.push([]);
        }

        displayModeItems.forEach(function(item, index) {
            columns[index % columnCount].push(item);
        });

        var baseDuration = 120 - (settings.scrollSpeed * 10);

        columns.forEach(function(columnItems, colIndex) {
            var column = document.createElement('div');
            column.className = 'wall-display-column' + (colIndex % 2 === 1 ? ' reverse' : '');

            var duration = baseDuration + (colIndex * 5) + Math.random() * 10;
            column.style.setProperty('--scroll-duration', duration + 's');

            var allItems = columnItems.concat(columnItems);

            allItems.forEach(function(item) {
                var cell = document.createElement('div');
                cell.className = 'wall-display-cell';
                cell.innerHTML =
                    '<img src="' + item.image + '" alt="" loading="lazy">' +
                    '<div class="wall-display-cell-overlay">' +
                    '<span class="wall-display-cell-title">' + (item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>' +
                    '</div>';
                column.appendChild(cell);
            });

            fragment.appendChild(column);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    function getGridSizeClass(item) {
        var size = getItemSize(item.id);
        switch (size) {
            case '2x2': return 'wall-cell-size-2';
            case '1x2': return 'wall-cell-size-1-2';
            case '2x1': return 'wall-cell-size-2-1';
            default: return 'wall-cell-size-1';
        }
    }

    function renderWall(items) {
        wallItems = items || [];
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

        const fragment = document.createDocumentFragment();
        items.forEach(function (item, index) {
            const cell = document.createElement('div');
            cell.className = 'wall-cell ' + getGridSizeClass(item);
            const imgUrl = (item.image_webp || item.image) || '/static/images/placeholder.svg';
            cell.innerHTML =
                '<img src="' + imgUrl + '" loading="lazy" alt="' + (item.title || '').replace(/"/g, '&quot;') + '" onerror="this.src=\'/static/images/placeholder.svg\'">' +
                '<div class="wall-cell-overlay"><span class="wall-cell-title">' + (item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>';
            cell.addEventListener('click', function () {
                openFullscreen(item);
            });
            cell.style.borderRadius = settings.radius + 'px';
            fragment.appendChild(cell);
        });
        grid.appendChild(fragment);
    }

    function openFullscreen(item) {
        const el = document.getElementById('wall-fullscreen');
        const img = document.getElementById('wall-fullscreen-img');
        const title = document.getElementById('wall-fullscreen-title');
        const viewBtn = document.getElementById('wall-fullscreen-view');
        const editBtn = document.getElementById('wall-fullscreen-edit');
        if (!el || !img) return;
        img.src = item.image || '';
        img.alt = item.title || '';
        if (title) title.textContent = item.title || '';
        if (viewBtn) {
            viewBtn.onclick = function() {
                closeFullscreen();
                showItemDetail(item.id, false);
            };
        }
        if (editBtn) {
            editBtn.onclick = function() {
                closeFullscreen();
                showItemDetail(item.id, true);
            };
        }
        var currentSize = getItemSize(item.id);
        var sizeBtns = el.querySelectorAll('.wall-size-btn');
        sizeBtns.forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-size') === currentSize);
            btn.onclick = function() {
                sizeBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                setItemSize(item.id, this.getAttribute('data-size'));
                loadWall();
            };
        });
        el.classList.add('wall-fullscreen-show');
    }

    function showItemDetail(itemId, startEdit) {
        if (typeof showMessage === 'function') showMessage('加载中...', 'info');
        ItemsAPI.getById(itemId).then(function(item) {
            if (!item) {
                if (typeof showMessage === 'function') showMessage('未找到该记录', 'error');
                return;
            }
            renderDetailDialog(item, startEdit);
        }).catch(function(err) {
            if (typeof showMessage === 'function') showMessage('加载失败: ' + (err.message || ''), 'error');
        });
    }

    function renderDetailDialog(item, startEdit) {
        var overlay = document.createElement('div');
        overlay.className = 'item-detail-overlay';
        overlay.dataset.itemId = item.id;

        var imagesHTML = '';
        if (item.images && item.images.length > 0) {
            imagesHTML = '<div class="item-detail-images" id="item-detail-images-' + item.id + '">' +
                item.images.map(function(img, idx) {
                    return '<div class="item-detail-image-item" data-image-id="' + img.id + '">' +
                        '<img src="' + img.image_url + '" alt="图片 ' + (idx + 1) + '">' +
                        '</div>';
                }).join('') + '</div>';
        } else {
            imagesHTML = '<div class="item-detail-images" id="item-detail-images-' + item.id + '"></div>';
        }

        var dateStr = item.finish_time ? item.finish_time.slice(0, 10) : '';
        var editTitleValue = (item.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

        var dialog = document.createElement('div');
        dialog.className = 'item-detail-dialog';
        dialog.innerHTML =
            '<div class="item-detail-content">' +
            '<button class="item-detail-close">✕</button>' +
            '<div class="item-detail-header">' +
            '<div class="item-detail-badge">' + (item.category_name || '') + '</div>' +
            '<div class="item-detail-view">' +
            '<h2 class="item-detail-title">' + (item.title || '') + '</h2>' +
            '<div class="item-detail-date"><span class="date-icon">📅</span> ' + (dateStr || '未填写') + '</div>' +
            '</div>' +
            '<div class="item-detail-edit" style="display:none;" data-item-id="' + item.id + '">' +
            '<label class="item-detail-edit-label">标题</label>' +
            '<input type="text" class="item-detail-edit-title" value="' + editTitleValue + '" placeholder="标题">' +
            '<label class="item-detail-edit-label">完成时间</label>' +
            '<input type="date" class="item-detail-edit-finish" value="' + dateStr + '">' +
            '<div class="item-detail-edit-actions">' +
            '<button type="button" class="btn btn-primary btn-sm wall-detail-save">保存</button>' +
            '<button type="button" class="btn btn-secondary btn-sm wall-detail-cancel">取消</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            (item.notes ? '<div class="item-detail-notes"><h3>备注/感想</h3><p>' + item.notes + '</p></div>' : '') +
            '<div class="item-detail-images-section">' +
            '<div class="item-detail-images-header"><h3>图片</h3></div>' +
            imagesHTML +
            '</div>' +
            '<div class="item-detail-actions">' +
            '<button type="button" class="btn btn-secondary wall-detail-edit-btn">编辑</button>' +
            '<button type="button" class="btn btn-danger wall-detail-delete">删除记录</button>' +
            '</div>' +
            '</div>';

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        setTimeout(function() { overlay.classList.add('show'); }, 10);

        overlay.querySelector('.item-detail-close').addEventListener('click', function() {
            closeDetailDialog(overlay);
        });
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeDetailDialog(overlay);
        });

        overlay.querySelector('.wall-detail-edit-btn').addEventListener('click', function() {
            var view = overlay.querySelector('.item-detail-view');
            var edit = overlay.querySelector('.item-detail-edit');
            if (view) view.style.display = 'none';
            if (edit) edit.style.display = 'block';
        });

        overlay.querySelector('.wall-detail-cancel').addEventListener('click', function() {
            var view = overlay.querySelector('.item-detail-view');
            var edit = overlay.querySelector('.item-detail-edit');
            if (view) view.style.display = 'block';
            if (edit) edit.style.display = 'none';
        });

        overlay.querySelector('.wall-detail-save').addEventListener('click', function() {
            var titleInput = overlay.querySelector('.item-detail-edit-title');
            var dateInput = overlay.querySelector('.item-detail-edit-finish');
            ItemsAPI.update(item.id, {
                title: titleInput.value,
                finish_time: dateInput.value || null
            }).then(function() {
                overlay.querySelector('.item-detail-title').textContent = titleInput.value;
                overlay.querySelector('.item-detail-date').innerHTML = '<span class="date-icon">📅</span> ' + (dateInput.value || '未填写');
                var view = overlay.querySelector('.item-detail-view');
                var edit = overlay.querySelector('.item-detail-edit');
                if (view) view.style.display = 'block';
                if (edit) edit.style.display = 'none';
                if (typeof showMessage === 'function') showMessage('保存成功', 'success');
                loadWall();
            }).catch(function(err) {
                if (typeof showMessage === 'function') showMessage('保存失败: ' + (err.message || ''), 'error');
            });
        });

        overlay.querySelector('.wall-detail-delete').addEventListener('click', function() {
            if (!confirm('确定要删除这条记录吗？')) return;
            ItemsAPI.delete(item.id).then(function() {
                closeDetailDialog(overlay);
                if (typeof showMessage === 'function') showMessage('已删除', 'success');
                loadWall();
            }).catch(function(err) {
                if (typeof showMessage === 'function') showMessage('删除失败: ' + (err.message || ''), 'error');
            });
        });

        if (startEdit) {
            setTimeout(function() {
                var view = overlay.querySelector('.item-detail-view');
                var edit = overlay.querySelector('.item-detail-edit');
                if (view) view.style.display = 'none';
                if (edit) edit.style.display = 'block';
            }, 100);
        }
    }

    function closeDetailDialog(overlay) {
        overlay.classList.remove('show');
        setTimeout(function() { overlay.remove(); }, 300);
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
            if (btn) { btn.disabled = false; btn.textContent = '保存为图片'; }
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
            var bgColor = '#0f0f1a';
            if (settings.bg !== 'default') {
                bgColor = settings.bg;
            }
            var opts = {
                useCORS: true,
                allowTaint: false,
                scale: 2,
                logging: false,
                backgroundColor: bgColor,
                imageTimeout: 15000,
                onclone: function (clonedDoc, clonedNode) {
                    if (clonedNode && clonedNode.style) {
                        clonedNode.style.background = bgColor;
                        clonedNode.style.backgroundImage = 'none';
                    }
                    var header = clonedNode.querySelector ? clonedNode.querySelector('.wall-header') : null;
                    if (header && header.style) header.style.display = 'none';
                    var footer = clonedNode.querySelector ? clonedNode.querySelector('.wall-footer') : null;
                    if (footer && footer.style) footer.style.display = 'none';
                    var overlays = clonedNode.querySelectorAll ? clonedNode.querySelectorAll('.wall-cell-overlay') : [];
                    for (var o = 0; o < overlays.length; o++) {
                        if (overlays[o].style) overlays[o].style.display = 'none';
                    }
                    var clones = clonedNode.querySelectorAll ? clonedNode.querySelectorAll('.wall-cell img[src]') : [];
                    for (var k = 0; k < clones.length; k++) {
                        if (clones[k].style) {
                            clones[k].style.objectFit = 'contain';
                            clones[k].style.backgroundColor = 'rgba(0,0,0,0.25)';
                        }
                        if (k < blobUrls.length && blobUrls[k]) clones[k].src = blobUrls[k];
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
                                if (btn) { btn.disabled = false; btn.textContent = '保存为图片'; }
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
                        if (btn) { btn.disabled = false; btn.textContent = '保存为图片'; }
                    }, mime, quality);
                }
                doDownload('image/webp', '.webp', 0.85);
            }).catch(function (err) {
                restoreImages();
                if (typeof showMessage === 'function') showMessage('生成失败: ' + (err.message || ''), 'error');
                if (btn) { btn.disabled = false; btn.textContent = '保存为图片'; }
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
        if (_wallLoading) return;
        _wallLoading = true;
        
        const grid = document.getElementById('wall-grid');
        if (grid) grid.innerHTML = '<div class="wall-loading">加载中...</div>';

        ItemsAPI.getAchievementWall(currentCategoryId)
            .then(function (res) {
                const items = (res && res.items) ? res.items : [];
                renderWall(items);
                _wallLoading = false;
            })
            .catch(function (err) {
                if (typeof showMessage === 'function') showMessage('加载成就墙失败: ' + (err.message || ''), 'error');
                renderWall([]);
                _wallLoading = false;
            });
    }

    function renderTabs() {
        var container = document.getElementById('wall-tabs');
        if (!container) return;
        if (!categories.length) {
            container.innerHTML = '<span class="wall-tabs-empty">暂无分类，请先<a href="/categories">添加分类</a></span>';
            return;
        }
        const fragment = document.createDocumentFragment();
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
            fragment.appendChild(btn);
        });
        container.innerHTML = '';
        container.appendChild(fragment);
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
        initSettingsPanel();
        initWall();

        var exportBtn = document.getElementById('wall-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportWallAsImage);

        var fs = document.getElementById('wall-fullscreen');
        if (fs) {
            fs.addEventListener('click', function (e) {
                if (e.target === fs) closeFullscreen();
                else if (e.target.closest('.wall-fullscreen-close')) closeFullscreen();
            });
            var closeBtn = document.querySelector('.wall-fullscreen-close');
            if (closeBtn) closeBtn.addEventListener('click', closeFullscreen);
        }

        var displayMode = document.getElementById('wall-display-mode');
        var displayClose = document.getElementById('wall-display-close');
        var displayPause = document.getElementById('wall-display-pause');
        if (displayClose) {
            displayClose.addEventListener('click', exitDisplayMode);
        }
        if (displayPause) {
            displayPause.addEventListener('click', toggleDisplayPause);
        }

        document.addEventListener('keydown', function(e) {
            if (displayMode && displayMode.classList.contains('active')) {
                if (e.key === 'Escape') {
                    exitDisplayMode();
                } else if (e.key === ' ') {
                    e.preventDefault();
                    toggleDisplayPause();
                }
            }
        });
    });
})();
