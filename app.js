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
        document.getElementById("ticketDays").innerText = "スキルが目標を上回っています。";
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
    document.getElementById("stubRange").innerText = `${Math.round(neededHours*0.6)}h - ${Math.round(neededHours*1.3)}h`;
    
    lastCalculatedHours = neededHours;
    lastCalculatedDaysText = formatDaysString(neededHours, dailyStudy);

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
        document.getElementById("ticketHours").innerText = `${neededHours} 時間`;
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
    currentAnimationInterval = setInterval(() => {
        current += increment;
        if (current >= targetHours) {
            clearInterval(currentAnimationInterval);
            document.getElementById("ticketHours").innerText = `${targetHours} 時間`;
            document.getElementById("ticketDays").innerText = formatDaysString(targetHours, dailyStudy);
        } else {
            document.getElementById("ticketHours").innerText = `${Math.round(current)} 時間`;
            document.getElementById("ticketDays").innerText = formatDaysString(Math.round(current), dailyStudy);
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
                <div></div>
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

function selectTargetPurpose(purpose, btn) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedTargetPurposeCode = purpose;
}

function nextCheckInStep() { checkInStep++; renderCheckInStep(); }
function prevCheckInStep() { checkInStep--; renderCheckInStep(); }

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
    const textToCopy = `✈️ 私の英語学習フライトプラン ✈️\n━━━━━━━━━━━━━━━━━\n🛫 出発地: ${currentStart.replace('_', ' × ')}\n🛬 目的地: ${currentEnd.replace('_', ' × ')}\n⏱️ 必要フライト時間: ${lastCalculatedHours} 時間\n📅 達成目標期間: ${lastCalculatedDaysText} (1日${dailyStudy}hペース)\n━━━━━━━━━━━━━━━━━\nLet's skyscan your English!\n#TheLanguageMatrix #英語学習 #LEMMA`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.querySelector('.share-btn');
        const originalText = btn.innerText;
        btn.innerText = "✅ コピー完了！";
        setTimeout(() => { btn.innerText = originalText; }, 1500);
    });
}

