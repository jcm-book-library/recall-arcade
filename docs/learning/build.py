from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
S="/tmp/claude-0/-home-user-recall-arcade/152be2aa-1e3d-50c7-aa0a-85f3ca81180a/scratchpad/"
G=S+"guide/"
d=Document()
st=d.styles["Normal"]; st.font.name="Arial"; st.font.size=Pt(11)
for s in d.sections: s.left_margin=s.right_margin=Cm(2); s.top_margin=s.bottom_margin=Cm(1.8)
def H(t,l=1): d.add_heading(t,level=l)
def P(t,bold_lead=None,italic=False):
    p=d.add_paragraph()
    if bold_lead: r=p.add_run(bold_lead); r.bold=True
    r=p.add_run(t); r.italic=italic; return p
def B(items,style="List Bullet"):
    for it in items:
        p=d.add_paragraph(style=style)
        if isinstance(it,tuple): r=p.add_run(it[0]); r.bold=True; p.add_run(it[1])
        else: p.add_run(it)
def IMG(f,w=16,cap=None):
    d.add_picture(f,width=Cm(w)); d.paragraphs[-1].alignment=WD_ALIGN_PARAGRAPH.CENTER
    if cap:
        p=d.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run(cap); r.italic=True; r.font.size=Pt(9); r.font.color.rgb=RGBColor(0x58,0x68,0x74)
def shade(cell,hexc):
    tcPr=cell._tc.get_or_add_tcPr(); sh=OxmlElement("w:shd"); sh.set(qn("w:val"),"clear"); sh.set(qn("w:color"),"auto"); sh.set(qn("w:fill"),hexc); tcPr.append(sh)
def T(rows,widths=None):
    t=d.add_table(rows=len(rows),cols=len(rows[0])); t.style="Table Grid"
    for i,r in enumerate(rows):
        for j,v in enumerate(r):
            c=t.cell(i,j); c.text=""; run=c.paragraphs[0].add_run(str(v)); run.font.size=Pt(9.5)
            if i==0: run.bold=True; shade(c,"F0A31A")
    if widths:
        for row in t.rows:
            for j,w in enumerate(widths): row.cells[j].width=Cm(w)
    d.add_paragraph()
def CODE(text,cap=None):
    t=d.add_table(rows=1,cols=1); c=t.cell(0,0); shade(c,"EEF1F3"); c.text=""
    para=c.paragraphs[0]
    for k,line in enumerate(text.strip("\n").split("\n")):
        r=para.add_run(line+("\n" if k<len(text.strip("\n").split("\n"))-1 else "")); r.font.name="Courier New"; r._element.rPr.rFonts.set(qn("w:eastAsia"),"Courier New"); r.font.size=Pt(9)
    if cap:
        p=d.add_paragraph(); r=p.add_run(cap); r.italic=True; r.font.size=Pt(9); r.font.color.rgb=RGBColor(0x58,0x68,0x74)
    else: d.add_paragraph()
def TIP(t):
    tb=d.add_table(rows=1,cols=1); c=tb.cell(0,0); shade(c,"FFF4DC"); c.text=""; r=c.paragraphs[0].add_run("💡 "+t); r.font.size=Pt(10); d.add_paragraph()

# ---------------- Title
d.add_heading("How our pixel games work",0)
P("A visual guide to Planet Pong, The Labyrinth and Flyover: the game styles, the mechanics, where they came from, and how the code makes them happen. Written for someone who has never coded. Read it in any order: each part stands on its own.",italic=True)
P("6 Nov 2026 · Recall Arcade",italic=True)

H("The short version (read this first)")
B([("Every game is a loop. ","Read the controls, move everything a tiny bit, draw the picture. Repeat about 120 times a second and it looks like motion."),
   ("Each of our games teaches a different layer. ","Pong: things moving and bouncing. The Labyrinth: a world made of tiles, enemies and keys. Flyover: smooth flight, a scrolling world, and levels the computer builds for you."),
   ("The mechanics aren't new. ","Each one has a 40 to 60-year history, from 1950s oscilloscope tennis to today's phone games. Knowing the history shows what a mechanic is good at and what it's bad at."),
   ("The code is mostly plain words and numbers. ","A lot of what makes the games feel right is a handful of numbers at the top of each file (speeds, sizes, timings) and some data files you could edit yourself (maps, routes)."),
   ("Nothing is magic. ","When a game feels unfair, it's usually one of three things: a hitbox, a timing, or randomness. We built checker scripts to catch those.")])

