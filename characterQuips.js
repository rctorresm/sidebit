// characterQuips.js
// Movie-referencing quips shown in place of the plain word/char counter
// (e.g. replacing notesCounter's text). NOT wired into the UI yet — this
// file is a standalone library for review.
//
// Design: one column per franchise (Marvel, DC, Star Wars, Harry Potter,
// Lord of the Rings/The Hobbit, Chuck Norris), each with a quip for every
// tier, zipped together into that tier's pool of 6. Explicit names,
// characters, and quotes throughout — not paraphrased description of
// length. Tiers are every 25 characters up to 1,000 (typical note length),
// wider hand-written bands from 1,000-10,000, and a formula-driven
// fallback beyond that so it never runs dry on very long notes.
// getCharacterQuip picks randomly from the matching tier's pool and,
// given the previously shown line, avoids repeating it back-to-back.
//
// Settings are not user-configurable — this is backend-only flavor text.

const TIER_MAXES = [
  25, 50, 75, 100, 125, 150, 175, 200, 225, 250,
  275, 300, 325, 350, 375, 400, 425, 450, 475, 500,
  525, 550, 575, 600, 625, 650, 675, 700, 725, 750,
  775, 800, 825, 850, 875, 900, 925, 950, 975, 1000,
  1500, 2500, 5000, 10000
]; // 44 tiers

const MARVEL = [
  "I am Groot.",
  "Whatever it takes... eventually.",
  "Even Ant-Man started small.",
  "Hulk's getting impatient. Write more.",
  "This wouldn't even make Nick Fury's incident report.",
  "Not exactly Avengers-assemble energy yet.",
  "Tony Stark would've automated this by now.",
  "Loki's mischief has more depth than this.",
  "Cap could hold that shield up longer than you've been typing.",
  "Wakanda forever. This note, not so much yet.",
  "This has more range than Hawkeye's aim. Barely.",
  "Even Peter Parker's homework has more words.",
  "Somebody alert S.H.I.E.L.D. — this is getting real.",
  "This is basically an Infinity Stone's worth of content.",
  "Thanos would call this note... inevitable.",
  "Doctor Strange saw 14,000,605 futures. This wasn't the winning one — yet.",
  "This has real Wanda-rewriting-reality energy.",
  "Somebody give this note a vibranium shield.",
  "Rocket's stolen bigger things than this word count. For now.",
  "This is basically Phase One of the MCU.",
  "You're monologuing like Thanos on Titan.",
  "This is giving full Ultron-uprising energy.",
  "Somebody call the Avengers. This note assembled itself.",
  "This has Civil War levels of complexity now.",
  "Somebody get Nick Fury on the phone about this.",
  "This is basically its own post-credits scene.",
  "Groot would need more than three words for this one.",
  "This note snapped its fingers and half the sidebar disappeared.",
  "This is Wakanda-reveal levels of a plot twist.",
  "Somebody's writing at full Tony-Stark-all-nighter pace.",
  "This has 'I love you 3000' levels of commitment.",
  "This is basically Infinity War's ensemble cast, but words.",
  "You've written the Snap of notes. Half your afternoon, gone.",
  "This has Endgame's runtime and Endgame's stakes.",
  "This is a whole Multiverse of Madness in note form.",
  "Somebody's assembling the Illuminati of paragraphs.",
  "This note has as many timelines as the Sacred Timeline, before Loki broke it.",
  "This is basically its own Disney+ spinoff series.",
  "This note has more phases than the MCU itself.",
  "Congrats, you've written a full page. Fury's already writing the sequel's incident report.",
  "This is officially Phase Four material.",
  "You've basically drafted the next Avengers roster.",
  "This is Endgame-runtime long. Somebody bring popcorn.",
  "This note is the whole Infinity Saga at this point."
];

