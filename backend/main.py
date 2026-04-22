import os
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / "reports"

app = FastAPI(title="AI Agent Pizza Marketplace API", version="0.3.0")
app.mount("/src", StaticFiles(directory=str(BASE_DIR / "src")), name="src")

EXAMPLE_TOOLS: list[dict[str, Any]] = [
    {"toolname": "lotstatus", "description": "Lot current process, wait, and anomaly status lookup", "keys": ["lot_id", "fab", "include_hold"], "category": "lot", "developer": "MES Team", "usecount": 1940},
    {"toolname": "lot_history", "description": "Lot movement history and dwell time lookup", "keys": ["lot_id", "start_time", "end_time"], "category": "lot", "developer": "MES Team", "usecount": 1725},
    {"toolname": "lot_hold_reason", "description": "Lot hold reason code and action status lookup", "keys": ["lot_id"], "category": "lot", "developer": "Quality Ops", "usecount": 1410},
    {"toolname": "lot_priority_queue", "description": "Urgent lot priority queue lookup", "keys": ["line", "priority_group"], "category": "lot", "developer": "Planning", "usecount": 1490},
    {"toolname": "lot_dispatch_reco", "description": "Available equipment based lot dispatch recommendation", "keys": ["line", "eqp_group", "lot_ids"], "category": "lot", "developer": "Scheduling AI", "usecount": 1180},
    {"toolname": "lot_split_merge", "description": "Lot split and merge condition check", "keys": ["lot_id", "action", "target_qty"], "category": "lot", "developer": "MES Team", "usecount": 1090},
    {"toolname": "eqpstatus", "description": "Real time equipment status lookup", "keys": ["eqp_id", "area"], "category": "eqp", "developer": "Equipment Eng", "usecount": 2380},
    {"toolname": "get_down_eqp_list", "description": "Down equipment list and downtime lookup", "keys": ["fab", "area", "min_down_min"], "category": "eqp", "developer": "Equipment Eng", "usecount": 2230},
    {"toolname": "eqp_alarm_feed", "description": "Equipment alarm event stream lookup", "keys": ["eqp_id", "severity", "from_time"], "category": "eqp", "developer": "Automation", "usecount": 1660},
    {"toolname": "eqp_pm_schedule", "description": "Equipment PM schedule and remaining time lookup", "keys": ["eqp_id", "window_days"], "category": "eqp", "developer": "Maintenance", "usecount": 1520},
    {"toolname": "eqp_recipe_capability", "description": "Equipment recipe capability and constraints lookup", "keys": ["eqp_id"], "category": "eqp", "developer": "Process Eng", "usecount": 1370},
    {"toolname": "eqp_utilization", "description": "Equipment utilization and idle rate analysis", "keys": ["eqp_group", "date"], "category": "eqp", "developer": "Ops Analytics", "usecount": 1810},
    {"toolname": "recipe_parameter_trace", "description": "Recipe parameter history by lot", "keys": ["lot_id", "step"], "category": "process", "developer": "Process Eng", "usecount": 1460},
    {"toolname": "process_window_check", "description": "Process spec window violation check", "keys": ["step", "values"], "category": "process", "developer": "Process Eng", "usecount": 1750},
    {"toolname": "chamber_matching_score", "description": "Chamber matching score and variation metrics", "keys": ["eqp_group", "recipe"], "category": "process", "developer": "Process Eng", "usecount": 1260},
    {"toolname": "spc_signal_monitor", "description": "SPC rule violation signal and trend detection", "keys": ["parameter", "line", "period"], "category": "process", "developer": "SPC Team", "usecount": 1980},
    {"toolname": "inline_metrology", "description": "Inline metrology data lookup and summary", "keys": ["lot_id", "wafer_id"], "category": "process", "developer": "Metrology", "usecount": 1540},
    {"toolname": "run_to_run_tuning", "description": "R2R control parameter recommendation", "keys": ["recipe", "last_runs"], "category": "process", "developer": "APC Team", "usecount": 1175},
    {"toolname": "defect_map_summary", "description": "Wafer defect map pattern summary", "keys": ["wafer_id"], "category": "quality", "developer": "Defect Analysis", "usecount": 1640},
    {"toolname": "defect_image_lookup", "description": "Defect image and label metadata lookup", "keys": ["defect_id"], "category": "quality", "developer": "Defect Analysis", "usecount": 1510},
    {"toolname": "fdc_anomaly_trace", "description": "FDC anomaly trace with related lot context", "keys": ["eqp_id", "from_time"], "category": "quality", "developer": "FDC Team", "usecount": 1290},
    {"toolname": "excursion_alert", "description": "Quality excursion alert lookup", "keys": ["product", "severity"], "category": "quality", "developer": "Quality Ops", "usecount": 1430},
    {"toolname": "sample_plan_recommend", "description": "Inspection sampling plan recommendation", "keys": ["product", "risk_level", "volume"], "category": "quality", "developer": "Quality Ops", "usecount": 980},
    {"toolname": "coa_document_fetch", "description": "COA and inspection document lookup", "keys": ["lot_id", "document_type"], "category": "quality", "developer": "QA Document", "usecount": 1210},
    {"toolname": "yield_by_step", "description": "Yield contribution analysis by process step", "keys": ["product", "period"], "category": "yield", "developer": "Yield Team", "usecount": 1770},
    {"toolname": "yield_loss_breakdown", "description": "Yield loss breakdown by defect and category", "keys": ["product", "line", "week"], "category": "yield", "developer": "Yield Team", "usecount": 1690},
    {"toolname": "wafer_bin_distribution", "description": "Test bin distribution and anomaly ratio analysis", "keys": ["lot_id"], "category": "yield", "developer": "Test Eng", "usecount": 1580},
    {"toolname": "cp_to_ft_correlation", "description": "CP to FT correlation analysis", "keys": ["product", "date_range"], "category": "yield", "developer": "Test Data", "usecount": 1120},
    {"toolname": "scrap_risk_predict", "description": "Lot scrap risk prediction", "keys": ["lot_id"], "category": "yield", "developer": "Yield AI", "usecount": 930},
    {"toolname": "line_balance_snapshot", "description": "Line level WIP imbalance and dwell snapshot", "keys": ["fab", "line"], "category": "process", "developer": "Ops Analytics", "usecount": 1350},
]