H("At a glance")
T([["","Planet Pong","The Labyrinth","Flyover"],
   ["Game style","Bat-and-ball (1970s arcade)","Top-down maze adventure (1980s)","Side-scrolling flight (1980s arcade to 2010s phone games)"],
   ["How things move","Smooth, in straight lines, bouncing","Grid: hop tile to tile with a slide","Smooth, with momentum, gravity and drag"],
   ["The world","One screen, nothing scrolls","A big tile map, the camera follows you","A long world that slides past a fixed plane"],
   ["The challenge","Reflexes and angles","Planning a route, timing, escaping","Steering, reading hazards, managing fuel"],
   ["New ideas it brought","Game loop, velocity, collisions, a computer opponent","Tile maps, enemies that chase, keys and doors, hearts, timed traps, a puzzle checker","Physics, parallax, hitboxes, levels built by the computer, fairness tests, fuel as a life bar"],
   ["Classic ancestors","Tennis for Two, Pong, Breakout, Arkanoid","Pac-Man, The Legend of Zelda, Gauntlet, Pokémon","Scramble, Defender, Gradius, Helicopter, Flappy Bird, Jetpack Joyride"]],[3,4.5,4.5,4.5])

# ---------------- Part 1 foundations
H("Part 1. The ideas every game shares")
H("1.1 The game loop",2)
IMG(G+"d01-loop.png",12)
P("A video game is a flip-book that draws its own pages. Each time round the loop, the game reads the controls, works out where everything has moved to since last time (the update), and repaints the whole screen (the draw). Do that quickly enough and your eyes see smooth motion.")
B(["The update is the 'rules' of the game: speed, bouncing, catching, scoring.","The draw is only the 'looks'. It never decides anything. Keeping these two apart is one of the most important habits in game code: you can change how something looks without breaking how it behaves, and the other way round."])
H("1.2 The fixed timestep: the same speed on every screen",2)
IMG(G+"d02-timestep.png",15)
P("Screens refresh at different speeds: 60, 120 or 144 times a second. If the game moved things once per refresh, the ball would be twice as fast on a fancy phone. So all three games chop time into equal 1/120-second slices and run the update once per slice, as many slices as needed to catch up. The draw happens once per refresh. This idea is often called a fixed timestep, and it was popularised for games in the 2000s (it's why the games behave the same for you, a helper's test robot, and a slow old tablet).")
H("1.3 Tiny pixels, made bigger",2)
P("All three games draw on a deliberately tiny canvas (320 × 180 dots for Pong and Flyover, 320 × 192 for The Labyrinth), about the size of a 1980s home computer screen. The browser then blows it up with crisp square pixels. That's what gives the retro look, and it keeps the numbers small and easy to reason about: 'the paddle is 28 pixels tall' means something you can picture.")
H("1.4 Pictures made from letters",2)
IMG(G+"d03-letters.png",15)
P("None of the art is a picture file (except your hero.png and the Tail Fin photos). Each sprite is written in the code as rows of letters, and each letter is a colour. The game paints the letters onto a hidden canvas once, then stamps that picture wherever it's needed. This is the same thing Piskel does when you draw: a grid where every cell is one colour. It also means a helper can 'draw' by typing, and you can change a colour by changing one line.")
TIP("Symmetrical things (the Minotaur, bats, wasps) are written as the LEFT half only and mirrored by the code. Half the typing, and they're always perfectly even.")

