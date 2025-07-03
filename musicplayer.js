const musicPlayer = {
    isNext: false,
    TIME_LIMIT: 2,
    isPlaying: false,
    loopMode: localStorage.getItem("loopMode"),
    isShuffleMode: localStorage.getItem("random") === "true",
    currentIndex: Number(localStorage.getItem("songIndex")) || 0,

    songs: [
        {
            id: 1,
            filePath: "./songs/audio_8.mp3",
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
        {
            id: 6,
            filePath: "./songs/audio_a6.mp3",
            title: "Tái sinh",
            artist: "Tùng Dương",
            image: "https://a10.gaanacdn.com/images/albums/72/3019572/crop_480x480_3019572.jpg",
        },
        {
            id: 7,
            filePath: "./songs/TaiSinh-TungDuong-16735175.mp3",
            title: "Tái sinh",
            artist: "Tùng Dương",
            image: "https://a10.gaanacdn.com/images/albums/72/3019572/crop_480x480_3019572.jpg",
        },
    ],

    init() {
        const $ = document.querySelector.bind(document);
        this.player = $(".player");
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
        this.dashboard = $(".dashboard");
        this.circleSvg = $(".cd-svg");
        this.progressCircle = $(".progress-circle");

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

        this.loadCurrentSong();
        this.renderSongsList();
        this.attachEvents();
    },

    attachEvents() {
        let isStrokeDragging = false;
        let isVolumeDragging = false;
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

        this.prevBtn.onclick = this.changeSong.bind(this);
        this.nextBtn.onclick = this.changeSong.bind(this);
        this.volumeSlider.oninput = this.handleVolume.bind(this);

        this.volumeSlider.addEventListener("touchstart", () => {
            isVolumeDragging = true;
        });

        this.volumeSlider.addEventListener("touchmove", (e) => {
            if (isVolumeDragging) {
                if (e.cancelable) e.preventDefault();
                this.handleTouchMove(e, this.volumeSlider, this.handleVolume);
            }
        });

        this.volumeSlider.addEventListener("touchend", () => {
            isVolumeDragging = false;
        });

        this.loopBtn.onclick = () => {
            // Nếu bật Loop thì tắt ngẫu nhiên
            if (this.isShuffleMode) this.shuffleBtn.click();

            const modes = ["off", "loop-single", "loop-all"];
            const current = this.loopMode ?? "off";
            const nextIndex = (modes.indexOf(current) + 1) % modes.length;
            this.loopMode = modes[nextIndex];

            this.updateLoopButton();
            localStorage.setItem("loopMode", this.loopMode);
        };

        this.shuffleBtn.onclick = () => {
            // Nếu bật ngẫu nhiên thì tắt Lốp!
            const isLoopMode = this.loopMode !== "off";
            if (isLoopMode && !this.isShuffleMode) {
                this.loopBtn.classList.replace(`${this.loopMode}`, "loop-all");
                this.loopMode = "loop-all";
                this.loopBtn.click();
            }

            this.isShuffleMode = !this.isShuffleMode;
            this.updateShuffleButton();
            localStorage.setItem("random", this.isShuffleMode);
        };

        this.audio.ontimeupdate = () => {
            this.progress.value = this.audio.currentTime;
            const percentage = isNaN(this.audio.duration) ? 0 : (this.audio.currentTime / this.audio.duration) * 100;
            this.updateProgressCircle(percentage);
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        };

        this.progress.oninput = () => {
            if (!this.audio.paused) (this.progress.seeking = true), this.audio.pause();
            this.audio.currentTime = this.progress.value;
        };

        this.progress.onchange = () => {
            if (this.progress.seeking) this.audio.play();
            this.progress.seeking = false;
        };

        this.progress.addEventListener("touchstart", () => {
            this.progress.seeking = true;
        });

        this.progress.addEventListener("touchmove", (e) => {
            this.handleTouchMove(e, this.progress, this.updateProgress);
        });

        this.progress.addEventListener("touchend", () => {
            if (this.progress.seeking) {
                this.audio.play();
                this.progress.seeking = false;
            }
        });

        this.circleSvg.onmousedown = (e) => {
            isStrokeDragging = true;
            this.progress.seeking = true;
            this.handleSvgInteraction.call(this, e);
        };

        this.player.onmousemove = (e) => {
            if (isStrokeDragging) {
                this.handleSvgInteraction.call(this, e);
            }
        };

        this.player.onmouseup = () => {
            if (isStrokeDragging && this.progress.seeking) {
                this.audio.play();
                this.progress.seeking = false;
                isStrokeDragging = false;
            }
        };

        this.circleSvg.addEventListener("touchstart", (e) => {
            this.progress.seeking = true;
            this.handleSvgInteraction.call(this, e);
        });

        this.circleSvg.addEventListener("touchmove", this.handleSvgInteraction.bind(this));

        this.circleSvg.addEventListener("touchend", () => {
            if (this.progress.seeking) {
                this.audio.play();
                this.progress.seeking = false;
            }
        });

        this.audio.onended = () => {
            if (this.loopMode === "loop-single") {
                this.audio.currentTime = 0;
                this.audio.play();
            } else if (this.loopMode === "loop-all" || this.currentIndex < this.songs.length - 1) {
                // Thỏa mãn loop === off thì phát hết danh sách sẽ dừng
                this.nextBtn.click();
            }
        };

        this.playlist.onclick = (e) => {
            const songNode = e.target.closest(".song");
            if (!songNode) return;

            const clickedIndex = [...this.playlist.children].indexOf(songNode);
            if (clickedIndex === this.currentIndex) {
                return this.isPlaying ? this.audio.pause() : this.audio.play();
            }

            if (clickedIndex !== -1) {
                this.currentIndex = clickedIndex;
                this.loadCurrentSong();
                this.audio.play();
            }
        };
    },

    handleTouchMove(e, element, callback) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const rect = element.getBoundingClientRect();
        const isVolume = element === this.volumeSlider;
        const value = (() => {
            const ratio = isVolume
                ? (rect.bottom - touch.clientY) / rect.height
                : ((touch.clientX - rect.left) / rect.width) * this.audio.duration;
            return Math.min(Math.max(ratio, 0), isVolume ? 1 : this.audio.duration);
        })();

        element.value = value;
        if (isVolume) {
            callback.call(this, { target: element });
        } else {
            const percentage = isNaN(this.audio.duration) ? 0 : (value / this.audio.duration) * 100;
            callback.call(this, value, percentage);
        }
    },

    updateProgress(currentTime, percentage) {
        this.progress.seeking = true;
        if (!this.audio.paused) this.audio.pause();
        this.audio.currentTime = currentTime;
        this.progress.value = currentTime;
        this.updateProgressCircle(percentage);
        this.currentTimeEl.textContent = this.formatTime(currentTime);
    },

    updateProgressCircle(percentage) {
        const circumference = 283;
        const offset = circumference * (1 - percentage / 100);
        this.progressCircle.setAttribute("stroke-dashoffset", offset);
    },

    handleSvgInteraction(e) {
        e.preventDefault();
        const isTouch = e.type.startsWith("touch");
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        const rect = this.circleSvg.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        let angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90;
        if (angle < 0) angle += 360;
        const percentage = (angle / 360) * 100;
        const currentTime = isNaN(this.audio.duration) ? 0 : (percentage / 100) * this.audio.duration;
        this.updateProgress(currentTime, percentage);
    },

    getRandomIndex() {
        if (this.songs.length === 1) return this.currentIndex;
        let index;
        do {
            index = Math.floor(Math.random() * this.songs.length);
        } while (index === this.currentIndex);
        return index;
    },

    handleCurrentIndex() {
        const length = this.songs.length;
        this.currentIndex = (this.currentIndex + length) % length;
        this.loadCurrentSong();
    },

    savePlayingIndex() {
        localStorage.setItem("songIndex", this.currentIndex);
    },

    getCurrentSong() {
        const song = this.songs[this.currentIndex];
        this.savePlayingIndex();
        return song;
    },

    loadCurrentSong() {
        const song = this.getCurrentSong();
        this.title.textContent = song.title;
        this.thumbnail.src = song.image;
        this.audio.src = song.filePath;
        this.audio.volume = this.volumeSlider.value;

        this.updateLoopButton();
        this.updateShuffleButton();
        this.markCurrentSong();

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

    changeSong(e) {
        this.isPlaying = true;

        const pre = e?.target.closest(".btn-prev");
        const next = !this.isNext && e?.target.closest(".btn-next");
        const redirect = next ? 1 : pre && -1;

        const shouldReset = this.audio.currentTime > this.TIME_LIMIT;
        if (redirect === -1 && shouldReset) return (this.audio.currentTime = 0);

        this.currentIndex = this.isShuffleMode ? this.getRandomIndex() : this.currentIndex + redirect;

        this.handleCurrentIndex();
    },

    updateLoopButton() {
        this.audio.loop = this.loopMode === "loop-single";
        this.loopBtn.classList.remove("loop-single", "loop-all", "off", "active");

        const mode = this.loopMode ?? "off";
        this.loopBtn.classList.add(mode);

        this.loopBtn.classList.toggle("active", mode !== "off");
        this.loopBtn.style.cssText =
            mode === "loop-single"
                ? `--color-one: #ec1f55;
                --color-all: transparent;
                --svg-fill: unset;`
                : mode === "loop-all"
                ? `--color-one: transparent;
                --color-all: #ec1f55;
                --svg-fill: unset;`
                : `--color-one: transparent;
                --color-all: transparent;
                --svg-fill: transparent;`;
    },

    updateShuffleButton() {
        this.shuffleBtn.classList.toggle("active", this.isShuffleMode);
    },

    handleVolume(e) {
        const value = parseFloat(e.target.value);
        this.audio.volume = value;

        const percent = value * 100;
        const red = Math.round(value * 255);
        const green = Math.round((1 - value) * 255);
        const color = `rgb(${red}, ${green}, 0)`;
        this.volumeSlider.style.background = `linear-gradient(to right, #4caf50 ${
            value === 0 ? "10%" : `${percent * 0.3}%`
        }, ${color} ${percent}%)`;

        const [turn, mute] = +value === 0 ? ["transparent", "#4caf50"] : ["#4caf50", "transparent"];
        this.volCtrl.style.setProperty("--turn-color", turn);
        this.volCtrl.style.setProperty("--mute-color", mute);
        value >= 0.6 && this.volCtrl.style.setProperty("--turn-color", "#F44336");
    },

    togglePlayPause() {
        this.audio.paused ? this.audio.play() : this.audio.pause();
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
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

    markCurrentSong() {
        const children = [...this.playlist.children];

        children.forEach((child, index) => {
            const isActive = index === this.currentIndex;
            child.classList.toggle("active", isActive);

            if (isActive) {
                const dashHeight = this.dashboard.offsetHeight;
                const offset = child.offsetTop - dashHeight - 10;

                this.player.scrollTo({
                    top: offset,
                    behavior: "smooth",
                });
            }
        });
    },

    sanitizeText(text) {
        if (typeof text !== "string") return "";
        const tempDiv = document.createElement("div");
        tempDiv.textContent = text;
        return tempDiv.innerHTML;
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
};

musicPlayer.init();

// const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// console.log("userTimeZone : ", userTimeZone);
