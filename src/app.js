const searchInput = document.getElementById("searchInput");
const chipRow = document.getElementById("chipRow");
const sortSelect = document.getElementById("sortSelect");
const toolGrid = document.getElementById("toolGrid");
const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const pageTabs = Array.from(document.querySelectorAll(".page-tab"));
const toolsPanel = document.getElementById("toolsPanel");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const historyMeta = document.getElementById("historyMeta");
const historySearchInput = document.getElementById("historySearchInput");
const historyToolFilter = document.getElementById("historyToolFilter");
const historySkillFilter = document.getElementById("historySkillFilter");
const historySkillUsageFilter = document.getElementById("historySkillUsageFilter");

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
let expandedHistoryId = null;
const sourceCodeCache = new Map();
const HISTORY_STORAGE_KEY = "pizza_tool_history";

const DEFAULT_HISTORY = [
  {
    id: "conv-001",
    report_id: "conv-001",
    title: "LOT 이상 상태 확인",
    summary: "lotstatus와 lot_history를 비교해 현재 상태와 이동 이력을 확인한 대화",
    timestamp: "오늘 09:20",
    tags: ["lotstatus", "lot_history"],
    tools: ["lotstatus", "lot_history"],
    skill: ["lot-investigation"],
    question: "LOT123의 현재 상태와 최근 이동 이력을 같이 보여줘.",
    answer: "현재 공정 상태와 함께 최근 이동 이력을 정리했습니다. hold 여부와 체류 시간도 함께 확인할 수 있습니다."
  },
  {
    id: "conv-002",
    report_id: "conv-002",
    title: "다운 설비 조회",
    summary: "get_down_eqp_list를 사용해 다운 설비와 지속 시간을 조회한 대화",
    timestamp: "오늘 08:10",
    tags: ["get_down_eqp_list", "eqpstatus"],
    tools: ["get_down_eqp_list", "eqpstatus"],
    skill: [],
    question: "현재 10분 이상 다운된 설비 목록을 보여줘.",
    answer: "다운 시간 기준으로 설비 목록을 정리했고, 각 설비의 현재 상태와 주요 식별 정보도 함께 반환했습니다."
  },
  {
    id: "conv-003",
    report_id: "conv-003",
    title: "수율 손실 원인 분석",
    summary: "yield_loss_breakdown과 wafer_bin_distribution으로 손실 원인을 살펴본 대화",
    timestamp: "어제 17:40",
    tags: ["yield_loss_breakdown", "wafer_bin_distribution"],
    tools: ["yield_loss_breakdown", "wafer_bin_distribution"],
    skill: ["yield-analysis", "report-summary"],
    question: "이번 주 수율 손실의 주요 원인을 분석해줘.",
    answer: "결함 분류 기준 손실 원인과 테스트 bin 분포를 함께 확인해 주요 손실 구간을 요약했습니다."
  }
];

const DEFAULT_HISTORY_BY_ID = new Map(DEFAULT_HISTORY.map((item) => [item.id, item]));

const CATEGORY_COLOR_PRESETS = {
  lot: { bg: "#f8fafc", fg: "#475569", border: "#dbe2ea" },
  eqp: { bg: "#f8fafc", fg: "#334155", border: "#d7dfe8" },
  process: { bg: "#f8fafc", fg: "#3f5e7a", border: "#d1d9e3" },
  quality: { bg: "#f8fafc", fg: "#4b5563", border: "#dde3ea" },
  yield: { bg: "#f8fafc", fg: "#52606d", border: "#d9e0e7" }
};

