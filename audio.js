const playlist = [
    "./songs/ChayNgayDi-SonTungMTP-5468704.mp3",
    "./songs/GioThi-buitruonglinh-16952778.mp3",
    "./songs/HayTraoChoAnh-SonTungMTPSnoopDogg-6010660.mp3",
];
let currentIndex = 0;
let audioContext, analyser, source, dataArray;

// Lưu trạng thái vào localStorage
function savePlayerState(state) {
    try {
        localStorage.setItem("playerState", JSON.stringify(state));
        console.log("Trạng thái đã lưu:", state);
    } catch (error) {
        console.error("Lỗi khi lưu trạng thái:", error);
    }
}

// Lấy trạng thái từ localStorage
function loadPlayerState() {
    try {
        const state = localStorage.getItem("playerState");
        const defaultState = { shuffle: false, loop: "off", currentIndex: 0 };
        const loadedState = state ? JSON.parse(state) : defaultState;
        console.log("Trạng thái đã tải:", loadedState);
        return loadedState;
    } catch (error) {
        console.error("Lỗi khi lấy trạng thái:", error);
        return { shuffle: false, loop: "off", currentIndex: 0 };
    }
}

// Hàm điều hướng danh sách
function navigateList(isNext, state) {
    const arrayLength = playlist.length;
    let newIndex = state.shuffle
        ? Math.floor(Math.random() * arrayLength)
        : (state.currentIndex + (isNext ? 1 : -1) + arrayLength) % arrayLength;

    state.currentIndex = newIndex;
    savePlayerState(state);
    console.log("Điều hướng đến bài:", playlist[newIndex]);
    return playlist[newIndex];
}

// Cập nhật màu nền theo nhạc
function flashBackground() {
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    const bass = dataArray.slice(0, dataArray.length / 4).reduce((sum, val) => sum + val, 0) / (dataArray.length / 4);
    console.log("Bass:", bass); // Debug cường độ bass
    const r = Math.min(255, bass * 2);
    const g = Math.min(255, bass * 1.5);
    const b = Math.min(255, bass * 3);

    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    requestAnimationFrame(flashBackground);
}

// Khởi tạo trình phát
function initAudioPlayer() {
    console.log("Khởi tạo trình phát");
    const state = loadPlayerState();
    currentIndex = state.currentIndex;
    const audioPlayer = document.getElementById("audioPlayer");

    if (!audioPlayer) {
        console.error('Không tìm thấy phần tử <audio> với id="audioPlayer"');
        return;
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
        console.error("Trình duyệt không hỗ trợ Web Audio API");
        return;
    }

    // Cập nhật giao diện
    const shuffleButton = document.getElementById("shuffleButton");
    const loopButton = document.getElementById("loopButton");
    const playButton = document.getElementById("playButton");
    const pauseButton = document.getElementById("pauseButton");

    if (!shuffleButton || !loopButton || !playButton || !pauseButton) {
        console.error("Không tìm thấy các nút điều khiển");
        return;
    }

    shuffleButton.classList.toggle("active", state.shuffle);
    loopButton.dataset.loop = state.loop;
    loopButton.textContent = state.loop === "one" ? "Loop 1" : state.loop === "all" ? "Loop All" : "No Loop";
    audioPlayer.src = playlist[state.currentIndex];
    console.log("Nguồn audio:", audioPlayer.src);

    // Khởi tạo AudioContext một lần
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().then(() => console.log("AudioContext resumed"));
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    try {
        source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    } catch (error) {
        console.error("Lỗi khi tạo MediaElementSource:", error);
        return;
    }

    // Nút Play
    playButton.addEventListener("click", () => {
        console.log("Nút Play được nhấn");
        audioContext.resume().then(() => console.log("AudioContext resumed"));
        audioPlayer.play().catch((error) => console.error("Lỗi khi phát nhạc:", error));
        flashBackground(); // Bắt đầu hiệu ứng nếu chưa chạy
    });

    // Nút Pause
    pauseButton.addEventListener("click", () => {
        console.log("Nút Pause được nhấn");
        audioPlayer.pause();
    });

    // Sự kiện nút Next
    document.getElementById("nextButton").addEventListener("click", () => {
        console.log("Nút Next được nhấn");
        state.currentIndex = currentIndex;
        audioPlayer.src = navigateList(true, state);
        currentIndex = state.currentIndex;
        audioContext.resume().then(() => console.log("AudioContext resumed"));
        audioPlayer.play().catch((error) => console.error("Lỗi khi phát nhạc:", error));
    });

    // Sự kiện nút Previous
    document.getElementById("prevButton").addEventListener("click", () => {
        console.log("Nút Previous được nhấn");
        state.currentIndex = currentIndex;
        audioPlayer.src = navigateList(false, state);
        currentIndex = state.currentIndex;
        audioContext.resume().then(() => console.log("AudioContext resumed"));
        audioPlayer.play().catch((error) => console.error("Lỗi khi phát nhạc:", error));
    });

    // Sự kiện nút Shuffle
    shuffleButton.addEventListener("click", () => {
        console.log("Nút Shuffle được nhấn");
        state.shuffle = !state.shuffle;
        shuffleButton.classList.toggle("active", state.shuffle);
        savePlayerState(state);
    });

    // Sự kiện nút Loop
    loopButton.addEventListener("click", () => {
        console.log("Nút Loop được nhấn");
        state.loop = state.loop === "off" ? "all" : state.loop === "all" ? "one" : "off";
        loopButton.dataset.loop = state.loop;
        loopButton.textContent = state.loop === "one" ? "Loop 1" : state.loop === "all" ? "Loop All" : "No Loop";
        savePlayerState(state);
    });

    // Xử lý khi bài hát kết thúc
    audioPlayer.addEventListener("ended", () => {
        console.log("Bài hát kết thúc");
        if (state.loop === "one") {
            audioPlayer.play();
        } else if (state.loop === "all" || state.shuffle) {
            state.currentIndex = currentIndex;
            audioPlayer.src = navigateList(true, state);
            currentIndex = state.currentIndex;
            audioPlayer.play().catch((error) => console.error("Lỗi khi phát nhạc:", error));
        }
    });

    // Debug khi <audio> phát
    audioPlayer.addEventListener("play", () => console.log("Audio đang phát"));
    audioPlayer.addEventListener("error", (e) => console.error("Lỗi audio:", e));
}

// Gọi khi trang tải
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContent Loaded");
    initAudioPlayer();
});
playButton.addEventListener("click", () => {
    console.log("Nút Play được nhấn");
    initAudioPlayer();
    audioPlayer.play().catch((error) => console.error("Lỗi khi phát nhạc:", error));
});