const DC = [
  "I'm Batman.",
  "Not even Flash could speed through this yet.",
  "Krypton had more content than this note.",
  "Alfred would raise an eyebrow at this length.",
  "Even Robin's sidekick intro was longer.",
  "This wouldn't fill the Batcave's welcome mat.",
  "Clark Kent's disguise has more depth than this note.",
  "Themyscira wasn't built in this many characters.",
  "This needs the Lasso of Truth to admit it's short.",
  "Even the Batmobile's manual has more pages.",
  "Somebody call Commissioner Gordon, we've got a length problem.",
  "This is getting Gotham-at-night moody.",
  "Why so serious about the word count?",
  "This note has main-villain-monologue energy.",
  "Up, up, and — okay, this is actually going somewhere.",
  "Bruce Wayne would've hired someone to write this by now.",
  "Somebody signal the Bat-Signal, this note needs backup.",
  "Kryptonite has less impact than this paragraph.",
  "This has full Justice League roll-call energy.",
  "Diana Prince crossed No Man's Land for less than this. Respect.",
  "This is basically Two-Face's coin flip — could go either way, but it's long.",
  "Some men just want to watch the word count burn.",
  "This is giving full Dark Knight trilogy ambition.",
  "Somebody's building their own Hall of Justice out of paragraphs.",
  "This needs its own Batcave computer to organize.",
  "This has Lex Luthor's monologue energy, minus the evil plan.",
  "Somebody get this note a cape. It's earned one.",
  "This is basically all of Atlantis, but words.",
  "This has full Watchmen levels of 'this is longer than I expected.'",
  "It's not who you are underneath, it's how long you've been typing that defines you.",
  "This is basically its own Snyder Cut.",
  "This note has more extended-edition energy than the Snyder Cut, and that's saying something.",
  "This has enough content for its own Injustice storyline.",
  "This has Ben Affleck's Batman levels of brooding length.",
  "This is basically a whole Arkham Asylum case file.",
  "Somebody get Wonder Woman's shield, this note needs backup.",
  "This is officially a Gotham-sized production.",
  "This has as many twists as a Nolan Batman script.",
  "This note needs its own Watchtower to keep track of everything in it.",
  "One full page. Even Batman takes a breath after a page like this.",
  "This is basically its own DC Extended Universe entry.",
  "You've written enough for Gotham's entire case files.",
  "This is Snyder Cut runtime long — four hours, no apologies.",
  "This note is the whole Justice League saga at this point."
];

const STAR_WARS = [
  "These are not the droids you're looking for.",
  "Help me, Obi-Wan. This note is my only hope.",
  "Do or do not. There is no 'almost done.'",
  "Size matters not. Well, actually, it kind of does now.",
  "I am your father. Of this note, apparently.",
  "The Force is with this note. Barely, but it's there.",
  "Never tell me the odds of finishing this.",
  "This has real 'I've got a bad feeling about this' energy.",
  "Even Chewbacca's roar had more punctuation than this.",
  "This is turning into a proper Jedi training montage.",
  "You shall not pass — wait, wrong franchise. Still applies.",
  "This is basically a podracing commentary at this point.",
  "Somebody alert the Rebel Alliance, we've got length now.",
  "This has full Order 66 levels of plot twist.",
  "May the Force be with you. You'll need it to finish this.",
  "This is getting properly Yoda-wise-and-wordy.",
  "Somebody's building a whole Death Star out of paragraphs.",
  "This note has more scrolling than the opening crawl.",
  "This is basically its own trilogy at this point.",
  "You've unlocked full Jedi Master status.",
  "This has Vader's 'I find your lack of brevity disturbing' energy.",
  "This is giving full Emperor Palpatine monologue.",
  "Somebody get Yoda on the phone, this needs wisdom now.",
  "This has more twists than 'I am your father.'",
  "Somebody's assembling their own Rebel briefing room.",
  "This is basically Han shooting first, but with words.",
  "This note has survived more than the Millennium Falcon's hyperdrive.",
  "This has full Empire-Strikes-Back-is-actually-the-best-one energy.",
  "This is basically the Kessel Run, but in under twelve parsecs of scrolling.",
  "Somebody's writing at full 'unlimited power' Palpatine pace.",
  "This has more chosen-one energy than Anakin's entire arc.",
  "This is basically its own Skywalker saga.",
  "This note has as many Jedi Councils as opinions.",
  "This is giving full Jedi-archive energy.",
  "Somebody call the Senate, this note has gotten political.",
  "This has more scenes than the entire prequel trilogy's pod race.",
  "This note is basically its own Mandalorian season.",
  "This is officially longer than an opening crawl has any right to be.",
  "This has more lore than the entire Star Wars wiki. Almost.",
  "One full page. Somewhere, a scroll of golden text is applauding.",
  "This is basically its own spin-off trilogy.",
  "You've written enough for the entire Skywalker family tree.",
  "This is Return of the Jedi runtime long, extended cut included.",
  "This note is the whole Skywalker Saga at this point."
];

