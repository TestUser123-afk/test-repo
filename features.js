// Features.js - Bookmarks, DevTools, and Cloak functionality for Hyperion

class HyperionFeatures {
  constructor() {
    this.bookmarks = JSON.parse(localStorage.getItem('hyperion_bookmarks') || '[]');
    this.devtoolsVisible = false;
    this.currentFrame = null;
    this.init();
  }

  init() {
    console.log('HyperionFeatures initializing...');
    // Wait for DOM and other scripts to load
    setTimeout(() => {
      this.setupEventListeners();
      this.createModals();
      this.updateBookmarkButton();
      console.log('HyperionFeatures initialized!');
    }, 100);
  }

  setupEventListeners() {
    // Three dots menu toggle
    const threeDotsBtn = document.getElementById('threeDotsBtn');
    const contextMenu = document.getElementById('contextMenu');

    threeDotsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      contextMenu.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!threeDotsBtn?.contains(e.target) && !contextMenu?.contains(e.target)) {
        contextMenu?.classList.add('hidden');
      }
    });

    // Bookmark button
    document.getElementById('bookmarkBtn')?.addEventListener('click', () => {
      this.toggleBookmark();
    });

    // Menu items
    document.getElementById('bookmarksBtn')?.addEventListener('click', () => {
      this.showBookmarks();
      contextMenu?.classList.add('hidden');
    });

    document.getElementById('devtoolsBtn')?.addEventListener('click', () => {
      this.toggleDevtools();
      contextMenu?.classList.add('hidden');
    });

    document.getElementById('cloakBtn')?.addEventListener('click', () => {
      this.showCloakModal();
      contextMenu?.classList.add('hidden');
    });

    // Update current frame reference
    this.updateCurrentFrame();
    setInterval(() => this.updateCurrentFrame(), 1000);
  }

  updateCurrentFrame() {
    const iframes = document.querySelectorAll('#iframeContainer iframe');

    // Get the currently visible iframe (not display:none)
    for (let iframe of iframes) {
      if (iframe.style.display !== 'none' && iframe.offsetWidth > 0 && iframe.offsetHeight > 0) {
        this.currentFrame = iframe;
        return;
      }
    }

    // Fallback to homepage frame
    const homepageFrame = document.getElementById('homepageFrame');
    if (homepageFrame) {
      this.currentFrame = homepageFrame;
    }
  }

  getDeproxiedUrl(rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.origin).toString();
      // Detect and decode based on known prefixes
      // uv
      if (window.__uv$config && typeof window.__uv$config.decodeUrl === 'function') {
        const pref = window.__uv$config.prefix;
        if (url.includes(pref)) {
          const enc = url.split(pref)[1] || '';
          try { return window.__uv$config.decodeUrl(enc); } catch {}
        }
      }
      // envade
      if (window.__envade$config && window.__envade$config.codec && typeof window.__envade$config.codec.decode === 'function') {
        const pref = window.__envade$config.prefix;
        if (url.includes(pref)) {
          const enc = url.split(pref)[1] || '';
          try { return window.__envade$config.codec.decode(enc); } catch {}
        }
      }
      // scramjet
      if (window.scramjet && typeof window.scramjet.decodeUrl === 'function') {
        // scramjet paths can vary, so attempt to find after '/service/scramjet/'
        const idx = url.indexOf('/service/scramjet/');
        if (idx !== -1) {
          const enc = url.substring(idx + '/service/scramjet/'.length);
          try { return window.scramjet.decodeUrl(enc); } catch {}
        }
      }
      // If no proxy prefix detected, return as-is
      return rawUrl;
    } catch {
      return rawUrl;
    }
  }

  getCurrentUrl() {
    try {
      if (this.currentFrame?.contentWindow?.location?.href) {
        return this.currentFrame.contentWindow.location.href;
      }
    } catch (e) {
      // Cross-origin restrictions
    }

    // Fallback to input value
    const input = document.getElementById('input');
    const inputValue = input?.value || '';

    // If input is empty, return current page URL or homepage
    if (!inputValue) {
      return window.location.href;
    }

    return inputValue;
  }

  getDisplayUrl() {
    const url = this.getCurrentUrl();
    return this.getDeproxiedUrl(url);
  }

  getCurrentTitle() {
    try {
      if (this.currentFrame?.contentDocument?.title) {
        return this.currentFrame.contentDocument.title;
      }
    } catch (e) {
      // Cross-origin restrictions
    }

    // Fallback to URL
    return this.getCurrentUrl() || 'Untitled';
  }

  toggleBookmark() {
    const currentUrl = this.getCurrentUrl();
    const title = this.getCurrentTitle();

    if (!currentUrl) {
      alert('No page to bookmark');
      return;
    }

    const cleanUrl = this.getDeproxiedUrl(currentUrl);

    const existingIndex = this.bookmarks.findIndex(b => b.url === cleanUrl);

    if (existingIndex >= 0) {
      // Remove bookmark
      this.bookmarks.splice(existingIndex, 1);
    } else {
      // Add bookmark (store deproxied url)
      this.bookmarks.push({
        title: title,
        url: cleanUrl,
        timestamp: Date.now()
      });
    }

    this.saveBookmarks();
    this.updateBookmarkButton();
  }

  updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const cleanUrl = this.getDeproxiedUrl(this.getCurrentUrl());

    if (this.bookmarks.some(b => b.url === cleanUrl)) {
      bookmarkBtn?.classList.add('bookmarked');
    } else {
      bookmarkBtn?.classList.remove('bookmarked');
    }
  }

  saveBookmarks() {
    localStorage.setItem('hyperion_bookmarks', JSON.stringify(this.bookmarks));
  }

  showBookmarks() {
    const modal = document.getElementById('bookmarksModal');
    const list = document.getElementById('bookmarksList');

    // Clear existing content
    list.innerHTML = '';

    if (this.bookmarks.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: #777; padding: 20px;">No bookmarks yet</div>';
    } else {
      this.bookmarks.forEach((bookmark, index) => {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.innerHTML = `
          <div class="bookmark-info">
            <div class="bookmark-title">${this.escapeHtml(bookmark.title)}</div>
            <div class="bookmark-url">${this.escapeHtml(bookmark.url)}</div>
          </div>
          <button class="bookmark-delete" onclick="features.deleteBookmark(${index})" title="Delete bookmark">
            <i data-lucide="trash-2"></i>
          </button>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.bookmark-delete')) return;
          this.navigateToBookmark(bookmark.url);
          modal.classList.add('hidden');
        });

        list.appendChild(item);
      });
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
  }

  deleteBookmark(index) {
    this.bookmarks.splice(index, 1);
    this.saveBookmarks();
    this.showBookmarks(); // Refresh the list
    this.updateBookmarkButton();
  }

  navigateToBookmark(url) {
    const input = document.getElementById('input');
    if (input) {
      input.value = url; // raw/original url; skibidi.js will encode on navigation
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);
    }
  }

  toggleDevtools() {
    if (!this.currentFrame?.contentWindow) {
      alert('No active page to inspect');
      return;
    }

    const iframe = this.currentFrame.contentWindow;

    if (iframe.eruda) {
      this.devtoolsVisible ? iframe.eruda.hide() : iframe.eruda.show();
      this.devtoolsVisible = !this.devtoolsVisible;
    } else {
      const script = iframe.document.createElement('script');
      script.src = 'https://unpkg.com/eruda@3.4.3/eruda.js';
      script.onload = () => {
        iframe.eruda.init({
          tool: ['console', 'elements', 'sources', 'network', 'resources', 'info']
        });
        iframe.eruda.show();
        this.devtoolsVisible = true;
      };
      script.onerror = () => {
        alert('Failed to load DevTools. Make sure you have an internet connection.');
      };
      iframe.document.head.appendChild(script);
    }
  }

  showCloakModal() {
    const modal = document.getElementById('cloakModal');
    modal.classList.remove('hidden');
  }

  applyCloaking() {
    const title = document.getElementById('cloakTitle').value.trim();
    const favicon = document.getElementById('cloakFavicon').value.trim();

    if (title) {
      document.title = title;
    }

    if (favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = favicon;
    }

    // Save cloak settings
    localStorage.setItem('hyperion_cloak', JSON.stringify({ title, favicon }));

    document.getElementById('cloakModal').classList.add('hidden');
    alert('Cloak applied successfully!');
  }

  resetCloaking() {
    document.title = 'Hyperion';
    let link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = 'favicon.svg';
    }

    localStorage.removeItem('hyperion_cloak');
    document.getElementById('cloakModal').classList.add('hidden');
    alert('Cloak reset successfully!');
  }

  createModals() {
    // Create bookmarks modal
    const bookmarksModal = document.createElement('div');
    bookmarksModal.id = 'bookmarksModal';
    bookmarksModal.className = 'bookmarks-modal hidden';
    bookmarksModal.innerHTML = `
      <div class="bookmarks-content">
        <button class="modal-close" onclick="document.getElementById('bookmarksModal').classList.add('hidden')">&times;</button>
        <h2>Bookmarks</h2>
        <div id="bookmarksList"></div>
      </div>
    `;

    // Create cloak modal
    const cloakModal = document.createElement('div');
    cloakModal.id = 'cloakModal';
    cloakModal.className = 'cloak-modal hidden';
    cloakModal.innerHTML = `
      <div class="cloak-content">
        <button class="modal-close" onclick="document.getElementById('cloakModal').classList.add('hidden')">&times;</button>
        <h2>Page Cloak</h2>
        <div class="form-group">
          <label for="cloakTitle">Page Title:</label>
          <input type="text" id="cloakTitle" placeholder="Enter new page title" />
        </div>
        <div class="form-group">
          <label for="cloakFavicon">Favicon URL:</label>
          <input type="text" id="cloakFavicon" placeholder="Enter favicon URL" />
        </div>
        <div class="cloak-buttons">
          <button class="cloak-btn secondary" onclick="features.resetCloaking()">Reset</button>
          <button class="cloak-btn primary" onclick="features.applyCloaking()">Apply</button>
        </div>
      </div>
    `;

    document.body.appendChild(bookmarksModal);
    document.body.appendChild(cloakModal);

    // Close modals when clicking outside
    bookmarksModal.addEventListener('click', (e) => {
      if (e.target === bookmarksModal) {
        bookmarksModal.classList.add('hidden');
      }
    });

    cloakModal.addEventListener('click', (e) => {
      if (e.target === cloakModal) {
        cloakModal.classList.add('hidden');
      }
    });

    // Load saved cloak settings
    this.loadSavedCloak();
  }

  loadSavedCloak() {
    const saved = localStorage.getItem('hyperion_cloak');
    if (saved) {
      try {
        const { title, favicon } = JSON.parse(saved);
        if (title) document.title = title;
        if (favicon) {
          let link = document.querySelector("link[rel~='icon']");
          if (link) link.href = favicon;
        }
      } catch (e) {
        console.error('Failed to load saved cloak settings:', e);
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize features when everything is loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    window.features = new HyperionFeatures();
  }, 500);
});

// Fallback initialization
if (document.readyState === 'complete') {
  setTimeout(() => {
    if (!window.features) {
      window.features = new HyperionFeatures();
    }
  }, 500);
}
