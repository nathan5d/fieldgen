
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
        "sumField": "LOTS",
        "sums": {
            "TOTAL": "LOTS",
            "TOTAL_PESO": "WEIGHT"
        }
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
        "sumField": "QTD",
        "sums": {
            "TOTAL": "QTD"
        }
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
    // 1. Popula o select primeiro
    select.innerHTML = "";
    for (let k in currentConfig) {
        let o = document.createElement("option");
        o.value = k;
        o.innerText = currentConfig[k].name;
        select.appendChild(o);
    }

    // 2. Define a data padrão
    document.getElementById("data").value = new Date().toISOString().split("T")[0];
    document.getElementById("data").addEventListener("input", build);

    // 3. Carrega o rascunho (isso já vai renderizar as linhas ou as padrão)
    carregarRascunho();

    // 4. Inicializa o resto
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

    // Dentro da função addRow, garanta a adição do atributo:
    row.innerHTML = fields.map(c => {
        let mode = c.type === "number" ? "numeric" : (c.type === "weight" ? "decimal" : "text");
        return `
    <div>
        <label>${c.label || c.name}</label>
        <input type="text" 
               data-field="${c.name}" 
               inputmode="${mode}" 
               class="${c.type}"
               autocomplete="off" 
               placeholder="${c.placeholder || ''}">
    </div>`;
    }).join("");

    container.appendChild(row);
}

// Salva o estado atual dos inputs no localStorage
function salvarRascunho() {
    const type = select.value;
    const rows = document.querySelectorAll(".input-row");

    // Pega todos os rascunhos existentes
    let todosRascunhos = JSON.parse(localStorage.getItem("fieldGenRascunhos")) || {};

    // Atualiza apenas o tipo atual
    todosRascunhos[type] = {
        date: document.getElementById("data").value,
        rows: Array.from(rows).map(row => {
            let rowObj = {};
            row.querySelectorAll("input[data-field]").forEach(i => {
                rowObj[i.getAttribute("data-field")] = i.value;
            });
            return rowObj;
        })
    };

    localStorage.setItem("fieldGenRascunhos", JSON.stringify(todosRascunhos));
}


function carregarRascunho() {
    const todosRascunhos = JSON.parse(localStorage.getItem("fieldGenRascunhos")) || {};
    const type = select.value;
    const rascunho = todosRascunhos[type];

    if (!rascunho) {
        // Se não tem rascunho, garante que o form esteja limpo (ou padrão)
        renderInputs();
        return;
    }

    // Define a data
    document.getElementById("data").value = rascunho.date;

    // Recria as linhas
    container.innerHTML = "";
    rascunho.rows.forEach(rowData => {
        addRow();
        const lastRow = container.lastElementChild;
        Object.keys(rowData).forEach(fieldName => {
            const input = lastRow.querySelector(`[data-field="${fieldName}"]`);
            if (input) input.value = rowData[fieldName];
        });
    });

    build();
}


function limparRascunhoAtual() {
    const type = select.value;
    let todosRascunhos = JSON.parse(localStorage.getItem("fieldGenRascunhos")) || {};

    // Remove apenas o rascunho do tipo atual
    delete todosRascunhos[type];
    localStorage.setItem("fieldGenRascunhos", JSON.stringify(todosRascunhos));

    // Reseta a interface (volta para o estado inicial de 2 linhas vazias)
    renderInputs();
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
    salvarRascunho();
});

// No evento BLUR
container.addEventListener("blur", e => {
    const fieldName = e.target.getAttribute("data-field");
    const fieldConfig = currentConfig[select.value].fields.find(c => c.name === fieldName);

    e.target.value = formatValue(e.target.value, fieldConfig);
    build();
}, true);


// Substitua o listener atual do select por este:
select.addEventListener("change", () => {
    // 1. Apenas troca o valor. O carregarRascunho já limpa o container.
    // O build() também será chamado dentro do carregarRascunho.
    carregarRascunho();

    // 2. Atualiza o editor se estiver visível
    if (editorDiv.style.display === "block") {
        if (configMode === "simple") {
            renderSimpleEditor();
        } else if (editorInstance) {
            editorInstance.setValue(JSON.stringify(currentConfig, null, 4));
        }
    }
});
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

    let text = renderTemplate(conf.templateHeader, { DATE: dateFormatted });

    // Renderiza as linhas de itens
    data.forEach(d => {
        text += renderTemplate(conf.templateLine, d);
    });

    // --- LÓGICA DE SOMAS ---
    const sumsData = {};

    // 1. Verifica se existem somas múltiplas configuradas
    if (conf.sums) {
        Object.entries(conf.sums).forEach(([varName, fieldName]) => {
            sumsData[varName] = calcularSoma(data, fieldName, conf.fields);
        });
    }
    // 2. Fallback: Se não houver 'sums', mas houver o antigo 'sumField'
    else if (conf.sumField) {
        sumsData["TOTAL"] = calcularSoma(data, conf.sumField, conf.fields);
    }

    // 3. Aplica o template de total se houver somas calculadas
    if (Object.keys(sumsData).length > 0 && conf.templateTotal) {
        let templateTotal = conf.templateTotal;

        // Se o usuário só tem uma soma mas esqueceu a tag {TOTAL}, corrigimos
        if (conf.sumField && !conf.sums && !templateTotal.includes("{TOTAL}")) {
            templateTotal += ": {TOTAL}";
        }

        text += "\n" + renderTemplate(templateTotal, sumsData);
    }

    preview.innerHTML = text.replace(/\n/g, '<br>');
    return text;
}