EXAMPLE_REPORT_HTML = """
<!doctype html>
<html>
  <head>
    <title>Pizza Report Sample</title>
  </head>
  <body>
    <section>
      <h1>Pizza Report Sample</h1>
      <p>This is a temporary HTML report preview.</p>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>report_id</td>
            <td>{report_id}</td>
          </tr>
          <tr>
            <td>status</td>
            <td>sample fallback</td>
          </tr>
          <tr>
            <td>source</td>
            <td>embedded example</td>
          </tr>
        </tbody>
      </table>
    </section>
  </body>
</html>
"""

EXAMPLE_HISTORY: list[dict[str, Any]] = [
    {
        "id": "conv-001",
        "report_id": "conv-001",
        "title": "LOT 이상 상태 확인",
        "summary": "lotstatus와 lot_history를 비교해 현재 상태와 이동 이력을 확인한 대화",
        "timestamp": "오늘 09:20",
        "tags": ["lotstatus", "lot_history"],
        "tools": ["lotstatus", "lot_history"],
        "skill": ["lot-investigation"],
        "question": "LOT123의 현재 상태와 최근 이동 이력을 같이 보여줘.",
        "answer": "현재 공정 상태와 함께 최근 이동 이력을 정리했습니다. hold 여부와 체류 시간도 함께 확인할 수 있습니다.",
    },
    {
        "id": "conv-002",
        "report_id": "conv-002",
        "title": "다운 설비 조회",
        "summary": "get_down_eqp_list를 사용해 다운 설비와 지속 시간을 조회한 대화",
        "timestamp": "오늘 08:10",
        "tags": ["get_down_eqp_list", "eqpstatus"],
        "tools": ["get_down_eqp_list", "eqpstatus"],
        "skill": [],
        "question": "현재 10분 이상 다운된 설비 목록을 보여줘.",
        "answer": "다운 시간 기준으로 설비 목록을 정리했고, 각 설비의 현재 상태와 주요 식별 정보도 함께 반환했습니다.",
    },
    {
        "id": "conv-003",
        "report_id": "conv-003",
        "title": "수율 손실 원인 분석",
        "summary": "yield_loss_breakdown과 wafer_bin_distribution으로 손실 원인을 살펴본 대화",
        "timestamp": "어제 17:40",
        "tags": ["yield_loss_breakdown", "wafer_bin_distribution"],
        "tools": ["yield_loss_breakdown", "wafer_bin_distribution"],
        "skill": ["yield-analysis", "report-summary"],
        "question": "이번 주 수율 손실의 주요 원인을 분석해줘.",
        "answer": "결함 분류 기준 손실 원인과 테스트 bin 분포를 함께 확인해 주요 손실 구간을 요약했습니다.",
    },
]


