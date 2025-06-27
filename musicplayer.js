const musicPlayer = {
    DIRECTION_NEXT: 1,
    DIRECTION_PREV: -1,
    RESET_THRESHOLD_SECONDS: 2,
    isNext: true,

    songs: [
        {
            id: 1,
            filePath: "./songs/audio_a6.mp3",
            title: "Chạy ngay đi",
            artist: "Sơn Tùng M-TP",
            image: "https://thanhnien.mediacdn.vn/Uploaded/caotung/2022_08_07/ca-si-mono-2225.jpg",
        },
        {
            id: 2,
            filePath: "./songs/GioThi-buitruonglinh-16952778.mp3",
            title: "Gió Thị",
            artist: "Bùi Trường Linh",
            image: "https://image.baophapluat.vn/w840/Uploaded/2025/hfobhvwbucqaow/2022_11_12/truc-nhan-6080.jpg",
        },
        {
            id: 3,
            filePath: "./songs/shimmy-294651.mp3",
            title: "Hãy trao cho anh",
            artist: "Sơn Tùng M-TP ft. Snoop Dogg",
            image: "https://hoseiki.vn/wp-content/uploads/2025/03/gai-xinh-22-712x1024.jpg?v=1741737841",
        },
        {
            id: 4,
            filePath: "./songs/MatKetNoi-DuongDomic-16783113.mp3",
            title: "Mất kết nối",
            artist: "Dương Domic",
            image: "https://i.ytimg.com/vi/QvswgfLDuPg/maxresdefault.jpg",
        },
        {
            id: 5,
            filePath: "./songs/high-end-hustle.mp3",
            title: "Tái sinh",
            artist: "Tùng Dương",
            image: "https://a10.gaanacdn.com/images/albums/72/3019572/crop_480x480_3019572.jpg",
        },
    ],

    currentIndex: 0,
    isPlaying: false,
    isLoopMode: localStorage.getItem("loop") === "true",
    isShuffleMode: localStorage.getItem("random") === "true",

    init() {
        const $ = document.querySelector.bind(document);
        this.playlist = $(".playlist");
        this.togglePlayBtn = $(".btn-toggle-play");
        this.title = $(".playing-title");
        this.thumbnail = $(".cd-thumb img");
        this.audio = $(".audio");
        this.controlEl = $(".control");
        this.playIcon = $(".play-icon");
        this.prevBtn = $(".btn-prev");
        this.nextBtn = $(".btn-next");
        this.loopBtn = $(".btn-repeat");
        this.shuffleBtn = $(".btn-random");
        this.progress = $("#progress");
        this.currentTimeEl = $(".current-time");
        this.durationEl = $(".duration");
        this.volumeSlider = $(".volume-slider");
        this.volCtrl = $(".volume-control");

        this.canvas = $("#visualizer");
        this.canvasCtx = this.canvas.getContext("2d");
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        this.renderSongsList();
        this.loadCurrentSong();
        this.attachEvents();
    },

    drawVisualizer() {
        requestAnimationFrame(this.drawVisualizer.bind(this));
        this.analyser.getByteFrequencyData(this.dataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        const barWidth = (width / this.bufferLength) * 2.5;

        this.canvasCtx.clearRect(0, 0, width, height);

        let x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = this.dataArray[i] / 2;
            const red = barHeight + 100;
            const green = i * 5;
            const blue = 255 - barHeight;
            this.canvasCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;

            this.canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    },

    attachEvents() {
        this.togglePlayBtn.onclick = this.togglePlayPause.bind(this);

        this.audio.onplay = () => {
            if (this.audioContext.state === "suspended") this.audioContext.resume();
            this.drawVisualizer();
            this.playIcon.classList.replace("fa-play", "fa-pause");
            this.isPlaying = true;
        };

        this.audio.onpause = () => {
            if (!this.progress.seeking) this.playIcon.classList.replace("fa-pause", "fa-play");
            this.isPlaying = false;
        };

        this.prevBtn.onclick = this.changeSong.bind(this, this.DIRECTION_PREV);
        this.nextBtn.onclick = this.changeSong.bind(this, this.DIRECTION_NEXT);

        this.loopBtn.onclick = () => {
            this.isLoopMode = !this.isLoopMode;
            this.updateLoopButton();
            localStorage.setItem("loop", this.isLoopMode);
        };

        this.shuffleBtn.onclick = () => {
            this.isShuffleMode = !this.isShuffleMode;
            this.updateShuffleButton();
            localStorage.setItem("random", this.isShuffleMode);
        };

        this.audio.ontimeupdate = () => {
            this.progress.value = this.audio.currentTime;
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        };

        this.progress.addEventListener("input", () => {
            if (!this.audio.paused) (this.progress.seeking = true), this.audio.pause();
            this.audio.currentTime = this.progress.value;
        });

        this.progress.addEventListener("change", () => {
            if (this.progress.seeking) this.audio.play();
            this.progress.seeking = false;
        });

        this.audio.onended = () => {
            if (this.isLoopMode) {
                this.audio.currentTime = 0;
                this.audio.play();
            } else {
                this.changeSong(this.DIRECTION_NEXT);
            }
        };

        this.volumeSlider.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            this.audio.volume = value;

            const percent = value * 100;
            const red = Math.round(value * 255);
            const green = Math.round((1 - value) * 255);
            const color = `rgb(${red}, ${green}, 0)`;
            this.volumeSlider.style.background = `linear-gradient(to right, #4caf50 ${
                value === 0 ? "0%" : `${percent * 0.3}%`
            }, ${color} ${percent}%)`;

            const [turn, mute] = +value === 0 ? ["transparent", "#4caf50"] : ["#4caf50", "transparent"];
            this.volCtrl.style.setProperty("--turn-color", turn);
            this.volCtrl.style.setProperty("--mute-color", mute);
            value >= 0.6 && this.volCtrl.style.setProperty("--turn-color", "#F44336");
        });

        this.playlist.onclick = (e) => {
            const songNode = e.target.closest(".song");
            if (!songNode) return;

            const clickedIndex = [...this.playlist.children].indexOf(songNode);
            if (clickedIndex !== -1) {
                this.currentIndex = clickedIndex;
                this.loadCurrentSong();
                this.renderSongsList();
                this.audio.play();
            }
        };
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
    },

    changeSong(direction) {
        this.isPlaying = true;
        const shouldReset = this.audio.currentTime > this.RESET_THRESHOLD_SECONDS;

        if (direction === this.DIRECTION_PREV && shouldReset) {
            this.audio.currentTime = 0;
            return;
        }

        if (this.isShuffleMode) {
            this.currentIndex = this.getRandomIndex();
        } else {
            this.currentIndex += direction;
        }

        this.updateCurrentIndex();
    },

    getRandomIndex() {
        if (this.songs.length === 1) return this.currentIndex;
        let index;
        do {
            index = Math.floor(Math.random() * this.songs.length);
        } while (index === this.currentIndex);
        return index;
    },

    updateCurrentIndex() {
        this.currentIndex = (this.currentIndex + this.songs.length) % this.songs.length;
        this.loadCurrentSong();
        this.renderSongsList();
    },

    updateLoopButton() {
        this.audio.loop = this.isLoopMode;
        this.loopBtn.classList.toggle("active", this.isLoopMode);
    },

    updateShuffleButton() {
        this.shuffleBtn.classList.toggle("active", this.isShuffleMode);
    },

    loadCurrentSong() {
        const song = this.getCurrentSong();
        this.title.textContent = song.title;
        this.thumbnail.src = song.image;
        this.audio.src = song.filePath;
        this.audio.volume = this.volumeSlider.value;

        this.updateLoopButton();
        this.updateShuffleButton();

        this.audio.onloadedmetadata = () => {
            this.progress.max = this.audio.duration;
            this.durationEl.textContent = this.formatTime(this.audio.duration);
        };

        this.audio.oncanplay = () => {
            if (this.isPlaying) {
                this.audio.play();
            }
        };
    },

    getCurrentSong() {
        return this.songs[this.currentIndex];
    },

    togglePlayPause() {
        this.audio.paused ? this.audio.play() : this.audio.pause();
    },

    renderSongsList() {
        const html = this.songs
            .map((song, index) => {
                const isActive = index === this.currentIndex;
                return (
                    `<div class="song ${isActive ? "active" : ""}">` +
                    `<div class="thumb" style="background-image: url('${song.image}');"></div>` +
                    `<div class="body">` +
                    `<h3 class="title">${this.sanitizeText(song.title)}</h3>` +
                    `<p class="author">${this.sanitizeText(song.artist)}</p>` +
                    `</div>` +
                    `<div class="option"><i class="fas fa-ellipsis-h"></i></div>` +
                    `</div>`
                );
            })
            .join("");

        this.playlist.innerHTML = html;
    },

    sanitizeText(text) {
        if (typeof text !== "string") return "";
        const tempDiv = document.createElement("div");
        tempDiv.textContent = text;
        return tempDiv.innerHTML;
    },
};

musicPlayer.init();
