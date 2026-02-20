/**
 * 动漫/漫画封面选择器 - 可复用组件
 * 用法：CoverPicker.open({ initialSearch: '主题名', onSelect: function(coverUrl) {} })
 */
(function () {
    var overlay = null;
    var currentOnSelect = null;
    var searchState = { q: '', page: 1, loading: false, loadingMore: false, hasNextPage: false };
    var apiBase = function () { return window.API_BASE_URL || '/api'; };

    function getOverlay() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'cover-picker-overlay';
        overlay.className = 'cover-picker-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
            '<div class="cover-picker-backdrop"></div>' +
            '<div class="cover-picker-sheet">' +
            '  <div class="cover-picker-header">' +
            '    <input type="text" id="cover-picker-search-input" class="cover-picker-search-input" placeholder="支持中文、英文、日文，输入动漫或漫画名">' +
            '    <button type="button" id="cover-picker-search-btn" class="btn btn-primary">搜索</button>' +
            '    <button type="button" id="cover-picker-close-btn" class="cover-picker-close-btn" aria-label="关闭">✕</button>' +
            '  </div>' +
            '  <div class="cover-picker-content-area">' +
            '    <div id="cover-picker-loading" class="cover-picker-loading" style="display: none;">搜索中...</div>' +
            '    <div class="cover-picker-results-wrap">' +
            '      <div id="cover-picker-results" class="cover-picker-results"></div>' +
            '    </div>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(overlay);

        overlay.querySelector('.cover-picker-backdrop').addEventListener('click', close);
        overlay.querySelector('#cover-picker-close-btn').addEventListener('click', close);
        overlay.querySelector('#cover-picker-search-btn').addEventListener('click', doSearch);
        overlay.querySelector('#cover-picker-search-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
        });
        var resultsEl = overlay.querySelector('#cover-picker-results');
        resultsEl.addEventListener('scroll', function onResultsScroll() {
            var el = resultsEl;
            if (searchState.loadingMore || !searchState.hasNextPage || !searchState.q) return;
            var threshold = 120;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) loadMore();
        });
        return overlay;
    }

    function displayTitle(item) {
        var ja = (item.title_japanese && item.title_japanese.trim()) ? item.title_japanese.trim() : '';
        var en = (item.title && item.title.trim()) ? item.title.trim() : '';
        return ja || en || '';
    }

    function appendResultCard(container, item) {
        if (!item.url) return;
        var card = document.createElement('div');
        card.className = 'cover-result-item';
        card.dataset.url = item.url;
        card.dataset.title = displayTitle(item);
        card.innerHTML = '<div class="cover-result-image-wrap">' +
            '<img src="' + item.url + '" alt="" loading="lazy">' +
            '</div>' +
            '<div class="cover-result-footer">' +
            '<span class="cover-result-title">' + (displayTitle(item)) + '</span>' +
            '<span class="cover-result-type">' + (item.type || '') + '</span>' +
            '</div>';
        card.addEventListener('click', function () {
            var url = this.dataset.url;
            if (typeof currentOnSelect === 'function') currentOnSelect(url);
            close();
        });
        container.appendChild(card);
    }

    function close() {
        if (!overlay) return;
        var scrollY = 0;
        if (document.body.style.top) {
            scrollY = Math.abs(parseInt(document.body.style.top, 10)) || 0;
        }
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        currentOnSelect = null;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
    }

    async function doSearch() {
        var input = overlay.querySelector('#cover-picker-search-input');
        var resultsEl = overlay.querySelector('#cover-picker-results');
        var loadingEl = overlay.querySelector('#cover-picker-loading');
        var q = (input && input.value) ? input.value.trim() : '';
        if (!q) {
            if (typeof window.showMessage === 'function') window.showMessage('请输入要搜索的动漫或漫画名', 'error');
            return;
        }
        searchState = { q: q, page: 1, loading: true, loadingMore: false, hasNextPage: false };
        resultsEl.innerHTML = '';
        loadingEl.style.display = 'flex';
        try {
            var r = await fetch(apiBase() + '/anime-search?q=' + encodeURIComponent(q) + '&type=both&page=1&source=both');
            if (!r.ok) throw new Error(r.statusText || '请求失败');
            var json = await r.json();
            var items = json.data || [];
            searchState.hasNextPage = !!json.has_next_page;
            searchState.loading = false;
            if (items.length === 0) {
                resultsEl.innerHTML = '<p class="cover-search-empty">未找到结果，换一个关键词试试</p>';
            } else {
                items.forEach(function (item) { appendResultCard(resultsEl, item); });
            }
        } catch (err) {
            searchState.loading = false;
            resultsEl.innerHTML = '<p class="cover-search-empty">搜索失败，请稍后重试</p>';
            if (typeof window.showMessage === 'function') window.showMessage('搜索失败: ' + (err.message || '网络错误'), 'error');
        }
        loadingEl.style.display = 'none';
    }

    async function loadMore() {
        if (searchState.loadingMore || !searchState.hasNextPage || !searchState.q) return;
        var resultsEl = overlay.querySelector('#cover-picker-results');
        if (!resultsEl || resultsEl.querySelector('.cover-search-empty')) return;
        searchState.loadingMore = true;
        var loadMoreNode = document.createElement('p');
        loadMoreNode.className = 'cover-picker-load-more';
        loadMoreNode.textContent = '加载中...';
        resultsEl.appendChild(loadMoreNode);
        var nextPage = searchState.page + 1;
        try {
            var r = await fetch(apiBase() + '/anime-search?q=' + encodeURIComponent(searchState.q) + '&type=both&page=' + nextPage + '&source=both');
            if (!r.ok) throw new Error(r.statusText || '请求失败');
            var json = await r.json();
            var items = json.data || [];
            searchState.page = nextPage;
            searchState.hasNextPage = !!json.has_next_page;
            loadMoreNode.remove();
            items.forEach(function (item) { appendResultCard(resultsEl, item); });
        } catch (err) {
            loadMoreNode.remove();
            if (typeof window.showMessage === 'function') window.showMessage('加载更多失败: ' + (err.message || '网络错误'), 'error');
        }
        searchState.loadingMore = false;
    }

    function open(options) {
        options = options || {};
        var el = getOverlay();
        var searchInput = el.querySelector('#cover-picker-search-input');
        var initialSearch = (options.initialSearch != null) ? String(options.initialSearch).trim() : '';
        searchInput.value = initialSearch;
        currentOnSelect = options.onSelect || null;
        el.querySelector('#cover-picker-results').innerHTML = '';
        el.classList.add('open');
        el.setAttribute('aria-hidden', 'false');
        var scrollY = window.scrollY || window.pageYOffset;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = '-' + scrollY + 'px';
        document.body.style.width = '100%';
        setTimeout(function () {
            searchInput.focus();
            if (initialSearch) doSearch();
        }, 300);
    }

    window.CoverPicker = { open: open, close: close };
})();