const TOOLS = [
  { toolname: "lotstatus", description: "Lot 현재 공정, 대기, 이상 상태 조회", keys: ["lot_id", "fab", "include_hold"], category: "lot", developer: "MES Team", usecount: 1940 },
  { toolname: "lot_history", description: "Lot 이동 이력과 체류 시간 조회", keys: ["lot_id", "start_time", "end_time"], category: "lot", developer: "MES Team", usecount: 1725 },
  { toolname: "lot_hold_reason", description: "Lot hold 사유 코드와 조치 상태 조회", keys: ["lot_id"], category: "lot", developer: "Quality Ops", usecount: 1410 },
  { toolname: "lot_priority_queue", description: "긴급 lot 우선순위 큐 조회", keys: ["line", "priority_group"], category: "lot", developer: "Planning", usecount: 1490 },
  { toolname: "lot_dispatch_reco", description: "가용 설비 기반 lot dispatch 추천", keys: ["line", "eqp_group", "lot_ids"], category: "lot", developer: "Scheduling AI", usecount: 1180 },
  { toolname: "lot_split_merge", description: "Lot split 및 merge 조건 점검", keys: ["lot_id", "action", "target_qty"], category: "lot", developer: "MES Team", usecount: 1090 },
  { toolname: "eqpstatus", description: "설비 상태(run, idle, down, pm) 실시간 조회", keys: ["eqp_id", "area"], category: "eqp", developer: "Equipment Eng", usecount: 2380 },
  { toolname: "get_down_eqp_list", description: "다운 설비 목록 및 다운 시간 조회", keys: ["fab", "area", "min_down_min"], category: "eqp", developer: "Equipment Eng", usecount: 2230 },
  { toolname: "eqp_alarm_feed", description: "설비 알람 이벤트 스트림 조회", keys: ["eqp_id", "severity", "from_time"], category: "eqp", developer: "Automation", usecount: 1660 },
  { toolname: "eqp_pm_schedule", description: "설비 PM 일정과 잔여 시간 조회", keys: ["eqp_id", "window_days"], category: "eqp", developer: "Maintenance", usecount: 1520 },
  { toolname: "eqp_recipe_capability", description: "설비별 지원 recipe와 제약 조건 조회", keys: ["eqp_id"], category: "eqp", developer: "Process Eng", usecount: 1370 },
  { toolname: "eqp_utilization", description: "설비 가동률과 유휴율 분석", keys: ["eqp_group", "date"], category: "eqp", developer: "Ops Analytics", usecount: 1810 },
  { toolname: "recipe_parameter_trace", description: "Lot별 recipe 파라미터 적용 이력 조회", keys: ["lot_id", "step"], category: "process", developer: "Process Eng", usecount: 1460 },
  { toolname: "process_window_check", description: "공정 스펙 윈도우 초과 여부 점검", keys: ["step", "values"], category: "process", developer: "Process Eng", usecount: 1750 },
  { toolname: "chamber_matching_score", description: "챔버간 매칭 지수와 편차 지표 제공", keys: ["eqp_group", "recipe"], category: "process", developer: "Process Eng", usecount: 1260 },
  { toolname: "spc_signal_monitor", description: "SPC 룰 위반 신호와 추세 감지", keys: ["parameter", "line", "period"], category: "process", developer: "SPC Team", usecount: 1980 },
  { toolname: "inline_metrology", description: "Inline 계측 데이터 조회와 요약", keys: ["lot_id", "wafer_id"], category: "process", developer: "Metrology", usecount: 1540 },
  { toolname: "run_to_run_tuning", description: "R2R 제어 파라미터 추천값 생성", keys: ["recipe", "last_runs"], category: "process", developer: "APC Team", usecount: 1175 },
  { toolname: "defect_map_summary", description: "Wafer defect map 패턴 분류 결과 조회", keys: ["wafer_id"], category: "quality", developer: "Defect Analysis", usecount: 1640 },
  { toolname: "defect_image_lookup", description: "결함 이미지와 라벨 메타데이터 조회", keys: ["defect_id"], category: "quality", developer: "Defect Analysis", usecount: 1510 },
  { toolname: "fdc_anomaly_trace", description: "FDC 이상 탐지 이벤트와 연관 lot 추적", keys: ["eqp_id", "from_time"], category: "quality", developer: "FDC Team", usecount: 1290 },
  { toolname: "excursion_alert", description: "품질 excursion 발생 및 해제 알림 조회", keys: ["product", "severity"], category: "quality", developer: "Quality Ops", usecount: 1430 },
  { toolname: "sample_plan_recommend", description: "검사 샘플링 계획 추천", keys: ["product", "risk_level", "volume"], category: "quality", developer: "Quality Ops", usecount: 980 },
  { toolname: "coa_document_fetch", description: "COA 및 검사성적서 문서 조회", keys: ["lot_id", "document_type"], category: "quality", developer: "QA Document", usecount: 1210 },
  { toolname: "yield_by_step", description: "공정 step별 수율 기여도 분석", keys: ["product", "period"], category: "yield", developer: "Yield Team", usecount: 1770 },
  { toolname: "yield_loss_breakdown", description: "수율 손실 원인을 defect와 category로 분해", keys: ["product", "line", "week"], category: "yield", developer: "Yield Team", usecount: 1690 },
  { toolname: "wafer_bin_distribution", description: "테스트 bin 분포 및 이상 bin 비중 분석", keys: ["lot_id"], category: "yield", developer: "Test Eng", usecount: 1580 },
  { toolname: "cp_to_ft_correlation", description: "CP와 FT 결과 상관 분석", keys: ["product", "date_range"], category: "yield", developer: "Test Data", usecount: 1120 },
  { toolname: "scrap_risk_predict", description: "Lot 폐기 리스크 예측", keys: ["lot_id"], category: "yield", developer: "Yield AI", usecount: 930 },
  { toolname: "line_balance_snapshot", description: "라인별 WIP 불균형과 체류 시간 스냅샷", keys: ["fab", "line"], category: "process", developer: "Ops Analytics", usecount: 1350 }
];

