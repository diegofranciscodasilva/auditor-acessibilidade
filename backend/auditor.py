"""Motor de auditoria: analisa o HTML estático e retorna problemas de acessibilidade."""
import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# Penalidade de pontuação por severidade
PENALTY = {"error": 8, "warning": 4, "info": 1}
MAX_RESPONSE_BYTES = 2 * 1024 * 1024


class AuditError(Exception):
    """Erro esperado durante a coleta da página."""


def validate_url(url: str) -> bool:
    """Valida esquema, host e destino para reduzir riscos de SSRF."""
    if not isinstance(url, str):
        return False

    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    if parsed.username or parsed.password:
        return False
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        return False

    hostname = parsed.hostname.lower().rstrip(".")
    if hostname == "localhost" or hostname.endswith(".localhost"):
        return False

    try:
        addresses = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80),
                                       type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False

    for address in addresses:
        try:
            ip = ipaddress.ip_address(address[4][0])
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False
    return bool(addresses)


def fetch_html(url: str) -> str:
    """Baixa o HTML da página com limite de tamanho e redirecionamentos validados."""
    if not validate_url(url):
        raise AuditError("URL inválida ou destino não permitido.")

    headers = {"User-Agent": "A11yAudit/1.0 (educational)"}
    current_url = url
    for _ in range(5):
        res = requests.get(current_url, headers=headers, timeout=10, allow_redirects=False,
                           stream=True)
        res.raise_for_status()

        if res.status_code in (301, 302, 303, 307, 308):
            location = res.headers.get("Location")
            if not location:
                break
            current_url = urljoin(current_url, location)
            if not validate_url(current_url):
                raise AuditError("Redirecionamento para destino não permitido.")
            continue

        content_length = res.headers.get("Content-Length")
        if content_length and int(content_length) > MAX_RESPONSE_BYTES:
            raise AuditError("A página excede o limite de 2 MB.")

        chunks = []
        downloaded = 0
        for chunk in res.iter_content(chunk_size=64 * 1024):
            downloaded += len(chunk)
            if downloaded > MAX_RESPONSE_BYTES:
                raise AuditError("A página excede o limite de 2 MB.")
            chunks.append(chunk)
        return res.encoding and b"".join(chunks).decode(res.encoding, errors="replace") or b"".join(chunks).decode("utf-8", errors="replace")

    raise AuditError("A página realizou muitos redirecionamentos.")


def issue(severity, title, description, snippet, suggestion):
    return {
        "severity": severity,
        "title": title,
        "description": description,
        "snippet": snippet[:200],
        "suggestion": suggestion,
    }


def analyze(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    issues = []

    # 1. Atributo lang
    root = soup.find("html")
    if not root or not root.get("lang"):
        issues.append(issue("warning", "Atributo lang ausente",
                            "O idioma da página não está declarado.",
                            "<html>", 'Use <html lang="pt-BR">.'))

    # 2. Imagens sem alt
    for img in soup.find_all("img"):
        if img.get("alt") is None:
            issues.append(issue("error", "Imagem sem texto alternativo",
                                "Leitores de tela não conseguem descrever a imagem.",
                                str(img), 'Adicione alt="..." (ou alt="" se decorativa).'))

    # 3. Botões sem nome acessível
    for btn in soup.find_all("button"):
        if not btn.get_text(strip=True) and not btn.get("aria-label") and not btn.get("title"):
            issues.append(issue("error", "Botão sem rótulo acessível",
                                "O botão não possui texto nem aria-label.",
                                str(btn), "Inclua texto visível ou aria-label."))

    # 4. Links vazios
    for a in soup.find_all("a"):
        if not a.get_text(strip=True) and not a.get("aria-label") and not a.find("img", alt=True):
            issues.append(issue("error", "Link sem texto",
                                "Links vazios não informam seu destino.",
                                str(a), "Adicione texto descritivo ou aria-label."))

    # 5. Campos de formulário sem label
    for field in soup.find_all(["input", "select", "textarea"]):
        if field.get("type") in ("hidden", "submit", "button"):
            continue
        fid = field.get("id")
        has_label = fid and soup.find("label", attrs={"for": fid})
        if not has_label and not field.get("aria-label") and not field.get("aria-labelledby"):
            issues.append(issue("warning", "Campo sem label",
                                "Campos de formulário precisam de rótulo associado.",
                                str(field), 'Use <label for="id"> ou aria-label.'))

    # 6. Hierarquia de títulos
    last = 0
    h1_count = len(soup.find_all("h1"))
    for h in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        level = int(h.name[1])
        if last and level > last + 1:
            issues.append(issue("warning", "Hierarquia de títulos quebrada",
                                f"Salto de h{last} para h{level}.",
                                str(h), f"Use h{last + 1} antes de h{level}."))
        last = level
    if h1_count != 1:
        issues.append(issue("warning", "Quantidade de h1 incomum",
                            f"Foram encontrados {h1_count} elementos h1.",
                            "<h1>", "Use um único h1 por página."))

    # 7. Meta viewport
    if not soup.find("meta", attrs={"name": "viewport"}):
        issues.append(issue("info", "Meta viewport ausente",
                            "Pode prejudicar a exibição em dispositivos móveis.",
                            "<head>", 'Adicione <meta name="viewport" content="width=device-width, initial-scale=1">.'))

    # 8. Título da página
    if not soup.title or not soup.title.get_text(strip=True):
        issues.append(issue("warning", "Página sem título",
                            "A tag <title> ajuda na navegação e orientação.",
                            "<head>", "Adicione um <title> descritivo."))

    # Pontuação (mínimo 0)
    score = max(0, 100 - sum(PENALTY[i["severity"]] for i in issues))
    return {"score": score, "issues": issues}