# ---------------- Pong
H("Part 2. Planet Pong: bat-and-ball")
IMG(S+"hard-split.png",14,"Hard level: Ceres is in play (it smashes asteroids in one hit), and the asteroids have split in two.")
H("The style",2)
P("A bat-and-ball game: two paddles, one ball, first to a score wins. It's the very first video game style. You can learn it in five seconds, which is exactly why it's the first stop on the island.")
H("The mechanics, and what they do",2)
T([["Mechanic","What it means","What it lets the game do","What it holds back"],
   ["Velocity","The ball has a speed AND a direction, e.g. 'right 120 and up 40 pixels per second'. Each slice, its position moves by velocity × time.","Smooth, believable motion in any direction from just two numbers.","Real physics (spin, air) is ignored. Fine for Pong, not for a golf game."],
   ["Collision (rectangle overlap)","Every thing is treated as a box. Two boxes touch if they overlap on both the left–right and up–down axes.","Fast and dead simple. Used for paddles, walls and asteroids.","Round things are treated as square. At very high speeds a ball can skip right through a thin wall between two slices (called 'tunnelling'), which is one reason the ball has a top speed."],
   ["Bounce angle from where you hit","Hit the paddle's centre and the ball goes straight; hit an edge and it goes steeply (up to 55°).","Skill: you aim with the paddle. The brighter paddle ends show this.","Very steep angles make the ball bounce up and down a lot, so it's capped."],
   ["Speeding up","The ball gets 7 px/s faster every hit, up to a maximum.","Rallies get tense; the game naturally builds to a climax.","Too fast becomes luck, not skill, hence the cap."],
   ["A beatable computer opponent","The computer paddle simply chases the ball, but has a top speed slower than the fastest ball.","An opponent that feels alive with one line of logic, and is beatable with angled shots.","It never 'thinks ahead', so experienced players learn to exploit it."],
   ["Breakable obstacles (hit points)","Asteroids take 1–3 hits; on Hard they split in two.","Variety and surprise in the middle of the court.","More objects means more to check every slice (fine at this size)."],
   ["Special balls and powers","Dwarf planets with powers (Pluto worth double, Haumea fast, Eris shrinks the computer's paddle, Makemake curves); Halley's Comet as a rare second ball.","The same rules, but each serve feels different. Teaches the planets too.","Each power is a special case in the code, so a dozen of them would get messy."]],[3,5,4.5,4.5])
IMG(G+"d07-bounce.png",13)
H("Where it came from",2)
B([("1958: Tennis for Two. ","A physicist, William Higinbotham, showed visitors a tennis game on a laboratory oscilloscope. Arguably the first video game made just for fun."),
   ("1972: the Magnavox Odyssey and Pong. ","The first home console had a tennis game; Atari's Pong arcade machine made it a craze. Pong's paddle was secretly split into segments that sent the ball off at different angles: the exact trick our paddles use."),
   ("1976: Breakout. ","Turned Pong sideways into a solo game: bounce the ball into a wall of bricks. Our breakable asteroids are a nod to it."),
   ("1986: Arkanoid. ","Added power-ups that fall from bricks. Our dwarf planets with powers come from this line of thinking."),
   ("Today: ","Brick breakers and 'one more go' phone games still run on exactly these mechanics.")])