function formatUseCount(count) {
  const numeric = Number(count) || 0;
  if (numeric < 1000) {
    return String(numeric);
  }
  const value = (numeric / 1000).toFixed(1);
  return `${value.endsWith(".0") ? value.slice(0, -2) : value}k`;
}

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

function formatDeveloperLabel(developer) {
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

function toUniqueStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(
    values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
}

function truncateText(value, maxLength = 96) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}

function splitPreviewText(value, maxLength = 128) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return { preview: text, rest: "" };
  }

  const previewBase = text.slice(0, maxLength).trim();
  return {
    preview: `${previewBase}...`,
    rest: text.slice(maxLength).trim()
  };
}

function renderCategoryChips() {
  const categories = [...new Set(toolsData.map((tool) => tool.category))].sort((a, b) => a.localeCompare(b));
  chipRow.innerHTML = '<button class="chip active" data-filter="all">전체</button>';

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.dataset.filter = category;
    button.textContent = category.toUpperCase();
    applyCategoryTheme(button, category);
    chipRow.appendChild(button);
  });
}

function getHistoryItems() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_HISTORY;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((item) => {
        const fallback = DEFAULT_HISTORY_BY_ID.get(item?.id);
        if (!fallback) {
          return item;
        }
        return {
          ...item,
          report_id: item.report_id || item.reportId || item.report || fallback.report_id
        };
      });
    }
  } catch (error) {
    console.warn("Failed to read history from localStorage.", error);
  }
  return DEFAULT_HISTORY;
}

async function fetchHistoryFromApi() {
  try {
    const response = await fetch("/api/history");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data.history)) {
      return data.history;
    }
  } catch (error) {
    console.warn("Failed to fetch history from API, fallback to local storage.", error);
  }
  return null;
}