class _HTMLBodyExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.in_title = False
        self.in_body = False
        self.body_depth = 0
        self.title_parts: list[str] = []
        self.body_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        start_tag = self.get_starttag_text() or f"<{tag}>"
        if tag.lower() == "title":
            self.in_title = True
        if tag.lower() == "body":
            self.in_body = True
            self.body_depth = 1
            return
        if self.in_body:
            self.body_parts.append(start_tag)
            self.body_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False
            return
        if tag.lower() == "body":
            self.in_body = False
            self.body_depth = 0
            return
        if self.in_body:
            self.body_parts.append(f"</{tag}>")
            self.body_depth = max(self.body_depth - 1, 0)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.in_body:
            self.body_parts.append(self.get_starttag_text() or f"<{tag} />")

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self.in_body:
            self.body_parts.append(data)

    def handle_entityref(self, name: str) -> None:
        text = f"&{name};"
        if self.in_title:
            self.title_parts.append(text)
        if self.in_body:
            self.body_parts.append(text)

    def handle_charref(self, name: str) -> None:
        text = f"&#{name};"
        if self.in_title:
            self.title_parts.append(text)
        if self.in_body:
            self.body_parts.append(text)

    def handle_comment(self, data: str) -> None:
        if self.in_body:
            self.body_parts.append(f"<!--{data}-->")


def _normalize_tool_document(document: dict[str, Any]) -> dict[str, Any]:
    keys = document.get("keys", [])
    if not isinstance(keys, list):
        keys = []

    return {
        "toolname": str(document.get("toolname") or document.get("name") or "unknown_tool"),
        "description": str(document.get("description") or "No description"),
        "keys": [str(key) for key in keys],
        "category": str(document.get("category") or "etc"),
        "developer": document.get("developer") or "Unknown",
        "usecount": int(document.get("usecount") or 0),
    }


def _unique_string_list(values: Any) -> list[str]:
    if isinstance(values, list):
        items = values
    elif values:
        items = [values]
    else:
        items = []

    unique_items: list[str] = []
    seen: set[str] = set()

    for value in items:
        normalized = str(value).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique_items.append(normalized)

    return unique_items


def _normalize_history_document(document: dict[str, Any], index: int = 0) -> dict[str, Any]:
    tools = _unique_string_list(document.get("tools", document.get("tags", [])))
    tags = _unique_string_list(document.get("tags", tools))
    skill = _unique_string_list(document.get("skill", []))

    return {
        "id": str(document.get("id") or document.get("conversation_id") or f"conv-{index + 1}"),
        "title": str(document.get("title") or "대화"),
        "summary": str(document.get("summary") or "-"),
        "timestamp": str(document.get("timestamp") or "-"),
        "created_at": document.get("created_at") or document.get("createdAt") or document.get("updated_at") or document.get("updatedAt"),
        "report_id": document.get("report_id") or document.get("reportId") or document.get("report"),
        "tags": tags,
        "tools": tools,
        "skill": skill,
        "question": str(document.get("question") or "질문 내용이 없습니다."),
        "answer": str(document.get("answer") or "답변 내용이 없습니다."),
    }


def _history_sort_value(item: dict[str, Any]) -> str:
    created_at = item.get("created_at")
    if created_at is not None:
        return str(created_at)
    return str(item.get("timestamp") or "")


def _get_mongo_client() -> Any | None:
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri or MongoClient is None:
        return None
    return MongoClient(mongodb_uri, serverSelectionTimeoutMS=2000)


def _load_tools_from_mongodb() -> list[dict[str, Any]] | None:
    mongodb_db = os.getenv("MONGODB_DB", "pizza")
    mongodb_collection = os.getenv("MONGODB_COLLECTION", "tools")
    client = _get_mongo_client()
    if client is None:
        return None

    try:
        collection = client[mongodb_db][mongodb_collection]
        documents = list(collection.find({}, {"_id": 0}))
        tools = [_normalize_tool_document(document) for document in documents if isinstance(document, dict)]
        return tools or None
    except Exception:
        return None
    finally:
        client.close()


def get_tools() -> list[dict[str, Any]]:
    return _load_tools_from_mongodb() or EXAMPLE_TOOLS


def _load_history_from_mongodb() -> list[dict[str, Any]] | None:
    mongodb_db = os.getenv("MONGODB_DB", "pizza")
    mongodb_collection = os.getenv("MONGODB_HISTORY_COLLECTION", "history")
    client = _get_mongo_client()
    if client is None:
        return None

    try:
        collection = client[mongodb_db][mongodb_collection]
        documents = list(collection.find({}, {"_id": 0}))
        history = [
            _normalize_history_document(document, index)
            for index, document in enumerate(documents)
            if isinstance(document, dict)
        ]
        return history or None
    except Exception:
        return None
    finally:
        client.close()


def get_history() -> list[dict[str, Any]]:
    history = _load_history_from_mongodb() or EXAMPLE_HISTORY
    normalized = [_normalize_history_document(item, index) for index, item in enumerate(history)]
    return sorted(normalized, key=_history_sort_value, reverse=True)


