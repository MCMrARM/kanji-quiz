import json
import csv
from collections import defaultdict

en_sentences = defaultdict(dict)
jp_sentences = defaultdict(dict)

with open("eng_sentences.tsv") as f:
    reader = csv.reader(f, delimiter="\t", quotechar='"')
    for row in reader:
        en_sentences[row[0]]["en"] = row[2]

with open("jpn_transcriptions.tsv") as f:
    reader = csv.reader(f, delimiter="\t", quotechar='"')
    for row in reader:
        if row[2] not in ["Hrkt"]:
            print("Unknown transcript: " + row[2])
            continue
        jp_sentences[row[0]]["jp_script"] = row[2]
        jp_sentences[row[0]]["jp"] = row[4]

sentences = defaultdict(dict)

with open("links.csv") as f:
    reader = csv.reader(f, delimiter="\t", quotechar='"')
    for row in reader:
        if row[0] in jp_sentences and row[1] in en_sentences:
            sentences[row[0]] = {**jp_sentences[row[0]], **en_sentences[row[1]]}
        elif row[0] in en_sentences and row[1] in jp_sentences and row[1] not in sentences:
            sentences[row[1]] = {**jp_sentences[row[1]], **en_sentences[row[0]]}

sentences = [v for v in sentences.values() if "en" in v and "jp" in v]
with open("sentences.json", "w") as f:
    json.dump(sentences, f, ensure_ascii=False)