/**
 * Função auxiliar para isolar a lógica de cálculo e formatação
 */
function calcularSoma(data, fieldName, fieldsConfig) {
    const fieldConfig = fieldsConfig.find(c => c.name === fieldName);

    // Soma os valores
    const total = data.reduce((acc, d) => {
        let v = d[fieldName] || "0";
        // Limpeza robusta: remove pontos de milhar e converte vírgula em ponto
        let valNum = parseFloat(v.toString().replace(/\./g, "").replace(",", "."));
        return acc + (isNaN(valNum) ? 0 : valNum);
    }, 0);

    // Formatação baseada no tipo do campo
    if (fieldConfig && fieldConfig.type === 'weight') {
        let localeCode = (fieldConfig.locale === "BR") ? 'pt-BR' : 'en-US';
        return new Intl.NumberFormat(localeCode, {
            minimumFractionDigits: fieldConfig.decimals || 3,
            maximumFractionDigits: fieldConfig.decimals || 3
        }).format(total);
    } else {
        let formatted = Math.round(total).toString();
        if (fieldConfig && fieldConfig.pad) {
            formatted = formatted.padStart(fieldConfig.pad, '0');
        }
        return formatted;
    }
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


        lucide.createIcons(); // Garante que os ícones nos links apareçam

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

// Copia a configuração atual para o clipboard
async function copiarConfigJSON() {
    const configStr = editorInstance.getValue();
    await navigator.clipboard.writeText(configStr);
    alert("Configuração copiada!");
}

// Lê o clipboard e joga no editor
async function colarConfigJSON() {
    try {
        const texto = await navigator.clipboard.readText();
        // Validação básica antes de aplicar
        JSON.parse(stripComments(texto)); 
        
        editorInstance.setValue(texto);
        alert("JSON colado com sucesso! Não esqueça de Salvar.");
    } catch (e) {
        alert("O conteúdo do clipboard não é um JSON válido.");
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





function salvarNoHistorico(texto) {
    if (!texto || texto.length < 10) return;

    let historico = JSON.parse(localStorage.getItem('relatorioHistorico')) || [];
    const type = select.value;
    const dataRaw = coletar(); // Pega os valores dos inputs antes de limpar

    const novoItem = {
        id: Date.now(),
        data: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        conteudo: texto,
        tipo: type,     // Guardamos qual relatório era
        raw: dataRaw    // Guardamos os valores dos campos
    };

    historico = [novoItem, ...historico].slice(0, 10);
    localStorage.setItem('relatorioHistorico', JSON.stringify(historico));
    renderizarHistorico();
}


function restaurarParaInputs(id) {
    const historico = JSON.parse(localStorage.getItem('relatorioHistorico')) || [];
    const item = historico.find(i => Number(i.id) === Number(id));

    if (!item || !item.raw) {
        alert("Este item não possui dados de origem para restauração.");
        return;
    }

    // 1. Troca o select para o tipo correto
    select.value = item.tipo;

    // 2. Limpa o container e recria as linhas baseadas no histórico
    container.innerHTML = "";
    item.raw.forEach(rowData => {
        addRow();
        const lastRow = container.lastElementChild;
        Object.keys(rowData).forEach(fieldName => {
            const input = lastRow.querySelector(`[data-field="${fieldName}"]`);
            if (input) input.value = rowData[fieldName];
        });
    });

    build();
    closeSheet();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Centralize a chamada para evitar repetição
async function copiar() {
    const texto = build();
    if (!texto || texto.trim().length < 10) return; // Segurança contra cópia vazia

    await navigator.clipboard.writeText(texto);
    salvarNoHistorico(texto);

    alert("Copiado e salvo no histórico!");

    // Limpa o rascunho após a confirmação do usuário
    limparRascunhoAtual();
}

async function share() {
    const texto = build();
    if (!texto || texto.trim().length < 10) return;

    try {
        if (navigator.share) {
            await navigator.share({ text: texto });
            // Se chegou aqui, o compartilhamento foi bem sucedido
            salvarNoHistorico(texto);
            limparRascunhoAtual();
        } else {
            // Fallback para WhatsApp
            window.open("https://wa.me/?text=" + encodeURIComponent(texto));
            salvarNoHistorico(texto);
            // No caso de window.open, não temos certeza se ele enviou, 
            // mas como abriu a aba, geralmente limpamos.
            if (confirm("Relatório enviado? Deseja limpar os campos?")) {
                limparRascunhoAtual();
            }
        }
    } catch (err) {
        console.log("Compartilhamento cancelado ou erro:", err);
    }
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
            <button  onclick="restaurarParaInputs(${item.id})"style="background: var(--success); border: none; padding: 12px; border-radius: 14px; color: white; cursor: pointer;">Usar</button>
           
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