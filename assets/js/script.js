/*
 * A11yAudit — Lógica do front-end
 * Gerencia o formulário de auditoria, exibição de resultados,
 * chamadas à API e interações de UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------- ELEMENTOS DO DOM ----------
    const auditForm = document.getElementById('audit-form');
    const auditUrlInput = document.getElementById('audit-url');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsSection = document.getElementById('results-section');
    const issuesList = document.getElementById('issues-list');
    const scoreValue = document.getElementById('score-value');
    const scoreRing = document.getElementById('score-ring');
    const scoreLabel = document.getElementById('score-label');
    const statsRow = document.getElementById('stats-row');
    const mockupPreview = document.getElementById('mockup-preview');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const newAuditBtn = document.getElementById('new-audit-btn');
    const exportBtn = document.getElementById('export-btn');

    // ---------- ANO AUTOMÁTICO NO FOOTER ----------
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // ---------- MENU MOBILE ----------
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('show');
        const expanded = navMenu.classList.contains('show');
        navToggle.setAttribute('aria-expanded', String(expanded));
        const icon = navToggle.querySelector('i');
        icon.className = expanded ? 'ri-close-line' : 'ri-menu-line';
    });

    // ---------- NAVEGAÇÃO ATIVA POR SCROLL ----------
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.header__link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 100;
            if (window.scrollY >= top) current = section.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    });

    // ---------- SUBMISSÃO DO FORMULÁRIO ----------
    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = auditUrlInput.value.trim();
        if (!url) return;

        // Mostrar loading
        loadingOverlay.style.display = 'flex';
        resultsSection.style.display = 'none';

        try {
            // Chamada ao back-end real
            const response = await fetchAuditResults(url);
            displayResults(response);
        } catch (err) {
            console.error('Erro na auditoria:', err);
            displayError(err.message || 'Não foi possível realizar a auditoria.');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // ---------- NOVA AUDITORIA ----------
    newAuditBtn.addEventListener('click', () => {
        resultsSection.style.display = 'none';
        auditUrlInput.value = '';
        auditUrlInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ---------- EXPORTAR ----------
    exportBtn.addEventListener('click', () => {
        window.print();
    });

    // ---------- FUNÇÕES ----------

    /**
     * Chama a API real e apresenta uma mensagem acionável se ela estiver indisponível.
     */
    async function fetchAuditResults(url) {
        const apiBase = window.location.port === '5000' ? '' : 'http://localhost:5000';
        let res;
        try {
            res = await fetch(`${apiBase}/api/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
        } catch {
            throw new Error('Não foi possível conectar à API. Inicie o backend na porta 5000 e tente novamente.');
        }
        const data = await res.json().catch(() => ({ error: 'Resposta inválida da API.' }));
        if (!res.ok) throw new Error(data.error || 'Não foi possível executar a auditoria.');
        if (!Number.isFinite(data.score) || !Array.isArray(data.issues)) {
            throw new Error('Resposta da API em formato inesperado.');
        }
        return data;
    }

    /**
     * Exibe os resultados no painel.
     */
    function displayResults(data) {
        const { score, issues } = data;
        mockupPreview.innerHTML = '';
        const scorePreview = document.createElement('p');
        scorePreview.style.textAlign = 'center';
        scorePreview.innerHTML = `<strong>${Number(score)}/100</strong><br>${issues.length} ocorrências`;
        mockupPreview.appendChild(scorePreview);

        // Atualiza score
        scoreValue.textContent = score;
        const circumference = 326.73; // 2 * PI * 52
        scoreRing.style.strokeDashoffset = circumference - (score / 100) * circumference;

        // Cor do anel conforme pontuação
        if (score >= 80) {
            scoreRing.style.stroke = 'var(--success)';
            scoreLabel.textContent = 'Ótimo — poucos problemas encontrados';
        } else if (score >= 50) {
            scoreRing.style.stroke = 'var(--warning)';
            scoreLabel.textContent = 'Regular — melhorias recomendadas';
        } else {
            scoreRing.style.stroke = 'var(--error)';
            scoreLabel.textContent = 'Crítico — muitos problemas de acessibilidade';
        }

        // Contadores por severidade
        const count = (s) => issues.filter(i => i.severity === s).length;
        statsRow.innerHTML = `
      <span class="stat-chip stat-chip--error"><i class="ri-close-circle-line"></i> ${count('error')} erros</span>
      <span class="stat-chip stat-chip--warning"><i class="ri-alert-line"></i> ${count('warning')} avisos</span>
      <span class="stat-chip stat-chip--success"><i class="ri-information-line"></i> ${count('info')} informativos</span>
    `;

        // Ícones e rótulos por severidade (não depende só da cor)
        const icons = { error: 'ri-close-circle-line', warning: 'ri-alert-line', info: 'ri-information-line' };
        const labels = { error: 'Alto', warning: 'Médio', info: 'Baixo' };

        // Lista de problemas
        issuesList.innerHTML = '';
        issues.forEach(issue => {
            const severity = Object.prototype.hasOwnProperty.call(icons, issue.severity) ? issue.severity : 'info';
            const article = document.createElement('article');
            article.className = `issue-card issue-card--${severity}`;
            article.innerHTML = `
        <i class="issue-card__icon ${icons[severity]}" aria-hidden="true"></i>
        <div class="issue-card__content">
          <h4 class="issue-card__title"></h4>
          <p class="issue-card__desc"></p>
          <pre class="issue-card__code" hidden><code></code></pre>
          <p class="issue-card__suggestion"><i class="ri-lightbulb-line"></i> <span></span></p>
        </div>`;
            article.querySelector('.issue-card__title').textContent =
                `${issue.title || 'Problema encontrado'} (${labels[severity]})`;
            article.querySelector('.issue-card__desc').textContent = issue.description || '';
            if (issue.snippet) {
                const codeBlock = article.querySelector('.issue-card__code');
                codeBlock.hidden = false;
                codeBlock.querySelector('code').textContent = issue.snippet;
            }
            article.querySelector('.issue-card__suggestion span').textContent = issue.suggestion || '';
            issuesList.appendChild(article);
        });

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function displayError(message) {
        resultsSection.style.display = 'block';
        statsRow.innerHTML = '';
        issuesList.innerHTML = '';
        scoreValue.textContent = '--';
        scoreLabel.textContent = 'Auditoria não concluída';
        const alert = document.createElement('p');
        alert.className = 'issue-card issue-card--error';
        alert.setAttribute('role', 'alert');
        alert.textContent = message;
        issuesList.appendChild(alert);
        mockupPreview.innerHTML = '<p style="text-align:center">Nenhum relatório disponível</p>';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
});
