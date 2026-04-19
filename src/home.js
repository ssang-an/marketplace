const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const quickPromptButtons = Array.from(document.querySelectorAll(".quick-prompt-btn"));

const CAPABILITY_GUIDE = {
  eqp: {
    title: "설비(EQP) 운영",
    tools: ["eqpstatus", "get_down_eqp_list", "eqp_alarm_feed", "eqp_pm_schedule"],
    prompts: [
      "10분 이상 down 설비 보여줘",
      "A라인 eqpstatus 요약해줘"
    ]
  },
  lot: {
    title: "Lot 추적/디스패치",
    tools: ["lotstatus", "lot_history", "lot_dispatch_reco", "lot_hold_reason"],
    prompts: [
      "LOT123 현재 상태 조회해줘",
      "긴급 lot 우선순위 추천해줘"
    ]
  },
  quality: {
    title: "품질/결함 대응",
    tools: ["defect_map_summary", "fdc_anomaly_trace", "excursion_alert"],
    prompts: [
      "defect map 패턴 요약해줘",
      "현재 excursion 알림 보여줘"
    ]
  },
  yield: {
    title: "수율 분석",
    tools: ["yield_by_step", "yield_loss_breakdown", "scrap_risk_predict"],
    prompts: [
      "이번 주 수율 손실 Top 원인 알려줘",
      "폐기 리스크 높은 lot 찾아줘"
    ]
  }
};

function appendMessage(role, text) {
  const article = document.createElement("article");
  article.className = `msg ${role}`;

  const author = document.createElement("p");
  author.className = "msg-author";
  author.textContent = role === "user" ? "You" : "Agent";

  const body = document.createElement("p");
  body.textContent = text;

  article.appendChild(author);
  article.appendChild(body);
  chatMessages.appendChild(article);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function buildCapabilityOverview() {
  const lines = ["현재 Home에서 대화로 탐색 가능한 업무는 아래 4가지입니다:"];

  Object.values(CAPABILITY_GUIDE).forEach((item) => {
    lines.push(`- ${item.title}: ${item.tools.join(", ")}`);
  });

  lines.push("원하는 영역을 말하면, 바로 다음 질문 예시까지 추천해줄게요.");
  return lines.join("\n");
}

function buildFocusedGuide(key) {
  const target = CAPABILITY_GUIDE[key];
  if (!target) {
    return null;
  }

  return [
    `${target.title}에서 지금 가능한 작업:`,
    `- 사용 도구: ${target.tools.join(", ")}`,
    `- 추천 질문 1: ${target.prompts[0]}`,
    `- 추천 질문 2: ${target.prompts[1]}`
  ].join("\n");
}

function inferIntent(userText) {
  const q = userText.toLowerCase();

  if (q.includes("뭘 할 수") || q.includes("무엇") || q.includes("help") || q.includes("가능")) {
    return { type: "overview" };
  }

  if (q.includes("설비") || q.includes("eqp") || q.includes("down")) {
    return { type: "focused", key: "eqp" };
  }

  if (q.includes("lot") || q.includes("디스패치") || q.includes("홀드")) {
    return { type: "focused", key: "lot" };
  }

  if (q.includes("품질") || q.includes("결함") || q.includes("fdc") || q.includes("excursion")) {
    return { type: "focused", key: "quality" };
  }

  if (q.includes("수율") || q.includes("yield") || q.includes("스크랩") || q.includes("폐기")) {
    return { type: "focused", key: "yield" };
  }

  return { type: "fallback" };
}

function mockAgentReply(userText) {
  const intent = inferIntent(userText);

  if (intent.type === "overview") {
    return buildCapabilityOverview();
  }

  if (intent.type === "focused") {
    return buildFocusedGuide(intent.key);
  }

  return [
    "요청을 이해했어요. 우선 아래 중 하나를 말해보세요:",
    "- 설비 down 현황 조회",
    "- lot 상태/이력 조회",
    "- 품질 이슈 대응",
    "- 수율 손실 분석"
  ].join("\n");
}

async function fetchChatReply(message) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (typeof data.answer === "string" && data.answer.trim()) {
      return data.answer;
    }
  } catch (error) {
    console.warn("Failed to fetch /api/chat, fallback to local mock.", error);
  }

  return mockAgentReply(message);
}

async function submitMessage(text) {
  const value = text.trim();
  if (!value) {
    return;
  }

  appendMessage("user", value);
  chatInput.value = "";
  const reply = await fetchChatReply(value);
  appendMessage("agent", reply);
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void submitMessage(chatInput.value);
});

quickPromptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt || "";
    void submitMessage(prompt);
  });
});
