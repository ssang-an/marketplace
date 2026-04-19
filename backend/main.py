from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="AI Agent Pizza Marketplace API", version="0.1.0")

app.mount("/src", StaticFiles(directory=str(BASE_DIR / "src")), name="src")


class ChatRequest(BaseModel):
    message: str


TOOLS: list[dict[str, Any]] = [
    {"toolname": "lotstatus", "description": "Lot 현재 공정/대기/이상 상태 조회", "keys": ["lot_id", "fab", "include_hold"], "category": "lot", "developer": "MES Team", "usecount": 1940},
    {"toolname": "lot_history", "description": "Lot 이동 이력과 체류 시간 조회", "keys": ["lot_id", "start_time", "end_time"], "category": "lot", "developer": "MES Team", "usecount": 1725},
    {"toolname": "lot_hold_reason", "description": "Lot hold 사유 코드/조치 상태 조회", "keys": ["lot_id"], "category": "lot", "developer": "Quality Ops", "usecount": 1410},
    {"toolname": "lot_priority_queue", "description": "긴급 lot 우선순위 큐 조회", "keys": ["line", "priority_group"], "category": "lot", "developer": "Planning", "usecount": 1490},
    {"toolname": "lot_dispatch_reco", "description": "가용 설비 기반 lot dispatch 추천", "keys": ["line", "eqp_group", "lot_ids"], "category": "lot", "developer": "Scheduling AI", "usecount": 1180},
    {"toolname": "lot_split_merge", "description": "Lot split/merge 가능 조건 점검", "keys": ["lot_id", "action", "target_qty"], "category": "lot", "developer": "MES Team", "usecount": 1090},
    {"toolname": "eqpstatus", "description": "설비 상태(run/idle/down/pm) 실시간 조회", "keys": ["eqp_id", "area"], "category": "eqp", "developer": "Equipment Eng", "usecount": 2380},
    {"toolname": "get_down_eqp_list", "description": "다운 설비 목록 및 다운 시간 조회", "keys": ["fab", "area", "min_down_min"], "category": "eqp", "developer": "Equipment Eng", "usecount": 2230},
    {"toolname": "eqp_alarm_feed", "description": "설비 알람 이벤트 스트림 조회", "keys": ["eqp_id", "severity", "from_time"], "category": "eqp", "developer": "Automation", "usecount": 1660},
    {"toolname": "eqp_pm_schedule", "description": "설비 PM 일정/잔여 시간 조회", "keys": ["eqp_id", "window_days"], "category": "eqp", "developer": "Maintenance", "usecount": 1520},
    {"toolname": "eqp_recipe_capability", "description": "설비별 지원 recipe/제약 조건 조회", "keys": ["eqp_id"], "category": "eqp", "developer": "Process Eng", "usecount": 1370},
    {"toolname": "eqp_utilization", "description": "설비 가동률/유휴율 분석", "keys": ["eqp_group", "date"], "category": "eqp", "developer": "Ops Analytics", "usecount": 1810},
    {"toolname": "recipe_parameter_trace", "description": "Lot별 recipe 파라미터 적용 이력 조회", "keys": ["lot_id", "step"], "category": "process", "developer": "Process Eng", "usecount": 1460},
    {"toolname": "process_window_check", "description": "공정 스펙 윈도우 초과 여부 점검", "keys": ["step", "values"], "category": "process", "developer": "Process Eng", "usecount": 1750},
    {"toolname": "chamber_matching_score", "description": "챔버간 매칭 지수와 편차 지표 제공", "keys": ["eqp_group", "recipe"], "category": "process", "developer": "Process Eng", "usecount": 1260},
    {"toolname": "spc_signal_monitor", "description": "SPC 룰 위반 신호 및 추세 감지", "keys": ["parameter", "line", "period"], "category": "process", "developer": "SPC Team", "usecount": 1980},
    {"toolname": "inline_metrology", "description": "Inline 계측 데이터 조회/요약", "keys": ["lot_id", "wafer_id"], "category": "process", "developer": "Metrology", "usecount": 1540},
    {"toolname": "run_to_run_tuning", "description": "R2R 제어 파라미터 추천값 생성", "keys": ["recipe", "last_runs"], "category": "process", "developer": "APC Team", "usecount": 1175},
    {"toolname": "defect_map_summary", "description": "Wafer defect map 패턴 분류 결과 조회", "keys": ["wafer_id"], "category": "quality", "developer": "Defect Analysis", "usecount": 1640},
    {"toolname": "defect_image_lookup", "description": "결함 이미지/라벨 메타데이터 조회", "keys": ["defect_id"], "category": "quality", "developer": "Defect Analysis", "usecount": 1510},
    {"toolname": "fdc_anomaly_trace", "description": "FDC 이상 탐지 이벤트와 연관 lot 추적", "keys": ["eqp_id", "from_time"], "category": "quality", "developer": "FDC Team", "usecount": 1290},
    {"toolname": "excursion_alert", "description": "품질 excursion 발생/해제 알림 조회", "keys": ["product", "severity"], "category": "quality", "developer": "Quality Ops", "usecount": 1430},
    {"toolname": "sample_plan_recommend", "description": "검사 샘플링 계획 추천", "keys": ["product", "risk_level", "volume"], "category": "quality", "developer": "Quality Ops", "usecount": 980},
    {"toolname": "coa_document_fetch", "description": "COA/검사성적서 문서 조회", "keys": ["lot_id", "document_type"], "category": "quality", "developer": "QA Document", "usecount": 1210},
    {"toolname": "yield_by_step", "description": "공정 step별 수율 기여도 분석", "keys": ["product", "period"], "category": "yield", "developer": "Yield Team", "usecount": 1770},
    {"toolname": "yield_loss_breakdown", "description": "수율 손실 원인을 defect/category로 분해", "keys": ["product", "line", "week"], "category": "yield", "developer": "Yield Team", "usecount": 1690},
    {"toolname": "wafer_bin_distribution", "description": "테스트 bin 분포 및 이상 bin 비중 분석", "keys": ["lot_id"], "category": "yield", "developer": "Test Eng", "usecount": 1580},
    {"toolname": "cp_to_ft_correlation", "description": "CP-FT 결과 상관 분석", "keys": ["product", "date_range"], "category": "yield", "developer": "Test Data", "usecount": 1120},
    {"toolname": "scrap_risk_predict", "description": "Lot 폐기 리스크 예측", "keys": ["lot_id"], "category": "yield", "developer": "Yield AI", "usecount": 930},
    {"toolname": "line_balance_snapshot", "description": "라인별 WIP 불균형/체류 시간 스냅샷", "keys": ["fab", "line"], "category": "process", "developer": "Ops Analytics", "usecount": 1350},
]