const HARRY_POTTER = [
  "Yer a wizard, Harry. Well, yer a note, at least.",
  "Wingardium Leviosa. Barely got this note off the ground.",
  "Even a first-year's essay has more ink than this.",
  "This wouldn't pass Professor McGonagall's inspection yet.",
  "Not even a Chocolate Frog card has this little text.",
  "This is shorter than the Sorting Hat's opening song. So far.",
  "Hagrid's 'yer a wizard, Harry' had more weight than this.",
  "This needs a Time-Turner to actually get somewhere.",
  "Somebody send this note by owl post — it's ready to fly now.",
  "This is basically your Hogwarts acceptance letter length.",
  "Expecto Patronum. This note finally has some substance.",
  "This has real 'first day at Hogwarts' energy.",
  "Somebody alert Dumbledore's Army, this is getting serious.",
  "This is turning into a proper Marauder's Map.",
  "Even Hermione's reading list is jealous of this pace.",
  "This has full 'Mischief Managed' energy — barely contained.",
  "Somebody's brewing a whole cauldron of content here.",
  "This note needs its own Room of Requirement to hold it all.",
  "This is basically a full Potions essay for Snape now.",
  "You've unlocked Prefect-level word count.",
  "This has He-Who-Must-Not-Be-Named levels of gravity now.",
  "Somebody call the Order of the Phoenix, this is escalating.",
  "This is giving full Dumbledore's-office-full-of-secrets energy.",
  "Even Snape wouldn't dock points from this one.",
  "This needs its own chapter in the textbook now.",
  "This has more twists than a Bertie Bott's Every Flavour Beans box.",
  "Somebody's writing at full Hermione-in-the-library pace.",
  "This note has survived more than a Basilisk encounter.",
  "This is basically its own N.E.W.T. exam.",
  "You've built a whole Chamber of Secrets out of paragraphs.",
  "This has more depth than the Black Lake.",
  "This is basically the Triwizard Tournament of notes — three tasks, no shortcuts.",
  "Somebody get the Pensieve, we need to review this whole thing.",
  "This is giving full Deathly Hallows finale energy.",
  "This note has as many horcruxes as plot points.",
  "This has enough content for its own Hogwarts elective.",
  "Somebody's assembling the whole Wizengamot to review this.",
  "This is officially longer than a Divination syllabus.",
  "This is more than what Harry Potter signed up for.",
  "One full page. Even Hermione would nod approvingly.",
  "This is basically its own spin-off at Ilvermorny.",
  "You've out-written the entire Half-Blood Prince's marginalia.",
  "This is Order of the Phoenix length — the longest book in the series, and that's a real fact.",
  "This note is the whole seven-book saga at this point."
];

