class KanjiPickerData {

    load(path, callback) {
        fetch(path).then((r) => r.json()).then((r) => {
            this.groups = r;
            for (let group of this.groups)
                this.initAllKanji(group);
            callback();
        });
    }

    initAllKanji(group) {
        let allKanji = "";
        for (let s of group["subcategories"]) {
            allKanji += s["kanji"];
            s["start_index"] = allKanji.length;
        }
    }

}

class KanjiPicker {

    constructor(dom, data, initialSelection, callback) {
        this.dom = dom;
        this.domSelectedGroup = null;
        this.domKanjiList = [];
        this.lastElementIndexClicked = 0;
        this.selection = new Set();
        for (let c of initialSelection)
            this.selection.add(c);
        this.updateCallback = callback;

        let firstGroupLi = null;

        let ul = document.createElement("ul");
        ul.classList.add("groups");
        for (let group of data.groups) {
            let li = document.createElement("li");
            li.group = group;
            li.textContent = group["name"];
            ul.appendChild(li);
            li.addEventListener("click", () => this.setGroup(li));
            if (firstGroupLi === null)
                firstGroupLi = li;
        }
        {
            let li = document.createElement("li");
            li.group = null;
            li.textContent = "Custom";
            ul.appendChild(li);
            li.addEventListener("click", () => this.setGroup(li));
            if (firstGroupLi === null)
                firstGroupLi = li;
        }
        dom.appendChild(ul);

        this.domItems = document.createElement("div");
        this.domItems.classList.add("items");
        dom.appendChild(this.domItems);

        this.domCustomText = document.createElement("textarea");
        this.domCustomText.classList.add("custom-text");
        dom.appendChild(this.domCustomText);
        this.domCustomText.addEventListener("input", () => this.applyFromTextArea());

        this.setGroup(firstGroupLi);
    }

    getSelectedString() {
        return Array.from(this.selection).join("");
    }

    setGroup(el) {
        let self = this;
        this.applyFromTextArea();
        if (this.domSelectedGroup !== null)
            this.domSelectedGroup.classList.remove("selected");
        this.domSelectedGroup = el;
        el.classList.add("selected");
        this.domCustomText.style.display = "none";
        this.domCustomText.value = "";
        this.domItems.style.display = "block";
        this.domItems.textContent = "";
        this.domKanjiList = [];

        if (el.group === null) {
            this.domCustomText.style.display = "block";
            this.domItems.style.display = "none";
            this.domCustomText.value = this.getSelectedString();
            return;
        }

        for (let s of el.group["subcategories"]) {
            let header = document.createElement("h5");
            header.textContent = s["name"];
            this.domItems.append(header);

            let domKanjiList = [];
            for (let i of s["kanji"]) {
                let itm = document.createElement("span");
                itm.kanjiIndex = this.domKanjiList.length;
                itm.textContent = i;
                itm.classList.add("item");
                if (this.selection.has(i))
                    itm.classList.add("selected");
                itm.addEventListener("click", function(ev) { self.onKanjiClicked(this, ev); });
                this.domItems.append(itm);
                domKanjiList.push(itm);
                this.domKanjiList.push(itm);
            }

            header.addEventListener("click", () => this.onKanjiHeaderClicked(domKanjiList));
        }
    }

    onKanjiClicked(dom, ev) {
        if (ev.shiftKey) {
            let i = Math.min(this.lastElementIndexClicked, dom.kanjiIndex);
            let j = Math.max(this.lastElementIndexClicked, dom.kanjiIndex);
            let s = dom.classList.contains("selected");
            for (let k = i; k <= j; k++) {
                dom = this.domKanjiList[k];
                if (s) {
                    this.selection.delete(dom.textContent);
                    dom.classList.remove("selected");
                } else {
                    this.selection.add(dom.textContent);
                    dom.classList.add("selected");
                }
            }
            this.onKanjiListUpdated();
            return;
        }

        if (dom.classList.contains("selected")) {
            this.selection.delete(dom.textContent);
            dom.classList.remove("selected");
        } else {
            this.selection.add(dom.textContent);
            dom.classList.add("selected");
        }
        this.lastElementIndexClicked = dom.kanjiIndex;
        this.onKanjiListUpdated();
    }

