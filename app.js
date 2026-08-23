const card = document.getElementById('card');

let isDragging = false;
card.addEventListener('click',() => {
    if (isDragging) return;
    card.classList.toggle('flipped');
});

let startX = 0;
let currentX = 0;

function handleStart(e) {
    isDragging = false;
    startX = getClientX(e);
    card.style.transition = 'none';
}

function handleMove(e) {
    if (StartX == 0) return;

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
    currentX = 0
}

function swipeCard(direction) {
    let moveX = -1000;
    let rotateDeg = -45;
    let resultText = '分からなかった'

    if (direction === 'right') {
        moveX = 1000;
        rotateDeg = 45;
        resultText = '分かった';
    }

    card.style.transition = 'transform 0.4s ease';
    card.style.transform = 'translateX(' + moveX + 'px) rotate(' + rotateDeg + 'deg)';

    setTimeout(() => {
        card.style.transition = 'none';
        card.style.transform = 'none';
        card.classList.remove('flipped');
        console.log('判定結果: ' + resultText);
        currentIndex = (currentIndex + 1) % quizList.length;
        showQuiz(currentIndex);

    }, 400);
}

function resetCardPosition() {
    card.style.transition = 'transform 0.2s ease';
    card.style.transform = 'none';
}

function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
}

card.addEventListener('mousedown', handleStart, { passive: false });
window.addEventListener('mousemove' ,handleMove, {passive: false });
window.addEventListener('mouseup', handleEnd);
window.addEventListener('touchcancel',handleEnd)

card.addEventListener('touchstart',handleStart);
window.addEventListener('touchmove',handleMove);
window.addEventListener('touchend',handleEnd)

// CSVファイルの部分だよ//

const importBtn = document.getElementById('import-btn');
const csvInput = document.getElementById('csv-input');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');

let quizList = [];
let currentIndex = 0;

importBtn.addEventListener('click',() => {
    csvInput.click();
});

csvInput.addEventListener('change',(e) => {
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

    for (let i = 0;i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(/,|, |\t/);

        if (columns.length >= 2) {
            quizList.push({
                question: columns[0].trim(),
                answer: columns[1].trim(),
                explanation: columns[2] ? columns[2].trim() : ''
            });
        }
    }

    if (quizList.length > 0) {
        currentIndex = 0;
        showQuiz(currentIndex);
        alert(quizList.length + '問の問題を読み込みました！');
    } else {
        console.log('読み込んだ生データ:',text);
        alert('問題データが見つかりませんでした。\n読み込んだ内容:\n' + text.substring(0,50));
    }
}

function showQuiz(index) {
    if (!quizList[index]) return;

    const quiz = quizList[index];
    questionText.innerText = quiz.question;

    let backText = quiz.answer;
    if (quiz.explanation) {
        backText += '\n\n 【解説】\n' + quiz.explanation;
    }
    answerText.innerText = backText;
}