function normalizeHistoryItem(item, index) {
  const tools = toUniqueStringList(
    Array.isArray(item.tools)
      ? item.tools
      : Array.isArray(item.tags)
        ? item.tags
        : []
  );
  const rawSkill = item?.skill;
  const skills = toUniqueStringList(
    Array.isArray(rawSkill)
      ? rawSkill
      : rawSkill
        ? [rawSkill]
        : []
  );
  const tags = toUniqueStringList(Array.isArray(item.tags) ? item.tags : tools);

  return {
    id: item.id || `conv-${index + 1}`,
    title: item.title || "대화",
    summary: item.summary || "-",
    timestamp: item.timestamp || "-",
    created_at: item.created_at || item.createdAt || item.updated_at || item.updatedAt || null,
    report_id: item.report_id || item.reportId || item.report || null,
    tags,
    tools,
    skill: skills,
    question: item.question || "질문 내용이 없습니다.",
    answer: item.answer || "답변 내용이 없습니다."
  };
}

function getNormalizedHistoryItems() {
  return getHistoryItems()
    .map(normalizeHistoryItem)
    .sort((a, b) => getHistorySortValue(b) - getHistorySortValue(a));
}

function getHistorySortValue(item) {
  if (item.created_at) {
    const parsed = Date.parse(String(item.created_at));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const timestamp = String(item.timestamp || "");
  const now = new Date();
  if (timestamp.includes("오늘")) {
    return now.getTime();
  }
  if (timestamp.includes("어제")) {
    return now.getTime() - 24 * 60 * 60 * 1000;
  }

  const parsed = Date.parse(timestamp);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return 0;
}

function renderHistoryToolOptions(historyItems) {
  const selectedValue = historyToolFilter.value || "all";
  const toolNames = [...new Set(historyItems.flatMap((item) => item.tools))].sort((a, b) => a.localeCompare(b));

  historyToolFilter.innerHTML = '<option value="all">전체 TOOL</option>';
  toolNames.forEach((toolName) => {
    const option = document.createElement("option");
    option.value = toolName;
    option.textContent = toolName;
    historyToolFilter.appendChild(option);
  });

  historyToolFilter.value = toolNames.includes(selectedValue) || selectedValue === "all" ? selectedValue : "all";
}

function renderHistorySkillOptions(historyItems) {
  const selectedValue = historySkillFilter.value || "all";
  const skillNames = [...new Set(historyItems.flatMap((item) => item.skill))].sort((a, b) => a.localeCompare(b));

  historySkillFilter.innerHTML = '<option value="all">전체 SKILL</option>';
  skillNames.forEach((skillName) => {
    const option = document.createElement("option");
    option.value = skillName;
    option.textContent = skillName;
    historySkillFilter.appendChild(option);
  });

  historySkillFilter.value = skillNames.includes(selectedValue) || selectedValue === "all" ? selectedValue : "all";
}

function getFilteredHistoryItems(historyItems) {
  const keyword = historySearchInput.value.trim().toLowerCase();
  const activeTool = historyToolFilter.value;
  const activeSkill = historySkillFilter.value;
  const activeSkillUsage = historySkillUsageFilter.value;

  return historyItems.filter((item) => {
    const bucket = `${item.title} ${item.summary} ${item.question} ${item.answer} ${item.tools.join(" ")} ${item.skill.join(" ")}`.toLowerCase();
    const passKeyword = !keyword || bucket.includes(keyword);
    const passTool = activeTool === "all" || item.tools.includes(activeTool);
    const passSkill = activeSkill === "all" || item.skill.includes(activeSkill);
    const passSkillUsage =
      activeSkillUsage === "all" ||
      (activeSkillUsage === "used" && item.skill.length > 0) ||
      (activeSkillUsage === "unused" && item.skill.length === 0);
    return passKeyword && passTool && passSkill && passSkillUsage;
  });
}

function renderHistory() {
  const historyItems = getNormalizedHistoryItems();
  renderHistoryToolOptions(historyItems);
  renderHistorySkillOptions(historyItems);
  const filteredItems = getFilteredHistoryItems(historyItems);
  historyMeta.textContent = `${filteredItems.length}개 대화`;
  historyList.innerHTML = "";

  if (!filteredItems.length) {
    historyList.innerHTML = `
      <article class="empty-state">
        <p class="eyebrow">No Match</p>
        <h3>조건에 맞는 대화 이력이 없습니다</h3>
        <p>검색어를 줄이거나 다른 TOOL 필터를 선택해보세요.</p>
      </article>
    `;
    return;
  }

  filteredItems.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";
    article.dataset.historyId = item.id;
    article.classList.toggle("expanded", expandedHistoryId === item.id);
    const tools = Array.isArray(item.tools) ? item.tools : [];
    const skills = Array.isArray(item.skill) ? item.skill : [];
    const isExpanded = expandedHistoryId === item.id;
    const questionText = truncateText(item.question, 86) || "질문 내용이 없습니다.";
    const answerParts = splitPreviewText(item.answer, 128);
    article.innerHTML = `
      <div class="history-item-head">
        <div class="history-copy">
          <h3>Q: ${questionText}</h3>
          <p class="history-answer-preview">
            <span>A: ${answerParts.preview || "답변 내용이 없습니다."}</span>${answerParts.rest ? `<span class="history-answer-rest ${isExpanded ? "active" : ""}"> ${answerParts.rest}</span>` : ""}
          </p>
        </div>
        <div class="history-side">
          <span class="history-time">${item.timestamp || "-"}</span>
          <div class="history-actions">
            ${item.report_id ? `<a class="history-report-link" href="/pizza/report/${encodeURIComponent(item.report_id)}">리포트</a>` : ""}
            <button class="history-toggle" type="button" data-history-toggle="${item.id}">${isExpanded ? "접기" : "더보기"}</button>
          </div>
        </div>
      </div>
      <div class="history-summary-inline">
        <div class="history-inline-block">
          <div class="history-tools compact">
            ${skills.map((skill) => `<span class="history-skill">${skill}</span>`).join("")}
            ${tools.map((tool) => `<span class="history-tool">${tool}</span>`).join("")}
          </div>
        </div>
      </div>
    `;
    historyList.appendChild(article);
  });
}

