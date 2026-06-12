import dgram from "dgram";

// Forza Horizon 6 "Data Out" packet format — 324 bytes, little-endian
// Verified against official FH6 docs + live packet dump.
// FH6 adds CarGroup, SmashableVelDiff, SmashableMass after NumCylinders —
// these are NOT in older Forza titles and shift every subsequent offset by +12.
export interface ForzaTelemetry {
  // ── Sled (offsets 0–211) ─────────────────────────────────────
  isRaceOn: boolean;          // S32 @ 0    (1 = race on, 0 = menus)
  timestampMs: number;        // U32 @ 4
  engineMaxRpm: number;       // F32 @ 8
  engineIdleRpm: number;      // F32 @ 12
  currentEngineRpm: number;   // F32 @ 16
  accelX: number;             // F32 @ 20   m/s² (car local: right)
  accelY: number;             // F32 @ 24         (up)
  accelZ: number;             // F32 @ 28         (forward)
  velocityX: number;          // F32 @ 32   m/s
  velocityY: number;          // F32 @ 36
  velocityZ: number;          // F32 @ 40
  angularVelocityX: number;   // F32 @ 44   rad/s (pitch)
  angularVelocityY: number;   // F32 @ 48         (yaw)
  angularVelocityZ: number;   // F32 @ 52         (roll)
  yaw: number;                // F32 @ 56   radians
  pitch: number;              // F32 @ 60
  roll: number;               // F32 @ 64
  normSuspFl: number;         // F32 @ 68   0=max stretch, 1=max compression
  normSuspFr: number;         // F32 @ 72
  normSuspRl: number;         // F32 @ 76
  normSuspRr: number;         // F32 @ 80
  tireSlipRatioFl: number;    // F32 @ 84   0=100% grip, |>1|=slip
  tireSlipRatioFr: number;    // F32 @ 88
  tireSlipRatioRl: number;    // F32 @ 92
  tireSlipRatioRr: number;    // F32 @ 96
  wheelRotSpeedFl: number;    // F32 @ 100  rad/s
  wheelRotSpeedFr: number;    // F32 @ 104
  wheelRotSpeedRl: number;    // F32 @ 108
  wheelRotSpeedRr: number;    // F32 @ 112
  wheelOnRumbleFl: boolean;   // S32 @ 116
  wheelOnRumbleFr: boolean;   // S32 @ 120
  wheelOnRumbleRl: boolean;   // S32 @ 124
  wheelOnRumbleRr: boolean;   // S32 @ 128
  wheelInPuddleFl: boolean;   // S32 @ 132
  wheelInPuddleFr: boolean;   // S32 @ 136
  wheelInPuddleRl: boolean;   // S32 @ 140
  wheelInPuddleRr: boolean;   // S32 @ 144
  surfaceRumbleFl: number;    // F32 @ 148
  surfaceRumbleFr: number;    // F32 @ 152
  surfaceRumbleRl: number;    // F32 @ 156
  surfaceRumbleRr: number;    // F32 @ 160
  tireSlipAngleFl: number;    // F32 @ 164
  tireSlipAngleFr: number;    // F32 @ 168
  tireSlipAngleRl: number;    // F32 @ 172
  tireSlipAngleRr: number;    // F32 @ 176
  tireCombSlipFl: number;     // F32 @ 180
  tireCombSlipFr: number;     // F32 @ 184
  tireCombSlipRl: number;     // F32 @ 188
  tireCombSlipRr: number;     // F32 @ 192
  suspTravelFl: number;       // F32 @ 196  meters
  suspTravelFr: number;       // F32 @ 200
  suspTravelRl: number;       // F32 @ 204
  suspTravelRr: number;       // F32 @ 208
  // ── Car info (offsets 212–251) ───────────────────────────────
  carOrdinal: number;         // S32 @ 212  unique car make/model ID
  carClass: number;           // S32 @ 216  0=D 1=C 2=B 3=A 4=S1 5=S2 6=X 7=Trucks
  carPI: number;              // S32 @ 220  100-999
  drivetrainType: number;     // S32 @ 224  0=FWD 1=RWD 2=AWD
  numCylinders: number;       // S32 @ 228
  carGroup: number;           // U32 @ 232  FH6-only
  smashableVelDiff: number;   // F32 @ 236  FH6-only: velocity loss from collision (m/s)
  smashableMass: number;      // F32 @ 240  FH6-only: mass of hit object (kg)
  // ── Dynamics (offsets 244–322) ───────────────────────────────
  posX: number;               // F32 @ 244  world space (m)
  posY: number;               // F32 @ 248
  posZ: number;               // F32 @ 252
  speed: number;              // F32 @ 256  m/s
  power: number;              // F32 @ 260  watts
  torque: number;             // F32 @ 264  N·m
  tireTempFl: number;         // F32 @ 268  °C
  tireTempFr: number;         // F32 @ 272
  tireTempRl: number;         // F32 @ 276
  tireTempRr: number;         // F32 @ 280
  boost: number;              // F32 @ 284  PSI above atmospheric (negative = vacuum)
  fuel: number;               // F32 @ 288  0.0-1.0
  distanceTraveled: number;   // F32 @ 292  meters
  bestLapTime: number;        // F32 @ 296  seconds (0 if none)
  lastLapTime: number;        // F32 @ 300
  currentLapTime: number;     // F32 @ 304
  currentRaceTime: number;    // F32 @ 308  seconds since driving started
  lap: number;                // U16 @ 312
  racePosition: number;       // U8  @ 314
  accel: number;              // U8  @ 315  0-255
  brake: number;              // U8  @ 316  0-255
  clutch: number;             // U8  @ 317  0-255
  handBrake: number;          // U8  @ 318  0-255
  currentGear: number;        // U8  @ 319  0=N/R, 1-10
  steer: number;              // S8  @ 320  -127=full left, 127=full right
  normalizedDrivingLine: number; // S8 @ 321
  normalizedAIBrakeDiff: number; // S8 @ 322
}

