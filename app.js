
// 1. Definição da Configuração Inicial (Padrão)
const defaultConfig = {

    "1": {
        "name": "Lotes",
        "fields": [
            {
                "name": "COD",
                "label": "Código",
                "type": "number",
                "pad": 2,
                "placeholder": "01"
            },
            {
                "name": "LOTS",
                "type": "number",
                "pad": 2,
                "placeholder": "01"
            },
            {
                "name": "WEIGHT",
                "label": "Peso (kg)",
                "type": "weight",
                "decimals": 3,
                "locale": "BR",
                "placeholder": "0,000"
            }
        ],
        "templateHeader": "📌 Report - {DATE} \\n\\n",
        "templateLine": "🔹 Cod.: {COD} - Lotes: {LOTS} Peso Bruto: {WEIGHT} \\n",
        "templateTotal": "📊 TOTAL: {TOTAL} ",
        "sumField": "LOTS"
    },
    "2": {
        "name": "Resumo",
        "fields": [
            {
                "name": "NAME",
                "label": "NOME",
                "type": "text"
            },
            {
                "name": "QTD",
                "type": "number",
                "pad": 2
            }
        ],
        "templateHeader": "Resumo do dia {DATE} \\n\\n",
        "templateLine": "{QTD} {NAME} \\n",
        "templateTotal": "📊 TOTAL: {TOTAL} ",
        "sumField": "QTD"
    }


};

// 2. Carregamento da Configuração (LocalStorage ou Default)
// Ajuste na linha 23
let storedConfig = localStorage.getItem('relatorioConfig');
let currentConfig = storedConfig ? JSON.parse(storedConfig) : defaultConfig;

// 3. Seleção de Elementos do DOM
const select = document.getElementById("tipoRelatorio");
const preview = document.getElementById("preview");
const container = document.getElementById("inputsContainer");
const btnConfig = document.getElementById("btnConfig");
const editorDiv = document.getElementById("editorContainer");
const jsonEditor = document.getElementById("jsonEditor");

// 4. Inicialização da Interface
function init() {
    select.innerHTML = "";
    for (let k in currentConfig) {
        let o = document.createElement("option");
        o.value = k;
        o.innerText = currentConfig[k].name;
        select.appendChild(o);
    }
    document.getElementById("data").value = new Date().toISOString().split("T")[0];
    // Adiciona o listener da data
    document.getElementById("data").addEventListener("input", build);
    
    select.addEventListener("change", () => {
        // 1. Atualiza o formulário (o que você já faz)
        renderInputs();

        // 2. Se o editor estiver visível, atualiza o conteúdo dele para o novo tipo
        if (editorDiv.style.display === "block") {
            if (configMode === "simple") {
                renderSimpleEditor(); // Re-renderiza os inputs do simples
            } else {
                // Se for avançado, o CodeMirror precisa ser atualizado
                if (editorInstance) {
                    editorInstance.setValue(JSON.stringify(currentConfig, null, 4));
                }
            }
        }
    });
    renderInputs();
    renderizarHistorico();

    setConfigMode('simple');
}

function renderInputs() {
    container.innerHTML = "";
    addRow();
    addRow();
    build();
}

function addRow() {
    const type = select.value;
    const fields = currentConfig[type].fields;
    const row = document.createElement("div");
    row.className = "input-row";

    row.innerHTML = fields.map(c => `
        <div>
            <label>${c.label || c.name}</label>
            <input type="text" 
                   data-field="${c.name}" 
                   inputmode="decimal" 
                   class="${c.type}"
                   placeholder="${c.placeholder || ''}">
        </div>
    `).join("");

    container.appendChild(row);
}

// 5. Listeners de Eventos (Máscara e Auto-Row)
container.addEventListener("input", e => {
    // Tratamento para PESO (aceita tanto ponto quanto vírgula enquanto digita)
    if (e.target.classList.contains("weight")) {
        let v = e.target.value.replace(/[^\d,.]/g, "");
        e.target.value = v;
    }
    // Tratamento para NUMBER
    else {
        const fieldName = e.target.getAttribute("data-field");
        const type = select.value;
        const fieldConfig = currentConfig[type].fields.find(c => c.name === fieldName);

        if (fieldConfig && fieldConfig.type === 'number') {
            e.target.value = e.target.value.replace(/\D/g, "");
        }
    }
    build();
});