const LORD_OF_THE_RINGS = [
  "My precious. That's about all there is so far.",
  "One does not simply write more. Except you should.",
  "Fly, you fools — this note needs more words.",
  "Even Bilbo's unexpected party invite was longer.",
  "The Shire's welcome sign has more text than this.",
  "This wouldn't even get you out of Hobbiton yet.",
  "Not even a second breakfast's worth of content.",
  "This needs a wizard to show up and get things moving.",
  "Somebody send an eagle, this note needs a lift.",
  "This is basically leaving the Shire for the first time.",
  "You shall not pass — without finishing this first.",
  "This has real 'the Fellowship is forming' energy.",
  "Somebody alert Rivendell, the council needs to see this.",
  "This is turning into a proper quest now.",
  "Even Gandalf took his time, and look how this turned out.",
  "This has full 'Speak, friend, and enter' energy.",
  "Somebody's building a whole Fellowship out of paragraphs.",
  "This note needs its own Council of Elrond to sort out.",
  "This is basically crossing the Misty Mountains at this point.",
  "You've unlocked proper Ranger-of-the-North status.",
  "This has Boromir's 'one does not simply' levels of gravity.",
  "Somebody call Legolas, this needs a keen eye to finish.",
  "This is giving full Mines-of-Moria-this-is-taking-forever energy.",
  "Even Gollum wouldn't call this 'precious' yet. Now he might.",
  "This needs its own map like the one in the front of the book.",
  "This has more twists than the path through Mirkwood.",
  "Somebody's writing at full Aragorn-becomes-king pace.",
  "This note has survived more than Frodo's trip through Shelob's lair.",
  "This is basically its own Two Towers at this point.",
  "You've built a whole Minas Tirith out of paragraphs.",
  "This has more depth than the Mines of Moria.",
  "This is basically Smaug's hoard of words at this point.",
  "Somebody get the Palantír, we need to see the whole thing.",
  "This is giving full Return-of-the-King extended-edition energy.",
  "This note has as many endings as the Return of the King movie. And that's saying something.",
  "This has enough content for its own Silmarillion footnote.",
  "Somebody's assembling the whole White Council to review this.",
  "This is officially longer than the walk to Mordor felt.",
  "This has more lore than Middle-earth itself. Almost.",
  "One full page. Frodo took less time to leave the Shire.",
  "This is basically its own Hobbit trilogy — stretched from one small book into three long movies. Fitting.",
  "You've out-written the entire appendices section.",
  "This is extended-edition runtime long, and you know it.",
  "This note is the whole trilogy at this point. Extended editions included."
];

const CHUCK_NORRIS = [
  "Chuck Norris writes notes with his mind. This isn't that.",
  "Chuck Norris doesn't need more characters. You might.",
  "Chuck Norris finished his notes before he started them.",
  "Chuck Norris counted to infinity. Twice. This note, once.",
  "Chuck Norris doesn't proofread. Typos fix themselves.",
  "Chuck Norris's grocery list has more range than this.",
  "Chuck Norris doesn't take notes. Notes take Chuck Norris.",
  "This is getting more serious. Chuck Norris approves.",
  "Chuck Norris can slam a revolving door. This note can slam too, apparently.",
  "Chuck Norris doesn't need a save button. It saves out of fear.",
  "This note is starting to have Chuck Norris levels of confidence.",
  "Chuck Norris once wrote a novel by staring at a blank page.",
  "Chuck Norris doesn't write essays. He roundhouse-kicks them into existence.",
  "This has real Chuck-Norris-doesn't-flinch energy now.",
  "Chuck Norris's to-do list only has one item: everything.",
  "This note is getting long enough to impress Chuck Norris. Almost.",
  "Chuck Norris doesn't need word counts. Words count themselves in his presence.",
  "This is basically Chuck-Norris-workout-routine length now.",
  "Chuck Norris counted every word in this note without looking.",
  "This has earned a nod from Chuck Norris. A small one.",
  "Chuck Norris doesn't edit. First drafts fear him too much to need it.",
  "This note has officially entered Chuck-Norris-approved territory.",
  "Chuck Norris once wrote War and Peace as a warmup.",
  "This is getting long enough that even Chuck Norris is taking notes.",
  "Chuck Norris doesn't read novels. Novels summarize themselves for him.",
  "This has real Chuck-Norris-roundhouse-kicked-writer's-block energy.",
  "Chuck Norris's autobiography wrote itself out of respect.",
  "This note could survive a Chuck Norris roundhouse kick at this point.",
  "Chuck Norris doesn't need chapters. He just glares at the plot until it resolves.",
  "This is officially longer than Chuck Norris's patience for small talk.",
  "Chuck Norris finished reading this note before you finished writing it.",
  "This has earned its own Chuck Norris fact.",
  "Chuck Norris doesn't outline. The outline writes itself in fear.",
  "This note has more stamina than Chuck Norris's workout tape.",
  "Chuck Norris once staring-contested a blank page into a bestseller.",
  "This is getting long enough to make Chuck Norris put his coffee down.",
  "Chuck Norris doesn't need a thesaurus. Words rearrange themselves for him.",
  "This note has survived longer than most of Chuck Norris's opponents.",
  "Chuck Norris's memoir is one page. This note has already beaten it.",
  "One full page. Chuck Norris did it in one punch.",
  "This is longer than Chuck Norris's list of fears. Which is empty.",
  "Chuck Norris once summarized this note before it existed.",
  "This note has more endurance than Chuck Norris's workout DVD, and that thing never ends.",
  "Chuck Norris doesn't write long notes. Long notes write themselves, out of fear of him."
];

