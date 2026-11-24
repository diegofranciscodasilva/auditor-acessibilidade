"""API Flask do A11yAudit."""
from flask import Flask, jsonify, request
import requests

try:
    from .auditor import AuditError, analyze, fetch_html, validate_url
except ImportError:
    from auditor import AuditError, analyze, fetch_html, validate_url

app = Flask(__name__)


@app.after_request
def allow_local_frontend(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


@app.post("/api/audit")
def audit():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()

    if not validate_url(url):
        return jsonify({"error": "URL inválida"}), 400

    try:
        html = fetch_html(url)
    except AuditError as exc:
        return jsonify({"error": str(exc)}), 422
    except requests.RequestException as exc:
        return jsonify({"error": "Não foi possível acessar a página."}), 502

    result = analyze(html)
    result["url"] = url
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=False, port=5000)
