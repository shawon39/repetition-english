# Content Guide

How to write repetition content for Repetition English. Every JSON track file
must follow this guide. `node scripts/validate-data.mjs` checks the rules that a
machine can check. The rest is on the author.

## 1. The model

```
Level (starter → advanced)
 └─ Topic (weather, office, ...)
     └─ Track = one topic at one level  →  data/topics/<topic>/<level>.json
         └─ Unit = one grammar focus (present-simple, past-simple, ...)
             └─ Session = one sentence type (positive, negative, questions, ...)
                 └─ Item = one sentence (or one short paragraph)
```

The unit and session structure of every track comes from `blueprint` in
`data/catalog.json`. Follow it exactly: same units, same order, same session
types, same item counts.

## 2. Golden rules

1. **Never mix categories.** A session has one grammar focus (from its unit)
   and one sentence type. A "negative" session in "past-simple" contains only
   negative past simple sentences. A question session contains only questions.
2. **One story per track.** Each track follows one small story or setting with
   the same people and places. Sentences must feel connected, not random.
   Different tracks of the same topic may use different stories.
3. **Many ways to say it.** Within a topic, show many angles. Weather is not
   only "It is hot". It is also "The temperature is 35 degrees", "The sun is
   very strong", "I carry an umbrella", "We stay inside".
4. **Repetition by transformation.** At starter and elementary, about half of
   the items in negative and question sessions should transform a sentence
   from the positive session of the same unit (same scene, new form). At
   intermediate and advanced, reuse the same scenes and people but vary
   freely.
5. **Natural, correct English.** Write what a fluent speaker would really say.
   Use standard spelling (either US or UK, but stay consistent in a file; prefer
   US spelling).
6. **Two kinds of Bengali meaning.** Every item has a full-sentence meaning
   (`bn`), shown only when the learner asks for it, and difficult words carry
   their own meaning (`words`).

## 3. Levels

| Level | CEFR | Sentence length | Words glossed per item | Vocabulary |
|---|---|---|---|---|
| starter | A1 | 3–7 words | 1–2 | the most common everyday words |
| elementary | A2 | 5–10 words | 1–3 | common words, simple phrasal verbs |
| intermediate | B1 | 8–16 words | 2–3 | wider vocabulary, collocations |
| advanced | B2–C1 | 12–25 words | 2–4 | idioms, formal words, complex clauses |

Paragraph items (intermediate and advanced only):

- intermediate: 3–4 sentences, 35–60 words, 3–5 glossed words.
- advanced: 4–6 sentences, 55–90 words, 4–6 glossed words.
- A paragraph stays in the grammar focus of its unit (a past-continuous
  paragraph is mostly past continuous; supporting verbs in past simple are OK).
- Give every paragraph a short `title`.

## 4. Session types

