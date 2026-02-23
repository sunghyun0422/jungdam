/* =========================
   BUMFOOD script.js (FINAL / FULL REPLACE v2 + CONTACT UPLOAD)
   ✅ 유지: header/footer fetch, year, active menu(서브 포함),
          sitemap(fullscreen modal), search(top sheet),
          chips, ESC close, hero slider(기존 그대로)
   ✅ 개선: fetch 타이밍 안정화(헤더 로드 후 바인딩),
          중복 백드롭 대비(querySelectorAll),
          오버레이 상호 배타(하나 열면 다른 하나 닫힘),
          스크롤 락(스크롤바 폭 보정 포함) → 화면 흔들림 제거,
          링크 클릭 시 모달 닫기
   ✅ FIX: 검색 버튼 클릭/엔터 submit 동일 동작
   ✅ ADD: CONTACT 폼 메일 + 파일첨부(FormData) 전송
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  /* ===== 1) HEADER / FOOTER LOAD ===== */
  const headerContainer = document.getElementById("header");
  const footerContainer = document.getElementById("footer");

  async function loadPart(container, url) {
    if (!container) return;
    const res = await fetch(url, { cache: "no-cache" });
    container.innerHTML = await res.text();
  }

  try {
    await Promise.all([
      loadPart(headerContainer, "./header.html"),
      loadPart(footerContainer, "./footer.html"),
    ]);
  } catch (e) {
    console.error("[loadPart] failed", e);
  }

  /* ===== 2) YEAR ===== */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ===== 3) ACTIVE MENU AUTO (서브 포함) ===== */
  (function setActiveMenu() {
    let current = location.pathname.split("/").filter(Boolean).pop() || "index";
    current = current.replace(".html", "");
    const currentHtml = `./${current}.html`;

    document
      .querySelectorAll(".gnbLink.is-active")
      .forEach((a) => a.classList.remove("is-active"));
    document
      .querySelectorAll(".gnbDrop a.is-sub-active")
      .forEach((a) => a.classList.remove("is-sub-active"));
    document
      .querySelectorAll(".drawer__col a.is-sub-active")
      .forEach((a) => a.classList.remove("is-sub-active"));

    // 서브 메뉴 활성 (데스크탑 드롭다운)
    document.querySelectorAll(".gnbDrop a").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      const hrefClean = href.replace("./", "").replace(".html", "");
      if (href === currentHtml || hrefClean === current) {
        a.classList.add("is-sub-active");
        a.closest(".gnbItem")
          ?.querySelector(".gnbLink")
          ?.classList.add("is-active");
      }
    });

    // 상위 메뉴 직접 링크 활성
    document.querySelectorAll(".gnbLink").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      const hrefClean = href.replace("./", "").replace(".html", "");
      if (href === currentHtml || hrefClean === current) a.classList.add("is-active");
    });

    // 사이트맵(드로어) 내부 서브 active (있으면)
    document.querySelectorAll("#drawer a").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      const hrefClean = href.replace("./", "").replace(".html", "");
      if (href === currentHtml || hrefClean === current) a.classList.add("is-sub-active");
    });
  })();

  /* =========================
     4) OVERLAY CONTROLS
  ========================= */

  /* ===== SITEMAP (Fullscreen Modal) ===== */
  const drawer = document.getElementById("drawer");
  const openMenu = document.getElementById("openMenu");
  const closeMenu = document.getElementById("closeMenu");
  const closeMenuBackdrops = document.querySelectorAll(
    "#closeMenuBackdrop, .sitemapModal__backdrop"
  );

  /* ===== SEARCH (Top Sheet) ===== */
  const searchBar = document.getElementById("searchBar");
  const openSearch = document.getElementById("openSearch");
  const closeSearch = document.getElementById("closeSearch");
  const closeSearchBackdrops = document.querySelectorAll(
    "#closeSearchBackdrop, .searchSheet__backdrop"
  );

  let __scrollY = 0;

  function setScrollLock(lock) {
    if (lock) {
      if (document.body.classList.contains("no-scroll")) return;
      __scrollY = window.scrollY || window.pageYOffset;
      document.body.classList.add("no-scroll");
      document.body.style.top = `-${__scrollY}px`;
    } else {
      document.body.classList.remove("no-scroll");
      document.body.style.top = "";
      window.scrollTo(0, __scrollY);
    }
  }

  function isDrawerOpen() {
    return Boolean(drawer?.classList.contains("is-open"));
  }
  function isSearchOpen() {
    return Boolean(searchBar?.classList.contains("is-open"));
  }
  function anyOverlayOpen() {
    return isDrawerOpen() || isSearchOpen();
  }

  function setDrawer(open) {
    if (!drawer) return;
    if (open) setSearch(false); // 하나 열면 다른 하나 닫기

    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    openMenu?.setAttribute("aria-expanded", String(open));

    setScrollLock(anyOverlayOpen());

    if (open) {
      setTimeout(() => {
        const first = drawer.querySelector(
          "a, button, input, [tabindex]:not([tabindex='-1'])"
        );
        first?.focus();
      }, 0);
    }
  }

  function setSearch(open) {
    if (!searchBar) return;
    if (open) setDrawer(false); // 하나 열면 다른 하나 닫기

    searchBar.classList.toggle("is-open", open);
    searchBar.setAttribute("aria-hidden", String(!open));
    openSearch?.setAttribute("aria-expanded", String(open));

    setScrollLock(anyOverlayOpen());

    if (open) {
      const input =
        searchBar.querySelector("#searchInput") ||
        searchBar.querySelector(".searchSheet__input");
      setTimeout(() => input?.focus(), 0);
    }
  }

  // open/close bind
  openMenu?.addEventListener("click", () => setDrawer(true));
  closeMenu?.addEventListener("click", () => setDrawer(false));
  closeMenuBackdrops.forEach((bd) => bd.addEventListener("click", () => setDrawer(false)));

  openSearch?.addEventListener("click", () => setSearch(true));
  closeSearch?.addEventListener("click", () => setSearch(false));
  closeSearchBackdrops.forEach((bd) => bd.addEventListener("click", () => setSearch(false)));

  // 사이트맵 안 링크 클릭하면 모달 닫기
  drawer?.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a");
    if (!a) return;
    setDrawer(false);
  });

  // 추천 검색어(칩) 클릭 -> 인풋에 채우기 + 포커스
  function bindChips() {
    const chips = document.querySelectorAll(".chip, .searchSheet__chip");
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const q = (chip.getAttribute("data-chip") || chip.textContent || "").trim();
        const input =
          document.querySelector("#searchBar #searchInput") ||
          document.querySelector("#searchBar .searchSheet__input") ||
          document.querySelector(".searchSheet__input");
        if (input) input.value = q;
        input?.focus();
      });
    });
  }
  bindChips();

  /* ===== SEARCH SUBMIT (버튼/엔터 동일) ===== */
  (function bindSearchSubmit() {
    if (!searchBar) return;

    const form =
      searchBar.querySelector('form[role="search"]') ||
      searchBar.querySelector("form") ||
      null;

    const input =
      searchBar.querySelector("#searchInput") ||
      searchBar.querySelector(".searchSheet__input") ||
      null;

    if (!form || !input) return;

    const submitBtn = form.querySelector('button[type="submit"]');

    const go = () => {
      const q = (input.value || "").trim();
      if (!q) {
        input.focus();
        return;
      }
      window.location.href = `./search.html?q=${encodeURIComponent(q)}`;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      go();
    });

    submitBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      go();
    });
  })();

  /* ===== ESC로 닫기 ===== */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setDrawer(false);
      setSearch(false);
    }
  });

  /* =========================
     7) HERO SLIDER (기존 그대로)
  ========================= */
  (function initHero() {
    const hero = document.querySelector(".hero");
    const viewport = document.querySelector(".hero__viewport");
    const track = document.querySelector(".heroTrack");
    if (!hero || !viewport || !track) return;

    const prevBtn = document.getElementById("prevHero");
    const nextBtn = document.getElementById("nextHero");
    const dots = Array.from(document.querySelectorAll(".dot"));

    const realSlides = Array.from(track.querySelectorAll(".heroSlide"));
    const realLen = realSlides.length;
    if (realLen <= 1) return;

    const AUTO_MS = 5000;
    const TRANS_MS = 900;
    const EASE = "cubic-bezier(.22,.61,.36,1)";

    const firstClone = realSlides[0].cloneNode(true);
    const lastClone = realSlides[realLen - 1].cloneNode(true);
    firstClone.classList.add("is-clone");
    lastClone.classList.add("is-clone");

    track.insertBefore(lastClone, realSlides[0]);
    track.appendChild(firstClone);

    const slides = Array.from(track.querySelectorAll(".heroSlide"));
    let idx = 1;
    let isMoving = false;

    let autoTimeout = null;
    let autoInterval = null;

    function realIndex() {
      let r = idx - 1;
      if (r < 0) r = realLen - 1;
      if (r >= realLen) r = 0;
      return r;
    }

    function syncDots() {
      const r = realIndex();
      dots.forEach((d, n) => d.classList.toggle("is-on", n === r));
    }

    function applyTransform(withAnim) {
      const current = slides[idx];
      if (!current) return;

      const vw = viewport.getBoundingClientRect().width;
      const sw = current.getBoundingClientRect().width;
      const centerOffset = (vw - sw) / 2;
      const leftInTrack = current.offsetLeft;

      track.style.transition = withAnim ? `transform ${TRANS_MS}ms ${EASE}` : "none";
      track.style.transform = `translate3d(${-(leftInTrack) + centerOffset}px,0,0)`;

      syncDots();
    }

    function fixInfinite() {
      if (idx === realLen + 1) {
        idx = 1;
        applyTransform(false);
      } else if (idx === 0) {
        idx = realLen;
        applyTransform(false);
      }
    }

    function moveTo(nextIdx, withAnim = true) {
      if (isMoving) return;
      isMoving = true;
      idx = nextIdx;

      applyTransform(withAnim);

      setTimeout(() => {
        fixInfinite();
        isMoving = false;
      }, withAnim ? TRANS_MS + 50 : 0);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        idx = 1;
        applyTransform(false);
      });
    });

    nextBtn?.addEventListener("click", () => moveTo(idx + 1, true));
    prevBtn?.addEventListener("click", () => moveTo(idx - 1, true));

    dots.forEach((d) => {
      d.addEventListener("click", () => {
        const go = Number(d.dataset.go);
        moveTo(go + 1, true);
      });
    });

    function stopAuto() {
      clearTimeout(autoTimeout);
      clearInterval(autoInterval);
    }

    function startAuto() {
      stopAuto();
      autoTimeout = setTimeout(() => {
        moveTo(idx + 1, true);
        autoInterval = setInterval(() => moveTo(idx + 1, true), AUTO_MS);
      }, AUTO_MS);
    }

    startAuto();

    ["click", "touchstart", "pointerdown"].forEach((evt) => {
      hero.addEventListener(evt, startAuto, { passive: true });
    });

    window.addEventListener("resize", () => applyTransform(false));
  })();

  /* =========================
     8) CONTACT (메일 + 파일첨부)
  ========================= */
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fd = new FormData();
      const v = (id) => (document.getElementById(id)?.value || "").trim();

      // 텍스트
      fd.append("type", v("type"));
      fd.append("company", v("company"));
      fd.append("name", v("name"));
      fd.append("email", v("email"));
      fd.append("phone", v("phone"));
      fd.append("region", v("region"));
      fd.append("subject", v("subject"));
      fd.append("message", v("message"));

      // 링크(선택)
      fd.append("filesLink", v("files"));

      // 파일(선택)
      const upload = document.getElementById("upload");
      const files = upload?.files ? Array.from(upload.files) : [];

      // 제한: 최대 3개, 파일당 10MB
      if (files.length > 3) {
        alert("파일은 최대 3개까지 첨부할 수 있어요.");
        return;
      }
      const over = files.find((f) => f.size > 10 * 1024 * 1024);
      if (over) {
        alert(`"${over.name}" 파일이 10MB를 초과합니다.`);
        return;
      }
      files.forEach((file) => fd.append("files", file));

      // 필수값 체크
      const required = ["type", "company", "name", "email", "subject", "message"];
      for (const key of required) {
        if (!fd.get(key)) {
          alert("필수 항목(*)을 모두 입력해 주세요.");
          return;
        }
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const oldText = submitBtn?.textContent;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "전송 중...";
        }

        const res = await fetch("/api/send-mail", {
  method: "POST",
  body: fd,
});


        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "전송 실패");

        alert("문의가 접수되었습니다.");
        contactForm.reset();
      } catch (err) {
        console.error(err);
        alert(`전송 실패: ${err.message || "서버/설정을 확인하세요."}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = oldText || "문의 접수";
        }
      }
    });
  }
});
// BUSINESS AREAS (tab switch)
(function(){
  const rail = document.querySelector(".aJump");
  const areas = Array.from(document.querySelectorAll(".aArea"));
  if(!rail || areas.length === 0) return;

  const links = Array.from(rail.querySelectorAll(".aJump__link"));

  function activate(id){
    const targetId = (id || "").replace("#", "") || areas[0].id;

    areas.forEach(a => a.classList.toggle("is-active", a.id === targetId));
    links.forEach(l => {
      const lid = (l.getAttribute("href") || "").replace("#", "");
      l.classList.toggle("is-active", lid === targetId);
      l.setAttribute("aria-current", lid === targetId ? "true" : "false");
    });

    // URL만 갱신(스크롤 튀는 건 방지)
    if(history.replaceState){
  history.replaceState(null, "", location.pathname);
}

  }

  // 클릭 시 탭 전환
  links.forEach(l => {
    l.addEventListener("click", (e) => {
      e.preventDefault();
      activate(l.getAttribute("href"));
    });
  });

  // 초기: 해시 있으면 그거, 없으면 첫 탭
  activate(location.hash);
})();
// ✅ Collaboration / Affiliates (data-driven)
// ✅ Collaboration / Affiliates (logo-only, data-driven)
(async function loadAffiliates(){
  const head = document.getElementById("affHead");
  const grid = document.getElementById("affGrid");
  if(!head || !grid) return;

  try{
    const res = await fetch("./data/affiliates.json", { cache: "no-store" });
    if(!res.ok) throw new Error("affiliates.json fetch failed");
    const data = await res.json();

    head.innerHTML = `
      <div>
        <p class="affK">${data.title || "COLLABORATION"}</p>
        <h2 class="affT">${data.headline || "협업 브랜드"}</h2>
        <p class="affD">${data.desc || ""}</p>
      </div>
    `;

    const items = Array.isArray(data.items) ? data.items : [];
    grid.innerHTML = items.map((it) => {
      const name = it.name || "Brand";
      const url  = it.url  || "#";
      const logo = it.logo || "";

      // 로고만 노출. 텍스트는 접근성/툴팁으로만.
      return `
        <a class="affLogoLink"
           href="${url}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="${name} 사이트로 이동 (새 창)"
           title="${name}">
          <img class="affLogoImg"
               src="${logo}"
               alt="${name} 로고"
               loading="lazy" />
        </a>
      `;
    }).join("");

  }catch(err){
    const section = grid.closest(".affiliates");
    if(section) section.style.display = "none";
  }
})();