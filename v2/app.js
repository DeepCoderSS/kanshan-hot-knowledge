const els = {
  startButton: document.querySelector("#start-button"),
  snapshotNotice: document.querySelector("#snapshot-notice"),
  snapshotTime: document.querySelector("#snapshot-time"),
  hotList: document.querySelector("#hot-list-rail"),
  topicRank: document.querySelector("#topic-rank"),
  topicTime: document.querySelector("#topic-time"),
  topicTitle: document.querySelector("#topic-title"),
  topicSummary: document.querySelector("#topic-summary"),
  factStrip: document.querySelector("#fact-strip"),
  sourceLink: document.querySelector("#source-link"),
  topicBubble: document.querySelector("#topic-bubble"),
  progressLabel: document.querySelector("#progress-label"),
  progressBar: document.querySelector("#progress-bar"),
  boxGrid: document.querySelector("#box-grid"),
  talkSection: document.querySelector("#talk-section"),
  talkTitle: document.querySelector("#talk-title"),
  talkPoints: document.querySelector("#talk-points"),
  talkOpener: document.querySelector("#talk-opener"),
  passportCount: document.querySelector("#passport-count"),
  modal: document.querySelector("#knowledge-modal"),
  closeModal: document.querySelector("#close-modal"),
  modalContent: document.querySelector("#modal-content")
};

const storageKey = "kanshan-knowledge-progress-v1";
const state = {
  generated: [],
  featured: [],
  activeId: "",
  completed: {},
  activeBox: null
};

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "时间待确认" : dateTimeFormatter.format(date);
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "时间待确认" : timeFormatter.format(date);
}

function activePayload() {
  return [...state.generated, ...state.featured].find((item) => item.id === state.activeId)
    ?? state.generated[0]
    ?? state.featured[0];
}

function completedForActive() {
  return state.completed[state.activeId] ?? [];
}

function saveProgress() {
  window.localStorage.setItem(storageKey, JSON.stringify(state.completed));
}

function renderPassport() {
  els.passportCount.textContent = Object.values(state.completed)
    .reduce((total, items) => total + items.length, 0);
}

function renderHotList() {
  els.hotList.innerHTML = state.generated.slice(0, 9).map((payload, index) => {
    const topic = payload.topic;
    const thumbnail = topic.thumbnailUrl
      ? `<img src="${escapeHtml(topic.thumbnailUrl)}" alt="" loading="lazy" />`
      : `<span>${index + 1}</span>`;
    return `
      <article class="hotItem">
        <div class="hotThumb">${thumbnail}<b>#${index + 1}</b></div>
        <h4>${escapeHtml(topic.title)}</h4>
        <p>${escapeHtml(topic.summary || "打开热点后，和刘看山一起寻找知识暗门。")}</p>
        <button class="hotPageLink" type="button" data-topic-id="${escapeHtml(payload.id)}">进入拆盒页面 →</button>
      </article>
    `;
  }).join("");
}

function renderTopic() {
  const payload = activePayload();
  if (!payload) return;
  const topic = payload.topic;

  els.topicRank.textContent = topic.rank;
  els.topicTime.textContent = formatDateTime(payload.updatedAt);
  els.topicTitle.textContent = topic.title;
  els.topicSummary.textContent = topic.summary;
  els.factStrip.innerHTML = topic.facts.map((fact) => `<span>${escapeHtml(fact)}</span>`).join("");
  els.sourceLink.href = topic.sourceUrl;
  els.topicBubble.textContent = topic.bubble;
}

function renderBoxes() {
  const payload = activePayload();
  if (!payload) return;
  const completed = completedForActive();

  els.boxGrid.innerHTML = payload.topic.boxes.map((box, index) => {
    const done = completed.includes(box.id);
    return `
      <button class="boxCard${done ? " complete" : ""}" type="button" data-box-id="${escapeHtml(box.id)}">
        <div><span>${escapeHtml(box.icon)}</span><small>DOOR ${String(index + 1).padStart(2, "0")}</small></div>
        <h3>${escapeHtml(box.clue)}</h3>
        <p>${escapeHtml(box.label)} · 先猜再看答案</p>
        <strong>${done ? "再看一次" : "打开这扇门"} →</strong>
      </button>
    `;
  }).join("");
}