// 🗃️ 18個のセルすべての完全データマトリクス格納
const matrixData = {
    "A1_BICS": {
        title: "A1 × BICS (挨拶・単語の羅列)",
        vocab: "英検:3級 / TOEIC L&R:120-220 / TOEFL:0-31 / IELTS:1.0-3.0 / DET:10-55 / 語彙目安:約1,000語",
        time: "累積 125 時間",
        wpm: "Reading: 40-60 WPM / Speaking: 20-30 WPM",
        curation: "【できること】名前、出身地の極めて単純なやり取り。型通りの挨拶。\n【できないこと】相手の返答を予想して自発的にラリーを繋ぐこと。\n★明日からの最初のアクション:\n中学1年レベルの基本動詞（go, have, take）のコアイメージを音読して脳にログインさせてください。"
    },
    "A1_Bridge": {
        title: "A1 × Bridge (超初歩の実務受信)",
        vocab: "英検:3級 / TOEIC L&R:120-380 / TOEFL:10-34 / IELTS:2.0-3.5 / DET:20-55 / 語彙目安:約1,200語",
        time: "累積 150 時間",
        wpm: "Reading: 50-70 WPM / Speaking: 10-20 WPM",
        curation: "【できること】単発のシンプルな社内通知や短い数字データの読み取り。\n【できないこと】複数文にまたがるメールの文脈把握、チャットへの英語での返信。\n★明日からの最初のアクション:\n社内で使われる最も短い英文定型フォーマット（OK, Approved等）を3パターン丸暗記してください。"
    },
    "A1_CALP": {
        title: "A1 × CALP (単発の事実認識)",
        vocab: "英検:3級 / TOEIC L&R:150-200 / TOEFL:0-23 / IELTS:1.5-2.5 / DET:10-40 / 語彙目安:約1,500語",
        time: "累積 180 時間",
        wpm: "Reading: 30-50 WPM / Speaking: 計測不可",
        curation: "【できること】図表のキャプション、ラベルに書かれた単純な単語や明確な事実の視認。\n【できないこと】論理的な因果関係の理解、短いテキストの要約や推論。\n★明日からの最初のアクション:\n'Water boils at 100 degrees.'のような、もっとも単純な事実の短文を1日3つ主語と述語に分けてください。"
    },
    "A2_BICS": {
        title: "A2 × BICS (カタコト脱出・対人)",
        vocab: "英検:準2級 / TOEIC L&R:225-545 / TOEFL:32-41 / IELTS:3.5-4.5 / DET:60-80 / 語彙目安:約2,500語",
        time: "累積 187 時間",
        wpm: "Reading: 80-100 WPM / Speaking: 40-60 WPM",
        curation: "【できること】ホテルや駅でのトラブル対応、趣味や家族についての簡単な情報交換。\n【できないこと】抽象的な話題の雑談、冗談やスラングが飛び交うネイティブ同士の輪への参加。\n★明日からの最初のアクション:\n海外旅行の「困った場面」を想定し、3文構成（状況説明＋理由＋要求）の独り言をつぶやいてみてください。"
    },
    "A2_Bridge": {
        title: "A2 × Bridge (指示書通りの受動実務)",
        vocab: "英検:準2級 / TOEIC L&R:385-780 / TOEFL:35-45 / IELTS:4.0 / DET:65-80 / 語彙目安:約3,000語",
        time: "累積 400 時間",
        wpm: "Reading: 90-110 WPM / Speaking: 30-50 WPM",
        curation: "【できること】定型メールの解読、マニュアルに沿った単純データ処理、短い指示の理解。\n【できないこと】自由記述での複雑な進捗報告、突発的なクレームの電話応対。\n★明日からの最初のアクション:\n毎日届く定型の英語ビジネスメールを、返信フォームのテンプレートと照らし合わせてパターン化してください。"
    },
    "A2_CALP": {
        title: "A2 × CALP (基礎短文の読解)",
        vocab: "英検:準2級 / TOEIC L&R:400-500 / TOEFL:35-45 / IELTS:4.0 / DET:65-75 / 語彙目安:約3,500語",
        time: "累積 450 時間",
        wpm: "Reading: 70-90 WPM / Speaking: 20-40 WPM",
        curation: "【できること】子供向けの科学書など、短くシンプルに書かれた百科事典等の事実関係の把握。\n【できないこと】論文の段落同士の関係性の読み取り、筆者の主張や仮説の論理的な批判検証。\n★明日からの最初のアクション:\n子供向けの科学百科事典（Simple English Wikipedia等）の短い1段落を、主語・動詞を意識して精読してください。"
    },
    "B1_BICS": {
        title: "B1 × BICS (日常雑談の完全自立)",
        vocab: "英検:2級 / TOEIC L&R:550-780 / TOEFL:42-71 / IELTS:4.0-5.0 / DET:85-95 / 語彙目安:約5,000語",
        time: "累積 465 時間",
        wpm: "Reading: 110-130 WPM / Speaking: 70-95 WPM",
        curation: "【できること】身近な話題や時事ニュースについての標準速度での雑談、自己意見の簡単な表明。\n【できないこと】込み入った感情の機微を伝えること、会話の主導権を握って話をジャックすること。\n★明日からの最初のアクション:\nYouTubeの1分程度の海外日常Vlogを視聴し、そこで使われたフレーズを1つ自分の日常に置き換えて発話してください。"
    },
    "B1_Bridge": {
        title: "B1 × Bridge (日常ビジネスメール)",
        vocab: "英検:2級 / TOEIC L&R:790-1090 / TOEFL:55-71 / IELTS:4.5-5.0 / DET:85-100 / 語彙目安:約6,000語",
        time: "累積 800 時間",
        wpm: "Reading: 120-140 WPM / Speaking: 60-80 WPM",
        curation: "【できること】一般的な実務メールの送受信、アジェンダに沿ったミーティングでの進捗報告。\n【できないこと】ブレインストーミングでの変則的な意見への即座の反論、タフな顧客対応や値引き交渉。\n★明日からの最初のアクション:\nVOAニュースの記事を1つ選び、130 WPMのタイマーをかけて時間内に内容の7割をキャッチする速読訓練を開始してください。"
    },
    "B1_CALP": {
        title: "B1 × CALP (一般論理の受信開始)",
        vocab: "英検:2級 / TOEIC L&R:700-800 / TOEFL:42-71 / IELTS:4.0-5.0 / DET:85-95 / 語彙目安:約6,500語",
        time: "累積 900 時間",
        wpm: "Reading: 100-120 WPM / Speaking: 50-70 WPM",
        curation: "【できること】科学・歴史テーマの易しい解説（Wikipedia等）の読解、学校講義のメインアイデアの把握。\n【できないこと】学術論文の背景知識なしでの精読、自分の専門外の講義に対する論理的なカウンター質問。\n★明日からの最初のアクション:\n身近な社会問題のWikipedia記事を読み、「原因・現状・対策」の3つの要素を箇条書きで抜き出してみましょう。"
    },
    "B2_BICS": {
        title: "B2 × BICS (ネイティブとの雑談)",
        vocab: "英検:準1級 / TOEIC L&R:800-900 / TOEFL:72-94 / IELTS:5.5-6.5 / DET:100-115 / 語彙目安:約9,000語",
        time: "累積 1,000 時間",
        wpm: "Reading: 140-170 WPM / Speaking: 100-130 WPM",
        curation: "【できること】ネイティブと緊張感なしにやり取りし、文化的なジョークや皮肉のニュアンスも大枠理解できる。\n【できないこと】海外の古いTV番組や政治コンテクストが絡む、超ディープなローカルスラングの100%完全同調。\n★明日からの最初のアクション:\n海外の人気コメディドラマを英語字幕付きで観て、登場人物のセリフのテンポに被せるようにシャドーイングしてください。"
    },
    "B2_Bridge": {
        title: "B2 × Bridge (現場を回す圧倒的実務)",
        vocab: "英検:準1級 / TOEIC L&R:785-940 / TOEFL:72-94 / IELTS:5.5-6.5 / DET:105-125 / 語彙目安:約10,000語",
        time: "累積 1,350 時間",
        wpm: "Reading: 150-180 WPM / Speaking: 90-120 WPM",
        curation: "【できること】ビジネス会議でのファシリテーション、複雑な業務仕様書の理解、プレゼンと質疑応答。\n【できないこと】法的なリスクが激しく絡む、海外エリート相手の英文契約交渉における微細な言葉の駆け引き。\n★明日からの最初のアクション:\nBBCの時事ビジネス記事を1本読み、その背景にある企業の狙いを「PREP法」の論理で30秒で話す練習をしてください。"
    },
    "B2_CALP": {
        title: "B2 × CALP (教養講義・ロジックの核)",
        vocab: "英検:準1級 / TOEIC L&R:850-950 / TOEFL:72-94 / IELTS:5.5-6.5 / DET:105-125 / 語彙目安:約11,000語",
        time: "累積 1,450 時間",
        wpm: "Reading: 130-160 WPM / Speaking: 80-110 WPM",
        curation: "【できること】TED Talksの字幕なし完全理解。自分の専門分野に関する海外入門論文の読解と要約記述。\n【できないこと】査読付き学術論文のハイスピードな乱読、英語ディベートでの学術的な鋭いカウンター突っ込み。\n★明日からの最初のアクション:\n関心のあるテーマのTED Talksを1本選び、スクリプトを読み込みながら、話者のロジック展開の「繋ぎ語」をマーキングしてください。"
    },
    "C1_BICS": {
        title: "C1 × BICS (高速・即興の洗練討論)",
        vocab: "英検:1級 / TOEIC L&R:950+ / TOEFL:95-113 / IELTS:7.0-8.0 / DET:130-140 / 語彙目安:約15,000語",
        time: "累積 2,250 時間",
        wpm: "Reading: 180-220 WPM / Speaking: 130-160 WPM",
        curation: "【できること】騒がしいバー等で、複数人のネイティブが即興で行う超高速のローカル雑談に完全参入。\n【できないこと】ネイティブの幼児期のカルチャーや、地域方言が激しすぎるニッチなインサイド・トークへの完璧な同調。\n★明日からの最初のアクション:\n海外の人気ポッドキャストを1.1倍速で聴き、会話が切り替わる瞬間の相槌の入れ方をトレースしてください。"
    },
    "C1_Bridge": {
        title: "C1 × Bridge (最高級タフな国際交渉)",
        vocab: "英検:1級 / TOEIC L&R:945-990 / TOEFL:95-113 / IELTS:7.0-8.0 / DET:130-150 / 語彙目安:約16,000語",
        time: "累積 2,600 時間",
        wpm: "Reading: 190-230 WPM / Speaking: 120-150 WPM",
        curation: "【できること】国際M&A契約や高度な知財交渉。ネイティブ向けの高度なユーモアや皮肉を使った心理的関係構築。\n【できないこと】ネイティブが「教養」として嗜む古典文学や歴史的メタファーが重層的に隠された最高級文芸の完璧な解読。\n★明日からの最初のアクション:\n海外の経済小説やタフな交渉ドキュメンタリーを読み、相手の要求の裏にある「本音」を匂わせる表現を分析してください。"
    },
    "C1_CALP": {
        title: "C1 × CALP (知性を研ぐエリート学術)",
        vocab: "英検:1級 / TOEIC L&R:960+ / TOEFL:95-113 / IELTS:7.0-8.0 / DET:130-150 / 語彙目安:約17,000語",
        time: "累積 2,800 時間",
        wpm: "Reading: 170-210 WPM / Speaking: 110-140 WPM",
        curation: "【できること】『The Economist』や『Nature』誌などの論文を辞書なしで精読。海外大学院ディスカッションの完全完遂。\n【できないこと】未知の学術分野における、その道10年のトップ専門家レベルの超高難度な新理論構築。\n★明日からの最初のアクション:\n『The Economist』の最新論説を1本読み、著者の論理構造の欠陥（あるいは反論の余地）を英語で200語のエッセイに書き出してください。"
    },
    "C2_BICS": {
        title: "C2 × BICS (文化・言葉の完全越境)",
        vocab: "英検:1級満点圏 / 各種試験:最高値 / DET:150-160 / 語彙目安:約20,000語",
        time: "累積 4,750 時間",
        wpm: "Reading: 240+ WPM / Speaking: 150-180 WPM",
        curation: "【できること】政治演説、演劇、古典小説、映画のセリフなどを文化的背景も含めて100%理解。言葉遣いの格の自在な変化。\n【できないこと】ほぼなし（ネイティブの知識人層と同等）。\n★明日からの最初のアクション:\n海外の名作文学や歴史的演説をオーディオブックで聴き、言葉の持つ「リズム」と「思想」を完全に身体へ同期させてください。"
    },
    "C2_Bridge": {
        title: "C2 × Bridge (全方位支配のトップ交渉)",
        vocab: "TOEIC L&R:満点圏 / 各種換算:上限値 / DET:155-160 / 語彙目安:約22,000語",
        time: "累積 5,000 時間",
        wpm: "Reading: 250+ WPM / Speaking: 140-170 WPM",
        curation: "【できること】あらゆる国際ビジネス文書の即時処理、企業の最高戦略決定会議での英語によるトップ交渉や宣言。\n【できないこと】なし。\n★明日からの最初のアクション:\nグローバル企業の決算発表の質疑応答の音声を聴き、経営陣が放つ「市場をコントロールするための極限の表現」をシャドーイングしてください。"
    },
    "C2_CALP": {
        title: "C2 × CALP (最高峰の思想・人類の知性)",
        vocab: "TOEFL iBT:114-120 / IELTS:8.5-9.0 / DET:155-160 / 語彙目安:約25,000語",
        time: "累積 5,500 時間",
        wpm: "Reading: 220+ WPM / Speaking: 130-160 WPM",
        curation: "【できること】国際学会での基調講演、査読付き最高峰論文の単独執筆、超難解なグローバル政策・法案文書の立案。\n【できないこと】なし。\n★明日からの最初のアクション:\n自分の研究あるいは専門領域の最先端の査読付き論文を読み、それに対する補足仮説のプロトタイプを英語で1,000語ビルドしてください。"
    }
};

window.onload = function() {
    openCheckInModal();
};
