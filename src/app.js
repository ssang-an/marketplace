const searchInput = document.getElementById("searchInput");
const chipRow = document.getElementById("chipRow");
const sortSelect = document.getElementById("sortSelect");
const toolGrid = document.getElementById("toolGrid");

const toolModal = document.getElementById("toolModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalToolName = document.getElementById("modalToolName");
const modalDescription = document.getElementById("modalDescription");
const modalCategory = document.getElementById("modalCategory");
const modalDeveloper = document.getElementById("modalDeveloper");
const modalUsecount = document.getElementById("modalUsecount");
const modalKeys = document.getElementById("modalKeys");
const apiQueryInput = document.getElementById("apiQueryInput");
const apiPayloadPreview = document.getElementById("apiPayloadPreview");
const copyApiBtn = document.getElementById("copyApiBtn");
const copyApiStatus = document.getElementById("copyApiStatus");
const sourceCodePreview = document.getElementById("sourceCodePreview");
const copySourceBtn = document.getElementById("copySourceBtn");
const copySourceStatus = document.getElementById("copySourceStatus");
const modalTabs = Array.from(document.querySelectorAll(".modal-tab"));
const modalPanes = {
  api: document.getElementById("apiPane"),
  source: document.getElementById("sourcePane")
};

let activeFilter = "all";
let toolsData = [];
let selectedTool = null;
const sourceCodeCache = new Map();

function formatUseCount(count) {
  const numeric = Number(count) || 0;
  if (numeric < 1000) {
    return String(numeric);
  }
  const value = (numeric / 1000).toFixed(1);
  return `${value.endsWith(".0") ? value.slice(0, -2) : value}k`;
}

function formatDeveloperLabel(developer) {
  // Supports:
  // - "MES Team" (legacy string)
  // - { name: "홍길동", team: "MES Team" }
  // - { developer_name: "홍길동", developer_team: "MES Team" }
  if (typeof developer === "string") {
    return developer;
  }

  if (!developer || typeof developer !== "object") {
    return "-";
  }

  const name = developer.name || developer.developer_name || "";
  const team = developer.team || developer.developer_team || "";

  if (name && team) {
    return `${name} · ${team}`;
  }
  return name || team || "-";
}

const CATEGORY_COLOR_PRESETS = {
  lot: { bg: "#e7f3ff", fg: "#1f5f9a", border: "#9cc5eb" },
  eqp: { bg: "#e6fbef", fg: "#1f7a46", border: "#95dfb2" },
  process: { bg: "#fff3e8", fg: "#a25018", border: "#f5be95" },
  quality: { bg: "#f4ecff", fg: "#6a3aa3", border: "#ccb1f2" },
  yield: { bg: "#fff9dc", fg: "#8c6f0d", border: "#ead88d" }
};

const TOOLS = [
  { toolname: "lotstatus", description: "Lot 현재 공정/대기/이상 상태 조회", keys: ["lot_id", "fab", "include_hold"], category: "lot", developer: "MES Team", usecount: 1940 },
  { toolname: "lot_history", description: "Lot 이동 이력과 체류 시간 조회", keys: ["lot_id", "start_time", "end_time"], category: "lot", developer: "MES Team", usecount: 1725 },
  { toolname: "lot_hold_reason", description: "Lot hold 사유 코드/조치 상태 조회", keys: ["lot_id"], category: "lot", developer: "Quality Ops", usecount: 1410 },
  { toolname: "lot_priority_queue", description: "긴급 lot 우선순위 큐 조회", keys: ["line", "priority_group"], category: "lot", developer: "Planning", usecount: 1490 },
  { toolname: "lot_dispatch_reco", description: "가용 설비 기반 lot dispatch 추천", keys: ["line", "eqp_group", "lot_ids"], category: "lot", developer: "Scheduling AI", usecount: 1180 },
  { toolname: "lot_split_merge", description: "Lot split/merge 가능 조건 점검", keys: ["lot_id", "action", "target_qty"], category: "lot", developer: "MES Team", usecount: 1090 },
  { toolname: "eqpstatus", description: "설비 상태(run/idle/down/pm) 실시간 조회", keys: ["eqp_id", "area"], category: "eqp", developer: "Equipment Eng", usecount: 2380 },
  { toolname: "get_down_eqp_list", description: "다운 설비 목록 및 다운 시간 조회", keys: ["fab", "area", "min_down_min"], category: "eqp", developer: "Equipment Eng", usecount: 2230 },
  { toolname: "eqp_alarm_feed", description: "설비 알람 이벤트 스트림 조회", keys: ["eqp_id", "severity", "from_time"], category: "eqp", developer: "Automation", usecount: 1660 },
  { toolname: "eqp_pm_schedule", description: "설비 PM 일정/잔여 시간 조회", keys: ["eqp_id", "window_days"], category: "eqp", developer: "Maintenance", usecount: 1520 },
  { toolname: "eqp_recipe_capability", description: "설비별 지원 recipe/제약 조건 조회", keys: ["eqp_id"], category: "eqp", developer: "Process Eng", usecount: 1370 },
  { toolname: "eqp_utilization", description: "설비 가동률/유휴율 분석", keys: ["eqp_group", "date"], category: "eqp", developer: "Ops Analytics", usecount: 1810 },
  { toolname: "recipe_parameter_trace", description: "Lot별 recipe 파라미터 적용 이력 조회", keys: ["lot_id", "step"], category: "process", developer: "Process Eng", usecount: 1460 },
  { toolname: "process_window_check", description: "공정 스펙 윈도우 초과 여부 점검", keys: ["step", "values"], category: "process", developer: "Process Eng", usecount: 1750 },
  { toolname: "chamber_matching_score", description: "챔버간 매칭 지수와 편차 지표 제공", keys: ["eqp_group", "recipe"], category: "process", developer: "Process Eng", usecount: 1260 },
  { toolname: "spc_signal_monitor", description: "SPC 룰 위반 신호 및 추세 감지", keys: ["parameter", "line", "period"], category: "process", developer: "SPC Team", usecount: 1980 },
  { toolname: "inline_metrology", description: "Inline 계측 데이터 조회/요약", keys: ["lot_id", "wafer_id"], category: "process", developer: "Metrology", usecount: 1540 },
  { toolname: "run_to_run_tuning", description: "R2R 제어 파라미터 추천값 생성", keys: ["recipe", "last_runs"], category: "process", developer: "APC Team", usecount: 1175 },
  { toolname: "defect_map_summary", description: "Wafer defect map 패턴 분류 결과 조회", keys: ["wafer_id"], category: "quality", developer: "Defect Analysis", usecount: 1640 },
  { toolname: "defect_image_lookup", description: "결함 이미지/라벨 메타데이터 조회", keys: ["defect_id"], category: "quality", developer: "Defect Analysis", usecount: 1510 },
  { toolname: "fdc_anomaly_trace", description: "FDC 이상 탐지 이벤트와 연관 lot 추적", keys: ["eqp_id", "from_time"], category: "quality", developer: "FDC Team", usecount: 1290 },
  { toolname: "excursion_alert", description: "품질 excursion 발생/해제 알림 조회", keys: ["product", "severity"], category: "quality", developer: "Quality Ops", usecount: 1430 },
  { toolname: "sample_plan_recommend", description: "검사 샘플링 계획 추천", keys: ["product", "risk_level", "volume"], category: "quality", developer: "Quality Ops", usecount: 980 },
  { toolname: "coa_document_fetch", description: "COA/검사성적서 문서 조회", keys: ["lot_id", "document_type"], category: "quality", developer: "QA Document", usecount: 1210 },
  { toolname: "yield_by_step", description: "공정 step별 수율 기여도 분석", keys: ["product", "period"], category: "yield", developer: "Yield Team", usecount: 1770 },
  { toolname: "yield_loss_breakdown", description: "수율 손실 원인을 defect/category로 분해", keys: ["product", "line", "week"], category: "yield", developer: "Yield Team", usecount: 1690 },
  { toolname: "wafer_bin_distribution", description: "테스트 bin 분포 및 이상 bin 비중 분석", keys: ["lot_id"], category: "yield", developer: "Test Eng", usecount: 1580 },
  { toolname: "cp_to_ft_correlation", description: "CP-FT 결과 상관 분석", keys: ["product", "date_range"], category: "yield", developer: "Test Data", usecount: 1120 },
  { toolname: "scrap_risk_predict", description: "Lot 폐기 리스크 예측", keys: ["lot_id"], category: "yield", developer: "Yield AI", usecount: 930 },
  { toolname: "line_balance_snapshot", description: "라인별 WIP 불균형/체류 시간 스냅샷", keys: ["fab", "line"], category: "process", developer: "Ops Analytics", usecount: 1350 }
];

function categoryHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 360;
  }
  return hash;
}

