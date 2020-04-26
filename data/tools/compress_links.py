import json
import csv
from collections import defaultdict

en_sentences = set()
jp_sentences = set()

with open("eng_sentences.tsv") as f:
    reader = csv.reader(f, delimiter="\t", quotechar='"')
    for row in reader:
        en_sentences.add(row[0])

with open("jpn_transcriptions.tsv") as f:
    reader = csv.reader(f, delimiter="\t", quotechar='"')
    for row in reader:
        jp_sentences.add(row[0])

sentences = defaultdict(dict)

with open("links_compressed.csv", "w") as cf:
    with open("links.csv") as f:
        reader = csv.reader(f, delimiter="\t", quotechar='"')
        for row in reader:
            if (row[0] in jp_sentences and row[1] in en_sentences) or (row[0] in en_sentences and row[1] in jp_sentences):
                cf.write(f"{row[0]}\t{row[1]}\n")
