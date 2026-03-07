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

            { "name": "LOTS", "type": "number", "pad": 2, "placeholder": "01" },
            {
                "name": "WEIGHT",
                "label": "Peso (kg)",
                "type": "weight",
                "decimals": 3,
                "locale": "BR",
                "placeholder": "0,000"
            }
        ],
        "templateHeader": "📌 Report - {DATE}\n\n",
        "templateLine": "🔹 Code {COD} - Lots: {LOTS}\nWeight: {WEIGHT}\n",
        "templateTotal": "📊 TOTAL: {TOTAL}",
        "sumField": "LOTS"
    },
    "2": {
        "name": "Resumo",
        "fields": [
            { "name": "NAME", label: "NOME", "type": "text" },
            { "name": "QTD", "type": "number", "pad": 2 }
        ],
        "templateHeader": "Resumo do dia {DATE}\n\n",
        "templateLine": "{QTD} {NAME}\n",
        "templateTotal": "📊 TOTAL: {TOTAL}",
        "sumField": "QTD"
    }

};

// 2. Carregamento da Configuração (LocalStorage ou Default)
let currentConfig = JSON.parse(localStorage.getItem('relatorioConfig')) || defaultConfig;

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
    select.onchange = renderInputs;
    renderInputs();
    renderizarHistorico();
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

        text += "\n" + renderTemplate(conf.templateTotal, { TOTAL: totalFormatted });
    }

    preview.innerText = text;
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
    return template.replace(/\{(.*?)\}/g, (_, key) => data[key] || "");
}

// 8. Configurações e Persistência
// Função para abrir/fechar o editor
function toggleEditor() {
    const isVisible = editorDiv.style.display === "block";
    editorDiv.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
        jsonEditor.value = JSON.stringify(currentConfig, null, 4);
        // Rola a tela para o editor aparecer totalmente
        setTimeout(() => editorDiv.scrollIntoView({ behavior: 'smooth' }), 100);
    }
}

// Atribui ao botão da engrenagem
btnConfig.onclick = toggleEditor;

function saveSettings() {
    try {
        const newConfig = JSON.parse(jsonEditor.value);

        // Chama a validação antes de salvar
        validateTemplates(newConfig);
        if (document.getElementById("errorLog").innerText !== "") return;

        localStorage.setItem('relatorioConfig', JSON.stringify(newConfig));
        alert("Configurações salvas!");
        location.reload();
    } catch (e) {
        document.getElementById("errorLog").innerText = "Erro no JSON: Verifique vírgulas ou chaves faltantes.";
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
    if (navigator.share) navigator.share({ text: texto });
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