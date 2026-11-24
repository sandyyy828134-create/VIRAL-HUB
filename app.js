(() => {
  "use strict";

  const STORAGE_KEY = "viral_hub_state_v2";
  const DB_NAME = "viral_hub_media_db";
  const DB_STORE = "video_blobs";

  const CATEGORIES = [
    "All",
    "Trending",
    "Shorts & Reels",
    "Music & Vibe",
    "Comedy"
  ];

  const DEFAULT_VIDEOS = [
    {
      id: "vh-sample-1",
      title: "Big Buck Bunny - Open Studio Clip",
      category: "Comedy",
      duration: "01:00",
      quality: "HD",
      description: "Featured open clip on Viral Hub. Watch directly in the player or download in one click.",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      isLocalBlob: false,
      views: 1420,
      downloads: 389,
      createdAt: "2026-11-18"
    },
    {
      id: "vh-sample-2",
      title: "Elephants Dream - Visual Showcase",
      category: "Trending",
      duration: "01:45",
      quality: "HD",
      description: "Top hub showcase clip with instant playback and direct file download.",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      isLocalBlob: false,
      views: 980,
      downloads: 214,
      createdAt: "2026-11-20"
    },
    {
      id: "vh-sample-3",
      title: "For Bigger Blazes - Quick Action Reel",
      category: "Shorts & Reels",
      duration: "00:15",
      quality: "HD",
      description: "Fast short reel uploaded on Viral Hub. Stream or download immediately.",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBliggerBlazes.mp4)",
      isLocalBlob: false,
      views: 2310,
      downloads: 642,
      createdAt: "2026-11-22"
    },
    {
      id: "vh-sample-4",
      title: "For Bigger Escapes - Travel & Motion Reel",
      category: "Music & Vibe",
      duration: "00:15",
      quality: "HD",
      description: "High-energy visual reel available to watch online or save straight to device.",
      url: "https://commondatastorage.googleapis.commp4](https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4)",
      isLocalBlob: false,
      views: 765,
      downloads: 173,
      createdAt: "2026-11-23"
    }
  ];

  const state = {
    isOwner: true,
    activeCategory: "All",
    searchQuery: "",
    sortBy: "latest",
    activeVideoId: null,
    selectedFile: null,
    videos: []
  };

  const blobUrlCache = new Map();
  let dbInstance = null;
  let toastTimer = null;

  const dom = {
    brandHome: document.getElementById("brandHome"),
    roleBadge: document.getElementById("roleBadge"),
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    toggleModeBtn: document.getElementById("toggleModeBtn"),
    modeLabel: document.getElementById("modeLabel"),
    openUploadBtn: document.getElementById("openUploadBtn"),
    categoryList: document.getElementById("categoryList"),
    sortSelect: document.getElementById("sortSelect"),
    heroSubtitle: document.getElementById("heroSubtitle"),
    totalVideosCount: document.getElementById("totalVideosCount"),
    totalDownloadsCount: document.getElementById("totalDownloadsCount"),
    sectionTitle: document.getElementById("sectionTitle"),
    resultCount: document.getElementById("resultCount"),
    videoGrid: document.getElementById("videoGrid"),
    emptyState: document.getElementById("emptyState"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),

    playerModal: document.getElementById("playerModal"),
    closePlayerBtn: document.getElementById("closePlayerBtn"),
    playerCategory: document.getElementById("playerCategory"),
    playerTitle: document.getElementById("playerTitle"),
    activeVideoEl: document.getElementById("activeVideoEl"),
    playerViews: document.getElementById("playerViews"),
    playerDownloads: document.getElementById("playerDownloads"),
    playerDate: document.getElementById("playerDate"),
    downloadVideoLink: document.getElementById("downloadVideoLink"),
    deleteVideoBtn: document.getElementById("deleteVideoBtn"),
    playerDescription: document.getElementById("playerDescription"),

    uploadModal: document.getElementById("uploadModal"),
    closeUploadBtn: document.getElementById("closeUploadBtn"),
    cancelUploadBtn: document.getElementById("cancelUploadBtn"),
    uploadForm: document.getElementById("uploadForm"),
    videoTitleInput: document.getElementById("videoTitleInput"),
    videoCategoryInput: document.getElementById("videoCategoryInput"),
    videoDurationInput: document.getElementById("videoDurationInput"),
    fileDropzone: document.getElementById("fileDropzone"),
    videoFileInput: document.getElementById("videoFileInput"),
    fileDropLabel: document.getElementById("fileDropLabel"),
    videoUrlInput: document.getElementById("videoUrlInput"),
    videoDescInput: document.getElementById("videoDescInput"),
    uploadError: document.getElementById("uploadError"),
    submitUploadBtn: document.getElementById("submitUploadBtn"),

    toastBanner: document.getElementById("toastBanner")
  };

  function showToast(message) {
    if (!dom.toastBanner) return;
    dom.toastBanner.textContent = message;
    dom.toastBanner.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toastBanner.classList.add("hidden");
    }, 2600);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugifyFilename(title) {
    const clean = String(title || "viral-hub-clip")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (clean || "viral-hub-clip") + ".mp4";
  }

  function normalizeCategory(cat) {
    if (CATEGORIES.includes(cat)) return cat;
    return "Trending";
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.videos = [...DEFAULT_VIDEOS];
        saveState();
        return;
      }
      const parsed = JSON.parse(raw);
      state.isOwner = typeof parsed.isOwner === "boolean" ? parsed.isOwner : true;
      if (Array.isArray(parsed.videos) && parsed.videos.length > 0) {
        state.videos = parsed.videos.map((v) => ({
          ...v,
          category: normalizeCategory(v.category)
        }));
      } else {
        state.videos = [...DEFAULT_VIDEOS];
      }
    } catch (err) {
      console.error("Failed to load Viral Hub state:", err);
      state.videos = [...DEFAULT_VIDEOS];
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isOwner: state.isOwner,
          videos: state.videos
        })
      );
    } catch (err) {
      console.error("Failed to save Viral Hub state:", err);
    }
  }

  function openMediaDb() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    });
  }

  async function saveBlobToDb(id, blob) {
    const db = await openMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put({ id, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Blob save failed"));
    });
  }

  async function getBlobFromDb(id) {
    if (blobUrlCache.has(id)) {
      return blobUrlCache.get(id);
    }
    const db = await openMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (!record || !record.blob) {
          resolve("");
          return;
        }
        const objectUrl = URL.createObjectURL(record.blob);
        blobUrlCache.set(id, objectUrl);
        resolve(objectUrl);
      };
      req.onerror = () => reject(req.error || new Error("Blob read failed"));
    });
  }

  async function deleteBlobFromDb(id) {
    if (blobUrlCache.has(id)) {
      URL.revokeObjectURL(blobUrlCache.get(id));
      blobUrlCache.delete(id);
    }
    try {
      const db = await openMediaDb();
      await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (_) {
      // Ignore cleanup errors
    }
  }

  async function resolveVideoSrc(video) {
    if (video.isLocalBlob) {
      return await getBlobFromDb(video.id);
    }
    return video.url || "";
  }

  function getFilteredVideos() {
    const q = state.searchQuery.trim().toLowerCase();
    const list = state.videos.filter((vid) => {
      const matchesCat = state.activeCategory === "All" || vid.category === state.activeCategory;
      const matchesQuery =
        !q ||
        vid.title.toLowerCase().includes(q) ||
        (vid.description || "").toLowerCase().includes(q) ||
        vid.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    if (state.sortBy === "views") {
      return [...list].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    }
    if (state.sortBy === "downloads") {
      return [...list].sort((a, b) => (Number(b.downloads) || 0) - (Number(a.downloads) || 0));
    }
    return list;
  }

  function renderCategories() {
    if (!dom.categoryList) return;
    dom.categoryList.innerHTML = CATEGORIES.map((cat) => {
      const activeClass = state.activeCategory === cat ? "active" : "";
      return `<button type="button" class="cat-pill ${activeClass}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    }).join("");
  }

  function renderModeAndStats() {
    const totalDownloads = state.videos.reduce((sum, v) => sum + (Number(v.downloads) || 0), 0);
    if (dom.totalVideosCount) dom.totalVideosCount.textContent = String(state.videos.length);
    if (dom.totalDownloadsCount) dom.totalDownloadsCount.textContent = String(totalDownloads);

    if (state.isOwner) {
      dom.roleBadge.textContent = "Owner";
      dom.roleBadge.classList.remove("visitor");
      dom.modeLabel.textContent = "Visitor View";
      dom.openUploadBtn.classList.remove("hidden");
      dom.heroSubtitle.textContent =
        "Owner Studio active. Publish clips for everyone to watch and download.";
    } else {
      dom.roleBadge.textContent = "Visitor";
      dom.roleBadge.classList.add("visitor");
      dom.modeLabel.textContent = "Owner Mode";
      dom.openUploadBtn.classList.add("hidden");
      dom.heroSubtitle.textContent =
        "Browse published clips on Viral Hub. Watch online or download any video directly.";
    }
  }

  async function renderVideos() {
    const filtered = getFilteredVideos();
    dom.sectionTitle.textContent =
      state.activeCategory === "All" ? "Latest & Trending" : state.activeCategory;
    dom.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "clip" : "clips"}`;

    if (filtered.length === 0) {
      dom.videoGrid.innerHTML = "";
      dom.emptyState.classList.remove("hidden");
      return;
    }

    dom.emptyState.classList.add("hidden");

    dom.videoGrid.innerHTML = filtered
      .map((vid) => {
        return `
          <article class="video-card" data-video-id="${escapeHtml(vid.id)}">
            <div class="thumb-wrap" data-action="watch" data-id="${escapeHtml(vid.id)}">
              <video class="thumb-video" muted preload="metadata" playsinline></video>
              <span class="quality-tag">${escapeHtml(vid.quality || "HD")}</span>
              <div class="thumb-overlay">
                <div class="play-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5-11-6.5z" />
                  </svg>
                </div>
              </div>
              <span class="duration-tag">${escapeHtml(vid.duration || "HD")}</span>
            </div>

            <div class="card-body">
              <div class="card-top-row">
                <span class="chip">${escapeHtml(vid.category)}</span>
                <span class="card-meta-mini">${Number(vid.views) || 0} views &middot; ${Number(vid.downloads) || 0} dl</span>
              </div>

              <h3 class="card-title" data-action="watch" data-id="${escapeHtml(vid.id)}">${escapeHtml(vid.title)}</h3>
              <p class="card-desc">${escapeHtml(vid.description || "Published on Viral Hub.")}</p>

              <div class="card-footer">
                <button type="button" class="btn btn-secondary card-btn" data-action="watch" data-id="${escapeHtml(vid.id)}">
                  <span>Watch</span>
                </button>
                <button type="button" class="btn btn-primary card-btn" data-action="download" data-id="${escapeHtml(vid.id)}">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download</span>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    for (const vid of filtered) {
      const card = dom.videoGrid.querySelector(`[data-video-id="${CSS.escape(vid.id)}"]`);
      const thumbVideo = card ? card.querySelector(".thumb-video") : null;
      if (thumbVideo) {
        const src = await resolveVideoSrc(vid);
        if (src) {
          thumbVideo.src = src;
        }
      }
    }
  }

  async function triggerVideoDownload(video) {
    const src = await resolveVideoSrc(video);
    if (!src) {
      showToast("Video file unavailable for download.");
      return;
    }

    const filename = slugifyFilename(video.title);
    const link = document.createElement("a");
    link.href = src;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    video.downloads = (Number(video.downloads) || 0) + 1;
    saveState();
    renderModeAndStats();
    await renderVideos();

    if (state.activeVideoId === video.id) {
      dom.playerDownloads.textContent = `${video.downloads} downloads`;
    }
    showToast(`Downloading "${video.title}"...`);
  }

  async function openPlayerModal(videoId) {
    const video = state.videos.find((v) => v.id === videoId);
    if (!video) return;

    state.activeVideoId = video.id;
    video.views = (Number(video.views) || 0) + 1;
    saveState();

    dom.playerCategory.textContent = video.category;
    dom.playerTitle.textContent = video.title;
    dom.playerViews.textContent = `${video.views} views`;
    dom.playerDownloads.textContent = `${video.downloads || 0} downloads`;
    dom.playerDate.textContent = video.createdAt || "Recently added";
    dom.playerDescription.textContent = video.description || "Published on Viral Hub.";

    if (state.isOwner) {
      dom.deleteVideoBtn.classList.remove("hidden");
    } else {
      dom.deleteVideoBtn.classList.add("hidden");
    }

    const src = await resolveVideoSrc(video);
    dom.activeVideoEl.src = src;
    dom.downloadVideoLink.href = src || "#";
    dom.downloadVideoLink.setAttribute("download", slugifyFilename(video.title));

    dom.playerModal.classList.remove("hidden");
    renderModeAndStats();
    await renderVideos();

    try {
      await dom.activeVideoEl.play();
    } catch (_) {
      // Playback starts on user interaction if autoplay is blocked
    }
  }

  function closePlayerModal() {
    dom.activeVideoEl.pause();
    dom.activeVideoEl.removeAttribute("src");
    dom.activeVideoEl.load();
    state.activeVideoId = null;
    dom.playerModal.classList.add("hidden");
  }

  function openUploadModal() {
    if (!state.isOwner) {
      showToast("Only the Viral Hub owner can upload videos.");
      return;
    }
    dom.uploadForm.reset();
    state.selectedFile = null;
    dom.fileDropLabel.textContent = "Choose video file from device";
    dom.uploadError.classList.add("hidden");
    dom.uploadError.textContent = "";
    dom.uploadModal.classList.remove("hidden");
  }

  function closeUploadModal() {
    dom.uploadModal.classList.add("hidden");
  }

  function showUploadError(msg) {
    dom.uploadError.textContent = msg;
    dom.uploadError.classList.remove("hidden");
  }

  async function handleUploadSubmit(event) {
    event.preventDefault();
    if (!state.isOwner) {
      showUploadError("Owner permission is required to upload videos.");
      return;
    }

    const title = dom.videoTitleInput.value.trim();
    const category = normalizeCategory(dom.videoCategoryInput.value);
    const duration = dom.videoDurationInput.value.trim() || "HD";
    const directUrl = dom.videoUrlInput.value.trim();
    const description = dom.videoDescInput.value.trim();

    if (!title) {
      showUploadError("Please enter a clip title.");
      return;
    }

    if (!state.selectedFile && !directUrl) {
      showUploadError("Please choose a video file or paste a direct video URL.");
      return;
    }

    const newId = "vh-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const isLocalBlob = Boolean(state.selectedFile);

    try {
      dom.submitUploadBtn.disabled = true;

      if (isLocalBlob) {
        await saveBlobToDb(newId, state.selectedFile);
      }

      const newVideo = {
        id: newId,
        title,
        category,
        duration,
        quality: "HD",
        description: description || "Published on Viral Hub.",
        url: isLocalBlob ? "" : directUrl,
        isLocalBlob,
        views: 0,
        downloads: 0,
        createdAt: new Date().toISOString().slice(0, 10)
      };

      state.videos.unshift(newVideo);
      saveState();
      closeUploadModal();
      renderModeAndStats();
      await renderVideos();
      showToast(`"${title}" is now live on Viral Hub.`);
    } catch (err) {
      console.error("Upload failed:", err);
      showUploadError("Could not store video locally. Try a smaller file or a direct URL.");
    } finally {
      dom.submitUploadBtn.disabled = false;
    }
  }

  async function handleDeleteActiveVideo() {
    if (!state.isOwner || !state.activeVideoId) return;
    const targetId = state.activeVideoId;
    const target = state.videos.find((v) => v.id === targetId);
    state.videos = state.videos.filter((v) => v.id !== targetId);
    saveState();

    if (target && target.isLocalBlob) {
      await deleteBlobFromDb(targetId);
    }

    closePlayerModal();
    renderModeAndStats();
    await renderVideos();
    showToast("Clip removed from Viral Hub.");
  }

  function bindEvents() {
    dom.brandHome.addEventListener("click", async (e) => {
      e.preventDefault();
      state.activeCategory = "All";
      state.searchQuery = "";
      state.sortBy = "latest";
      dom.searchInput.value = "";
      dom.sortSelect.value = "latest";
      dom.clearSearchBtn.classList.add("hidden");
      renderCategories();
      await renderVideos();
    });

    dom.searchInput.addEventListener("input", async (e) => {
      state.searchQuery = e.target.value;
      dom.clearSearchBtn.classList.toggle("hidden", !state.searchQuery);
      await renderVideos();
    });

    dom.clearSearchBtn.addEventListener("click", async () => {
      state.searchQuery = "";
      dom.searchInput.value = "";
      dom.clearSearchBtn.classList.add("hidden");
      await renderVideos();
    });

    dom.sortSelect.addEventListener("change", async (e) => {
      state.sortBy = e.target.value;
      await renderVideos();
    });

    dom.toggleModeBtn.addEventListener("click", () => {
      state.isOwner = !state.isOwner;
      saveState();
      renderModeAndStats();
      showToast(state.isOwner ? "Switched to Owner Mode" : "Switched to Visitor View");
    });

    dom.openUploadBtn.addEventListener("click", openUploadModal);
    dom.closeUploadBtn.addEventListener("click", closeUploadModal);
    dom.cancelUploadBtn.addEventListener("click", closeUploadModal);
    dom.uploadForm.addEventListener("submit", handleUploadSubmit);

    dom.videoFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        state.selectedFile = file;
        dom.fileDropLabel.textContent = file.name;
      }
    });

    dom.fileDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dom.fileDropzone.classList.add("dragover");
    });

    dom.fileDropzone.addEventListener("dragleave", () => {
      dom.fileDropzone.classList.remove("dragover");
    });

    dom.fileDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dom.fileDropzone.classList.remove("dragover");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        state.selectedFile = file;
        dom.fileDropLabel.textContent = file.name;
      } else {
        showToast("Please drop a valid video file.");
      }
    });

    dom.categoryList.addEventListener("click", async (e) => {
      const btn = e.target.closest(".cat-pill");
      if (!btn) return;
      state.activeCategory = btn.dataset.category || "All";
      renderCategories();
      await renderVideos();
    });

    dom.resetFiltersBtn.addEventListener("click", async () => {
      state.activeCategory = "All";
      state.searchQuery = "";
      state.sortBy = "latest";
      dom.searchInput.value = "";
      dom.sortSelect.value = "latest";
      dom.clearSearchBtn.classList.add("hidden");
      renderCategories();
      await renderVideos();
    });

    dom.videoGrid.addEventListener("click", async (e) => {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const videoId = actionEl.dataset.id;
      const video = state.videos.find((v) => v.id === videoId);
      if (!video) return;

      if (action === "watch") {
        await openPlayerModal(videoId);
      } else if (action === "download") {
        await triggerVideoDownload(video);
      }
    });

    dom.closePlayerBtn.addEventListener("click", closePlayerModal);
    dom.deleteVideoBtn.addEventListener("click", handleDeleteActiveVideo);

    dom.downloadVideoLink.addEventListener("click", async () => {
      if (!state.activeVideoId) return;
      const video = state.videos.find((v) => v.id === state.activeVideoId);
      if (!video) return;
      video.downloads = (Number(video.downloads) || 0) + 1;
      saveState();
      dom.playerDownloads.textContent = `${video.downloads} downloads`;
      renderModeAndStats();
      await renderVideos();
      showToast(`Downloading "${video.title}"...`);
    });

    dom.playerModal.addEventListener("click", (e) => {
      if (e.target === dom.playerModal) closePlayerModal();
    });

    dom.uploadModal.addEventListener("click", (e) => {
      if (e.target === dom.uploadModal) closeUploadModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.playerModal.classList.contains("hidden")) closePlayerModal();
        if (!dom.uploadModal.classList.contains("hidden")) closeUploadModal();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    loadState();
    renderCategories();
    renderModeAndStats();
    bindEvents();
    await renderVideos();
  });
})();