function getCategoryTheme(category) {
  const key = String(category || "etc").toLowerCase();
  if (CATEGORY_COLOR_PRESETS[key]) {
    return CATEGORY_COLOR_PRESETS[key];
  }

  const hue = categoryHash(key);
  return {
    bg: `hsl(${hue} 72% 94%)`,
    fg: `hsl(${hue} 58% 34%)`,
    border: `hsl(${hue} 58% 76%)`
  };
}

function applyCategoryTheme(node, category) {
  const theme = getCategoryTheme(category);
  node.style.setProperty("--cat-bg", theme.bg);
  node.style.setProperty("--cat-fg", theme.fg);
  node.style.setProperty("--cat-border", theme.border);
}

function renderCategoryChips() {
  const categories = [...new Set(toolsData.map((tool) => tool.category))].sort((a, b) => a.localeCompare(b));

  chipRow.innerHTML = '<button class="chip active" data-filter="all">전체</button>';

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.dataset.filter = category;
    button.textContent = category;
    applyCategoryTheme(button, category);
    chipRow.appendChild(button);
  });

  const activeChip = chipRow.querySelector(`[data-filter="${activeFilter}"]`);
  if (activeChip) {
    chipRow.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
    activeChip.classList.add("active");
  } else {
    activeFilter = "all";
    chipRow.querySelector('[data-filter="all"]').classList.add("active");
  }
}

