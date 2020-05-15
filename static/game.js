class GameData {

    load(path, callback) {
        fetch(path).then((r) => r.json()).then((r) => {
            this.sentences = r;
            callback();
        });
    }

    getSentenceCount() {
        return this.sentences.length;
    }

    getSentenceInfo(idx) {
        let info = this.sentences[idx];
        if (info.hasOwnProperty("jp_parsed"))
            return info;
        if (info["jp_script"] === "Hrkt") {
            let kanaReading = "";
            let readingArray = [];
            let r = /(\[[^\]]*\]|[^\[]+)/g;
            let s = info["jp"];
            let a;
            while ((a = r.exec(s)) !== null) {
                if (a[0].charAt(0) === '[') {
                    let readings = a[0].substr(1, a[0].length - 2).split("|");
                    for (let i = 1; i < readings.length; i++)
                        kanaReading += readings[i];
                    readingArray.push(readings);
                } else {
                    kanaReading += a[0];
                    readingArray.push([a[0]]);
                }
            }
            info["jp_kana"] = this.deleteKatakana(kanaReading);
            info["jp_parsed"] = readingArray;
        }
        return info;
    }

    deleteKatakana(str) {
        let katakanaRegex = /[アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポッャュョヮヴ]/g;
        let hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっゃゅょゎゔ";
        let katakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポッャュョヮゔ";
        return str.replace(katakanaRegex, (c) =>  {
            return hiragana.charAt(katakana.indexOf(c));
        });
    }

}

class KanaIme {

    constructor(dom) {
        this.dom = dom;
        this.dom.addEventListener("keydown", () => this.update());
        this.dom.addEventListener("keypress", () => this.update());
        this.dom.addEventListener("keyup", () => this.update());
        this.dom.addEventListener("input", () => this.update());
    }

    isLatin(char) {
        let cc = char.charCodeAt(0);
        return ((cc >= 97 && cc <= 122) || char === "." || char === "[" || char === "]" || char === " " ||
            char === "," || char === "!" || char === "?" || char === "-");
    }

    makeReplacementFor(txt) {
        if (txt.length > 1 && txt.charAt(0) === txt.charAt(1))
            return ["っ", 1];

        let specialMapTable = {
            "shi": "し",
            "tsu": "つ",
            "chi": "ち",
            "ji": "じ",
            "fu": "ふ",
            "[": "「",
            "]": "」",
            ".": "。",
            ",": "、",
            "?": "？",
            "!": "！",
            "-": "ー",
            "v": "ゔ"
        };
        function makeSmallLetterMappings(base, jpBase) {
            specialMapTable[base + "a"] = jpBase + "ゃ";
            specialMapTable[base + "u"] = jpBase + "ゅ";
            specialMapTable[base + "o"] = jpBase + "ょ";
        }
        makeSmallLetterMappings("j", "じ");
        makeSmallLetterMappings("jy", "じ");
        makeSmallLetterMappings("ky", "き");
        makeSmallLetterMappings("gy", "ぎ");
        makeSmallLetterMappings("sh", "し");
        makeSmallLetterMappings("ch", "ち");
        makeSmallLetterMappings("ny", "に");
        makeSmallLetterMappings("んy", "に");
        makeSmallLetterMappings("hy", "ひ");
        makeSmallLetterMappings("by", "び");
        makeSmallLetterMappings("py", "ぴ");
        makeSmallLetterMappings("my", "み");
        makeSmallLetterMappings("ry", "り");
        if (specialMapTable.hasOwnProperty(txt.substr(0, 1)))
            return [specialMapTable[txt.substr(0, 1)], 1];
        if (specialMapTable.hasOwnProperty(txt.substr(0, 2)))
            return [specialMapTable[txt.substr(0, 2)], 2];
        if (specialMapTable.hasOwnProperty(txt.substr(0, 3)))
            return [specialMapTable[txt.substr(0, 3)], 3];

        let monographsEn = "aiueo";
        let monographsJp = "あいうえお";
        let iof = monographsEn.indexOf(txt.charAt(0));
        if (iof !== -1)
            return [monographsJp[iof], 1];

        let monographsJpArr = {
            "n": "なにぬねの",
            "ん": "なにぬねの",
            "k": "かきくけこ",
            "g": "がぎぐげご",
            "s": "さしすせそ",
            "z": "ざじずぜぞ",
            "t": "たちつてと",
            "d": "だぢづでど",
            "h": "はひふへほ",
            "b": "ばびぶべぼ",
            "p": "ぱぴぷぺぽ",
            "m": "まみむめも",
            "y": "や-ゆ-よ",
            "r": "らりるれろ",
            "w": "わ---を",
            " ": "あいうえお"
        };
        monographsJp = null;
        if (txt.charAt(0) in monographsJpArr) {
            monographsJp = monographsJpArr[txt.charAt(0)];
        }
        let monograph = null;
        if (monographsJp !== null && txt.length > 1) {
            iof = monographsEn.indexOf(txt.charAt(1));
            if (iof !== -1) {
                monograph = monographsJp.charAt(iof);
                if (monograph === "-")
                    monograph = null;
            }
        }
        if (monograph === null) {
            if (txt.charAt(0) === "n")
                return ["ん", 1];
            return null;
        }
        return [monograph, 2];
    }