function renderProgress() {
  const payload = activePayload();
  if (!payload) return;
  const completed = completedForActive();
  const total = payload.topic.boxes.length;
  els.progressLabel.textContent = `${completed.length} / ${total} 已打开`;
  els.progressBar.style.width = `${(completed.length / total) * 100}%`;

  const complete = completed.length === total;
  els.talkSection.hidden = !complete;
  if (complete) {
    els.talkTitle.textContent = payload.topic.shortTitle;
    els.talkPoints.innerHTML = payload.topic.boxes.map((box) => `<li>${escapeHtml(box.talkLine)}</li>`).join("");
    els.talkOpener.textContent = payload.topic.talkOpener;
  }
}

function renderAll() {
  renderPassport();
  renderTopic();
  renderBoxes();
  renderProgress();
}

function chooseTopic(id, scroll = false) {
  const exists = [...state.generated, ...state.featured].some((item) => item.id === id);
  if (!exists) return;
  state.activeId = id;
  closeModal();
  renderAll();
  const url = new URL(window.location.href);
  url.searchParams.set("case", id);
  window.history.replaceState({}, "", url);
  if (scroll) document.querySelector(".topicCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openBox(id) {
  const payload = activePayload();
  const box = payload?.topic.boxes.find((item) => item.id === id);
  if (!box) return;
  state.activeBox = box;
  els.modalContent.innerHTML = `
    <span class="modalLabel">${escapeHtml(box.icon)} ${escapeHtml(box.label)}</span>
    <h2 id="box-question">${escapeHtml(box.question)}</h2>
    <div class="optionList">
      ${box.options.map((option, index) => `
        <button type="button" data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>
      `).join("")}
    </div>
  `;
  els.modal.hidden = false;
  document.body.classList.add("modalOpen");
}

function answerBox(index) {
  const box = state.activeBox;
  if (!box) return;
  const existing = state.completed[state.activeId] ?? [];
  if (!existing.includes(box.id)) state.completed[state.activeId] = [...existing, box.id];
  saveProgress();
  renderAll();

  const correct = index === box.answer;
  els.modalContent.innerHTML = `
    <span class="modalLabel">${escapeHtml(box.icon)} ${escapeHtml(box.label)}</span>
    <div class="answerReveal">
      <div class="${correct ? "correct" : "tryAgain"}"><strong>${correct ? "判断很准。" : "这个选项很像正确答案。"}</strong>${escapeHtml(box.answerNote)}</div>
      <h3>${escapeHtml(box.headline)}</h3>
      <ol>${box.explanation.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      <aside><strong>容易误解</strong>${escapeHtml(box.misconception)}</aside>
      <blockquote><strong>拿去聊</strong>${escapeHtml(box.talkLine)}</blockquote>
      <div class="modalSources">${box.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join("")}</div>
      <button class="primaryButton modalDone" type="button" data-modal-done>收下这个知识点</button>
    </div>
  `;
}

function closeModal() {
  state.activeBox = null;
  els.modal.hidden = true;
  document.body.classList.remove("modalOpen");
}

function bindEvents() {
  els.startButton.addEventListener("click", () => document.querySelector("#cases").scrollIntoView({ behavior: "smooth" }));
  els.hotList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic-id]");
    if (button) chooseTopic(button.dataset.topicId, true);
  });
  els.boxGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-box-id]");
    if (button) openBox(button.dataset.boxId);
  });
  els.modalContent.addEventListener("click", (event) => {
    const answer = event.target.closest("[data-answer]");
    if (answer) answerBox(Number(answer.dataset.answer));
    if (event.target.closest("[data-modal-done]")) closeModal();
  });
  els.closeModal.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) closeModal();
  });
}

async function init() {
  bindEvents();
  try {
    const [collection, loongson, typhoon] = await Promise.all([
      fetch("data/hot-pages.json", { cache: "no-store" }).then((response) => response.json()),
      fetch("data/hot-topic-loongson.json").then((response) => response.json()),
      fetch("data/hot-topic.json").then((response) => response.json())
    ]);
    state.generated = collection.items;
    state.featured = [loongson, typhoon];
    els.snapshotTime.textContent = `${formatTime(collection.generatedAt)} 更新 · 最近快照`;

    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try { state.completed = JSON.parse(stored); } catch { window.localStorage.removeItem(storageKey); }
    }

    const requestedCase = new URLSearchParams(window.location.search).get("case");
    const requestedPayload = [...state.generated, ...state.featured].find((item) => item.id === requestedCase);
    state.activeId = requestedPayload?.id ?? state.generated[0]?.id ?? state.featured[0]?.id ?? "";
    renderHotList();
    renderAll();
  } catch (error) {
    els.snapshotNotice.hidden = false;
    els.snapshotNotice.textContent = `快照加载失败：${error instanceof Error ? error.message : "请稍后重试"}`;
  }
}

init();