function renderTools(toolItems) {
  toolGrid.innerHTML = "";
  const selectedName = selectedTool?.toolname;

  toolItems.forEach((tool, index) => {
    const card = document.createElement("article");
    card.className = "tool-card";
    card.dataset.category = tool.category;
    card.dataset.toolname = tool.toolname;
    applyCategoryTheme(card, tool.category);
    card.style.animationDelay = `${Math.min(index, 8) * 0.04}s`;
    card.innerHTML = `
      <div class="tool-topline">
        <span class="category-dot" aria-hidden="true"></span>
        <span class="category-text">${tool.category.toUpperCase()}</span>
      </div>
      <div class="tool-head">
        <h3 class="tool-name">${tool.toolname}</h3>
        <button class="tool-toggle ${tool.enabled ? "on" : "off"}" type="button" aria-pressed="${tool.enabled ? "true" : "false"}">
          ${tool.enabled ? "ON" : "OFF"}
        </button>
      </div>
      <p>${tool.description}</p>
      <div class="meta">
        <span>${formatDeveloperLabel(tool.developer)}</span>
        <span class="usecount-badge">${formatUseCount(tool.usecount)}</span>
      </div>
    `;

    if (selectedName && selectedName === tool.toolname) {
      card.classList.add("selected");
    }

    const toggle = card.querySelector(".tool-toggle");
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      tool.enabled = !tool.enabled;
      toggle.classList.toggle("on", tool.enabled);
      toggle.classList.toggle("off", !tool.enabled);
      toggle.setAttribute("aria-pressed", tool.enabled ? "true" : "false");
      toggle.textContent = tool.enabled ? "ON" : "OFF";
    });

    card.addEventListener("click", () => openToolModal(tool));
    toolGrid.appendChild(card);
  });
}