    update() {
        if (this.dom.selectionStart !== this.dom.selectionEnd)
            return;
        let se = this.dom.selectionStart;
        let s = se;
        let v = this.dom.value;
        while (s > 0 && this.isLatin(v.charAt(s - 1)))
            --s;
        function replace(startIdx, endIdx, withTxt) {
            console.log("replace " + startIdx + ":" + endIdx + " with " + withTxt);
            v = v.substr(0, startIdx) + withTxt + v.substr(endIdx);
            if (se >= endIdx)
                se += withTxt.length - (endIdx - startIdx);
            return startIdx + withTxt.length;
        }
        if (s > 0 && v.charAt(s - 1) === 'ん') {
            let repl = this.makeReplacementFor(v.substr(s - 1, 3));
            if (repl !== null)
                s = replace(s - 1, s + 1, repl[0]);
        }
        while (s < se) {
            let repl = this.makeReplacementFor(v.substr(s, Math.min(se - s, 3)));
            if (repl === null)
                break;
            s = replace(s, s + repl[1], repl[0]);
        }
        this.dom.value = v;
        this.dom.selectionStart = se;
        this.dom.selectionEnd = se;
    }

}

class Game {

    constructor(data) {
        this.data = data;
        this.challengeIndex = -1;
        this.challengeCount = 10;
        this.challengePending = null;
        this.challengeFailed = null;
        this.challengeSentence = null;
        this.challengeSentenceIndex = -1;
        this.challengeCorrectNumber = 0;
        this.challengeIncorrectNumber = 0;
        this.challengeAlreadyIncorrect = false;
        this.challengeQuizKanji = null;

        this.domInputStage = document.getElementById("input_stage");
        this.domKanjiText = document.getElementById("kanji_text");
        this.domProgressText = document.getElementById("progress_text");
        this.domInput = document.getElementById("input");

        this.domPostInputStage = document.getElementById("post_input_stage");
        this.domPostText = document.getElementById("post_text");
        this.domPostSentenceJapanese = document.getElementById("post_sentence_japanese");
        this.domPostSentenceEnglish = document.getElementById("post_sentence_english");
        this.domPostSentenceYouSaid = document.getElementById("post_sentence_you_said");
        this.domPostSentenceYouSaidCtr = document.getElementById("post_sentence_you_said_ctr");

        this.domResultStage = document.getElementById("result_stage");
        this.domResultCorrectCount = document.getElementById("result_correct_count");
        this.domResultIncorrectCount = document.getElementById("result_incorrect_count");
        this.domResultTotalCount = document.getElementById("result_total_count");

        this.kanaIme = new KanaIme(this.domInput);
        this.domInput.addEventListener("keyup", (ev) => {
            if (ev.code === "Enter") {
                this.finishChallenge();
            }
        });

        document.addEventListener("keyup", (ev) => {
            if (ev.code === "Enter") {
                this.onDocumentEnterPressed(ev);
            }
        }, true);
    }

    start() {
        this.domResultStage.style.display = "none";

        this.challengeFailed = [];
        this.challengeIncorrectNumber = 0;
        this.challengeCorrectNumber = 0;
        this.challengeIndex = -1;
        this.nextChallenge();
    }

