const scramjet = new ScramjetController({
  prefix: "/service/scramjet/",
  files: {
    wasm: "/scramjet/scramjet.wasm.wasm",
    worker: "/scramjet/scramjet.worker.js",
    client: "/scramjet/scramjet.client.js",
    shared: "/scramjet/scramjet.shared.js",
    sync: "/scramjet/scramjet.sync.js"
  }
});

async function registerServiceWorker(proxyt) {
  if (!('serviceWorker' in navigator)) return;

  const swpath = '/sw.js';

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }

    await navigator.serviceWorker.register(swpath);
    console.log(`sw registered for ${proxyt}`);
  } catch (err) {
    console.error("sw registration failed", err);
  }
}

function getfav(url) {
  try {
    const domain = new URL(url).origin;
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(domain)}`;
  } catch {
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById("input");
  const iframecont = document.getElementById("iframeContainer");
  const proxysel = document.getElementById("proxysel");
  const tabsbar = document.getElementById("tabsBar");
  const homepage = document.getElementById("homepage");

  const backbtn = document.getElementById("backBtn");
  const forwardbtn = document.getElementById("forwardBtn");
  const reloadbtn = document.getElementById("reloadBtn");

  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  const wisp = {location.protocol === "http:" ? "ws:" :  "wss:"}//${location.host}/wisp/

  await connection.setTransport("/epoxy/index.mjs", [{ wisp }]);

  scramjet.init();

  const sproxy = localStorage.getItem('sproxy');
  if (sproxy) {
    proxysel.value = sproxy;
  }

  registerServiceWorker(proxysel.value);

  proxysel.addEventListener('change', e => {
    const selected = e.target.value;
    localStorage.setItem('sproxy', selected);
    registerServiceWorker(selected);
  });

  const resolveurl = (inputval) => {
    const trimmed = inputval.trim();
    const searchurl = "https://search.brave.com/search?q=%s";

    try {
      return new URL(trimmed).toString();
    } catch {
      try {
        const guess = new URL("https://" + trimmed);
        if (guess.hostname.includes(".")) return guess.toString();
      } catch {}
    }

    return searchurl.replace("%s", encodeURIComponent(trimmed));
  };

  function encodeurl(url) {
    const proxy = proxysel.value;
    switch (proxy) {
      case "uv":
        return window.__uv$config?.prefix + window.__uv$config.encodeUrl(url);
      case "envade":
        return window.__envade$config?.prefix + window.__envade$config.codec.encode(url);
      case "scramjet":
        return scramjet.encodeUrl?.(url) || url;
      default:
        return url;
    }
  }

  let tabs = [];
  let activetab = null;
  let tabid = 0;

  function toggleHomepage() {
    if (tabs.length === 0) {
      homepage.style.display = "block";
    } else {
      homepage.style.display = "none";
    }
  }

  function createtab(initurl = "https://hyperion-assets.vercel.app/") {
    const frame = document.createElement("iframe");
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.position = "absolute";
    frame.style.top = 0;
    frame.style.left = 0;
    frame.style.display = "none";

    iframecont.appendChild(frame);

    const tab = {
      id: tabid++,
      frame,
      url: initurl,
      title: "new tab",
      fav: getfav(initurl)
    };

    tabs.push(tab);
    frame.src = encodeurl(initurl);

    frame.addEventListener("load", () => {
      try {
        const ttl = frame.contentDocument?.title || new URL(initurl).hostname;
        tab.title = ttl || "...";
      } catch {
        tab.title = new URL(initurl).hostname;
      }
      tab.fav = getfav(tab.url);
      updatetabs();
    });

    switchtab(tab.id);
    toggleHomepage();
    updatetabs();
  }

  function switchtab(id) {
    tabs.forEach(t => t.frame.style.display = "none");

    const found = tabs.find(t => t.id === id);
    if (!found) return;

    activetab = id;
    found.frame.style.display = "block";
    input.value = found.url;
    toggleHomepage();
    updatetabs();
  }

  function closetab(id) {
    const i = tabs.findIndex(t => t.id === id);
    if (i === -1) return;

    const [tab] = tabs.splice(i, 1);
    tab.frame.remove();

    if (tabs.length === 0) {
      toggleHomepage();
    } else if (id === activetab) {
      switchtab(tabs[Math.max(i - 1, 0)].id);
    } else {
      updatetabs();
    }
  }

  function updatetabs() {
    tabsbar.innerHTML = "";

    tabs.forEach(tab => {
      const el = document.createElement("div");
      el.className = "tab" + (tab.id === activetab ? " active" : "");
      el.onclick = () => switchtab(tab.id);

      const icon = document.createElement("img");
      icon.src = tab.fav;
      icon.className = "tabicon";
      icon.alt = "";
      icon.onerror = () => icon.style.display = "none";

      const ttl = document.createElement("span");
      ttl.className = "tabttl";
      ttl.textContent = tab.title;

      const cls = document.createElement("span");
      cls.className = "tabclose";
      cls.textContent = "\u00d7";
      cls.onclick = (e) => {
        e.stopPropagation();
        closetab(tab.id);
      };

      el.appendChild(icon);
      el.appendChild(ttl);
      el.appendChild(cls);
      tabsbar.appendChild(el);
    });

    const add = document.createElement("div");
    add.className = "tab add";
    add.textContent = "+";
    add.onclick = () => createtab();
    tabsbar.appendChild(add);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const url = resolveurl(input.value);
      const tab = tabs.find(t => t.id === activetab);
      if (!tab) return;
      tab.url = url;
      tab.frame.src = encodeurl(url);
    }
  });

  reloadbtn.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activetab);
    if (tab) tab.frame.src = encodeurl(tab.url);
  });

  backbtn.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activetab);
    if (tab && tab.frame.contentWindow) tab.frame.contentWindow.history.back();
  });

  forwardbtn.addEventListener("click", () => {
    const tab = tabs.find(t => t.id === activetab);
    if (tab && tab.frame.contentWindow) tab.frame.contentWindow.history.forward();
  });



  toggleHomepage();
  updatetabs();

  if (tabs.length === 0) {
    createtab();
  }
});
