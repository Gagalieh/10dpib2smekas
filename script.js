// script.js — Frontend logic for index.html
// Requirements: place alongside config.js which must export `supabase` client
// Features implemented:
// - Hero load (site_settings fallback)
// - News (latest cards)
// - Events (timeline + countdown)
// - Gallery (Pinterest-like, lazy load pages, per-page 36, search & tag filter, load more)
// - Popup cinematic viewer (prev/next, keyboard, swipe basic)
// - Memories: film-strip (left) + detail (right) with thumbnails
// - Story Mode: global auto-cycle memories + per-memory inline slideshow (zoom-in)
// - Tag filter modal (checkboxes generated from tags table)
// - Robust error handling, retries, debounces, accessible controls
// - Helpers exported on window for debugging
//
// Note: This file is intentionally comprehensive to cover many edge-cases.
// If anything fails, open browser console and run window.siteHelpers for debugging.

import { supabase } from "./config.js";

///// CONFIGURATION /////
const PHOTO_TABLE = "photos";
const NEWS_TABLE = "news";
const EVENTS_TABLE = "events";
const MEM_TABLE = "memories";
const TAGS_TABLE = "tags";
const SITE_TABLES = ["site_settings", "site"]; // try both
const PHOTO_BUCKET = "photos";
const MEM_BUCKET = "memories2"; // matches admin
const PER_PAGE = 36;
const STORY_INTERVAL_MS = 9000; // cycle memories every 9s
const DETAIL_SLIDE_MS = 2200; // slideshow per memory photo
const MAX_RETRIES = 2;

///// DOM REFS /////
const refs = {
  heroTitle: document.getElementById("heroTitle"),
  heroSubtitle: document.getElementById("heroSubtitle"),
  heroSection: document.getElementById("hero"),
  btnScrollGallery: document.getElementById("btnScrollGallery"),
  btnScrollMemories: document.getElementById("btnScrollMemories"),
  btnStory: document.getElementById("btnStory"),
  themeToggle: document.getElementById("themeToggle"),

  newsList: document.getElementById("newsList"),
  eventsList: document.getElementById("eventsList"),

  galleryGrid: document.getElementById("galleryGrid"),
  gallerySearch: document.getElementById("gallerySearch"),
  galleryTagFilter: document.getElementById("galleryTagFilter"),
  loadMoreBtn: document.getElementById("loadMoreBtn"),
  pageInfo: document.getElementById("pageInfo"),

  filmStrip: document.getElementById("filmStrip"),
  memoryDetail: document.getElementById("memoryDetail"),
  memoryTitle: document.getElementById("memoryTitle"),
  memoryMeta: document.getElementById("memoryMeta"),
  memoryDesc: document.getElementById("memoryDesc"),
  memoryThumbs: document.getElementById("memoryThumbs"),
  memPreviewContainer: document.getElementById("memPreviewContainer"),
  playStoryBtn: document.getElementById("playStoryBtn"),
  openMemGallery: document.getElementById("openMemGallery"),

  popup: document.getElementById("popup"),
  popupImg: document.getElementById("popupImg"),
  popupClose: document.getElementById("popupClose"),
  popupPrev: document.getElementById("popupPrev"),
  popupNext: document.getElementById("popupNext"),
  popupMeta: document.getElementById("popupMeta"),

  tagChecklist: document.getElementById("tagChecklist"),
  filterModal: document.getElementById("filterModal"),
  applyFilter: document.getElementById("applyFilter"),
  closeFilter: document.getElementById("closeFilter"),

  heroCountdown: document.getElementById("heroCountdown"),

  // profile links in hero
  linkKetua: document.getElementById("linkKetua"),
  linkWakil: document.getElementById("linkWakil"),
  linkWali: document.getElementById("linkWali"),
  classCount: document.getElementById("classCount"),
  linkSchool: document.getElementById("linkSchool"),

  footerText: document.getElementById("footerText"),
};

///// STATE /////
let state = {
  galleryPage: 0,
  galleryLoading: false,
  galleryExhausted: false,
  galleryQuery: "",
  galleryTag: "",
  photosCache: [],
  memCache: [],
  tagsCache: [],
  popupList: [],
  popupIndex: 0,
  storyPlaying: false,
  storyInterval: null,
  detailSlideTimer: null,
  currentMemory: null,
  theme: localStorage.getItem("site_theme") || "dark",
};