// No evento BLUR
container.addEventListener("blur", e => {
    const fieldName = e.target.getAttribute("data-field");
    const fieldConfig = currentConfig[select.value].fields.find(c => c.name === fieldName);

    e.target.value = formatValue(e.target.value, fieldConfig);
    build();
}, true);

// No COLETAR (para salvar os dados formatados)
function coletar() {
    const type = select.value;
    const rows = document.querySelectorAll(".input-row");
    return Array.from(rows).map(r => {
        let obj = {};
        currentConfig[type].fields.forEach(c => {
            let input = r.querySelector(`[data-field="${c.name}"]`);
            obj[c.name] = formatValue(input.value, c);
        });
        return obj;
    }).filter(obj => Object.values(obj).some(v => v !== ""));
}


function formatValue(value, fieldConfig) {
    if (value === "") return "";
    if (!fieldConfig) return value;

    if (fieldConfig.type === 'weight') {
        // 1. Limpa o valor para realizar o cálculo (aceita vírgula ou ponto)
        let num = parseFloat(value.toString().replace(/\./g, "").replace(",", "."));
        if (isNaN(num)) return "";

        // 2. Define o Locale (pt-BR para ponto no milhar/vírgula decimal, en-US para o inverso)
        let localeCode = (fieldConfig.locale === "BR") ? 'pt-BR' : 'en-US';

        return new Intl.NumberFormat(localeCode, {
            minimumFractionDigits: fieldConfig.decimals || 3,
            maximumFractionDigits: fieldConfig.decimals || 3
        }).format(num);
    }

    // Máscara para Zeros à esquerda
    if (fieldConfig.pad && !isNaN(value)) {
        return value.toString().padStart(fieldConfig.pad, '0');
    }

    return value;
}

// 6. Lógica de Geração do Relatório (Build)
// Função BUILD corrigida para ler as novas propriedades em inglês
function build() {
    const type = select.value;
    const conf = currentConfig[type];
    const data = coletar();
    const dateFormatted = document.getElementById("data").value.split("-").reverse().join("/");

    // Agora usamos os templates diretamente, pois o \n já está contido neles
    let text = renderTemplate(conf.templateHeader, { DATE: dateFormatted });

    data.forEach(d => {
        text += renderTemplate(conf.templateLine, d);
    });
    // SOMA UNIVERSAL (usando sumField)
    if (conf.templateTotal && conf.sumField) {
        let sum = data.reduce((acc, d) => {
            let v = d[conf.sumField] || "0";
            // Limpa o valor para somar (remove pontos/vírgulas)
            // Dentro do build(), no bloco do reduce:
            let valNum = parseFloat(v.toString().replace(",", ".")); // Converte para formato JS (ponto)        
            return acc + (isNaN(valNum) ? 0 : valNum);
        }, 0);

        // Identifica a config do campo somado
        // Identifica a config do campo somado
        const fieldConfig = conf.fields.find(c => c.name === conf.sumField);
        let totalFormatted;

        if (fieldConfig && fieldConfig.type === 'weight') {
            // Usa a mesma lógica do formatValue para consistência
            let localeCode = (fieldConfig.locale === "BR") ? 'pt-BR' : 'en-US';
            totalFormatted = new Intl.NumberFormat(localeCode, {
                minimumFractionDigits: fieldConfig.decimals || 3,
                maximumFractionDigits: fieldConfig.decimals || 3
            }).format(sum);
        } else {
            totalFormatted = Math.round(sum).toString();
            if (fieldConfig && fieldConfig.pad) {
                totalFormatted = totalFormatted.padStart(fieldConfig.pad, '0');
            }
        }

        // Verificação de consistência:
        // Se o usuário esqueceu de colocar {TOTAL}, injetamos automaticamente
        let templateTotal = conf.templateTotal || "📊 TOTAL: {TOTAL}";

        if (!templateTotal.includes("{TOTAL}")) {
            templateTotal += ": {TOTAL}"; // Ajuste automático se ele esqueceu
        }

        text += "\n" + renderTemplate(templateTotal, { TOTAL: totalFormatted });
    }

    preview.innerHTML = text.replace(/\n/g, '<br>');
    return text;
}