export class ForzaTelemetryListener {
  private server?: dgram.Socket;
  private listeners: ((data: ForzaTelemetry) => void)[] = [];
  private errorListeners: ((err: Error) => void)[] = [];

  constructor(private port: number = 5300, private host: string = "127.0.0.1") {}

  get running(): boolean {
    return this.server !== undefined;
  }

  start(): void {
    if (this.server) return;

    const server = dgram.createSocket("udp4");
    this.server = server;

    // Without a handler, a bind failure (e.g. EADDRINUSE when the dashboard
    // is also running) is an unhandled 'error' event and kills the process.
    server.on("error", (err: Error) => {
      this.stop();
      this.errorListeners.forEach((listener) => listener(err));
    });

    server.on("listening", () => {
      console.log(`Listening for Forza telemetry on ${this.host}:${this.port}`);
    });

    server.on("message", (msg: Buffer) => {
      if (msg.length < 323) return;
      const data = this.parsePacket(msg);
      this.listeners.forEach((listener) => listener(data));
    });

    server.bind(this.port, this.host);
  }

  stop(): void {
    this.server?.close();
    this.server = undefined;
  }

  onTelemetry(callback: (data: ForzaTelemetry) => void): void {
    this.listeners.push(callback);
  }

  onError(callback: (err: Error) => void): void {
    this.errorListeners.push(callback);
  }

