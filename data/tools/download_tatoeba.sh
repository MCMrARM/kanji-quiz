#!/bin/bash

set -x
set -e

curl -o eng_sentences.tsv.bz2 https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2
bzip2 -df eng_sentences.tsv.bz2

curl -o jpn_transcriptions.tsv.bz2 https://downloads.tatoeba.org/exports/per_language/jpn/jpn_transcriptions.tsv.bz2
bzip2 -df jpn_transcriptions.tsv.bz2

curl -o links.tar.bz2 https://downloads.tatoeba.org/exports/links.tar.bz2
tar -xf links.tar.bz2
rm links.tar.bz2