// 7. Funções Utilitárias
function removeRow() {
    if (container.children.length > 1) {
        container.removeChild(container.lastChild);
        build();
    }
}


function renderTemplate(template, data) {
    // Primeiro, resolvemos o \n que vem como texto literal
    let formattedTemplate = template.replace(/\\n/g, "\n");

    // Depois, aplicamos as variáveis
    return formattedTemplate.replace(/\{(.*?)\}/g, (_, key) => data[key] || "");
}


// Atribui ao botão da engrenagem
btnConfig.onclick = toggleEditor;

let editorInstance = null;

function toggleEditor() {
    const isVisible = editorDiv.style.display === "block";
    editorDiv.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
        if (!editorInstance) {
            // Inicializa o CodeMirror no seu textarea
            editorInstance = CodeMirror.fromTextArea(document.getElementById("jsonEditor"), {
                mode: "text/javascript", // Permite destacar comentários visualmente
                lineNumbers: true,
                indentUnit: 4,
                lineWrapping: true,
                //theme: "default",
                theme: "dracula",
            });
        }
        // Garante que o texto esteja formatado e dentro do editor
        editorInstance.setValue(JSON.stringify(currentConfig, null, 4));
        editorInstance.refresh(); // Garante o render correto após display:block

        if (!editorInstance.hasChangeHandler) {
            editorInstance.on("change", (cm) => {
                const errorLog = document.getElementById("errorLog");
                try {
                    const content = stripComments(cm.getValue());
                    JSON.parse(content);
                    errorLog.innerText = "Formato válido!";
                    errorLog.style.color = "green";
                } catch (e) {
                    errorLog.innerText = "Formato inválido: verifique a sintaxe.";
                    errorLog.style.color = "red";
                }
            });
            editorInstance.hasChangeHandler = true; // Flag para não registrar de novo
        }


        setTimeout(() => editorDiv.scrollIntoView({ behavior: 'smooth' }), 100);
    }
}

function saveSettings() {
    try {
        if (configMode === "simple") {
            saveSimpleConfig();
        } else {
            saveAdvancedConfig();
        }

        // Agora o build() roda para ambos os casos de forma garantida
        build();

        // Opcional: fechar o editor após salvar
        toggleEditor();
    } catch (e) {
        alert(e.message);
    }
}


function resetConfig() {
    if (confirm("Isso apagará todas as suas alterações e restaurará o padrão. Continuar?")) {
        localStorage.removeItem('relatorioConfig');
        location.reload();
    }
}

function stripComments(jsonString) {
    // Remove tudo que for comentário de linha // ou bloco /* */
    // .trim() ajuda a limpar espaços vazios deixados no topo/fim
    return jsonString.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").trim();
}


let configMode = "simple";

function setConfigMode(mode) {
    configMode = mode;

    // Atualiza classes dos botões
    document.getElementById("btnSimple").classList.toggle("active", mode === "simple");
    document.getElementById("btnAdvanced").classList.toggle("active", mode === "advanced");

    // Alterna visibilidade
    document.getElementById("simpleEditor").style.display = (mode === "simple") ? "block" : "none";
    document.getElementById("advancedEditor").style.display = (mode === "advanced") ? "block" : "none";
    if (mode === "simple") {
        renderSimpleEditor();
    } else {
        // Atualiza o editor de código com o estado atual mais recente
        if (editorInstance) {
            editorInstance.setValue(JSON.stringify(currentConfig, null, 4));
            editorInstance.refresh();
        }
    }
}
function renderSimpleEditor() {
    const container = document.getElementById("simpleEditor");
    const type = select.value;
    const conf = currentConfig[type];

    const varList = conf.fields.map(f => `{${f.name}}`).join(", ");

    container.innerHTML = `
        <label>Nome do relatório</label>
        <input id="conf_name" value="${conf.name}">

        <label>Template Header</label>
        <input id="conf_header" value="${conf.templateHeader}">

        <label>Template Linha</label>
        <div style="display:flex; gap: 5px; margin-bottom: 2px;">
            <input id="conf_line" value="${conf.templateLine.replace(/\\n/g, '\\n')}">
        </div>
        <small style="color: #666; display: block; margin-bottom: 15px;">Variáveis: ${varList}</small>
        
        <label>Template Total</label>
        <input id="conf_total" value="${conf.templateTotal || '📊 TOTAL: {TOTAL}'}">
        <small style="color: #666; display: block; margin-bottom: 15px;">
            Use a variável <b>{TOTAL}</b>. Ex: "Total: {TOTAL} un."
        </small>

        <label>Campo de soma</label>
        <select id="conf_sumfield" style="margin-top: 5px;">
            ${conf.fields.map(f => `
                <option value="${f.name}" ${f.name === conf.sumField ? 'selected' : ''}>
                    ${f.name}
                </option>
            `).join("")}
        </select>
    `;
}


