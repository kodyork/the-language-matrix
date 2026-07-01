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

// マスクリック時の波紋(Ripple)アニメーション生成
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

// 📋 必要学習時間の計算 ＆ インタラクション駆動
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

    // チケット発券時のバウンドエフェクト
    const ticket = document.getElementById("mainTicket");
    ticket.classList.remove("ticket-issue");
    void ticket.offsetWidth;
    ticket.classList.add("ticket-issue");

    // ✈️ 飛行機がスムーズに目的地に向かうアニメーション
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
                <button class="option-btn" onclick="selectScoreType('toeic', this)">TOEIC LR</button>
                <button class="option-btn" onclick="selectScoreType('eiken', this)">英検</button>
                <button class="option-btn" onclick="selectScoreType('ielts', this)">IELTS</button>
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
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">TOEICスコアを入力 (10〜990):</label>
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
    } else if (type === 'ielts') {
        inputArea.innerHTML = `
            <label style="font-size:0.8rem; color:#9ca3af; display:block; margin-bottom:5px;">IELTS バンドスコア (1.0〜9.0):</label>
            <input type="number" class="score-input" id="calcInputScore" min="1.0" max="9.0" step="0.5" value="4.5" oninput="calculateCefrFromScore('ielts')">
            <p id="calcPreview" style="font-size:0.85rem; color:var(--accent-bics); margin-top:5px;"></p>
        `;
        calculateCefrFromScore('ielts');
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
    } else if (type === 'ielts') {
        if (val >= 7.0) cefr = "C1_CALP";
        else if (val >= 5.5) cefr = "B2_CALP";
        else if (val >= 4.0) cefr = "B1_CALP";
        else cefr = "A2_CALP";
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

// ⓘ詳細モーダルの展開システム
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
                    <h4>各種試験・語彙力の公式目安</h4>
                    <p style="font-size:0.85rem; color:var(--accent-bics); line-height:1.6;">${data.vocab}</p>
                </div>
                <div class="modal-section" style="border-left-color: #38bdf8;">
                    <h4>処理速度・WPM指標</h4>
                    <p>${data.wpm}</p>
                </div>
                <div class="modal-section" style="border-left-color: #d29922;">
                    <h4>累計必要学習時間目安</h4>
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

const matrixData = {
    "A1_BICS": { title: "A1 × BICS (挨拶・単語の羅列)", vocab: "英検:3級 / TOEIC:120〜 / 語彙:約1,000語", time: "平均125時間", wpm: "Reading: 40-60 WPM / Speaking: 20-30 WPM", curation: "【できること】名前、出身地の単純なやり取り。\n【できないこと】相手の返答を予想してラリーを繋ぐこと。\n★明日からの最初のアクション:\n中学1年レベルの基本動詞（go, have, take）のコアイメージを掴みましょう。" },
    "A1_Bridge": { title: "A1 × Bridge (超初歩の実務受信)", vocab: "TOEIC LR:120〜380 / 語彙:約1,200語", time: "平均150時間", wpm: "Reading: 50-70 WPM", curation: "【できること】単発のシンプルな社内通知のデータ読み取り。\n【できないこと】複数文メールの文脈把握、チャット返信。\n★明日からの最初のアクション:\n社内で使われる最も短い英文定型フォーマット（OK, Approved等）を覚える。" },
    "A1_CALP": { title: "A1 × CALP (単発の事実認識)", vocab: "限定的リテラシー / 語彙:約1,500語", time: "平均180時間", wpm: "Reading: 30-50 WPM", curation: "【できること】図表のキャプションに書かれた明確な事実の視認。\n【できないこと】論理的な因果関係の理解、テキストの要約。\n★明日からの最初のアクション:\n単純な事実の短文（Water boils at 100 degrees）を主語と述語に分ける。" },
    "A2_BICS": { title: "A2 × BICS (カタコト脱出・対人)", vocab: "英検:準2級 / IELTS:3.5 / 語彙:約2,500語", time: "平均187時間", wpm: "Reading: 80-100 WPM / Speaking: 40-60 WPM", curation: "【できること】ホテルでのトラブル対応、身近な情報交換。\n【できないこと】抽象的な話題の雑談、ネイティブ同士の高速な会話への参加。\n★明日からの最初のアクション:\n困った場面を想定し、3文構成（状況＋理由＋要求）の独り言を呟く。" },
    "A2_Bridge": { title: "A2 × Bridge (指示書通りの受動実務)", vocab: "TOEIC LR:385〜780 / 語彙:約3,000語", time: "平均400時間", wpm: "Reading: 90-110 WPM", curation: "【できること】定型メールの解読、マニュアルに沿った単純データ処理。\n【できないこと】自由記述での複雑な進捗報告、突発的なクレーム応対。\n★明日からの最初のアクション:\n毎日届く定型のビジネスメールをフォルダ分けしてパターン化する。" },
    "A2_CALP": { title: "A2 × CALP (基礎短文の読解)", vocab: "中学理科・社会教科書水準 / 語彙:約3,500語", time: "平均450時間", wpm: "Reading: 70-90 WPM", curation: "【できること】短くシンプルに書かれた百科事典の事実関係の把握。\n【できないこと】論文の段落同士の論理的な因果関係の読み取り。\n★明日からの最初のアクション:\nSimple English Wikipediaの短い1段落を、構造を意識して精読する。" },
    "B1_BICS": { title: "B1 × BICS (日常雑談の完全自立)", vocab: "英検:2級 / IELTS:4.5 / 語彙:約5,000語", time: "平均465時間", wpm: "Reading: 110-130 WPM / Speaking: 70-95 WPM", curation: "【できること】身近な話題についての標準速度での雑談、自己意見の表明。\n【できないこと】込み入った感情の機微を伝えること、会話の主導権を握ること。\n★明日からの最初のアクション:\n海外の日常Vlogを観て、使われた相槌をそのまま1つ真記して発話する。" },
    "B1_Bridge": { title: "B1 × Bridge (日常ビジネスメール)", vocab: "TOEIC LR:550〜780 / 語彙:約6,000語", time: "平均800時間", wpm: "Reading: 120-140 WPM / Speaking: 60-80 WPM", curation: "【できること】一般的な実務メールの送受信、ミーティングでの進捗報告。\n【できないこと】ブレストでの変則的な意見への即座の反論、顧客との値引き交渉。\n★明日からの最初のアクション:\nビジネスニュースを130WPMの目標速度を設定して速読訓練を行う。" },
    "B1_CALP": { title: "B1 × CALP (一般論理の受信開始)", vocab: "TOEFL:42〜 / IELTS:4.0 / 語彙:約6,500語", time: "平均900時間", wpm: "Reading: 100-120 WPM", curation: "【できること】科学・歴史テーマの易しい解説記事の読解、講義メインアイデアの把握。\n【できないこと】学術論文の背景知識なしでの精読、論理的なカウンター質問。\n★明日からの最初のアクション:\n社会問題のニュースを読み、「原因・現状・対策」を箇条書きで抜き出す。" },
    "B2_BICS": { title: "B2 × BICS (ネイティブとの雑談)", vocab: "英検:準1級 / 語彙:約9,000語", time: "平均1000時間", wpm: "Reading: 140-170 WPM / Speaking: 100-130 WPM", curation: "【できること】ネイティブと緊張感なくやり取りし、ジョークや皮肉のニュアンスも大枠理解できる。\n【できないこと】政治コンテクストや超ディープなローカルスラングへの完全な同調。\n★明日からの最初のアクション:\n海外ドラマを英語字幕で観て、役者のテンポのままシャドーイングする。" },
    "B2_Bridge": { title: "B2 × Bridge (現場を回す圧倒的実務)", vocab: "TOEIC LR:785〜 / 語彙:約10,000語", time: "平均1350時間", wpm: "Reading: 150-180 WPM / Speaking: 90-120 WPM", curation: "【できること】ビジネス会議でのファシリテーション、複雑な仕様書の理解、プレゼン完遂。\n【できないこと】法的なリスクが激しく絡む、タフな契約交渉における微細な言葉の駆け引き。\n★明日からの最初のアクション:\nBBCビジネス記事を読み、企業の狙いを「PREP法」の論理で30秒で話す訓練。" },
    "B2_CALP": { title: "B2 × CALP (教養講義・ロジックの核)", vocab: "TOEFL:72〜 / IELTS:5.5 / 語彙:約11,000語", time: "平均1450時間", wpm: "Reading: 130-160 WPM / Speaking: 80-110 WPM", curation: "【できること】TED Talksの字幕なし理解。自分の専門分野に関する論文の読解と要約。\n【できないこと】査読付き論文のハイスピードな乱読、ディベートでの鋭いカウンター突っ込み。\n★明日からの最初のアクション:\nTED Talksを1本選び、スクリプトの「論理の繋ぎ語（However等）」をマーキングする。" },
    "C1_BICS": { title: "C1 × BICS (高速・即興の洗練討論)", vocab: "英検:1級 / 語彙:約15,000語", time: "平均2250時間", wpm: "Reading: 180-220 WPM / Speaking: 130-160 WPM", curation: "【できること】騒がしいカフェ等で、複数人のネイティブが行う超高速の雑談に完全参入。\n【できないこと】幼児期のカルチャーや地域方言が激しすぎるインサイド・トークへの100%同調。\n★明日からの最初のアクション:\n海外の海外ポッドキャストを1.1倍速で聴き、会話の切り替わりの相槌の入れ方を真似る。" },
    "C1_Bridge": { title: "C1 × Bridge (最高級タフな国際交渉)", vocab: "TOEIC:945〜 / 語彙:約16,000語", time: "平均2600時間", wpm: "Reading: 190-230 WPM / Speaking: 120-150 WPM", curation: "【できること】国際M&Aや高度な知財交渉。ユーモアや皮肉を使った心理的な関係構築。\n【できないこと】古典文学や歴史的メタファーが重層的に隠された最高級文芸の完璧な解読。\n★明日からの最初のアクション:\n海外のタフな折衝ドキュメンタリーを観て、要求の裏にある「本音」の匂わせ方を分析する。" },
    "C1_CALP": { title: "C1 × CALP (知性を研ぐエリート学術)", vocab: "TOEFL:95〜 / IELTS:7.0 / 語彙:約17,000語", time: "平均2800時間", wpm: "Reading: 170-210 WPM / Speaking: 110-140 WPM", curation: "【できること】『The Economist』や『Nature』などの論文を辞書なし精読。大学院ディスカッション完遂。\n【できないこと】未知の学術分野における、その道10年のトップ専門家レベルの新理論構築。\n★明日からの最初のアクション:\n『The Economist』の論説を読み、そのロジックへの反論を英語で200語のエッセイに書く。" },
    "C2_BICS": { title: "C2 × BICS (文化・言葉の完全越境)", vocab: "ネイティブ知識人同等", time: "平均4750時間", wpm: "Reading: 240+ WPM", curation: "【できること】政治演説、演劇、古典小説を文化的背景も含めて100%理解。格調の自在な変化。\n【できないこと】特になし。\n★明日からの最初のアクション:\n歴史的演説をオーディオブックで聴き、言葉の持つリズムと思想を身体へ同期させる。" },
    "C2_Bridge": { title: "C2 × Bridge (全方位支配のトップ交渉)", vocab: "実務の神域 / 満点圏", time: "平均5000時間", wpm: "Reading: 250+ WPM", curation: "【できること】あらゆる国際ビジネス文書の即時処理、最高戦略決定会議での英語によるトップガバナンス。\n【できないこと】特になし。\n★明日からの最初のアクション:\nグローバル企業の決算質疑を聴き、市場をコントロールするための極限の表現をトレースする。" },
    "C2_CALP": { title: "C2 × CALP (最高峰の思想・人類の知性)", vocab: "IELTS:8.5〜9.0 / TOEFL:114〜", time: "平均5500時間", wpm: "Reading: 220+ WPM", curation: "【できること】国際学会での基調講演、査読付き最高峰論文の単独執筆、難解な政策・法案文書の立案。\n【できないこと】特になし。\n★明日からの最初のアクション:\n自分の研究あるいは専門領域の最先端の査読付き論文を読み、それに対する補足仮説のプロトタイプを英語で1,000語ビルドする。" }
};

window.onload = function() {
    openCheckInModal();
};