const CHARACTER_QUIP_TIERS = TIER_MAXES.map((max, i) => ({
  max,
  quips: [MARVEL[i], DC[i], STAR_WARS[i], HARRY_POTTER[i], LORD_OF_THE_RINGS[i], CHUCK_NORRIS[i]]
}));

const CHARS_PER_PAGE = 1500; // ~1 screenplay page, industry page-per-minute rule

const OVERFLOW_TEMPLATES = [
  pages => `Somebody call the Avengers — ${pages} pages of Infinity Saga right here.`,
  pages => `This is Snyder-Cut-runtime long: about ${pages} pages, no apologies.`,
  pages => `That's about ${pages}x a screenplay page — Frodo took less time to get to Mordor.`,
  pages => `That's roughly ${pages} pages. Even Hermione needs a Time-Turner for that reading list.`,
  pages => `At ${pages} pages, this is basically its own trilogy. May the Force be with you.`,
  pages => `Chuck Norris read all ${pages} pages before you finished this sentence.`
];

function pickQuip(pool, previousQuip) {
  if (pool.length === 1) return pool[0];
  const candidates = previousQuip ? pool.filter(q => q !== previousQuip) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function tierFor(charCount) {
  const idx = CHARACTER_QUIP_TIERS.findIndex(t => charCount <= t.max);
  if (idx !== -1) return { key: "t" + idx, pool: CHARACTER_QUIP_TIERS[idx].quips };
  const pages = Math.round(charCount / CHARS_PER_PAGE);
  return { key: "overflow:" + pages, pool: OVERFLOW_TEMPLATES.map(fn => fn(pages)) };
}

// Single-shot pick, given the last quip shown for this exact range (not the
// note's last quip overall — see createQuipPicker for why that distinction
// matters when someone bounces back and forth across a range boundary).
function getCharacterQuip(charCount, previousQuipForThisRange) {
  if (!charCount || charCount <= 0) return "";
  return pickQuip(tierFor(charCount).pool, previousQuipForThisRange);
}

// Stateful helper for wiring into the UI: one instance per note/section
// (e.g. per note tab). Remembers the last quip shown *for each range*, not
// just the last quip shown overall — so bouncing back and forth across a
// boundary (typing/backspacing near it) can't show the same line twice in a
// row for that range, even if a different range was shown in between. The
// quip only changes when charCount crosses into a different range; calling
// get() again with a charCount still in the current range returns the same
// quip instead of re-rolling on every keystroke.
function createQuipPicker() {
  let currentKey = null;
  const lastShownByRange = {};

  return {
    get(charCount) {
      if (!charCount || charCount <= 0) {
        currentKey = null;
        return "";
      }
      const { key, pool } = tierFor(charCount);
      if (key !== currentKey) {
        lastShownByRange[key] = pickQuip(pool, lastShownByRange[key]);
        currentKey = key;
      }
      return lastShownByRange[currentKey];
    }
  };
}