def _make_source_code(tool: dict[str, Any]) -> str:
    tool_name = str(tool.get("toolname", "tool")).strip()
    safe_name = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in tool_name)
    keys = tool.get("keys", []) if isinstance(tool.get("keys", []), list) else []
    key_lines = ",\n".join([f'        "{k}": "<{k}>"' for k in keys]) or '        "key": "<value>"'

    # 🚨🔥 반드시 수정: 아래 코드는 샘플 템플릿입니다.
    # 🚨🔥 실제 운영에서는 각 tool의 진짜 소스 저장소/버전 태그에서 코드를 가져오도록 교체하세요.
    return f"""import requests

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
    result = call_{safe_name}("user 프롬프트 입력")
    print(result)
"""


def _html(page: str) -> FileResponse:
    return FileResponse(str(BASE_DIR / page))


@app.get("/")
def root() -> FileResponse:
    return _html("home.html")


@app.get("/home.html")
def home_page() -> FileResponse:
    return _html("home.html")


@app.get("/index.html")
def marketplace_page() -> FileResponse:
    return _html("index.html")


@app.get("/tool-studio.html")
def tool_studio_page() -> FileResponse:
    return _html("tool-studio.html")


@app.get("/skills.html")
def skills_page() -> FileResponse:
    return _html("skills.html")


@app.get("/knowledge-goodocs.html")
def knowledge_page() -> FileResponse:
    return _html("knowledge-goodocs.html")


@app.get("/api/health")
def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.get("/api/tools")
def list_tools() -> JSONResponse:
    return JSONResponse({"tools": TOOLS})


@app.get("/api/tools/{toolname}/source")
def get_tool_source(toolname: str) -> JSONResponse:
    tool = next((item for item in TOOLS if item.get("toolname") == toolname), None)
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")

    # 🚨🔥 반드시 수정: 현재는 템플릿 생성 방식.
    # 🚨🔥 실제로는 toolname 기준으로 내부 코드 저장소/아티팩트에서 원문 코드를 조회해 반환하세요.
    source = _make_source_code(tool)
    return JSONResponse({"toolname": toolname, "language": "python", "source_code": source})


@app.post("/api/chat")
def chat(payload: ChatRequest) -> JSONResponse:
    q = payload.message.lower()

    if any(token in q for token in ["가능", "뭘 할", "what can", "help"]):
        answer = (
            "가능한 업무: 설비(EQP) 모니터링, lot 추적, 품질 이슈 대응, 수율 분석.\n"
            "예시 질문: '10분 이상 down 설비 보여줘', 'LOT123 상태 알려줘'"
        )
    elif any(token in q for token in ["eqp", "설비", "down"]):
        answer = "추천 도구: eqpstatus, get_down_eqp_list, eqp_alarm_feed, eqp_pm_schedule"
    elif any(token in q for token in ["lot", "홀드", "dispatch"]):
        answer = "추천 도구: lotstatus, lot_history, lot_hold_reason, lot_dispatch_reco"
    elif any(token in q for token in ["yield", "수율"]):
        answer = "추천 도구: yield_by_step, yield_loss_breakdown, scrap_risk_predict"
    else:
        answer = "요청 카테고리를 알려주세요: eqp / lot / quality / yield"

    return JSONResponse({"answer": answer})