| type | What every item must be |
|---|---|
| `affirmative` | A positive statement. No `not`, `n't`, `never`, `no`. Ends with `.` or `!` |
| `negative` | A negative statement (`not`, `n't`, `never`, `no`, `nobody`...). Ends with `.` |
| `yes-no-question` | A question answered with yes or no. Starts with an auxiliary (Is, Do, Did, Will, Can, Have...). Ends with `?` |
| `negative-question` | A question with a negative auxiliary (Isn't, Don't, Didn't, Hadn't, Won't...). Ends with `?` |
| `wh-question` | Starts with What, Where, When, Why, Who, Whose, Which, How (How much, How long...). Ends with `?` |
| `tag-question` | A statement plus a tag: `..., isn't it?` / `..., shouldn't we?` Ends with `?` |
| `indirect-question` | A polite or embedded question: `Could you tell me ...?`, `Do you know whether ...?`, `I wonder if ...` Ends with `?` or `.` |
| `paragraph` | A short connected text (see above) |

## 5. Grammar focus per unit

| grammar | Notes |
|---|---|
| `present-simple` | Include "to be" sentences (It is hot) and action verbs (I wear a jacket) |
| `present-continuous` | Actions happening now: It is raining. I am sweeping the floor. |
| `past-simple` | Yesterday, last week, ago. Regular and common irregular verbs |
| `future-will` | Predictions, promises, quick decisions |
| `future-going-to` | Plans and predictions from evidence (Look at those clouds. It is going to rain.) |
| `present-perfect` | Experience, recent events, just / already / yet / ever / never / since / for |
| `past-continuous` | Background actions, interrupted actions (was/were + -ing, when / while) |
| `present-perfect-continuous` | Duration up to now: has/have been + -ing, for / since |
| `past-perfect` | Earlier past: had + past participle, by the time / before / after |
| `modals` | should, must, have to, might, could, may, need to |
| `conditionals` | intermediate: first and second conditional. advanced: third and mixed conditionals |
| `passive` | Various tenses of the passive: is cleaned, was sent, has been fixed, will be delivered |

## 6. Glossary (`words`)

- Gloss the words a learner at that level may not know. At starter, gloss the
  key topic words (hot, rain, umbrella). Do not gloss "I", "the", "is".
- `w` is the word or phrase **exactly as it appears in the sentence**
  (case-insensitive match, whole words). Use phrases for phrasal verbs and
  collocations: `"w": "put away"`, `"w": "running late"`.
- `bn` is a short, natural Bengali meaning (1–4 words). Give 2 meanings
  separated by a comma only if both are useful: `"আর্দ্র, ভ্যাপসা"`.
- `pos` is one of: `noun`, `verb`, `adjective`, `adverb`, `phrase`,
  `phrasal verb`, `idiom`, `preposition`, `pronoun`, `conjunction`, `other`.
- `base` (optional) is the dictionary form when `w` is inflected:
  `{ "w": "swept", "bn": "ঝাড়ু দিয়েছিল", "pos": "verb", "base": "sweep" }`.
- Do not list the same word twice in one item.

## 7. Full-sentence meaning (`bn`)

- Natural, standard Bangla as spoken in Bangladesh (চলিত ভাষা). Translate the
  meaning, not word by word.
- Keep the **tense** and the **sentence type** of the English: a negative stays
  negative, a question stays a question and ends with `?`. Statements end with `।`.
- Write names in Bengali script (Nila → নীলা, Dhaka → ঢাকা) and numbers in
  Bengali digits (`৩৫ ডিগ্রি`, `৭টা`, `৫০০ টাকা`).
- Common English loanwords that Bangladeshis really use are fine (মিটিং, ইমেইল, অফিস).
- Paragraphs are translated in full, sentence by sentence.
- Translators write `data/bn/<topic>/<level>.json` as
  `{ "<grammar>/<type>/<id>": "বাংলা" }` (keys from
  `node scripts/export-items.mjs <topic> <level>`), then run
  `node scripts/merge-bn.mjs <topic>` to put each `bn` into the track.

## 8. Session fields

- `pattern`: the sentence formula in English, short and consistent.
  Example: `"It + is + adjective (+ time word)."` or
  `"Did + subject + verb (base) ...?"`
- `tipBn`: one short Bengali sentence that explains the pattern.
  Example: `"প্রশ্ন করতে Did শুরুতে বসে এবং verb তার মূল রূপে থাকে।"`

## 9. Numbers and symbols

- Write temperatures as `30 degrees`, never `30°C`.
- Write times as `7 o'clock`, `7:30`, or `seven thirty`.
- Money: `500 taka`, `20 dollars`. No currency symbols.
- Avoid emoji, quotes inside sentences, and brackets.

## 10. File format

```json
{
  "topic": "weather",
  "level": "starter",
  "title": "Weather Basics",
  "story": "Rina lives in Dhaka. Every morning she looks at the sky and talks about the weather with her brother Sami.",
  "storyBn": "রিনা ঢাকায় থাকে। প্রতিদিন সকালে সে আকাশ দেখে এবং ভাই সামির সাথে আবহাওয়া নিয়ে কথা বলে।",
  "units": [
    {
      "grammar": "present-simple",
      "focus": "Describe the weather today",
      "focusBn": "আজকের আবহাওয়া বর্ণনা করা",
      "sessions": [
        {
          "type": "affirmative",
          "pattern": "It + is + adjective (+ time word).",
          "tipBn": "আবহাওয়া বোঝাতে It is দিয়ে বাক্য শুরু হয়।",
          "items": [
            { "id": "01", "en": "It is hot today.", "bn": "আজ গরম।", "words": [{ "w": "hot", "bn": "গরম", "pos": "adjective" }] },
            { "id": "02", "en": "The sky is blue.", "bn": "আকাশ নীল।", "words": [{ "w": "sky", "bn": "আকাশ", "pos": "noun" }] }
          ]
        }
      ]
    }
  ]
}
```

Paragraph item:

```json
{
  "id": "01",
  "title": "A stormy evening",
  "en": "I was walking home when the wind started. ...",
  "words": [{ "w": "wind", "bn": "বাতাস", "pos": "noun" }]
}
```

Rules:

- `units[].grammar` values and order match `blueprint[level]`.
- `sessions[].type` values, order, and item counts match the blueprint unit.
- Item `id`s are `"01"`, `"02"`, ... in order inside each session.
- Files are UTF-8, 2-space indented JSON.
