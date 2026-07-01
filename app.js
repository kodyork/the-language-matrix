const levelsOrder = [
    "A1_BICS", "A1_Bridge", "A1_CALP",
    "A2_BICS", "A2_Bridge", "A2_CALP",
    "B1_BICS", "B1_Bridge", "B1_CALP",
    "B2_BICS", "B2_Bridge", "B2_CALP",
    "C1_BICS", "C1_Bridge", "C1_CALP",
    "C2_BICS", "C2_Bridge", "C2_CALP"
];

const cumulativeHours = {
    "A1_BICS": 125,  "A1_Bridge": 150,  "A1_CALP": 180,
    "A2_BICS": 187,  "A2_Bridge": 400,  "A2_CALP": 450,
    "B1_BICS": 465,  "B1_Bridge": 800,  "B1_CALP": 900,
    "B2_BICS": 1000, "B2_Bridge": 1350, "B2_CALP": 1450,
    "C1_BICS": 2250, "C1_Bridge": 2600, "C1_CALP": 2800,
    "C2_BICS": 4750, "C2_Bridge": 5000, "C2_CALP": 5500
};

let currentStart = "A2_BICS";
let currentEnd = "B2_Bridge";
let clickToggle = false;
let currentAnimationInterval = null;
let lastCalculatedHours = 0;
let lastCalculatedDaysText = "";

let checkInStep = 1;
let selectedStartFromScore = "A1_BICS";
let selectedTargetPurposeCode = "Bridge";

// 🔄 初期表示モードの管理用
let currentCellDisplayMode = "time";

function formatDaysString(hours, dailyStudy) {
    const days = Math.round(hours / dailyStudy);
    if (days < 30) return `${days}日`;
    if (days < 365) return `${days}日 (約 ${(days / 30.4).toFixed(1)}ヶ月)`;
    return `${days}日 (約 ${(days / 365).toFixed(1)}年)`;
}

function createRipple(event, element) {
    const circle = document.createElement("span");
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;
    const rect = element.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    const prevRipple = element.querySelector(".ripple");
    if (prevRipple) prevRipple.remove();

    element.appendChild(circle);
}

function handleCellClick(levelId, event) {
    createRipple(event, document.getElementById(`cell-${levelId.split('_')[0]}-${levelId.split('_')[1]}`));
    
    if (!clickToggle) {
        currentStart = levelId;
        document.getElementById("startLoc").value = levelId;
        clickToggle = true;
    } else {
        currentEnd = levelId;
        document.getElementById("endLoc").value = levelId;
        clickToggle = false;
    }
    calculateRoute();
}

function handleSelectChange() {
    currentStart = document.getElementById("startLoc").value;
    currentEnd = document.getElementById("endLoc").value;
    calculateRoute();
}

function updateHoursPerDay() {
    const val = document.getElementById("hoursPerDay").value;
    document.getElementById("hoursDisplay").innerText = parseFloat(val).toFixed(1);
    calculateRoute(true);
}