function saveSimpleConfig() {
    const type = select.value;
    const conf = currentConfig[type];

    conf.name = document.getElementById("conf_name").value;
    conf.templateHeader = document.getElementById("conf_header").value;
    conf.templateLine = document.getElementById("conf_line").value;
    conf.templateTotal = document.getElementById("conf_total").value;

    // Agora o campo de soma vem direto do select
    conf.sumField = document.getElementById("conf_sumfield").value;

    localStorage.setItem('relatorioConfig', JSON.stringify(currentConfig));
    alert("Configuração salva!");
}

function saveAdvancedConfig() {
    try {
        const content = stripComments(editorInstance.getValue());
        const parsed = JSON.parse(content);
        validateTemplates(parsed);

        currentConfig = parsed;
        localStorage.setItem('relatorioConfig', JSON.stringify(currentConfig));
        alert("Configuração avançada salva com sucesso!");

        // Em vez de location.reload(), apenas atualize o seletor se necessário
        // e deixe o saveSettings() chamar o build()
    } catch (e) {
        throw new Error("Erro no JSON: verifique a sintaxe!");
    }
}
function formatarJSON() {
    try {
        // 1. Pega o conteúdo atual
        const content = editorInstance.getValue();
        // 2. Limpa comentários
        const cleanContent = stripComments(content);
        // 3. Converte para objeto e depois para string formatada
        const parsed = JSON.parse(cleanContent);
        const formatted = JSON.stringify(parsed, null, 4);

        // 4. Atualiza o editor
        editorInstance.setValue(formatted);
    } catch (e) {
        alert("Não consigo formatar: O JSON está com erro de sintaxe.");
    }
}
function validateTemplates(config) {
    const errorLog = document.getElementById("errorLog");
    errorLog.innerText = ""; // Limpa erros anteriores

    for (let key in config) {
        const item = config[key];
        const validFields = item.fields.map(f => f.name);

        // Regex para encontrar tudo que está entre { }
        const templateStr = item.templateHeader + item.templateLine + (item.templateTotal || "");
        const matches = templateStr.match(/\{(.*?)\}/g);

        if (matches) {
            matches.forEach(m => {
                const varName = m.replace(/[\{\}]/g, "");
                // Ignora variáveis especiais como DATE e TOTAL
                if (varName !== "DATE" && varName !== "TOTAL" && !validFields.includes(varName)) {
                    errorLog.innerText = `Erro: Variável {${varName}} usada no template não existe nos campos!`;
                }
            });
        }
    }
}


function share() {
    const texto = build();
    if (navigator.share && navigator.canShare) navigator.share({ text: texto });
    else window.open("https://wa.me/?text=" + encodeURIComponent(texto));

    // Salva no histórico ao copiar
    salvarNoHistorico(texto); // Única chamada, menos chance de erro
    renderizarHistorico();
}


