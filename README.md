# ChopperClass

> *A pocket flight school for the helicopter-curious.*

ChopperClass is a free, browser-based learning app that explains **how helicopters fly** — from the curve of a single rotor blade to a six-axis hover — in seven hands-on lessons. Drag a slider, push a virtual stick, watch the airflow and the force arrows respond. Nothing to install, nothing to download, no math test at the end.

---

## Who is it for?

- **Students** studying physics, motion, forces, or aerodynamics for the first time.
- **Aviation-curious tinkerers** of any age who have always wondered *why* the small fan at the back of a helicopter is there.
- **Teachers and parents** who want a clean, distraction-free visual to anchor a "how does X work?" conversation.
- **Future pilots** preparing for their first introductory ground-school class.

You don't need a single line of code, equation, or formula to use it — though one or two formulas are quietly placed in the corner for anyone who asks "but how is it actually measured?"

---

## What you'll learn

ChopperClass is built around **seven lessons**, each one a 3-D or 2-D interactive scene with its own controls. They build on each other: by the time you reach lesson 7 you are flying the helicopter using everything you learned in lessons 1–6.

### 1 · Anatomy of a Helicopter

Identify the five parts that matter — **fuselage, main rotor, mast & hub, tail boom, tail rotor** — by tapping pills below the model. The camera glides to each part as you name it.

> Built around a real, accurately-modelled airframe (a Japanese OH-1 *Ninja* observation helicopter) so the parts look the way they do in real life, not in a textbook diagram.

### 2 · Bernoulli's Principle

A pure 2-D illustration of a wing cross-section (an *airfoil*) with animated streamlines flowing past it.

- **Angle of Attack** slider — tilts the wing.
- **Air speed** slider — sets how fast the air is moving.
- The streamlines change colour: pink where air is faster (low pressure), blue where it's slower (high pressure).
- A vertical lift arrow grows as pressure differential builds, and collapses when you push past the **stall** angle and the airflow separates.

The lesson the picture teaches itself: *fast air on top + slow air below = upward push.*

### 3 · A Rotor Blade IS a Wing

Take that 2-D wing and put four of them on top of a real helicopter. Watch them spin from above and from the side.

- **Rotor RPM** slider (starts at a gentle 10 RPM so you can clearly see all four blades).
- **Collective pitch** slider — tips all four blades together.
- A single vertical lift arrow shows the total upward push. Its **size** scales with pitch × RPM², its **direction** never changes — because that's how rotor lift actually behaves.
- A note reminds you: *more RPM = more airspeed over each blade = more lift, growing with the square of the speed.*

### 4 · A Spinning Rotor Makes Lift

Now the rotor is attached to a helicopter sitting on a helipad. Two sliders, three buttons:

- **RPM** and **Collective pitch** sliders — the same two controls a real pilot uses to lift off.
- **Stop / Idle / Cruise** quick-set buttons.
- Yellow weight arrow always points down. Cyan lift arrow grows with RPM and pitch. When **lift exceeds weight**, the helicopter rises off the pad in a gentle, realistic climb.

### 5 · Cyclic Pitch — Steering the Helicopter

The helicopter is now hovering. A single joystick on screen represents the *cyclic stick* — the one a pilot holds in their right hand.

- Push forward/back → the rotor disc tilts forward/back → the helicopter moves that way.
- Push left/right → it slides sideways.
- A yaw slider lets you point the nose any direction so you can see the body lean independently from the direction of travel.
- Force arrows show how the lift vector tilts off-vertical — and the *horizontal* part of that lift is the **thrust** that actually pushes the helicopter sideways.

### 6 · Why the Tail Rotor Exists

The lesson that surprises everyone: spinning the main rotor one way makes the *body* want to spin the other way (Newton's third law). Without a tail rotor, the whole helicopter would whirl around uncontrollably.

- A pink curved arc shows the body's reaction torque (always pushing one way).
- A magenta arrow shows the tail rotor's counter-thrust (gets longer as you spin the tail rotor faster).
- A cyan yaw arc shows the **actual** rotation — its direction (clockwise vs counter-clockwise) flips as you cross the balance point (around 1500 RPM), and a live yaw-rate readout tells you exactly what's happening.
- A one-tap **Auto-balance** button shows you where balance lives — and lets you feel how *just enough* tail rotor stops the spin.

### 7 · All Together — Free Flight

Everything from lessons 4, 5 and 6 active at the same time:

- **Cyclic** joystick (pitch + roll).
- **Pedals** joystick (yaw / tail-rotor trim).
- **Collective** slider (climb/descend).
- **Main rotor RPM** slider.
- **Reset** button if the helicopter ends up upside-down over a hill.

The camera follows the aircraft as it banks, climbs and yaws. Three colour-coded force arrows (lift, weight, thrust) update in real time so the physics is visible at every moment.

---

## Pedagogical design

- **Show, don't lecture.** Every slider produces an immediate visible change.
- **One concept per lesson.** Each panel introduces exactly one new control before moving on.
- **Real airframe.** The 3-D model is a calibrated, real helicopter — not a cartoon. Hub, blades and tail rotor pivot around the correct axes.
- **Honest physics.** Forces (lift, drag, torque, gravity) are computed from realistic relationships (`L ∝ v² · CL(α)`, `τ ∝ ω²`, etc.). Numbers are dimensionless and tuned for clarity, but the **shape** of the curves is right.
- **No reading required.** The *Read Me* button on the viewport opens a longer written explanation of the current lesson for anyone who wants depth.
- **Mobile-first.** Built for thumbs on a phone in portrait orientation as much as for a laptop screen. The lesson rail on the left is always one tap away.

---

## How a lesson typically runs

1. Open the app — it loads in under a couple of seconds.
2. Pick a lesson from the left rail (or just hit ▶ on lesson 1).
3. Read the short title that appears at the top of the visual.
4. **Play with the controls.** Watch what changes.
5. When something puzzles you, tap **Read Me** for the longer explanation.
6. Move on to the next lesson, or revisit one to compare.

A motivated student can finish all seven lessons in 25–30 minutes. A teacher can spend a full 45-minute period on any single lesson and never run out of "what happens if …" questions.

---

## A note on the airframe

ChopperClass uses a publicly-modelled **Kawasaki OH-1 *Ninja*** — a 4-bladed observation helicopter — as its star. Thanks to the user maskand for the awesome model available at "https://www.turbosquid.com/3d-models/3d-model-helicopter-oh1-jgsdf-basic-animation-444-2529676". It has the size, proportions and tail-rotor geometry of a real-world machine, which means everything you learn from the app maps directly onto every helicopter you'll ever see fly past.

---

## Get involved

Found a place where a control is confusing, a label is unclear, or a piece of physics doesn't match what you learned somewhere else? Open an issue on GitHub with a screenshot and a one-line description — that's exactly how the app gets better.

If you build a derivative for a different aircraft (a quadcopter? a tilt-rotor? a paper plane?), please tell us — the framework is reusable.

---

*ChopperClass is, and will always be, free to use in classrooms.*

— made by **dio.stesso**, who, by all available evidence, has rather too much time on his hands.