function setActivePageTab(tabName) {
  pageTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.pageTab === tabName);
  });
  toolsPanel.classList.toggle("active", tabName === "tools");
  historyPanel.classList.toggle("active", tabName === "history");
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

function renderTools(toolItems) {
  toolGrid.innerHTML = "";

  if (!toolItems.length) {
    toolGrid.innerHTML = `
      <article class="empty-state card">
        <p class="eyebrow">No Match</p>
        <h3>조건에 맞는 도구가 없습니다</h3>
        <p>검색어를 줄이거나 다른 카테고리를 선택해보세요.</p>
      </article>
    `;
    return;
  }

  toolItems.forEach((tool, index) => {
    const card = document.createElement("article");
    card.className = "tool-card";
    card.dataset.category = tool.category;
    card.dataset.toolname = tool.toolname;
    applyCategoryTheme(card, tool.category);
    card.style.animationDelay = `${Math.min(index, 8) * 0.05}s`;
    card.innerHTML = `
      <div class="tool-topline">
        <span class="category-dot" aria-hidden="true"></span>
        <span class="category-text">${tool.category.toUpperCase()}</span>
      </div>
      <div class="tool-head">
        <h3 class="tool-name">${tool.toolname}</h3>
        <span class="tool-usage">${formatUseCount(tool.usecount)}</span>
      </div>
      <p class="tool-description">${tool.description}</p>
      <div class="tool-footer">
        <span>${formatDeveloperLabel(tool.developer)}</span>
        <span>${tool.keys.length} keys</span>
      </div>
    `;
    card.addEventListener("click", () => openToolModal(tool));
    toolGrid.appendChild(card);
  });
}

