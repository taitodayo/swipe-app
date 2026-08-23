const card = document.getElementById('card');

let isDragging = false;
card.addEventListener('click', () => {
    if (isDragging) return;
    card.classList.toggle('flipped');
});

let startX = 0;
let currentX = 0; // currentx から修正

function handleStart(e) {
    isDragging = false;
    startX = getClientX(e);
    card.style.transition = 'none';
}

function handleMove(e) {
    if (startX === 0) return; // StartX から修正

    if (e.cancelable) {
        e.preventDefault();
    }

    currentX = getClientX(e) - startX;

    if (Math.abs(currentX) > 5) {
        isDragging = true;
    }

    const rotateDeg = currentX * 0.05;
    card.style.transform = 'translateX(' + currentX + 'px) rotate(' + rotateDeg + 'deg)';
}

function handleEnd() {
    if (startX === 0) return;

    const threshold = 100;

    if (currentX > threshold) {
        swipeCard('right');
    } else if (currentX < -threshold) {
        swipeCard('left');
    } else {
        resetCardPosition();
    }

    startX = 0;
    currentX = 0;
}

function swipeCard(direction) {
    let moveX = -1000;
    let rotateDeg = -45;
    let resultText = '分からなかった';

    if (direction === 'right') {
        moveX = 1000;
        rotateDeg = 45;
        resultText = '分かった';
    }

    card.style.transition = 'transform 0.8s cubic-bezier(0.6,-0.28,0.735,0.045) ease-in';
    card.style.transform = 'translateX(' + moveX + 'px) rotate(' + rotateDeg + 'deg)';
    card.style.opacity = '0'

    // 正解・不正解に応じて復習時間をセット
    updateQuizStatus(direction === 'right');

    setTimeout(() => {
        card.style.transition = 'none';
        card.style.transform = 'scale(0.9)';
        card.classList.remove('flipped');
        console.log('判定結果: ' + resultText);
        
        // 次の復習問題を表示
        showNextQuiz();

        setTimeout (() => {
            card.style.transition = 'opacity 0.8s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'none'
        },50);

    }, 400);
}

function resetCardPosition() {
    card.style.transition = 'transform 0.2s ease';
    card.style.transform = 'none';
}

function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
}

// スマホ用イベント（スクロール防止用に { passive: false } を指定）
card.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('touchend', handleEnd);
window.addEventListener('touchcancel', handleEnd); // スペル修正

// PC用イベント
card.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);


// CSVファイル・データ管理部分 //

const importBtn = document.getElementById('import-btn');
const csvInput = document.getElementById('csv-input');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');

let quizList = [];
let currentQuiz = null; // 現在出題中の問題データ

// 復習のインターバル（5分, 30分, 1日, 3日）
const PHASE_INTERVALS = {
    1: 5 * 60 * 1000,
    2: 30 * 60 * 1000,
    3: 24 * 60 * 60 * 1000,
    4: 3 * 24 * 60 * 60 * 1000
};

// 起動時に保存データを読み込む
window.addEventListener('DOMContentLoaded', () => {
    loadData();
    showNextQuiz();
});

importBtn.addEventListener('click', () => {
    csvInput.click();
});

csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
        const text = event.target.result;
        parseCSV(text);
    };

    reader.readAsText(file, 'UTF-8');
});

function parseCSV(text) {
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r\n|\n|\r/);
    quizList = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(/,|，|\t/);

        if (columns.length >= 2) {
            quizList.push({
                question: columns[0].trim(),
                answer: columns[1].trim(),
                explanation: columns[2] ? columns[2].trim() : '',
                phase: 1,
                nextReviewAt: 0 // 最初はすぐに出題可能
            });
        }
    }

    if (quizList.length > 0) {
        saveData(); // CSV読み込み時に保存
        showNextQuiz();
        alert(quizList.length + '問の問題を読み込みました！');
    } else {
        console.log('読み込んだ生データ:', text);
        alert('問題データが見つかりませんでした。\n読み込んだ内容:\n' + text.substring(0, 50));
    }
}

// 判定に応じたフェーズ更新処理
function updateQuizStatus(isCorrect) {
    if (!currentQuiz) return;

    const now = Date.now();

    if (isCorrect) {
        currentQuiz.phase += 1;
        const interval = PHASE_INTERVALS[currentQuiz.phase];
        if (interval) {
            currentQuiz.nextReviewAt = now + interval;
        } else {
            // 全フェーズ完了時は遠い将来に設定（習得済み）
            currentQuiz.nextReviewAt = now + (365 * 24 * 60 * 60 * 1000);
        }
    } else {
        // 不正解時はフェーズ1に戻し、5分後に再出題
        currentQuiz.phase = 1;
        currentQuiz.nextReviewAt = now + PHASE_INTERVALS[1];
    }

    saveData();
}

// 出題可能な問題を探して表示
function showNextQuiz() {
    const now = Date.now();
    // 出題時刻が来ている問題を抽出
    const availableQuizzes = quizList.filter(q => q.nextReviewAt <= now && q.phase < 5);

    if (availableQuizzes.length === 0) {
        currentQuiz = null;
        questionText.innerText = '現在、復習する問題はありません！';
        answerText.innerText = '時間をおいて再度開くか、新しいCSVを読み込んでください。';
        return;
    }

    // ランダムに1問選択
    const randomIndex = Math.floor(Math.random() * availableQuizzes.length);
    currentQuiz = availableQuizzes[randomIndex];

    questionText.innerText = currentQuiz.question;

    let backText = currentQuiz.answer;
    if (currentQuiz.explanation) {
        backText += '\n\n【解説】\n' + currentQuiz.explanation;
    }
    answerText.innerText = backText;
}

// ブラウザへのデータ保存と読み込み
function saveData() {
    localStorage.setItem('my_swipe_quiz_data', JSON.stringify(quizList));
}

function loadData() {
    const saved = localStorage.getItem('my_swipe_quiz_data');
    if (saved) {
        quizList = JSON.parse(saved);
    }
}

const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark");
const darkModeOn = e.matches;

darkModeMediaQuery.addListener((e) => {

    const darkModeOn = e.matches;
    if (darkModeOn) {

        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
    } else {

        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
    }
});