    onKanjiHeaderClicked(childrenDom) {
        let allSelected = true;
        for (let el of childrenDom) {
            if (!el.classList.contains("selected")) {
                allSelected = false;
                break;
            }
        }

        if (!allSelected) {
            for (let el of childrenDom) {
                this.selection.add(el.textContent);
                el.classList.add("selected");
            }
        } else {
            for (let el of childrenDom) {
                this.selection.delete(el.textContent);
                el.classList.remove("selected");
            }
        }
        this.onKanjiListUpdated();
    }

    applyFromTextArea() {
        if (this.domSelectedGroup !== null && this.domSelectedGroup.group === null) {
            if (this.domCustomText.value === this.getSelectedString())
                return;
            this.selection.clear();
            for (let c of this.domCustomText.value)
                this.selection.add(c);
            this.onKanjiListUpdated();
        }
    }

    onKanjiListUpdated() {
        if (this.updateCallback !== null)
            this.updateCallback();
    }

}

class App {

    constructor() {
        this.domOptionsStage = document.getElementById("options_stage");
        this.domProgressText = document.getElementById("progress_text");
        this.domKanjiPicker = document.getElementById("options_kanji_list");
        this.domStartGame = document.getElementById("options_start");

        this.kanjiPickerData = new KanjiPickerData();
        this.kanjiPicker = null;
        this.kanjiCalculateTimer = null;
        this.gameData = null;
        this.game = null;

        this.domStartGame.addEventListener("click", () => this.startGame());
    }

    load() {
        this.domProgressText.innerText = "Loading Kanji list...";
        this.kanjiPickerData.load("api/kanji-groups", () => {
            let savedKanji = localStorage["optionsKanji"] || "一二三四五六七八九十百千上下左右中大小月日年早木林山川土空田天生花草虫犬人名女男子目耳口手足見音力気円入出立休先夕本文字学校村町森正水火玉王石竹糸貝車金雨赤青白";
            this.kanjiPicker = new KanjiPicker(this.domKanjiPicker, this.kanjiPickerData, savedKanji, () => {
                this.onKanjiListUpdated();
            });
            this.onKanjiListUpdated();
        });
    }

    startGame() {
        if (this.kanjiPicker === null)
            return;
        let quizKanji = this.kanjiPicker.getSelectedString();
        localStorage["optionsKanji"] = quizKanji;
        let url = "api/sentences?count=20&kanji=" + quizKanji;

        this.domOptionsStage.style.display = "none";
        this.domProgressText.innerText = "Getting sentences from the server...";
        this.gameData = new GameData();
        this.gameData.load(url, () => {
            this.game = new Game(this.gameData);
            this.game.challengeCount = this.gameData.getSentenceCount();
            this.game.challengeQuizKanji = quizKanji;
            this.game.challengePending = [];
            for (let i = 0; i < this.game.challengeCount; i++)
                this.game.challengePending.push(i);
            this.game.start();
        });
    }

    onKanjiListUpdated() {
        if (this.kanjiCalculateTimer !== null) {
            clearTimeout(this.kanjiCalculateTimer);
            this.kanjiCalculateTimer = null;
        }
        this.domProgressText.innerText = "Available sentences: Calculating...";
        this.kanjiCalculateTimer = setTimeout(() => {
            let url = "api/sentences?only_count=1&kanji=" + this.kanjiPicker.getSelectedString();
            fetch(url).then((r) => r.text()).then((r) => {
                if (this.gameData !== null)
                    return;
                this.domProgressText.innerText = "Available sentences: " + r.trim();
            });
        }, 100);
    }

}

let app = new App();
app.load();