# ---------------- Labyrinth
H("Part 3. The Labyrinth: a top-down maze adventure")
IMG(S+"lab-1-garden-open.png",14,"The Garden Maze: every hedge, path and flower is one 16 × 16 tile.")
H("The style",2)
P("Seen from above, like the early Zelda and Pokémon games: you walk a maze, collect things, open doors with keys, and avoid (or outwit) enemies. Where Pong is about reflexes, this style is about planning: which way round, when to dash, what to grab first.")
H("The mechanics, and what they do",2)
IMG(G+"d04-movement.png",15)
T([["Mechanic","What it means","What it lets the game do","What it holds back"],
   ["Tile map","The world is a grid. Each level is rows of letters: # is a wall, . is floor, * a gem, P the start, E the exit.","Levels are easy to design and edit by typing. Checking 'can I walk here?' is just looking up one letter.","Everything is square and lines up on the grid. Organic shapes are hard."],
   ["Grid movement with a slide","The hero hops from tile to tile, but slides smoothly between them (0.14 s per step).","Precise, fair movement: you always know exactly where you are.","No diagonals or 'in between' positions. Feels a little stiff compared with Flyover."],
   ["Input buffering","The game remembers a key you tapped for a quarter of a second, and uses it as soon as the hero can turn.","You can press 'turn left' slightly early and it still happens. Makes controls feel responsive.","Too long a buffer and it feels like the game is doing things you didn't ask for."],
   ["Camera that follows","The map is bigger than the screen; the view slides to keep the hero in sight.","Big levels to explore on a small screen.","You can't see far ahead, which is a challenge (good) or frustrating (bad)."],
   ["Keys, doors and gems","Locked doors need the right key; every gem opens the way out.","Puts an ORDER on the level: explore here first, then there. The core of puzzle design.","You must make sure the key is reachable before its door, or the level is impossible (hence the checker)."],
   ["Enemies: patrol and chase","Bats and wasps fly back and forth. The Minotaur chases you when you're within 10 steps along the corridors, and wanders otherwise.","Simple rules that feel alive. Each enemy type asks something different of you.","They don't plan. Players learn the patterns, which is part of the fun."],
   ["Hearts and safe blink","A hit costs a heart; you blink for 1.5 s and can't be hit again.","Mistakes cost something but don't end the run. (Your note made this fairer: no more restarting.)","Too generous and there's no tension."],
   ["Timed traps (telegraphing)","Fire jets glow and hiss before they fire, on a fixed rhythm.","Danger you can read and time. Fair difficulty.","Players who don't notice the warning feel cheated, so the warning must be loud."],
   ["Trapdoors and random landing","Step on one, fall to the start or a random safe spot.","Surprise and a little luck.","Randomness can feel unfair, so the landing spot is always reachable and never next to an enemy."],
   ["A thrown item (the ice)","A projectile moves tile by tile until it hits something; it freezes an enemy for 5 s.","A one-shot choice: use it now or save it.","Only one thing at a time to keep it simple."],
   ["Random flips","Each play mirrors the map left–right, top–bottom or both.","Four versions of every level for free, all the same length, so best times stay fair.","It's the same maze in a mirror. Truly new mazes need hand-made versions."]],[3,5,4.5,4.5])
IMG(S+"lab-12-jet-flames.png",13,"The Lava Heart: a fire jet firing along a corridor. It glows and hisses first.")
H("The puzzle checker (flood fill)",2)
IMG(G+"d08-floodfill.png",16)
P("How do we know a level can be finished? The checker 'pours paint' from the start square: colour it, then every open square next to a coloured one, and keep going until nothing new gets coloured. It's exactly the paint bucket tool in Piskel. If the exit, every key and every gem got coloured, the level works. Our checker runs this on every level and all four flips, treating trapdoors as holes and doors as shut until their key is reached.")
H("Where it came from",2)
B([("1980: Rogue and Pac-Man. ","Rogue drew dungeons from letters on a text screen (sound familiar?) and invented the random dungeon. Pac-Man's four ghosts each chase you differently: the same 'simple rule, lively result' idea as our Minotaur."),
   ("1985: Gauntlet. ","Top-down dungeons, keys, doors and swarms of enemies, with your health ticking down."),
   ("1986: The Legend of Zelda. ","Top-down exploring, dungeons with locked doors and keys, items that open new paths. The template for our Labyrinth."),
   ("1996: Pokémon Red and Green. ","Grid movement with a smooth slide between tiles, exactly like our hero."),
   ("Today: ","The 'roguelike' family (Spelunky, Hades) mixes hand-made pieces with random variation. Our map flips are a first small step in that direction.")])

