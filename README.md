# A11yAudit

A11yAudit é uma aplicação web educacional que audita páginas públicas em busca de problemas comuns de acessibilidade. O front-end envia uma URL para uma API Flask e apresenta pontuação, severidades e sugestões de correção.

## Funcionalidades

- Verificação de atributo de idioma.
- Detecção de imagens sem texto alternativo.
- Verificação de nomes acessíveis em botões.
- Verificação de links vazios.
- Associação entre campos e labels.
- Análise da hierarquia de títulos.
- Verificação de meta viewport e título da página.
- Contadores por severidade e pontuação de 0 a 100.
- Exportação visual do relatório pelo navegador.
- Interface responsiva e navegação mobile acessível.

## Estrutura

```text
auditor-acessibilidade/
├── index.html
├── README.md
├── passo-a-passo.txt
├── versao.txt
├── assets/
│   ├── css/style.css
│   └── js/script.js
└── backend/
    ├── app.py
    ├── auditor.py
    └── requirements.txt
```

## Pré-requisitos

- Python 3.10 ou superior.
- Navegador moderno.
- Conexão de rede para analisar páginas externas.

## Instalação no Windows

```powershell
cd C:\Users\diego\Desktop\auditor-acessibilidade
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

## Execução

Em um terminal, inicie o servidor:

```powershell
.\venv\Scripts\python.exe backend\app.py
```

Em outro terminal, sirva o front-end para evitar restrições locais:

```powershell
.\venv\Scripts\python.exe -m http.server 5500
```

Depois acesse `http://localhost:5500`.

## Uso

1. Informe uma URL iniciada por `http://` ou `https://`.
2. Clique em **Auditar agora**.
3. Consulte a pontuação e a lista de ocorrências.
4. Use **Exportar relatório (PDF)** para abrir a impressão do navegador.
5. Use **Nova auditoria** para limpar o resultado.

## API

### POST `/api/audit`

Corpo JSON:

```json
{
  "url": "https://exemplo.com"
}
```

Resposta de sucesso:

```json
{
  "url": "https://exemplo.com",
  "score": 90,
  "issues": []
}
```

## Segurança

- Apenas URLs HTTP/HTTPS são aceitas.
- Destinos locais, privados, reservados e de link-local são bloqueados.
- Usuários e senhas em URLs são rejeitados.
- Redirecionamentos são limitados e validados.
- O conteúdo baixado é limitado a 2 MB.
- Dados exibidos no front-end são tratados como texto.
- O servidor deve executar em modo de produção sem o depurador para uso público.

## Limitações

A análise é estática e não executa JavaScript da página auditada. Ela não substitui testes automatizados completos com ferramentas WCAG nem testes manuais com leitores de tela e navegação por teclado.

## 👨‍💻 Autor

### Diego Francisco da Silva

Desenvolvedor Front-End em formação e estudante de Engenharia de Software.

- **[Site Empresa](https://diegofranciscodasilva.github.io/dev-software-web/)**: dev.software.web
- **[LinkedIn](https://www.linkedin.com/in/diego-francisco-da-silva/)**: diego-francisco-da-silva
- **[GitHub](https://github.com/diegofranciscodasilva)**: diegofranciscodasilva
- **[Instagram](https://www.instagram.com/diego_francisco_da_silva/)**: @diego_francisco_da_silva
- **[Instagram](https://www.instagram.com/dev.software.web/)**: @dev.software.web

---

Feito com ❤️ por Diego.
