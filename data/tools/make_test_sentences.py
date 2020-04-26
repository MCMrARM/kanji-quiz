import json
import random

HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"
KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
MISC_CHARS = "。「」？！ [|]"

with open("sentences.json") as f:
    sentences = json.load(f)
with open("known_kanji.txt") as f:
    known_kanji = f.read()
    allowed_chars = MISC_CHARS + HIRAGANA + KATAKANA + known_kanji
print(allowed_chars)
sentences = [s for s in sentences if all(c in allowed_chars for c in s["jp"])]
sentences = [s for s in sentences if any(c in known_kanji for c in s["jp"])]
print(len(sentences))

sentences = random.sample(sentences, 50)
with open("sentences_test.json", "w") as f:
    json.dump(sentences, f, ensure_ascii=False)