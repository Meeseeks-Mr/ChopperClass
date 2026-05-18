/**
 * All lesson text content lives here so it's easy to edit without touching
 * 3D code. Each lesson has a title and an HTML body. Written for a curious
 * 10th-grade student — analogies first, formulas second, vocabulary tagged.
 */

export const LESSONS = [
  {
    id: 'parts',
    title: '1 · Anatomy of a Helicopter',
    short: 'Parts',
    env: 'ground',
    bodyHtml: `
      <p>Before we figure out how a helicopter <em>flies</em>, let's first get to know its body. Tap the glowing dots on the helicopter to learn about each part.</p>

      <h3>The five things to remember</h3>
      <ul>
        <li><strong>Fuselage</strong> — the main body. It carries the pilot, passengers and cargo.</li>
        <li><strong>Main rotor</strong> — the spinning blades on top. These are the helicopter's <em>wings</em>. They both lift the helicopter and steer it.</li>
        <li><strong>Mast & hub</strong> — the shaft and the connector that hold the blades and let them tilt and rotate.</li>
        <li><strong>Tail boom</strong> — the long arm at the back. It exists for one job: to hold the tail rotor.</li>
        <li><strong>Tail rotor</strong> — the small spinning fan at the back. It stops the helicopter from spinning around like a top.</li>
      </ul>

      <div class="callout"><strong>Did you know?</strong> The main rotor blades of a real helicopter spin at around <strong>300–500 RPM</strong>. That's about 5–8 full turns every second!</div>

      <h3>Why so many parts?</h3>
      <p>An aeroplane has fixed wings, so it must keep moving forward to fly. A helicopter's wings are <em>moving</em> even when the helicopter is standing still in the air. That's the magic — and the reason we need an extra little fan at the back to balance things out.</p>
    `,
  },
  {
    id: 'bernoulli',
    title: '2 · Bernoulli\'s Principle',
    short: 'Bernoulli',
    env: 'sky',
    bodyHtml: `
      <p>Press the <em>play</em> button below and watch the air flow over the wing-shape (called an <strong>airfoil</strong>). The streamlines you see are like long ribbons of air moving past the wing.</p>

      <h3>The rule in one line</h3>
      <p class="formula">Where air moves faster, its pressure is lower.</p>
      <p>This is <strong>Bernoulli's principle</strong>. Air is a gas — but it has weight and pressure, just like water in a pipe. If you make air <em>speed up</em>, its pressure goes <em>down</em>. Make it <em>slow down</em>, and pressure goes <em>up</em>.</p>

      <h3>How a wing turns this into lift</h3>
      <ul>
        <li>The airfoil is curved on top and flatter underneath.</li>
        <li>Air going over the top has to travel a <em>longer path</em>, so it speeds up.</li>
        <li>Air below stays slower, so its pressure stays higher.</li>
        <li>High pressure below + low pressure above = an upward push. We call that push <strong>lift</strong>.</li>
      </ul>

      <div class="callout"><strong>Try it:</strong> slide the <em>Angle of attack</em>. As the wing tilts up into the wind, the lift arrow gets bigger — until the wing tilts too much and the air "lets go." That's called a <strong>stall</strong>.</div>

      <h3>Where you've already seen this</h3>
      <p>Blow gently across the top of a sheet of paper. The paper rises! That's the same trick — fast moving air on top creates low pressure, and the slower air underneath lifts the sheet up.</p>
    `,
  },
  {
    id: 'blade',
    title: '3 · A Rotor Blade Is a Wing',
    short: 'Blade',
    env: 'sky',
    bodyHtml: `
      <p>Each helicopter blade is shaped exactly like an aeroplane wing — an <strong>airfoil</strong>. Look at the cross-section as you rotate the view. Curved top, flatter bottom.</p>

      <h3>Pitch — the angle of the blade</h3>
      <p>Slide the <em>blade pitch</em> control. The blade tilts. This is called the <strong>angle of attack</strong>. The blade is now meeting the oncoming air at a different angle.</p>
      <ul>
        <li><strong>0°</strong> — Air slips by; very little lift is made.</li>
        <li><strong>Small positive angle</strong> — Air on top speeds up more; lift is created.</li>
        <li><strong>Too much angle</strong> — The air can't follow the curve anymore. It separates, and the blade <strong>stalls</strong> (lift drops suddenly).</li>
      </ul>

      <div class="callout"><strong>Important:</strong> A spinning blade is not a normal wing because the air does not flow past the helicopter — the helicopter is standing still! The lift comes from <em>spinning the wing</em> through the air instead. The result is the same — fast air over a curved surface makes lift.</div>

      <h3>The bigger the angle, the bigger the lift?</h3>
      <p>Up to a point, yes. After the stall angle, lift drops sharply. Real helicopter pilots are trained to keep the blade angle in the "sweet spot" — enough lift, but not enough to stall.</p>
    `,
  },
  {
    id: 'rotor',
    title: '4 · A Spinning Rotor Makes Lift',
    short: 'Rotor + Lift',
    env: 'ground',
    bodyHtml: `
      <p>A single blade by itself can't lift a helicopter. You need <em>several blades</em>, spinning <em>quickly</em>, all at the right angle. This is the <strong>main rotor</strong>.</p>

      <h3>Two controls, two effects</h3>
      <ul>
        <li><strong>RPM (rotations per minute)</strong> — How fast the blades are spinning. Faster spin means faster-moving air over each blade, which means <em>more lift</em>.</li>
        <li><strong>Collective pitch</strong> — How tilted <em>all four</em> blades are, together. More tilt = more lift (up to the stall angle).</li>
      </ul>

      <h3>What pilots actually do</h3>
      <p>In a real helicopter, the engine keeps the RPM almost constant. The pilot mostly changes the <strong>collective pitch</strong> to go up or down. Pull the lever up → blades tilt → more lift → helicopter rises. Push it down → less lift → helicopter sinks.</p>

      <div class="callout"><strong>The lift arrow</strong> on screen shows how much upward push the rotor is making. When the lift exceeds the helicopter's weight, it rises. When lift equals weight, it hovers.</div>

      <h3>A quick formula (just to peek at)</h3>
      <p class="formula">Lift ≈ ½ × air density × velocity² × area × CL</p>
      <p>You don't need to solve this in this class — just notice that <strong>velocity is squared</strong>. Double the blade speed, and the lift becomes <em>four times</em> bigger!</p>
    `,
  },
  {
    id: 'cyclic',
    title: '5 · Cyclic Pitch — Steering the Helicopter',
    short: 'Cyclic & Direction',
    env: 'sky',
    bodyHtml: `
      <p>Once it's flying, a helicopter needs to go <em>somewhere</em>. But it doesn't have a steering wheel. So how does it move forward, backward, left or right?</p>

      <h3>The trick: tilt the rotor disc</h3>
      <p>When all four blades spin, they trace out an invisible flat disc in the sky. If the pilot can make this <strong>disc tilt</strong>, the lift no longer points straight up — it points slightly to the side. That sideways component pulls the helicopter in that direction.</p>

      <ul>
        <li>Tilt disc <strong>forward</strong> → helicopter moves <strong>forward</strong>.</li>
        <li>Tilt disc <strong>back</strong> → it moves <strong>backward</strong>.</li>
        <li>Tilt disc <strong>left or right</strong> → it slides that way.</li>
      </ul>

      <h3>How is the disc tilted?</h3>
      <p>By changing each blade's pitch <em>as it rotates around</em>. As a blade passes the front of the helicopter, the system flattens it. As it reaches the back, the system tilts it more. The result: one side makes more lift than the other, and the disc tilts. This clever mechanism is called the <strong>swashplate</strong>.</p>

      <div class="callout"><strong>Try it:</strong> Use the joystick to tilt the disc. Watch the helicopter's lift vector tilt with it — and the helicopter drift in that direction.</div>

      <h3>Pitch vs. Roll</h3>
      <p>When the nose tips up or down, that's called <strong>pitch</strong>. When the helicopter tips on its side, that's <strong>roll</strong>. The cyclic stick controls both.</p>
    `,
  },
  {
    id: 'tail',
    title: '6 · Why the Tail Rotor Exists',
    short: 'Tail & Yaw',
    env: 'sky',
    bodyHtml: `
      <p>Here's a problem nobody warns you about when you first see a helicopter: spinning the main rotor one way makes the <em>body</em> want to spin the other way. This is Newton's third law in action.</p>

      <p class="formula">For every action, there is an equal and opposite reaction.</p>

      <h3>The fix</h3>
      <p>The <strong>tail rotor</strong> is a small sideways-blowing fan. By pushing air to one side, it creates a force on the tail that <em>cancels out</em> the body's tendency to spin. Without a tail rotor, the helicopter's fuselage would whirl around uncontrollably.</p>

      <ul>
        <li><strong>More tail rotor thrust</strong> → tail pushes harder one way → nose turns the other way (this is called <strong>yaw</strong>).</li>
        <li><strong>Less tail rotor thrust</strong> → torque takes over → nose yaws the opposite way.</li>
        <li><strong>Balanced</strong> → helicopter stays pointed the same direction.</li>
      </ul>

      <div class="callout"><strong>Pedals do this.</strong> Pilots use foot pedals to control the tail rotor. Pedals are the helicopter's "yaw" control — they don't turn the helicopter through space, they just point its nose left or right.</div>

      <h3>Why some helicopters don't have a tail rotor</h3>
      <p>Some heavy-lift helicopters (like the Chinook) use <em>two main rotors</em> spinning in opposite directions. Their torques cancel out, so no tail rotor is needed. Clever!</p>
    `,
  },
  {
    id: 'fullflight',
    title: '7 · All Together — Free Flight',
    short: 'Free Flight',
    env: 'sky',
    bodyHtml: `
      <p>Now you have everything: lift, pitch, roll, yaw. Time to fly!</p>

      <h3>The controls</h3>
      <ul>
        <li><strong>Cyclic stick (left joystick)</strong> — tilts the rotor disc. Forward/back = pitch (move forward/back). Left/right = roll (slide left/right).</li>
        <li><strong>Collective (vertical slider)</strong> — adjusts how tilted all blades are at once. Up = climb. Down = descend.</li>
        <li><strong>Pedals (right joystick, left/right only)</strong> — control the tail rotor → yaw the nose left or right.</li>
      </ul>

      <h3>The three rotations you keep hearing about</h3>
      <ul>
        <li><strong>Pitch</strong> — nose tilts up or down.</li>
        <li><strong>Roll</strong> — body leans left or right (one side dips).</li>
        <li><strong>Yaw</strong> — nose turns left or right while staying level.</li>
      </ul>

      <div class="callout"><strong>Force arrows</strong>: Yellow = weight (gravity, always down). Cyan = lift (from the main rotor). Magenta = thrust direction. Watch them dance as you fly.</div>

      <h3>A little challenge</h3>
      <p>Can you take off, fly in a circle around the helipad, and return to hover above the "H"? Try it. (Press <em>Reset</em> if you get lost.)</p>
    `,
  },
];