// 🔄 【新機能】18マスの補足情報を一瞬で切り替える制御ハブ
function switchCellDisplayMode(mode, btnElement) {
    currentCellDisplayMode = mode;
    
    // スイッチボタンのアクティブクラス切り替え
    document.querySelectorAll('.toggle-switch-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // 18個のセルすべてをループして、メタ情報を書き換える
    levelsOrder.forEach(levelId => {
        const parts = levelId.split('_');
        const cell = document.getElementById(`cell-${parts[0]}-${parts[1]}`);
        if (!cell) return;

        const metaDiv = cell.querySelector('.cell-meta');
        if (!metaDiv) return;

        // アニメーション効果を適用
        metaDiv.classList.remove('meta-fade');
        void metaDiv.offsetWidth; // リフロー
        metaDiv.classList.add('meta-fade');

        // モードに応じた専用簡易テキストをセット
        const data = matrixData[levelId];
        if (mode === 'time') {
            metaDiv.innerText = `${data.shortDisplay.time} / ${data.shortDisplay.vocab}`;
        } else if (mode === 'japan') {
            metaDiv.innerText = data.shortDisplay.japan;
        } else if (mode === 'global') {
            metaDiv.innerText = data.shortDisplay.global;
        }
    });
}

function calculateRoute(isSliderMove = false) {
    const dailyStudy = parseFloat(document.getElementById("hoursPerDay").value);
    const startParts = currentStart.split('_');
    const endParts = currentEnd.split('_');

    document.getElementById("ticketStartCode").innerText = startParts[0];
    document.getElementById("ticketStartName").innerText = startParts[1];
    document.getElementById("ticketEndCode").innerText = endParts[0];
    document.getElementById("ticketEndName").innerText = endParts[1];
    
    document.getElementById("stubStart").innerText = currentStart;
    document.getElementById("stubEnd").innerText = currentEnd;

    document.querySelectorAll('.matrix-cell').forEach(cell => {
        cell.classList.remove('highlight-start', 'highlight-end', 'highlight-both');
    });
    const startCell = document.getElementById(`cell-${startParts[0]}-${startParts[1]}`);
    const endCell = document.getElementById(`cell-${endParts[0]}-${endParts[1]}`);

    const startIndex = levelsOrder.indexOf(currentStart);
    const endIndex = levelsOrder.indexOf(currentEnd);
    const plane = document.getElementById("ticketPlane");

    if (currentStart === currentEnd) {
        if (startCell) startCell.classList.add('highlight-both');
        document.getElementById("ticketHours").innerText = "到着済み ✈️";
        document.getElementById("ticketDays").innerText = "目的地にいます。";
        document.getElementById("stubRange").innerText = "SAME LOC";
        document.getElementById("flightType").innerText = "STAY";
        if(plane) plane.style.left = "50%";
        generateTimeline([], dailyStudy);
        return;
    }

    if (startIndex > endIndex) {
        if (startCell) startCell.classList.add('highlight-start');
        if (endCell) endCell.classList.add('highlight-end');
        document.getElementById("ticketHours").innerText = "別ルート航路 ↩️";
        document.getElementById("ticketDays").innerText = "目標レベルを上回っています。";
        document.getElementById("stubRange").innerText = "REVERSE";
        document.getElementById("flightType").innerText = "REVERSE";
        if(plane) plane.style.left = "0%";
        generateTimeline([], dailyStudy);
        return;
    }

    if (startCell) startCell.classList.add('highlight-start');
    if (endCell) endCell.classList.add('highlight-end');
    document.getElementById("flightType").innerText = "DIRECT ROUTE";

    const neededHours = cumulativeHours[currentEnd] - cumulativeHours[currentStart];
    
    const minHours = Math.max(0, Math.round(neededHours * 0.6));
    const maxHours = Math.round(neededHours * 1.3);
    
    document.getElementById("stubRange").innerText = `±35% RANGE`;
    lastCalculatedHours = neededHours;
    
    const minDaysText = formatDaysString(minHours, dailyStudy);
    const maxDaysText = formatDaysString(maxHours, dailyStudy);
    lastCalculatedDaysText = `${minDaysText} 〜 ${maxDaysText}`;

    const ticket = document.getElementById("mainTicket");
    ticket.classList.remove("ticket-issue");
    void ticket.offsetWidth;
    ticket.classList.add("ticket-issue");

    if (plane) {
        plane.style.left = "0%";
        setTimeout(() => {
            const totalPathLength = levelsOrder.length;
            const progress = (endIndex / (totalPathLength - 1)) * 100;
            plane.style.left = `${Math.min(progress, 95)}%`;
        }, 50);
    }

    if (isSliderMove) {
        document.getElementById("ticketHours").innerText = `${minHours}h 〜 ${maxHours}h`;
        document.getElementById("ticketDays").innerText = lastCalculatedDaysText;
    } else {
        animateHours(neededHours, dailyStudy);
    }

    const pathLevels = levelsOrder.slice(startIndex + 1, endIndex + 1);
    generateTimeline(pathLevels, dailyStudy);
}

function animateHours(targetHours, dailyStudy) {
    clearInterval(currentAnimationInterval);
    let current = 0;
    const steps = 20;
    const increment = targetHours / steps;
    
    const minTarget = Math.max(0, Math.round(targetHours * 0.6));
    const maxTarget = Math.round(targetHours * 1.3);

    currentAnimationInterval = setInterval(() => {
        current += increment;
        if (current >= targetHours) {
            clearInterval(currentAnimationInterval);
            document.getElementById("ticketHours").innerText = `${minTarget}h 〜 ${maxTarget}h`;
            document.getElementById("ticketDays").innerText = lastCalculatedDaysText;
        } else {
            const currentMin = Math.max(0, Math.round(current * 0.6));
            const currentMax = Math.round(current * 1.3);
            document.getElementById("ticketHours").innerText = `${currentMin}h 〜 ${currentMax}h`;
            document.getElementById("ticketDays").innerText = `Calculating...`;
        }
    }, 15);
}

function generateTimeline(pathLevels, dailyStudy) {
    const container = document.getElementById("timelineContainer");
    container.innerHTML = "";
    if (pathLevels.length === 0) {
        document.getElementById("milestonePanel").style.display = "none";
        return;
    }
    document.getElementById("milestonePanel").style.display = "block";
    createTimelineItem(container, currentStart, "出発", true);

    const maxVisible = 5;
    let step = 1;
    if (pathLevels.length > maxVisible) {
        step = Math.ceil(pathLevels.length / maxVisible);
    }

    for(let i=0; i<pathLevels.length; i+=step) {
        const level = pathLevels[i];
        const isTarget = (level === currentEnd || i + step >= pathLevels.length);
        const finalLevel = isTarget ? currentEnd : level;
        const finalHours = cumulativeHours[finalLevel] - cumulativeHours[currentStart];
        createTimelineItem(container, finalLevel, formatDaysString(finalHours, dailyStudy), false, isTarget);
        if(isTarget) break;
    }
}

function createTimelineItem(container, levelId, timeText, isStart = false, isTarget = false) {
    const item = document.createElement("div");
    item.className = "timeline-item";
    if (isStart) item.classList.add("passed");
    if (isTarget) item.classList.add("active");
    item.innerHTML = `
        <div class="timeline-badge">${isStart ? '✈️' : isTarget ? '🏁' : '⚓'}</div>
        <div class="timeline-name">${levelId.replace('_', ' ')}</div>
        <div class="timeline-time">${timeText}</div>
    `;
    container.appendChild(item);
}

// 📋 搭乗手続き（問診オンボーディング）
function openCheckInModal() {
    checkInStep = 1;
    renderCheckInStep();
    document.getElementById('modalOverlay').classList.add('active');
}

function renderCheckInStep() {
    const body = document.getElementById('modalDynamicBody');
    if (checkInStep === 1) {
        body.innerHTML = `
            <div class="modal-title">🛫 Flight Check-in (搭乗手続き - 1/2)</div>
            <label class="question-label">現在のあなたの英語資格、または最も近いスコアを選択してください。</label>
            <div class="option-grid" style="grid-template-columns: repeat(2, 1fr);">
                <button class="option-btn" onclick="selectScoreType('none', this)">資格なし・初学者</button>
                <button class="option-btn" onclick="selectScoreType('toeic', this)">TOEIC L&R</button>
                <button class="option-btn" onclick="selectScoreType('eiken', this)">英検</button>
                <button class="option-btn" onclick="selectScoreType('toefl', this)">TOEFL iBT</button>
                <button class="option-btn" onclick="selectScoreType('ielts', this)">IELTS</button>
                <button class="option-btn" onclick="selectScoreType('det', this)">DET (Duolingo)</button>
            </div>
            <div id="scoreInputArea" style="margin-top:15px;"></div>
            <div class="modal-footer">
                <button class="nav-btn text-link-btn" onclick="skipCheckIn()" style="background:none; color:var(--text-muted); font-weight:normal; text-decoration:underline; border:none; padding:0;">問診をスキップして使う</button>
                <button class="nav-btn primary" id="checkinNextBtn" onclick="nextCheckInStep()">次へ進む ➔</button>
            </div>
        `;
        selectScoreType('none', document.querySelector('.option-btn'));
    } else if (checkInStep === 2) {
        body.innerHTML = `
            <div class="modal-title">🛬 Flight Check-in (目的地の設定 - 2/2)</div>
            <label class="question-label">今回の英語学習フライトの「最も重要な目的」は何ですか？</label>
            <div class="option-grid">
                <button class="option-btn" onclick="selectTargetPurpose('BICS', this)">🌴 旅行・日常会話をマスターしたい (BICS)</button>
                <button class="option-btn" onclick="selectTargetPurpose('Bridge', this)">💼 実務・海外出張・ビジネスを回したい (Bridge)</button>
                <button class="option-btn" onclick="selectTargetPurpose('CALP', this)">🎓 論文・教養・留学・学術的な議論をしたい (CALP)</button>
            </div>
            <div class="modal-footer">
                <button class="nav-btn" onclick="prevCheckInStep()">↩️ 戻る</button>
                <button class="nav-btn primary" onclick="finishCheckIn()">フライトプランを発券する 🎫</button>
            </div>
        `;
    }
}

function skipCheckIn() {
    currentStart = "A2_BICS";
    currentEnd = "B2_Bridge";
    document.getElementById("startLoc").value = currentStart;
    document.getElementById("endLoc").value = currentEnd;
    closeModal();
    calculateRoute();
}

function selectScoreType(type, btn) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const inputArea = document.getElementById('scoreInputArea');
    
    if (type === 'none') {
        inputArea.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">スタート地点：A1 × BICS (挨拶レイイヤー) から出発します。</p>`;
        selectedStartFromScore = "A1_BICS";
    } else if (type === 'toeic') {
        inputArea.innerHTML = `
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">TOEIC L&R スコアを入力 (10〜990):</label>
            <input type="number" class="score-input" id="calcInputScore" min="10" max="990" value="400" oninput="calculateCefrFromScore('toeic')">
            <p id="calcPreview" style="font-size:0.85rem; color:var(--accent-bics); margin-top:5px;"></p>
        `;
        calculateCefrFromScore('toeic');
    } else if (type === 'eiken') {
        inputArea.innerHTML = `
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">取得級を選択:</label>
            <select class="search-select" id="calcInputScore" onchange="calculateCefrFromScore('eiken')">
                <option value="5">5級 / 4級</option>
                <option value="3">3級</option>
                <option value="22">準2級</option>
                <option value="2">2級</option>
                <option value="11">準1級</option>
                <option value="1">1級</option>
            </select>
            <p id="calcPreview" style="font-size:0.85rem; color:var(--accent-bics); margin-top:5px;"></p>
        `;
        calculateCefrFromScore('eiken');
    } else if (type === 'toefl') {
        inputArea.innerHTML = `
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">TOEFL iBT スコアを入力 (0〜120):</label>
            <input type="number" class="score-input" id="calcInputScore" min="0" max="120" value="45" oninput="calculateCefrFromScore('toefl')">
            <p id="calcPreview" style="font-size:0.85rem; color:var(--accent-bics); margin-top:5px;"></p>
        `;
        calculateCefrFromScore('toefl');
    } else if (type === 'ielts') {
        inputArea.innerHTML = `
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">IELTS バンドスコア (1.0〜9.0):</label>
            <input type="number" class="score-input" id="calcInputScore" min="1.0" max="9.0" step="0.5" value="4.5" oninput="calculateCefrFromScore('ielts')">
            <p id="calcPreview" style="font-size:0.85rem; color:var(--accent-bics); margin-top:5px;"></p>
        `;
        calculateCefrFromScore('ielts');
    } else if (type === 'det') {
        inputArea.innerHTML = `
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">DET スコアを入力 (10〜160):</label>
            <input type="number" class="score-input" id="calcInputScore" min="10" max="160" step="5" value="70" oninput="calculateCefrFromScore('det')">
            <p id="calcPreview" style="font-size:0.85rem; color:var(--accent-bics); margin-top:5px;"></p>
        `;
        calculateCefrFromScore('det');
    }
}

