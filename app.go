package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math"
	"math/rand"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Sentence struct {
	Jp string `json:"jp"`
	JpScript string `json:"jp_script"`
	En string `json:"en"`
	Json []byte `json:"-"`
	Compounds []uint16 `json:"-"`
}

func loadKanjiMap() (map[rune]uint16, int) {
	bytes, err := ioutil.ReadFile("data/kanji_list.txt")
	if err != nil {
		log.Fatal(err)
	}
	str := string(bytes)
	str = strings.ReplaceAll(str, "\n", "")
	ret := make(map[rune]uint16)
	for idx, r := range str {
		ret[r] = uint16(idx)
	}
	return ret, len(str)
}

func loadSentences(kanjiMap map[rune]uint16) []Sentence {
	var sentences []Sentence

	bytes, err := ioutil.ReadFile("data/sentences.json")
	if err != nil {
		log.Fatal(err)
	}
	json.Unmarshal(bytes, &sentences)

	// build compounds
	compounds := make([]uint16, 0)
	compoundsI := 0
	for i, s := range sentences {
		inBrackets := false
		addedAnyChar := false
		for _, c := range s.Jp {
			if c == '[' {
				inBrackets = true
				addedAnyChar = false
			} else if c == ']' && inBrackets {
				inBrackets = false
				if addedAnyChar {
					compounds = append(compounds, math.MaxUint16)
				}
			} else if inBrackets {
				kanjiId, kanjiOk := kanjiMap[c]
				if kanjiOk {
					compounds = append(compounds, kanjiId)
					addedAnyChar = true
				}
			}
		}
		sentences[i].Compounds = compounds[compoundsI:len(compounds)]
		compoundsI = len(compounds)
	}
	fmt.Printf("compound array size: %d", len(compounds))

	// cache jsons, free fields
	filteredSentences := make([]Sentence, 0)
	for _, s := range sentences {
		if len(s.Compounds) == 0 {
			continue
		}
		s.Json, _ = json.Marshal(s)
		s.Jp = ""
		s.JpScript = ""
		s.En = ""
		filteredSentences = append(filteredSentences, s)
	}
	sentences = make([]Sentence, 0)

	runtime.GC()
	return filteredSentences
}

var kanjiList, kanjiMaxNo = loadKanjiMap()
var sentences = loadSentences(kanjiList)

func sampleSentences(list []*Sentence, n int) []*Sentence {
	if len(list) < n {
		return list
	}
	result := make([]*Sentence, 0, n)

	set := make(map[int]bool)
	for len(result) < n {
		i := rand.Intn(len(list))
		_, exists := set[i]
		if !exists {
			result = append(result, list[i])
		}
	}
	return result
}

func getSentences(w http.ResponseWriter, r *http.Request) {
	onlyCount := false
	if r.FormValue("only_count") == "1" {
		onlyCount = true
	}

	understoodKanji := make([]bool, kanjiMaxNo)
	understoodKanjiForm := r.FormValue("kanji")
	for _, c := range understoodKanjiForm {
		if c > math.MaxUint16 {
			continue
		}
		kanjiId, kanjiOk := kanjiList[c]
		if !kanjiOk {
			continue
		}
		understoodKanji[kanjiId] = true
	}

	understandThreshold, err := strconv.ParseFloat(r.FormValue("kanji_threshold")[0:], 64)
	if err != nil {
		understandThreshold = 1.0
	}

	filtered := make([]*Sentence, 0)
	filteredCount := 0
	for i, s := range sentences {
		compoundUnderstood := true
		understoodCompounds, totalCompounds := 0, 0
		for _, c := range s.Compounds {
			if c == math.MaxUint16 {
				if compoundUnderstood {
					understoodCompounds += 1
				}
				totalCompounds += 1
				compoundUnderstood = true
			} else if !understoodKanji[c] {
				compoundUnderstood = false
			}
		}
		if float64(understoodCompounds) / float64(totalCompounds) < understandThreshold {
			continue
		}
		filteredCount += 1
		if !onlyCount {
			filtered = append(filtered, &sentences[i])
		}
	}
	if onlyCount {
		fmt.Fprintf(w, "%d", filteredCount)
		return
	}

	count, err := strconv.ParseUint(r.FormValue("count")[0:], 10, 32)
	if err != nil {
		count = 10
	}
	if count > 100 {
		count = 100
	}

	io.WriteString(w, "[")
	for i, s := range sampleSentences(filtered, int(count)) {
		if i != 0 {
			io.WriteString(w, ",")
		}
		w.Write(s.Json)
	}
	io.WriteString(w, "]")
}

func timer(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()
		h.ServeHTTP(w, r)
		duration := time.Now().Sub(startTime)
		fmt.Printf("%s: %s\n", r.URL, duration)
	})
}

func main() {
	static := http.FileServer(http.Dir("./static"))
	http.Handle("/", static)
	http.HandleFunc("/api/kanji-groups", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "data/kanji_groups.json")
	})
	http.Handle("/api/sentences", timer(http.HandlerFunc(getSentences)))

	log.Fatal(http.ListenAndServe(":8080", nil))
}