# ---------------- Flyover
H("Part 4. Flyover: side-scrolling flight")
IMG(S+"fly4-9-bolt-down.png",14,"Leg 3: a thundercloud zapping downwards after flashing its warning light.")
H("The style",2)
P("A side-on flight where the world scrolls past. One control (hold to climb, let go to sink), lots to read and react to. It sits between the 1980s arcade 'shoot-'em-ups' and the one-button phone games of the 2000s and 2010s. We added a quiz into the gates, and fuel as a life bar.")
H("The mechanics, and what they do",2)
IMG(G+"d06-parallax.png",15)
T([["Mechanic","What it means","What it lets the game do","What it holds back"],
   ["Physics: acceleration and drag","Holding climb pushes the plane up harder and harder; letting go, gravity takes over; drag (air resistance) slows the up-and-down speed so it settles.","Each plane feels different: the Cessna is twitchy, the jumbo is heavy and keeps drifting. Same code, different numbers.","Harder to be precise than grid movement. That's the skill."],
   ["The world scrolls, the plane doesn't","The plane always sits a third of the way across. Everything else is drawn 'how far we've flown' to the left.","A world as long as we like, with simple maths.","Can't fly backwards (on purpose)."],
   ["Parallax","Far layers slide slowly, near layers fast.","A flat picture feels deep. Cheap and beautiful.","Purely looks: it doesn't change the rules."],
   ["Hitboxes smaller than pictures","Only a smaller rectangle inside each cloud, bird or plane counts as touching.","Near-misses feel fair, not cheap.","Too small and players clip through things that clearly hit them."],
   ["Levels built by the computer","Obstacles are placed from a 'recipe' per terrain (sea: storms and gulls; city: buildings and helicopters…), using a seeded random generator.","Every flight is different, with no hand-made level files, and a seed number can replay exactly the same course for testing.","Randomness can build something unfair or impossible, so everything must be checked."],
   ["Fairness tests","Before a course is used, the code 'flies' an imaginary plane through it to prove there's a way. The checker repeats this with hundreds of seeds, and at 24 moments of every moving hazard's cycle.","Random but always passable. It caught real unfair cases (a dust devil beside a lightning bolt).","It takes a little time when a leg loads."],
   ["Checkpoints with a question","Three gates, one right airport code. A wrong gate is a strike.","Learning woven into play, not a pop-up quiz.","The gates need clear sky around them, so obstacles are kept away."],
   ["Strikes and fuel (a life bar)","Leg 1: 3 strikes. Legs 2–3: fuel drains while climbing; a stopover refills it.","A resource to manage: tension that builds slowly, and planning ('can I make the next stopover?').","Fuel numbers need careful tuning, so a simulation flies pretend pilots to check them."],
   ["Telegraphed and moving hazards","Thunderclouds flash a light before zapping; helicopters swing on a smooth wave; dust devils grow and shrink.","Dangers you can read, time and outsmart.","Every new hazard needs a fairness test."],
   ["States","The game is always in one 'state': ready, briefing, playing, paused, diverted, leg done, won.","Clear rules for what each key does at each moment.","More states means more combinations to test."]],[3,5,4.5,4.5])
IMG(G+"d05-hitbox.png",14)
IMG(G+"d09-telegraph-sine.png",14)
H("Where it came from",2)
B([("1981: Scramble and Defender. ","The first side-scrolling shooters. Scramble even had a fuel gauge you had to keep topped up, 45 years before our fuel bar."),
   ("1982: Moon Patrol. ","Made parallax scrolling famous in arcades."),
   ("1985: Gradius. ","Waves of enemies on set flight paths, many of them smooth waves like our helicopter."),
   ("Early 2000s: the 'Helicopter' web game. ","One button: hold to rise, let go to fall, dodge the cave walls. Flyover's controls are this."),
   ("2011 to 2013: Jetpack Joyride and Flappy Bird. ","Endless one-button flyers with obstacles generated as you go."),
   ("Seeds: ","Elite (1984) squeezed a whole galaxy into a computer by generating it from a seed number; Minecraft worlds still do this. Our 'seed' replays a course exactly.")])

# ---------------- Code
H("Part 5. An introduction to the code")
H("5.1 What code actually is",2)
B(["Code is a text file of instructions that the computer follows, mostly from top to bottom. It looks like a mix of English words, maths and punctuation.",
   "Our games are written in TypeScript: JavaScript (the language every web browser understands) plus little labels that say what kind of thing each value is (a number, some text, a list). The labels let the computer catch mistakes before the game even runs.",
   "A tool called Vite gathers all our files and turns them into the finished website. GitHub Pages then puts that website online every time you merge a pull request."])