function calculateCefrFromScore(type) {
    const val = parseFloat(document.getElementById('calcInputScore').value);
    let cefr = "A1_BICS";
    
    if (type === 'toeic') {
        if (val >= 945) cefr = "C1_Bridge";
        else if (val >= 785) cefr = "B2_Bridge";
        else if (val >= 550) cefr = "B1_Bridge";
        else if (val >= 225) cefr = "A2_Bridge";
        else cefr = "A1_Bridge";
    } else if (type === 'eiken') {
        if (val === 1) cefr = "C1_BICS";
        else if (val === 11) cefr = "B2_BICS";
        else if (val === 2) cefr = "B1_BICS";
        else if (val === 22) cefr = "A2_BICS";
        else cefr = "A1_BICS";
    } else if (type === 'toefl') {
        if (val >= 114) cefr = "C2_CALP";
        else if (val >= 95) cefr = "C1_CALP";
        else if (val >= 72) cefr = "B2_CALP";
        else if (val >= 42) cefr = "B1_CALP";
        else if (val >= 32) cefr = "A2_CALP";
        else cefr = "A1_CALP";
    } else if (type === 'ielts') {
        if (val >= 8.5) cefr = "C2_CALP";
        else if (val >= 7.0) cefr = "C1_CALP";
        else if (val >= 5.5) cefr = "B2_CALP";
        else if (val >= 4.0) cefr = "B1_CALP";
        else if (val >= 3.5) cefr = "A2_CALP";
        else cefr = "A1_CALP";
    } else if (type === 'det') {
        if (val >= 155) cefr = "C2_BICS";
        else if (val >= 130) cefr = "C1_BICS";
        else if (val >= 100) cefr = "B2_BICS";
        else if (val >= 85) cefr = "B1_BICS";
        else if (val >= 60) cefr = "A2_BICS";
        else cefr = "A1_BICS";
    }
    
    selectedStartFromScore = cefr;
    document.getElementById('calcPreview').innerText = `判定現在地 🛫: ${cefr.replace('_', ' × ')}`;
}