function salvarNoHistorico(texto) {
    if (!texto || texto.length < 10) return; // Não salva textos curtos ou vazios

    let historico = JSON.parse(localStorage.getItem('relatorioHistorico')) || [];

    // Evita duplicados (se o último for igual ao atual, não salva)
    if (historico.length > 0 && historico[0].conteudo === texto) return;

    const novoItem = {
        id: Date.now(),
        data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        conteudo: texto
    };

    // Mantém APENAS os 10 últimos
    historico = [novoItem, ...historico].slice(0, 10);

    localStorage.setItem('relatorioHistorico', JSON.stringify(historico));
    renderizarHistorico();
}


// Centralize a chamada para evitar repetição
async function copiar() {
    const texto = build();
    await navigator.clipboard.writeText(texto);
    salvarNoHistorico(texto); // Única chamada, menos chance de erro
    alert("Copiado e salvo!");
}

function removerDoHistorico(id) {
    if (!confirm("Deseja excluir este relatório?")) return;

    let historico = JSON.parse(localStorage.getItem('relatorioHistorico')) || [];
    historico = historico.filter(item => Number(item.id) !== Number(id));

    localStorage.setItem('relatorioHistorico', JSON.stringify(historico));
    renderizarHistorico();
    closeSheet(); // Fecha a sheet se estiver aberta
}



function salvarArquivo() {
    // Pega o conteúdo que está na Sheet
    const conteudo = window.currentReportContent;
    const blob = new Blob([conteudo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `relatorio-${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Abre a Sheet com o conteúdo
// 1. Abertura do Dialog
function openSheet(id) {
    const dialog = document.getElementById("reportDialog");
    const historico = JSON.parse(localStorage.getItem('relatorioHistorico')) || [];
    const item = historico.find(i => Number(i.id) === Number(id));

    if (!item) return;

    document.getElementById("sheetContent").innerHTML = `
        <h3>Relatório de ${item.data}</h3>
        <pre style="white-space: pre-wrap; background: #F2F2F7; padding: 15px; border-radius: 14px;">${item.conteudo}</pre>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
            <button onclick="copiarDoHistorico()" style="background: var(--indigo); border: none; padding: 12px; border-radius: 14px; color: white; cursor: pointer;">Copiar</button>
            <button onclick="salvarArquivo()" style="background: var(--success); border: none; padding: 12px; border-radius: 14px; color: white; cursor: pointer;">Salvar</button>
        </div>
    `;

    window.currentReportContent = item.conteudo;
    dialog.showModal();


    // Força o navegador a reconhecer o estado para disparar a transição
    // (Apenas se a animação não disparar sozinha no seu navegador)
    requestAnimationFrame(() => {
        dialog.style.transform = 'translateY(0)';
    });
}

// 2. Fechamento único e limpo
function closeSheet() {
    const dialog = document.getElementById("reportDialog");
    dialog.close();
}

// 3. Evento para fechar clicando no fundo (backdrop)
document.getElementById('reportDialog').addEventListener('click', (e) => {
    // Só fecha se o clique for EXATAMENTE no elemento dialog (fundo)
    // e não em qualquer elemento filho (botões, texto, etc.)
    if (e.target === document.getElementById('reportDialog')) {
        closeSheet();
    }
});


// Impede que o zoom do iPhone bagunce o layout quando você clica no input
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
function copiarDoHistorico() {
    navigator.clipboard.writeText(window.currentReportContent);
    alert("Copiado com sucesso!");
    closeSheet();
}


// Atualize seu renderizarHistorico para chamar o openSheet
function renderizarHistorico() {
    const lista = document.getElementById("listaHistorico");
    const historico = JSON.parse(localStorage.getItem('relatorioHistorico')) || [];

    lista.innerHTML = historico.map(item => `
        <div class="hist-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f0f0f0;">
            <div onclick="openSheet(${item.id})" style="flex-grow: 1; cursor: pointer;">
                <small style="color: var(--gray); font-size: 10px;">${item.data}</small> 
                <div style="font-weight: 600; font-size: 14px; margin-top: 2px;">${item.conteudo.substring(0, 20).replace(/\n/g, ' ')}...</div>
            </div>
            <button onclick="removerDoHistorico(${item.id})" class="btn-delete-icon" title="Remover">
                <svg viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        </div>
    `).join("");
}
// Chame renderizarHistorico() ao final do init()

// Executa a inicialização
init();