H("5.2 How a game actually starts",2)
B([("1. ","You open the site. The browser loads one page and one starting file, src/main.ts."),
   ("2. ","main.ts looks at the end of the address (#pong, #labyrinth, #flyover, #island) and calls that game's start function, e.g. renderPong."),
   ("3. ","The start function makes the canvas, the score strip and the buttons, sets up the controls, and starts the loop."),
   ("4. ","When you leave the page it runs a 'clean-up' that stops the loop and removes the key listeners, so the game doesn't keep running in the background.")])
H("5.3 A whole game in 20 lines (simplified)",2)
P("This isn't from our files, but it's the same skeleton every one of our games is built on: a square you can move with the arrow keys.")
CODE('''const canvas = document.querySelector("canvas");   // the drawing area
const pen = canvas.getContext("2d");               // the "pen" we draw with
let x = 100;                                       // where the square is
const held = {};                                   // which keys are down

addEventListener("keydown", (e) => held[e.key] = true);   // 1. INPUT
addEventListener("keyup",   (e) => held[e.key] = false);

function update(seconds) {                         // 2. UPDATE: the rules
  if (held.ArrowRight) x = x + 150 * seconds;      // speed: 150 pixels a second
  if (held.ArrowLeft)  x = x - 150 * seconds;
}

function draw() {                                  // 3. DRAW: the looks
  pen.fillStyle = "black"; pen.fillRect(0, 0, 320, 180);   // wipe the screen
  pen.fillStyle = "orange"; pen.fillRect(x, 80, 16, 16);  // the square
}

function loop() { update(1 / 120); draw(); requestAnimationFrame(loop); }
loop();                                            // ...and round we go''')
B([("const / let: ","give something a name. const never changes, let can."),
   ("function: ","a named set of steps you can run whenever you like (update, draw)."),
   ("if: ","only do this when something is true."),
   ("requestAnimationFrame: ","the browser's way of saying 'call me again when the screen is ready for the next picture'. That's what makes it a loop.")])
H("5.4 Highlights in our real code (the parts we'll keep building on)",2)
P("Settings at the top of every game. ",bold_lead="1. ")
CODE('''const W = 320;                // the canvas is 320 game pixels wide
const PH = 28;               // paddle height
const CPU_SPEED = 80;        // slower than the ball can go, so the computer can be beaten
const BALL_START_SPEED = 120;
const BALL_SPEEDUP = 7;      // extra speed after every paddle hit...
const BALL_MAX_SPEED = 230;  // ...but never faster than this
const STEP = 1 / 120;        // the fixed timestep''',"From src/arcade/pong.ts. Most of a game's 'feel' lives in numbers like these. Change one, and the game changes.")
P("Data kept apart from the code. The maps, routes and island are data files you could edit without understanding the rest:",bold_lead="2. ")
CODE('''"#########################################",
"#P..............#.....#.....#...........#",
"###############.#####.#.###.#.#.#######.#",
"#...#.........#.#...#....*#.#.#.#.....#.#",''',"src/arcade/labyrinth-maps.ts: one letter per tile. # wall, . floor, P start, * gem.")
CODE('''route("HBA MEL SYD BNE CNS", "sea, mountains, coast, coast"),
route("PER MRU CPT WDH LOS",   "sea, coast, desert, sea", "CPT"),''',"src/arcade/flyover-data.ts: your routes, the terrain of each hop, and the stopovers.")
P("A shared toolkit. src/arcade/kit.ts holds what every game needs (the loop, the letter-art painter, saving best times, beeps), so a new game starts with those already solved.",bold_lead="3. ")
P("Checker scripts. scripts/check-labyrinth.mjs, check-flyover.mjs and check-island.mjs prove the levels are possible and fair. A checker is a safety net: it lets us (and you) change maps and numbers without fear.",bold_lead="4. ")
P("Test hooks and a robot browser. In the development copy each game has a secret helper (for example window.__flyover) that can jump to a leg or set the fuel. A 'headless' browser (Playwright) drives the games like a robot player and takes the screenshots you've seen in our reports.",bold_lead="5. ")
P("Saving in the browser. Best times, stamps and your progress are kept in the browser's own storage (localStorage) on your device. That's why nothing is shared between devices yet: a later project (accounts) would fix that.",bold_lead="6. ")
H("5.5 How a change gets made",2)
IMG(G+"d10-process.png",17)
P("Every change follows the same path: your idea, a design note in docs/, a written brief, a helper builds and tests, the lead session reviews, plays and fixes, a pull request, you merge, and the live site updates a few minutes later. The design notes are why a new session can pick up exactly where the last one stopped.")
TIP("Want to try a change yourself? The safest first experiment is a data file: add a gem (*) to a Labyrinth map or a new route to Flyover on GitHub, choose 'Create a new branch and start a pull request', and ask me to run the checker before you merge.")

