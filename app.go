package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
)

type Sentence struct {
	Jp string `json:"jp"`
	JpScript string `json:"jp_script"`
	En string `json:"en"`
}

func loadSentences() []Sentence {
	var sentences []Sentence

	file, err := os.Open("data/sentences.json")
	if err != nil {
		panic(err)
	}
	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		panic(err)
	}
	json.Unmarshal(bytes, &sentences)
	_ = file.Close()

	return sentences
}

var sentences = loadSentences()

func sampleSentences(list []*Sentence, n int) []*Sentence {
	if len(list) < n {
		return list
	}
	result := make([]*Sentence, 0, 5)

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
	filtered := make([]*Sentence, 0)
	for s := range sentences {
		filtered = append(filtered, &sentences[s])
	}

	count, err := strconv.ParseUint(r.FormValue("count")[0:], 10, 32)
	if err != nil {
		count = 10
	}
	if count > 100 {
		count = 100
	}

	out, err := json.Marshal(sampleSentences(filtered, int(count)))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "%s", string(out))
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
	http.Handle("/api/sentences", timer(http.HandlerFunc(getSentences)))

	log.Fatal(http.ListenAndServe(":8080", nil))
}