function finishCheckIn() {
    currentStart = selectedStartFromScore;
    currentEnd = `B2_${selectedTargetPurposeCode}`;
    document.getElementById("startLoc").value = currentStart;
    document.getElementById("endLoc").value = currentEnd;
    closeModal();
    calculateRoute();
}

function handleInfoClick(levelId, event) {
    event.stopPropagation();
    const parts = levelId.split('_');
    const data = matrixData[levelId];
    if (!data) return;

    const body = document.getElementById('modalDynamicBody');
    body.innerHTML = `
        <div class="modal-title" id="modalTitle"><span class="tag tag-${parts[1].toLowerCase()}">${parts[1]}</span> ${data.title}</div>
        <div class="modal-tabs">
            <button class="modal-tab active" onclick="switchModalTab('tab-scores', this)">📊 スコア・語彙</button>
            <button class="modal-tab" onclick="switchModalTab('tab-curation', this)">💡 運用イメージ</button>
            <button class="modal-tab" onclick="switchModalTab('tab-action', this)">🚀 明日からの行動</button>
        </div>
        <div class="tab-body">
            <div id="tab-scores" class="tab-content active">
                <div class="modal-section" style="border-left-color: #58a6ff;">
                    <h4>資格試験・語彙力の目安</h4>
                    <p style="font-size:0.85rem; color:var(--accent-bics); line-height:1.6;">${data.vocab}</p>
                </div>
                <div class="modal-section" style="border-left-color: #38bdf8;">
                    <h4>処理速度・WPM指標</h4>
                    <p>${data.wpm}</p>
                </div>
                <div class="modal-section" style="border-left-color: #d29922;">
                    <h4>Zeroからの累積必要学習時間目安</h4>
                    <p>${data.time}</p>
                </div>
            </div>
            <div id="tab-curation" class="tab-content">
                <div class="modal-section" style="border-left-color: #bc8cff;">
                    <h4>対応可能 / できること</h4>
                    <p>${data.curation.match(/【できること】([\s\S]*?)【できないこと】/)[1].trim()}</p>
                </div>
                <div class="modal-section" style="border-left-color: #eb5757;">
                    <h4>限界 / できないこと</h4>
                    <p>${data.curation.match(/【できないこと】([\s\S]*?)★/)[1].trim()}</p>
                </div>
            </div>
            <div id="tab-action" class="tab-content">
                <div class="modal-section" style="border-left-color: #10b981;">
                    <h4>次の一歩 (アクションプラン)</h4>
                    <p style="color:#fff; font-weight:600;">${data.curation.match(/★明日からの最初のアクション:([\s\S]*)$/)[1].trim()}</p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
}

function switchModalTab(tabId, btn) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function copyFlightPlan() {
    if (currentStart === currentEnd) { alert("出発地と目的地が同じ航路です。"); return; }
    const dailyStudy = document.getElementById("hoursPerDay").value;
    const minTarget = Math.max(0, Math.round(lastCalculatedHours * 0.6));
    const maxTarget = Math.round(lastCalculatedHours * 1.3);

    const textToCopy = `✈️ 私の英語学習フライトプラン ✈️\n━━━━━━━━━━━━━━━━━\n🛫 出発地: ${currentStart.replace('_', ' × ')}\n🛬 目的地: ${currentEnd.replace('_', ' × ')}\n⏱️ 必要フライト時間: ${minTarget}h 〜 ${maxTarget}h\n📅 達成目標期間: ${lastCalculatedDaysText} (1日${dailyStudy}hペース)\n━━━━━━━━━━━━━━━━━\nLet's skyscan your English!\n#TheLanguageMatrix #英語学習 #LEMMA`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.querySelector('.share-btn');
        const originalText = btn.innerText;
        btn.innerText = "✅ コピー完了！";
        setTimeout(() => { btn.innerText = originalText; }, 1500);
    });
}