# ---------------- The island
H("Part 6. The island: everything joined up")
IMG(S+"route-overview.png",15,"The whole island: a fenced loop past the six buildings, with gates and arcade stops.")
P("The island reuses The Labyrinth's engine (tiles, grid walking, camera, your hero) and adds a route: gates that open when a stop's challenges are done, skippable arcade stops that earn stamps, and free roam once you've been all the way round. It's the same idea as a board game's track, and as 1990s 'overworld maps' (Super Mario World, 1990) that link levels together.")

# ---------------- later
H("Part 7. Saved for later (we'll learn these as we build)")
T([["Topic","What it is","When we'll meet it"],
   ["Gravity and jumping","Things fall faster and faster; a jump is a burst of upward speed.","The Brawl (a side-on platformer)"],
   ["Platforms and slopes","Standing on things, not just bumping into them.","The Brawl"],
   ["Animation frames","Swapping pictures to make walking, running, jumping.","Your hero, the Brawl"],
   ["Attack patterns and phases","A boss that telegraphs moves and changes as it weakens.","The Boss"],
   ["Fake 3D","Making things bigger as they get closer, like old racing games (OutRun, 1986).","The Chase"],
   ["Behaviour states for enemies","Patrol, notice, chase, give up: a more 'thinking' version of the Minotaur.","The Brawl and the Boss"],
   ["Sound design","Our sounds are made by the computer from notes (no sound files). Music and effects that react to play.","Any time"],
   ["Saving across devices","Accounts and a database, so progress follows you.","The backend project"]],[4,8,5])

H("Glossary")
T([["Word","Meaning"],
   ["Game loop","Read input, update, draw, again and again."],
   ["Fixed timestep","Moving the game in equal slices of time so it runs at the same speed on every screen."],
   ["Sprite","A small picture that moves around (the hero, a bat, the plane)."],
   ["Tile / tile map","A square piece of the world / the grid of letters that lays out a level."],
   ["Velocity","Speed and direction together."],
   ["Acceleration / drag","Speeding up / slowing down because of 'air'."],
   ["Hitbox","The invisible rectangle that decides if two things touch."],
   ["Collision","Two hitboxes overlapping."],
   ["Parallax","Background layers moving at different speeds to look deep."],
   ["Telegraphing","A warning before danger (a glow, a hiss, a flashing light)."],
   ["Input buffer","Remembering a button you pressed slightly early."],
   ["Invincibility frames","A short safe moment after being hit (the blinking)."],
   ["Seed","The starting number for 'random' choices. The same seed gives the same result."],
   ["Procedural generation","The computer building levels from rules instead of by hand."],
   ["Flood fill","'Pouring paint' from a square to find everything it connects to."],
   ["State","Which situation the game is in (ready, playing, paused, game over)."],
   ["Branch / pull request / merge","A safe copy to work on / a request to bring it into the live game / saying yes."]],[5,12])
d.save(S+"How our pixel games work.docx"); print("saved")