function updateResultsSummary(items) {
  const label = activeFilter === "all" ? "전체 도구" : `${activeFilter.toUpperCase()} 도구`;
  resultsTitle.textContent = label;
  resultsMeta.textContent = `${items.length}개 도구`;
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
  updateResultsSummary(sortedTools);
  renderTools(sortedTools);
}

function updateApiPreview() {
  if (!selectedTool) {
    apiPayloadPreview.textContent = "-";
    return;
  }
  const payload = buildApiPayload(selectedTool.toolname, apiQueryInput.value.trim());
  apiPayloadPreview.textContent = JSON.stringify(payload, null, 2);
}

async function fetchToolSourceFromApi(toolName) {
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

  sourceCodePreview.textContent = "불러오는 중...";

  try {
    const source = await fetchToolSourceFromApi(toolName);
    sourceCodeCache.set(toolName, source);
    sourceCodePreview.textContent = source;
  } catch (error) {
    console.warn("Failed to fetch source from API, fallback to local template.", error);
    sourceCodePreview.textContent = buildSourceCode(selectedTool);
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

function openToolModal(tool) {
  selectedTool = tool;
  modalToolName.textContent = tool.toolname;
  modalDescription.textContent = tool.description;
  modalCategory.textContent = tool.category.toUpperCase();
  applyCategoryTheme(modalCategory, tool.category);
  modalDeveloper.textContent = formatDeveloperLabel(tool.developer);
  modalUsecount.textContent = `${formatUseCount(tool.usecount)} uses`;
  modalKeys.textContent = tool.keys.join(", ");
  apiQueryInput.value = "";
  copyApiStatus.textContent = "";
  copySourceStatus.textContent = "";
  sourceCodePreview.textContent = "Python Sample 탭에서 코드를 불러옵니다.";
  updateApiPreview();
  setActiveModalTab("api");
  toolModal.classList.remove("hidden");
}

function closeToolModal() {
  toolModal.classList.add("hidden");
}

async function copyText(text, targetNode) {
  try {
    await navigator.clipboard.writeText(text);
    targetNode.textContent = "복사 완료";
  } catch (error) {
    const hidden = document.createElement("textarea");
    hidden.value = text;
    document.body.appendChild(hidden);
    hidden.select();
    document.execCommand("copy");
    document.body.removeChild(hidden);
    targetNode.textContent = "복사 완료";
  }
}

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

pageTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActivePageTab(tab.dataset.pageTab);
  });
});

historySearchInput.addEventListener("input", renderHistory);
historyToolFilter.addEventListener("change", renderHistory);
historySkillFilter.addEventListener("change", renderHistory);
historySkillUsageFilter.addEventListener("change", renderHistory);
historyList.addEventListener("click", (event) => {
  const reportLink = event.target.closest(".history-report-link");
  if (reportLink) {
    return;
  }

  const toggle = event.target.closest("[data-history-toggle]");
  const item = event.target.closest(".history-item");
  const targetId = toggle?.dataset.historyToggle || item?.dataset.historyId;
  if (!targetId) {
    return;
  }
  expandedHistoryId = expandedHistoryId === targetId ? null : targetId;
  renderHistory();
});

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
  void copyText(apiPayloadPreview.textContent || "", copyApiStatus);
});
copySourceBtn.addEventListener("click", () => {
  void copyText(sourceCodePreview.textContent || "", copySourceStatus);
});
modalTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveModalTab(tab.dataset.tab));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !toolModal.classList.contains("hidden")) {
    closeToolModal();
  }
});

async function init() {
  const historyFromApi = await fetchHistoryFromApi();
  if (Array.isArray(historyFromApi) && historyFromApi.length) {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyFromApi));
    } catch (error) {
      console.warn("Failed to cache history to localStorage.", error);
    }
  }
  const fetched = await fetchToolsFromApi();
  toolsData = Array.isArray(fetched) ? fetched : TOOLS;
  renderCategoryChips();
  applyFilters();
  renderHistory();
  setActivePageTab("tools");
}

init();