function openToolModal(tool) {
  selectedTool = tool;
  modalToolName.textContent = tool.toolname;
  modalDescription.textContent = tool.description;
  modalCategory.textContent = tool.category.toUpperCase();
  applyCategoryTheme(modalCategory, tool.category);
  modalDeveloper.textContent = formatDeveloperLabel(tool.developer);
  modalUsecount.textContent = formatUseCount(tool.usecount);
  modalKeys.textContent = tool.keys.join(", ");
  copyApiStatus.textContent = "";
  copySourceStatus.textContent = "";
  apiQueryInput.value = "";
  updateApiPreview();
  sourceCodePreview.textContent = "Source Code 탭을 누르면 서버에서 코드를 불러옵니다.";
  setActiveModalTab("api");
  toolModal.classList.remove("hidden");
  apiQueryInput.focus();
  syncSelectedCard();
}

function closeToolModal() {
  toolModal.classList.add("hidden");
}

function syncSelectedCard() {
  const selectedName = selectedTool?.toolname;
  document.querySelectorAll(".tool-card").forEach((card) => {
    card.classList.toggle("selected", Boolean(selectedName) && card.dataset.toolname === selectedName);
  });
}

function buildApiPayload(toolName, queryText) {
  return {
    url: "pizza.skhynix.com/api/pizza/get-context",
    body: {
      tools: [toolName],
      query: queryText || "user 프롬프트 입력"
    }
  };
}

function buildSourceCode(tool) {
  const toolName = tool.toolname;
  const safeFunctionName = String(toolName).replace(/[^a-zA-Z0-9_]/g, "_");
  const keys = Array.isArray(tool.keys) ? tool.keys : [];
  const keyObject = keys.map((key) => `        "${key}": "<${key}>"`).join(",\n");

  return `import requests

API_URL = "https://pizza.skhynix.com/api/pizza/get-context"

def call_${safeFunctionName}(user_prompt: str):
    payload = {
        "tools": ["${toolName}"],
        "query": user_prompt,
        "tool_args": {
${keyObject || '        "key": "<value>"'}
        }
    }

    response = requests.post(API_URL, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    result = call_${safeFunctionName}("user 프롬프트 입력")
    print(result)
`;
}

