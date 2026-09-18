import json
def dumps(value) -> str: return json.dumps(value, separators=(",", ":"), ensure_ascii=False)
def loads(value: str): return json.loads(value or "{}")