def _find_report_document(report_id: str) -> dict[str, Any] | None:
    mongodb_db = os.getenv("MONGODB_DB", "pizza")
    report_collection = os.getenv("MONGODB_REPORT_COLLECTION", "reports")
    client = _get_mongo_client()
    if client is None:
        return None

    try:
        collection = client[mongodb_db][report_collection]
        return collection.find_one(
            {
                "$or": [
                    {"report_id": report_id},
                    {"id": report_id},
                    {"_id": report_id},
                ]
            },
            {"_id": 0},
        )
    except Exception:
        return None
    finally:
        client.close()


def _load_report_html(report_id: str) -> str:
    document = _find_report_document(report_id)
    if isinstance(document, dict):
        for key in ("html", "html_content", "content", "report_html"):
            value = document.get(key)
            if isinstance(value, str) and value.strip():
                return value

    local_path = REPORTS_DIR / f"{report_id}.html"
    if local_path.exists():
        return local_path.read_text(encoding="utf-8")

    return EXAMPLE_REPORT_HTML.format(report_id=escape(report_id))


def _parse_report_html(raw_html: str) -> tuple[str, str]:
    parser = _HTMLBodyExtractor()
    parser.feed(raw_html)
    parser.close()

    title = " ".join(part.strip() for part in parser.title_parts if part.strip()) or "Pizza Report"
    body = "".join(parser.body_parts).strip() or raw_html
    return title, body


def _wrap_report_html(report_id: str, title: str, body_html: str) -> str:
    safe_report_id = escape(report_id)
    safe_title = escape(title)
    return f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>{safe_title}</title>
    <style>
      :root {{
        --bg: #f3f4f6;
        --surface: #ffffff;
        --line: rgba(17, 24, 39, 0.08);
        --text: #111827;
        --muted: #6b7280;
        --accent: #3f5e7a;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        background: linear-gradient(180deg, #f8fafc 0%, var(--bg) 100%);
        color: var(--text);
        font-family: "Segoe UI", Arial, sans-serif;
      }}
      .shell {{
        width: min(1080px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 48px;
      }}
      .header {{
        margin-bottom: 16px;
        padding: 20px 24px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: var(--surface);
      }}
      .eyebrow {{
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }}
      h1 {{ margin: 0; font-size: 32px; }}
      .meta {{ margin-top: 8px; color: var(--muted); font-size: 14px; }}
      .report {{
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: var(--surface);
        overflow-x: auto;
      }}
      table {{ border-collapse: collapse; width: 100%; }}
      th, td {{ border: 1px solid #dbe2ea; padding: 10px 12px; text-align: left; }}
      th {{ background: #f8fafc; }}
      img {{ max-width: 100%; height: auto; }}
      pre {{ white-space: pre-wrap; word-break: break-word; }}
    </style>
  </head>
  <body>
    <div class=\"shell\">
      <section class=\"header\">
        <p class=\"eyebrow\">Pizza Report</p>
        <h1>{safe_title}</h1>
        <p class=\"meta\">report_id: {safe_report_id}</p>
      </section>
      <section class=\"report\">
        {body_html}
      </section>
    </div>
  </body>
</html>
"""


def _make_source_code(tool: dict[str, Any]) -> str:
    tool_name = str(tool.get("toolname", "tool")).strip()
    safe_name = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in tool_name)
    keys = tool.get("keys", []) if isinstance(tool.get("keys", []), list) else []
    key_lines = ",\n".join([f'        "{k}": "<{k}>"' for k in keys]) or '        "key": "<value>"'

    return f'''import requests

API_URL = "https://pizza.skhynix.com/api/pizza/get-context"

def call_{safe_name}(user_prompt: str):
    payload = {{
        "tools": ["{tool_name}"],
        "query": user_prompt,
        "tool_args": {{
{key_lines}
        }}
    }}

    response = requests.post(API_URL, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    result = call_{safe_name}("user prompt")
    print(result)
'''


@app.get("/")
def root() -> FileResponse:
    return FileResponse(str(BASE_DIR / "index.html"))


@app.get("/index.html")
def marketplace_page() -> FileResponse:
    return FileResponse(str(BASE_DIR / "index.html"))


@app.get("/api/health")
def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.get("/api/tools")
def list_tools() -> JSONResponse:
    return JSONResponse({"tools": get_tools()})


@app.get("/api/history")
def list_history() -> JSONResponse:
    return JSONResponse({"history": get_history()})


@app.get("/api/tools/{toolname}/source")
def get_tool_source(toolname: str) -> JSONResponse:
    tool = next((item for item in get_tools() if item.get("toolname") == toolname), None)
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    return JSONResponse({"toolname": toolname, "language": "python", "source_code": _make_source_code(tool)})


@app.get("/pizza/report/{report_id}")
def pizza_report(report_id: str) -> HTMLResponse:
    raw_html = _load_report_html(report_id)
    title, body_html = _parse_report_html(raw_html)
    return HTMLResponse(_wrap_report_html(report_id, title, body_html))