async function fetchToolSourceFromApi(toolName) {
  // 🚨🔥 반드시 수정: 운영 환경 API 게이트웨이 경로가 다르면 이 URL 규칙을 함께 수정해야 합니다.
  const response = await fetch(`/api/tools/${encodeURIComponent(toolName)}/source`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  if (typeof data.source_code !== "string") {
    throw new Error("Invalid source payload");
  }
  return data.source_code;
}

async function loadSourceCodeForSelectedTool() {
  if (!selectedTool) {
    sourceCodePreview.textContent = "-";
    return;
  }

  const toolName = selectedTool.toolname;
  if (sourceCodeCache.has(toolName)) {
    sourceCodePreview.textContent = sourceCodeCache.get(toolName);
    return;
  }

  sourceCodePreview.textContent = "Source Code 불러오는 중...";

  try {
    const source = await fetchToolSourceFromApi(toolName);
    sourceCodeCache.set(toolName, source);
    sourceCodePreview.textContent = source;
  } catch (error) {
    console.warn("Failed to fetch source from API, fallback to local template.", error);
    const fallback = buildSourceCode(selectedTool);
    sourceCodePreview.textContent = fallback;
  }
}

function setActiveModalTab(tabName) {
  modalTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  Object.entries(modalPanes).forEach(([key, pane]) => {
    pane.classList.toggle("active", key === tabName);
  });
  if (tabName === "source") {
    void loadSourceCodeForSelectedTool();
  }
}

function updateApiPreview() {
  if (!selectedTool) {
    apiPayloadPreview.textContent = "-";
    return;
  }
  const payload = buildApiPayload(selectedTool.toolname, apiQueryInput.value.trim());
  apiPayloadPreview.textContent = JSON.stringify(payload, null, 2);
}

async function copyApiPayloadToClipboard() {
  if (!selectedTool) {
    return;
  }

  const payload = buildApiPayload(selectedTool.toolname, apiQueryInput.value.trim());
  const text = JSON.stringify(payload, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    copyApiStatus.textContent = "복사 완료";
  } catch (error) {
    // Fallback for environments where clipboard API is blocked.
    const hidden = document.createElement("textarea");
    hidden.value = text;
    document.body.appendChild(hidden);
    hidden.select();
    document.execCommand("copy");
    document.body.removeChild(hidden);
    copyApiStatus.textContent = "복사 완료";
  }
}

async function copySourceCodeToClipboard() {
  const text = sourceCodePreview.textContent || "";
  if (!text || text === "-") {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copySourceStatus.textContent = "복사 완료";
  } catch (error) {
    const hidden = document.createElement("textarea");
    hidden.value = text;
    document.body.appendChild(hidden);
    hidden.select();
    document.execCommand("copy");
    document.body.removeChild(hidden);
    copySourceStatus.textContent = "복사 완료";
  }
}

function getSortedTools(toolItems) {
  const sortBy = sortSelect.value;
  const sorted = [...toolItems];

  if (sortBy === "toolname_asc") {
    sorted.sort((a, b) => a.toolname.localeCompare(b.toolname));
  } else {
    sorted.sort((a, b) => b.usecount - a.usecount);
  }

  return sorted;
}

function getFilteredTools() {
  const keyword = searchInput.value.trim().toLowerCase();

  return toolsData.filter((tool) => {
    const bucket = `${tool.toolname} ${tool.description} ${formatDeveloperLabel(tool.developer)} ${tool.category} ${tool.keys.join(" ")}`.toLowerCase();
    const passKeyword = !keyword || bucket.includes(keyword);
    const passFilter = activeFilter === "all" || tool.category === activeFilter;
    return passKeyword && passFilter;
  });
}

function applyFilters() {
  const filteredTools = getFilteredTools();
  const sortedTools = getSortedTools(filteredTools);
  renderTools(sortedTools);
}

searchInput.addEventListener("input", applyFilters);
sortSelect.addEventListener("change", applyFilters);

chipRow.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) {
    return;
  }

  chipRow.querySelectorAll(".chip").forEach((node) => node.classList.remove("active"));
  chip.classList.add("active");
  activeFilter = chip.dataset.filter;
  applyFilters();
});

modalCloseBtn.addEventListener("click", closeToolModal);
toolModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeToolModal();
  }
});
apiQueryInput.addEventListener("input", updateApiPreview);
copyApiBtn.addEventListener("click", () => {
  void copyApiPayloadToClipboard();
});
copySourceBtn.addEventListener("click", () => {
  void copySourceCodeToClipboard();
});
modalTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveModalTab(tab.dataset.tab);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !toolModal.classList.contains("hidden")) {
    closeToolModal();
  }
});

// TODO(API): 사내 API 연결 시 아래 함수를 실제 호출로 교체하세요.
// 권장 응답 스키마: [{ toolname, description, keys, category, developer, usecount }]
// 1) GET /api/tools
// 2) 응답 데이터를 동일한 필드명으로 매핑
// 3) toolsData = mappedData 후 renderCategoryChips() + applyFilters() 호출
async function fetchToolsFromApi() {
  try {
    const response = await fetch("/api/tools");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data.tools)) {
      return data.tools;
    }
  } catch (error) {
    console.warn("Failed to fetch tools from API, fallback to local data.", error);
  }
  return TOOLS;
}

async function init() {
  const fetched = await fetchToolsFromApi();
  const seed = Array.isArray(fetched) ? fetched : TOOLS;
  toolsData = seed.map((tool) => ({
    ...tool,
    enabled: typeof tool.enabled === "boolean" ? tool.enabled : true
  }));
  renderCategoryChips();
  applyFilters();
}

init();
