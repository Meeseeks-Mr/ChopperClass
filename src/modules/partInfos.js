// Descriptive text for each hotspot in Module 1.
export const PART_INFO = {
  cabin: {
    title: 'Cabin / Fuselage',
    html: `
      <p>The <strong>fuselage</strong> is the main body of the helicopter. It's like the car of an aeroplane — it holds the pilot, the passengers, and anything the helicopter is carrying.</p>
      <p>The fuselage is built to be as light as possible but very strong. That way, more of the rotor's lift can be used to carry useful stuff, instead of just lifting the helicopter itself.</p>
      <div class="callout">In military helicopters like this <strong>OH-1</strong>, the fuselage is also designed to be hard to spot — sleek, narrow, with low heat signature.</div>
    `,
  },
  rotor: {
    title: 'Main Rotor',
    html: `
      <p>The <strong>main rotor</strong> is the spinning set of blades on top of the helicopter. These are basically <em>wings that go around in a circle</em>.</p>
      <ul>
        <li>Each blade is shaped like a wing — curved on top, flatter underneath.</li>
        <li>As the blades spin, they push air down, and the air pushes the helicopter up.</li>
        <li>By changing how steep the blades are tilted, the pilot controls how much lift is created.</li>
      </ul>
      <div class="callout"><strong>This helicopter has 4 blades.</strong> Most modern helicopters have 3, 4, or 5 blades. More blades = quieter and smoother flight, but also more weight and cost.</div>
    `,
  },
  mast: {
    title: 'Mast & Hub',
    html: `
      <p>The <strong>mast</strong> is the central shaft that connects the engine below to the rotor above. The <strong>hub</strong> is the connector at the top, where all the blades attach.</p>
      <p>This is where the engineering gets really clever. The hub has a mechanism called the <strong>swashplate</strong> that allows each blade to change its angle as it rotates. This is how a helicopter steers — we'll see this in detail in lesson 5!</p>
    `,
  },
  tailboom: {
    title: 'Tail Boom',
    html: `
      <p>The <strong>tail boom</strong> is the long, narrow arm extending from the back of the fuselage. Its main purpose is to hold the tail rotor far away from the main rotor.</p>
      <p>Why far away? Because the further out the tail rotor is, the less thrust it needs to balance the body. It's a <em>lever arm</em> — like how a long wrench lets you turn a stubborn bolt with less effort.</p>
    `,
  },
  tailrotor: {
    title: 'Tail Rotor',
    html: `
      <p>The <strong>tail rotor</strong> is a small spinning fan at the back of the helicopter, mounted sideways. It does <em>one specific job</em>: it stops the helicopter body from spinning around.</p>
      <p>When the main rotor spins one way, the helicopter body wants to spin the other way (this is Newton's third law). The tail rotor pushes air sideways to cancel this out.</p>
      <div class="callout">The pilot uses <strong>pedals</strong> to control the tail rotor's thrust. We'll explore this in lesson 6.</div>
    `,
  },
  wheels: {
    title: 'Wheels',
    html: `
      <p>This helicopter lands on <strong>wheels</strong> instead of skids. Each wheel sits on a strut that absorbs the impact when the helicopter touches down.</p>
      <p>Wheels are useful when the helicopter has to taxi on a runway like an aeroplane, or when it operates from places with smooth, hard surfaces — like a ship's deck or an airfield.</p>
      <div class="callout">Many smaller helicopters use <strong>skids</strong> instead — two long bars on the underside. Skids are simpler and lighter, but wheels let a helicopter roll once on the ground.</div>
    `,
  },
};