// 🗃️ 18マスの切り替え用ショート表示データ（shortDisplay）を追加した完全データベース
const matrixData = {
    "A1_BICS": {
        title: "A1 × BICS (挨拶・単語の羅列)",
        vocab: "英検:3級 / TOEIC L&R:120-220 / TOEFL:0-31 / IELTS:1.0-3.0 / DET:10-55 / 語彙目安:約1,000語",
        time: "累積 125 時間",
        wpm: "Reading: 40-60 WPM / Speaking: 20-30 WPM",
        shortDisplay: { time: "累積 125h", vocab: "語彙 1.0k語", japan: "英検3級 / TOEIC 120〜", global: "TOEFL 0〜 / IELTS 1.0 / DET 10" },
        curation: "【できること】名前、出身地の極めて単純なやり取り。型通りの挨拶。\n【できないこと】相手の返答を予想して自発的にラリーを繋ぐこと。\n★明日からの最初のアクション:\n中学1年レベルの基本動詞（go, have, take）のコアイメージを音読して脳にログインさせてください。"
    },
    "A1_Bridge": {
        title: "A1 × Bridge (超初歩の実務受信)",
        vocab: "英検:3級 / TOEIC L&R:120-380 / TOEFL:10-34 / IELTS:2.0-3.5 / DET:20-55 / 語彙目安:約1,200語",
        time: "累積 150 時間",
        wpm: "Reading: 50-70 WPM / Speaking: 10-20 WPM",
        shortDisplay: { time: "累積 150h", vocab: "語彙 1.2k語", japan: "英検3級 / TOEIC 120〜", global: "TOEFL 10〜 / IELTS 2.0 / DET 20" },
        curation: "【できること】単発のシンプルな社内通知や短い数字データの読み取り。\n【できないこと】複数文にまたがるメールの文脈把握、チャットへの英語での返信。\n★明日からの最初のアクション:\n社内で使われる最も短い英文定型フォーマット（OK, Approved等）を3パターン丸暗記してください。"