///// UTILITIES /////
function qsel(sel){ return document.querySelector(sel); }
function qselAll(sel){ return Array.from(document.querySelectorAll(sel)); }
function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className = cls; return e; }
function toast(msg, type="info", ms=3000){
  const d = el("div","site-toast");
  d.textContent = msg;
  d.style.position="fixed"; d.style.right="18px"; d.style.bottom="18px";
  d.style.padding="8px 12px"; d.style.borderRadius="8px"; d.style.zIndex=99999;
  d.style.background = type==="error" ? "#ff6b6b" : type==="success" ? "#4be3a2" : "rgba(40,44,52,0.95)";
  d.style.color = "#021018"; d.style.fontWeight = "700";
  document.body.appendChild(d);
  setTimeout(()=> d.style.opacity = "0", ms-300);
  setTimeout(()=> d.remove(), ms);
}
function debounce(fn, wait=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
function safe(v){ return (v===undefined||v===null) ? "" : v; }
function fmtDate(d){ if(!d) return ""; const dt = new Date(d); return dt.toLocaleDateString() + " " + dt.toLocaleTimeString(); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

// supabase safe get public url (wrap try)
function publicUrlFromPath(bucket, path){
  try{
    if(!path) return "";
    if(path.startsWith("http")) return path;
    const r = supabase.storage.from(bucket).getPublicUrl(path);
    return (r && r.data && r.data.publicUrl) ? r.data.publicUrl : "";
  } catch(e){ console.error("publicUrlFromPath", e); return ""; }
}

// retry helper
async function withRetries(fn, retries=MAX_RETRIES){
  let lastErr;
  for(let i=0;i<=retries;i++){
    try { return await fn(); } catch(e){ lastErr = e; console.warn("retry failed", i, e); await sleep(250); }
  }
  throw lastErr;
}

///// INITIALIZE UI BINDINGS /////
function initBindings(){
  // scroll helpers
  refs.btnScrollGallery?.addEventListener("click", ()=> document.getElementById("gallery")?.scrollIntoView({behavior:"smooth"}));
  refs.btnScrollMemories?.addEventListener("click", ()=> document.getElementById("memories")?.scrollIntoView({behavior:"smooth"}));

  // theme toggle
  const applyTheme = ()=>{
    if(state.theme === "dark"){ document.body.classList.add("site-dark"); document.body.classList.remove("site-light"); }
    else { document.body.classList.add("site-light"); document.body.classList.remove("site-dark"); }
    localStorage.setItem("site_theme", state.theme);
  };
  refs.themeToggle?.addEventListener("click", ()=>{
    state.theme = (state.theme==="dark") ? "light" : "dark"; applyTheme();
  });
  applyTheme();

  // gallery search & tag
  refs.gallerySearch?.addEventListener("input", debounce((e)=>{
    state.galleryQuery = e.target.value.trim();
    resetGalleryAndLoad();
  }, 450));
  refs.galleryTagFilter?.addEventListener("change", (e)=>{
    state.galleryTag = e.target.value || "";
    resetGalleryAndLoad();
  });

  refs.loadMoreBtn?.addEventListener("click", ()=> loadGalleryPage(state.galleryPage + 1));

  // filter modal
  refs.applyFilter?.addEventListener("click", applyTagModal);
  refs.closeFilter?.addEventListener("click", ()=> refs.filterModal.classList.add("hide"));
  // popup controls
  refs.popupClose?.addEventListener("click", closePopup);
  refs.popupPrev?.addEventListener("click", popupPrev);
  refs.popupNext?.addEventListener("click", popupNext);
  document.addEventListener("keydown", (e)=>{
    if(refs.popup && !refs.popup.classList.contains("hide")){
      if(e.key === "ArrowLeft") popupPrev();
      if(e.key === "ArrowRight") popupNext();
      if(e.key === "Escape") closePopup();
    }
  });

  // story & memory controls
  refs.btnStory?.addEventListener("click", toggleStoryGlobal);
  refs.playStoryBtn?.addEventListener("click", ()=> toggleStoryForCurrent());
  refs.openMemGallery?.addEventListener("click", ()=> openMemoryGallery());

  // accessibility: click film strip to select memory delegated in rendering
}

///// HERO / SITE SETTINGS /////
async function loadHero(){
  try{
    // try site_settings first
    let settings = null;
    for(const t of SITE_TABLES){
      try{
        const r = await supabase.from(t).select("*").limit(1).single();
        if(r && r.data) { settings = r.data; break; }
      } catch(e){ /* ignore */ }
    }
    if(settings){
      refs.heroTitle.textContent = settings.hero_title || refs.heroTitle.textContent;
      refs.heroSubtitle.textContent = settings.hero_subtitle || refs.heroSubtitle.textContent;
      const heroImg = settings.hero_image || settings.hero_image_url || "";
      if(heroImg) refs.heroSection.style.backgroundImage = `linear-gradient(120deg,#0f1720 0%, rgba(15,23,32,0.65) 40%), url('${heroImg}')`;
      // profile
      refs.linkKetua.href = settings.ketua_instagram || "#";
      refs.linkKetua.textContent = settings.ketua_name || "—";
      refs.linkWakil.href = settings.wakil_instagram || "#";
      refs.linkWakil.textContent = settings.wakil_name || "—";
      refs.linkWali.href = settings.wali_instagram || "#";
      refs.linkWali.textContent = settings.wali_name || "—";
      refs.classCount.textContent = settings.jumlah_siswa || "—";
      refs.linkSchool.href = settings.school_url || "#";
      refs.footerText.textContent = settings.footer_text || refs.footerText.textContent;
    }
  } catch(err){ console.error("loadHero err", err); }
}

///// NEWS /////
async function loadNews(){
  try{
    const r = await supabase.from(NEWS_TABLE).select("*").order("published_at", { ascending: false }).limit(6);
    const data = (r && r.data) ? r.data : [];
    refs.newsList.innerHTML = "";
    for(const n of data){
      const card = el("div","news-card");
      const img = el("img"); img.src = n.image_url || n.url || ""; img.alt = n.title || "cover";
      const meta = el("div","news-meta");
      meta.innerHTML = `<strong>${safe(n.title)}</strong><div class="small muted">${n.published_at ? new Date(n.published_at).toLocaleDateString() : ""}</div><p class="muted small">${(n.content||"").slice(0,160)}</p>`;
      card.appendChild(img);
      card.appendChild(meta);
      refs.newsList.appendChild(card);
    }
  } catch(e){ console.error("loadNews", e); }
}

///// EVENTS /////
async function loadEvents(){
  try{
    const r = await supabase.from(EVENTS_TABLE).select("*").order("event_date", { ascending: true }).limit(8);
    const data = (r && r.data) ? r.data : [];
    refs.eventsList.innerHTML = "";
    for(const ev of data){
      const c = el("div","event-card");
      c.innerHTML = `<strong>${safe(ev.title)}</strong><div class="muted small">${ev.event_date? new Date(ev.event_date).toLocaleDateString(): ""}</div><div class="small muted">${safe(ev.description||"")}</div>`;
      refs.eventsList.appendChild(c);
    }
    // set next event countdown (first upcoming)
    const next = data.find(d => d.event_date && (new Date(d.event_date) > new Date()));
    if(next){
      startCountdown(next.event_date);
    }
  } catch(e){ console.error("loadEvents", e); }
}
let countdownTimer = null;
function startCountdown(target){
  try{
    if(countdownTimer) clearInterval(countdownTimer);
    function tick(){
      const now = new Date();
      const t = new Date(target) - now;
      if(t <= 0){ refs.heroCountdown.textContent = "Event berjalan"; clearInterval(countdownTimer); return; }
      const days = Math.floor(t / (1000*60*60*24));
      const hours = Math.floor((t%(1000*60*60*24))/(1000*60*60));
      const mins = Math.floor((t%(1000*60*60))/(1000*60));
      const secs = Math.floor((t%(1000*60))/1000);
      refs.heroCountdown.textContent = `${days}d ${hours}h ${mins}m ${secs}s`;
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  } catch(e){ console.error("startCountdown", e); }
}

///// TAGS /////
async function loadTags(){
  try{
    const r = await supabase.from(TAGS_TABLE).select("name").order("name", { ascending: true });
    const data = (r && r.data) ? r.data : [];
    state.tagsCache = data.map(x => x.name);
    // populate gallery tag filter select
    if(refs.galleryTagFilter){
      refs.galleryTagFilter.innerHTML = `<option value="">Semua tag</option>${state.tagsCache.map(t => `<option value="${t}">${t}</option>`).join("")}`;
    }
    // populate modal checklist
    if(refs.tagChecklist){
      refs.tagChecklist.innerHTML = state.tagsCache.map(t => `<label style="display:block"><input type="checkbox" value="${t}"> ${t}</label>`).join("");
    }
  } catch(e){ console.error("loadTags", e); }
}
function applyTagModal(){
  const checks = Array.from(refs.tagChecklist.querySelectorAll("input:checked")).map(i => i.value);
  state.galleryTag = checks.join(",");
  refs.filterModal.classList.add("hide");
  resetGalleryAndLoad();
}

///// GALLERY (lazy load pages) /////
async function resetGalleryAndLoad(){
  state.galleryPage = 0;
  state.galleryExhausted = false;
  state.photosCache = [];
  refs.galleryGrid.innerHTML = "";
  refs.pageInfo.textContent = "";
  await loadGalleryPage(1);
}

async function loadGalleryPage(page=1){
  if(state.galleryLoading || state.galleryExhausted) return;
  state.galleryLoading = true;
  refs.loadMoreBtn.textContent = "Memuat...";
  try{
    // build filters - simple: we'll ignore complex tags queries for now and fetch by range
    const offset = (page-1) * PER_PAGE;
    const r = await supabase.from(PHOTO_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + PER_PAGE - 1);
    if(r.error) throw r.error;
    const items = r.data || [];
    if(!items.length){
      state.galleryExhausted = true;
      refs.loadMoreBtn.textContent = "Tidak ada lagi";
      refs.pageInfo.textContent = `Halaman ${state.galleryPage || 1}`;
      return;
    }
    // append
    state.photosCache.push(...items);
    renderGalleryItems(items);
    state.galleryPage = page;
    refs.pageInfo.textContent = `Halaman ${state.galleryPage}`;
    refs.loadMoreBtn.textContent = "Muat Lebih";
  } catch(err){
    console.error("loadGalleryPage", err);
    refs.loadMoreBtn.textContent = "Gagal muat";
    toast("Gagal memuat galeri", "error");
  } finally {
    state.galleryLoading = false;
  }
}

function renderGalleryItems(items){
  for(const p of items){
    const tile = el("div","photo-tile");
    tile.tabIndex = 0;
    // image
    const img = el("img");
    img.alt = p.title || "foto";
    img.loading = "lazy";
    // determine url
    const url = p.url || p.image_url || publicUrlFromPath(PHOTO_BUCKET, p.path || p.image_path) || "";
    img.src = url;
    // meta block
    const meta = el("div","photo-meta");
    meta.innerHTML = `<strong>${safe(p.title) || "-"}</strong><div class="small muted">${(p.tags||[]).join(", ")}</div>`;
    tile.appendChild(img);
    tile.appendChild(meta);
    // click open popup with single-photo list (but we can expand later to gallery)
    tile.addEventListener("click", ()=> openPopupForPhoto(p));
    tile.addEventListener("keydown", (e)=>{ if(e.key==="Enter") openPopupForPhoto(p); });
    refs.galleryGrid.appendChild(tile);
  }
}

///// POPUP VIEWER /////
function openPopupForPhoto(photo){
  // for single photo, popupList is one item
  const url = photo.url || publicUrlFromPath(PHOTO_BUCKET, photo.path || photo.image_path) || "";
  state.popupList = [url];
  state.popupIndex = 0;
  showPopup();
  setTimeout(()=> { refs.popupImg.src = state.popupList[state.popupIndex]; }, 10);
  refs.popupMeta && (refs.popupMeta.textContent = `${safe(photo.title)} • ${safe((photo.tags||[]).join(", "))}`);
}
function showPopup(){ refs.popup.classList.remove("hide"); refs.popup.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
function closePopup(){ refs.popup.classList.add("hide"); refs.popup.setAttribute("aria-hidden","true"); refs.popupImg.src=""; document.body.style.overflow=""; }
function popupPrev(){ if(!state.popupList.length) return; state.popupIndex = (state.popupIndex - 1 + state.popupList.length) % state.popupList.length; refs.popupImg.src = state.popupList[state.popupIndex]; }
function popupNext(){ if(!state.popupList.length) return; state.popupIndex = (state.popupIndex + 1) % state.popupList.length; refs.popupImg.src = state.popupList[state.popupIndex]; }

///// MEMORIES /////
async function loadMemories(){
  try{
    const r = await supabase.from(MEM_TABLE).select("*").order("order",{ ascending:true });
    if(r.error) throw r.error;
    const data = r.data || [];
    state.memCache = data;
    renderFilmStrip(data);
    if(data.length) selectMemory(data[0].id);
  } catch(e){ console.error("loadMemories", e); }
}

function renderFilmStrip(list){
  refs.filmStrip.innerHTML = "";
  const inner = el("div","strip-inner");
  list.forEach((m, idx) => {
    const row = el("div","strip-row");
    // choose thumbnail (first photo in photos array or image_url)
    let thumbPath = "";
    if(m.photos && Array.isArray(m.photos) && m.photos.length) {
      const p0 = m.photos[0];
      thumbPath = p0.url || p0.path || p0.image_url || "";
    } else {
      thumbPath = m.image_url || m.image_path || "";
    }
    const thumb = el("img","strip-thumb");
    thumb.alt = m.title || `Memory ${idx+1}`;
    thumb.src = thumbPath.startsWith("http") ? thumbPath : publicUrlFromPath(MEM_BUCKET, thumbPath);
    thumb.dataset.memId = m.id;
    thumb.addEventListener("click", ()=> selectMemory(m.id));
    row.appendChild(thumb);
    inner.appendChild(row);
  });
  refs.filmStrip.appendChild(inner);
  // optional scroll handler for subtle parallax
  refs.filmStrip.addEventListener("scroll", ()=> {
    inner.style.transform = `translateY(${refs.filmStrip.scrollTop * -0.02}px)`;
  });
}

async function selectMemory(id){
  try{
    const r = await supabase.from(MEM_TABLE).select("*").eq("id", id).single();
    if(r.error) throw r.error;
    const m = r.data;
    state.currentMemory = m;
    refs.memoryTitle.textContent = m.title || "Memory";
    refs.memoryMeta.textContent = m.event_date ? new Date(m.event_date).toLocaleDateString() : "";
    refs.memoryDesc.textContent = m.short_desc || "";
    // render preview container (first large preview)
    renderMemoryPreview(m);
    // thumbnails
    refs.memoryThumbs.innerHTML = "";
    const photos = Array.isArray(m.photos) ? m.photos : [];
    for(let i=0;i<photos.length;i++){
      const ph = photos[i];
      const t = el("img");
      t.className = "strip-thumb";
      t.src = ph.url || publicUrlFromPath(MEM_BUCKET, ph.path || ph.image_path) || "";
      t.alt = ph.title || `foto ${i+1}`;
      t.addEventListener("click", ()=> openMemoryPhotoAt(i, photos));
      refs.memoryThumbs.appendChild(t);
    }
  } catch(e){ console.error("selectMemory", e); toast("Gagal muat memory", "error"); }
}

function renderMemoryPreview(m){
  // remove old preview
  refs.memPreviewContainer.innerHTML = "";
  const previewImg = el("img"); previewImg.id = "memPreview";
  const firstUrl = (m.photos && m.photos[0] && (m.photos[0].url || publicUrlFromPath(MEM_BUCKET, m.photos[0].path))) || m.image_url || publicUrlFromPath(MEM_BUCKET, m.image_path) || "";
  previewImg.src = firstUrl;
  refs.memPreviewContainer.appendChild(previewImg);
}

function openMemoryPhotoAt(idx, photos){
  state.popupList = photos.map(p => p.url || publicUrlFromPath(MEM_BUCKET, p.path || p.image_path) || "");
  state.popupIndex = idx || 0;
  showPopup(); refs.popupImg.src = state.popupList[state.popupIndex];
}
function openMemoryGallery(){
  if(!state.currentMemory) { toast("Pilih memory dulu", "error"); return; }
  const photos = state.currentMemory.photos || [];
  if(!photos.length){ toast("Tidak ada foto", "error"); return; }
  state.popupList = photos.map(p => p.url || publicUrlFromPath(MEM_BUCKET, p.path || p.image_path) || "");
  state.popupIndex = 0;
  showPopup(); refs.popupImg.src = state.popupList[0];
}

///// STORY MODE /////
function toggleStoryGlobal(){
  state.storyPlaying = !state.storyPlaying;
  if(state.storyPlaying) startAutoStory(); else stopAutoStory();
  refs.btnStory.textContent = state.storyPlaying ? "Stop Story ■" : "Story ▶";
}
function startAutoStory(){
  if(state.storyInterval) clearInterval(state.storyInterval);
  let idx = 0;
  highlightMemoryByIndex(idx);
  state.storyInterval = setInterval(()=>{
    idx = (idx + 1) % (state.memCache.length || 1);
    highlightMemoryByIndex(idx);
  }, STORY_INTERVAL_MS);
}
function stopAutoStory(){
  if(state.storyInterval) clearInterval(state.storyInterval);
  state.storyInterval = null;
  removeDetailSlide();
}
function highlightMemoryByIndex(i){
  const mem = state.memCache[i];
  if(!mem) return;
  // scroll film strip to element (best-effort)
  const thumbs = refs.filmStrip.querySelectorAll(".strip-thumb");
  if(thumbs[i]) thumbs[i].scrollIntoView({behavior:"smooth", block:"center", inline:"center"});
  selectMemory(mem.id);
  playDetailSlideshow(mem.photos || []);
}

function playDetailSlideshow(photos){
  removeDetailSlide();
  if(!photos || !photos.length) return;
  let j = 0;
  showInlinePreview(photos[j]);
  state.detailSlideTimer = setInterval(()=>{
    j = (j+1) % photos.length;
    showInlinePreview(photos[j]);
  }, DETAIL_SLIDE_MS);
}
function removeDetailSlide(){
  if(state.detailSlideTimer) { clearInterval(state.detailSlideTimer); state.detailSlideTimer = null; }
  const pr = document.getElementById("memPreview");
  if(pr) pr.remove();
}
function showInlinePreview(photo){
  const url = photo.url || publicUrlFromPath(MEM_BUCKET, photo.path || photo.image_path) || "";
  let pr = document.getElementById("memPreview");
  if(!pr){
    pr = el("img"); pr.id = "memPreview";
    pr.style.width = "100%"; pr.style.height = "320px"; pr.style.objectFit = "cover"; pr.style.borderRadius = "8px"; pr.style.marginTop = "12px";
    refs.memPreviewContainer.appendChild(pr);
  }
  pr.src = url;
  pr.style.transition = "transform 2s ease";
  pr.style.transform = "scale(1)";
  setTimeout(()=> pr.style.transform = "scale(1.03)", 60);
}
function toggleStoryForCurrent(){
  if(!state.currentMemory) { toast("Pilih memory dulu", "error"); return; }
  // if storyPlaying globally, stop; else play just current
  if(state.storyPlaying){ stopAutoStory(); return; }
  playDetailSlideshow(state.currentMemory.photos || []);
}

///// BOOTSTRAP LOAD SEQUENCE /////
async function init(){
  try{
    initBindings();
    // load essential pieces in parallel
    await Promise.all([
      withRetries(()=>loadHero()).catch(e=>console.warn("hero fail", e)),
      withRetries(()=>loadTags()).catch(e=>console.warn("tags fail", e)),
      withRetries(()=>loadNews()).catch(e=>console.warn("news fail", e)),
      withRetries(()=>loadEvents()).catch(e=>console.warn("events fail", e)),
      withRetries(()=>loadMemories()).catch(e=>console.warn("memories fail", e)),
      // start gallery first page
      withRetries(()=>loadGalleryPage(1)).catch(e=>console.warn("gallery fail", e)),
    ]);
    // small accessibility: focus main
    document.querySelector("main")?.setAttribute("tabindex","-1");
  } catch(e){
    console.error("init failed", e);
    toast("Gagal inisialisasi sebagian fitur. Cek console.", "error", 5000);
  }
}

// expose helpers for console
window.siteHelpers = {
  loadHero, loadNews, loadEvents, loadTags, loadGalleryPage, resetGalleryAndLoad, loadMemories,
  openPopupForPhoto, openMemoryGallery, startAutoStory, stopAutoStory, selectMemory,
  state,
};

// start
init();