    nextChallenge() {
        this.challengeSentenceIndex = Math.floor(Math.random() * this.data.getSentenceCount());
        if (this.challengePending !== null) {
            let idx = Math.floor(Math.random() * this.challengePending.length);
            this.challengeSentenceIndex = this.challengePending[idx];
            this.challengePending.splice(idx, 1);
            if (this.challengePending.length === 0)
                this.challengePending = [];
        }
        this.challengeSentence = this.data.getSentenceInfo(this.challengeSentenceIndex);
        ++this.challengeIndex;
        this.challengeAlreadyIncorrect = false;

        this.domKanjiText.innerText = "";
        this.domKanjiText.appendChild(this.createFuriganaFor(this.challengeSentence, this.challengeQuizKanji));
        this.domProgressText.innerText = "Sentence " + (this.challengeIndex + 1) + "/" + this.challengeCount;
        this.domInput.value = "";

        this.domInputStage.style.display = "block";
        this.domPostInputStage.style.display = "none";
        this.domInput.focus();
    }

    finishChallenge() {
        if (this.domInputStage.style.display !== "block")
            return;

        this.domPostSentenceJapanese.innerText = "";
        this.domPostSentenceJapanese.appendChild(this.createFuriganaFor(this.challengeSentence, null));

        this.domPostSentenceEnglish.innerText = this.challengeSentence["en"];

        let userInput = this.domInput.value.replace("。", "").replace("？", "").replace("！", "").replace("、", "").replace("\\", "");
        let expectedInput = this.challengeSentence["jp_kana"].replace("。", "").replace("？", "").replace("！", "").replace("、", "");
        if (userInput === expectedInput) {
            if (!this.challengeAlreadyIncorrect)
                this.challengeCorrectNumber += 1;

            this.domPostText.innerText = "Correct Answer";
            this.domPostInputStage.classList.remove("invalid");
            this.domPostSentenceYouSaid.innerText = "";
            this.domPostSentenceYouSaidCtr.style.display = "none";
        } else {
            if (!this.challengeAlreadyIncorrect) {
                this.challengeIncorrectNumber += 1;
                this.challengeFailed.push(this.challengeSentenceIndex);
                this.challengeAlreadyIncorrect = true;
            }

            this.domPostText.innerText = "Incorrect Answer";
            this.domPostInputStage.classList.add("invalid");
            this.domPostSentenceYouSaid.innerText = "";
            this.domPostSentenceYouSaidCtr.style.display = "block";

            let diff = Diff.diffChars(userInput, expectedInput);
            diff.forEach((part) => {
                let span = document.createElement("span");
                span.innerText = part.value;
                if (part.added || part.removed)
                    span.classList.add(part.added ? "added" : "removed");
                this.domPostSentenceYouSaid.appendChild(span);
            });
        }

        this.domInputStage.style.display = "none";
        this.domPostInputStage.style.display = "block";
    }

    finishGame() {
        this.domInputStage.style.display = "none";
        this.domPostInputStage.style.display = "none";
        this.domResultStage.style.display = "block";

        this.domResultCorrectCount.innerText = this.challengeCorrectNumber;
        this.domResultIncorrectCount.innerText = this.challengeIncorrectNumber;
        this.domResultTotalCount.innerText = (this.challengeCorrectNumber + this.challengeIncorrectNumber);

        if (this.challengeFailed.length > 0)
            this.domProgressText.innerText = "Press enter to play again with incorrect sentences";
        else
            this.domProgressText.innerText = "Thank you for playing";
    }

    onDocumentEnterPressed(ev) {
        if (this.domResultStage.style.display === "block" && this.challengeFailed.length > 0) {
            this.challengePending = this.challengeFailed;
            this.challengeCount = this.challengePending.length;
            this.start();
            ev.stopPropagation();
        }
        if (this.domPostInputStage.style.display === "block") {
            if (this.domPostInputStage.classList.contains("invalid")) {
                this.domInputStage.style.display = "block";
                this.domPostInputStage.style.display = "none";
                this.domInput.focus();
            } else if (this.challengeCount === this.challengeIndex + 1) {
                this.finishGame();
            } else {
                this.nextChallenge();
            }
            ev.stopPropagation();
        }
    }

    createFuriganaFor(info, exclude) {
        let excludeRegex = exclude != null ? new RegExp("^[" + exclude + "]+$") : null;
        let ret = document.createElement("span");
        let arr = info["jp_parsed"];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].length === 1 || (excludeRegex != null && excludeRegex.test(arr[i][0]))) {
                ret.appendChild(document.createTextNode(arr[i][0]));
            } else {
                let ruby = document.createElement("ruby");
                ruby.textContent = arr[i][0];
                let rt = "";
                for (let j = 1; j < arr[i].length; j++)
                    rt += arr[i][j];
                let rtDom = document.createElement("rt");
                rtDom.textContent = rt;
                ruby.appendChild(rtDom);
                ret.appendChild(ruby);
            }
        }
        return ret;
    }

}