  private parsePacket(buf: Buffer): ForzaTelemetry {
    return {
      isRaceOn:            buf.readInt32LE(0) === 1,
      timestampMs:         buf.readUInt32LE(4),
      engineMaxRpm:        buf.readFloatLE(8),
      engineIdleRpm:       buf.readFloatLE(12),
      currentEngineRpm:    buf.readFloatLE(16),
      accelX:              buf.readFloatLE(20),
      accelY:              buf.readFloatLE(24),
      accelZ:              buf.readFloatLE(28),
      velocityX:           buf.readFloatLE(32),
      velocityY:           buf.readFloatLE(36),
      velocityZ:           buf.readFloatLE(40),
      angularVelocityX:    buf.readFloatLE(44),
      angularVelocityY:    buf.readFloatLE(48),
      angularVelocityZ:    buf.readFloatLE(52),
      yaw:                 buf.readFloatLE(56),
      pitch:               buf.readFloatLE(60),
      roll:                buf.readFloatLE(64),
      normSuspFl:          buf.readFloatLE(68),
      normSuspFr:          buf.readFloatLE(72),
      normSuspRl:          buf.readFloatLE(76),
      normSuspRr:          buf.readFloatLE(80),
      tireSlipRatioFl:     buf.readFloatLE(84),
      tireSlipRatioFr:     buf.readFloatLE(88),
      tireSlipRatioRl:     buf.readFloatLE(92),
      tireSlipRatioRr:     buf.readFloatLE(96),
      wheelRotSpeedFl:     buf.readFloatLE(100),
      wheelRotSpeedFr:     buf.readFloatLE(104),
      wheelRotSpeedRl:     buf.readFloatLE(108),
      wheelRotSpeedRr:     buf.readFloatLE(112),
      wheelOnRumbleFl:     buf.readInt32LE(116) !== 0,
      wheelOnRumbleFr:     buf.readInt32LE(120) !== 0,
      wheelOnRumbleRl:     buf.readInt32LE(124) !== 0,
      wheelOnRumbleRr:     buf.readInt32LE(128) !== 0,
      wheelInPuddleFl:     buf.readInt32LE(132) !== 0,
      wheelInPuddleFr:     buf.readInt32LE(136) !== 0,
      wheelInPuddleRl:     buf.readInt32LE(140) !== 0,
      wheelInPuddleRr:     buf.readInt32LE(144) !== 0,
      surfaceRumbleFl:     buf.readFloatLE(148),
      surfaceRumbleFr:     buf.readFloatLE(152),
      surfaceRumbleRl:     buf.readFloatLE(156),
      surfaceRumbleRr:     buf.readFloatLE(160),
      tireSlipAngleFl:     buf.readFloatLE(164),
      tireSlipAngleFr:     buf.readFloatLE(168),
      tireSlipAngleRl:     buf.readFloatLE(172),
      tireSlipAngleRr:     buf.readFloatLE(176),
      tireCombSlipFl:      buf.readFloatLE(180),
      tireCombSlipFr:      buf.readFloatLE(184),
      tireCombSlipRl:      buf.readFloatLE(188),
      tireCombSlipRr:      buf.readFloatLE(192),
      suspTravelFl:        buf.readFloatLE(196),
      suspTravelFr:        buf.readFloatLE(200),
      suspTravelRl:        buf.readFloatLE(204),
      suspTravelRr:        buf.readFloatLE(208),
      carOrdinal:          buf.readInt32LE(212),
      carClass:            buf.readInt32LE(216),
      carPI:               buf.readInt32LE(220),
      drivetrainType:      buf.readInt32LE(224),
      numCylinders:        buf.readInt32LE(228),
      carGroup:            buf.readUInt32LE(232),
      smashableVelDiff:    buf.readFloatLE(236),
      smashableMass:       buf.readFloatLE(240),
      posX:                buf.readFloatLE(244),
      posY:                buf.readFloatLE(248),
      posZ:                buf.readFloatLE(252),
      speed:               buf.readFloatLE(256),
      power:               buf.readFloatLE(260),
      torque:              buf.readFloatLE(264),
      tireTempFl:          buf.readFloatLE(268),
      tireTempFr:          buf.readFloatLE(272),
      tireTempRl:          buf.readFloatLE(276),
      tireTempRr:          buf.readFloatLE(280),
      boost:               buf.readFloatLE(284),
      fuel:                buf.readFloatLE(288),
      distanceTraveled:    buf.readFloatLE(292),
      bestLapTime:         buf.readFloatLE(296),
      lastLapTime:         buf.readFloatLE(300),
      currentLapTime:      buf.readFloatLE(304),
      currentRaceTime:     buf.readFloatLE(308),
      lap:                 buf.readUInt16LE(312),
      racePosition:        buf.readUInt8(314),
      accel:               buf.readUInt8(315),
      brake:               buf.readUInt8(316),
      clutch:              buf.readUInt8(317),
      handBrake:           buf.readUInt8(318),
      currentGear:         buf.readUInt8(319),
      steer:               buf.readInt8(320),
      normalizedDrivingLine: buf.readInt8(321),
      normalizedAIBrakeDiff: buf.readInt8(322),
    };
  }
}