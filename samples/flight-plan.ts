/**
 * Sample file for theme QA. Exercises keywords, types, strings, numbers,
 * decorators, template literals, regex and JSX-ish generics in one screen.
 *
 * @module flight-plan
 */
import { EventEmitter } from "node:events";
import type { Readable } from "node:stream";

/** ICAO four-letter aerodrome identifier, e.g. CYYZ, CYUL, CYVR. */
export type IcaoCode = `C${Uppercase<string>}`;

export enum FlightPhase {
  Preflight = "PREFLIGHT",
  Taxi = "TAXI",
  Takeoff = "TAKEOFF",
  Climb = "CLIMB",
  Cruise = "CRUISE",
  Descent = "DESCENT",
  Approach = "APPROACH",
  Landed = "LANDED",
}

export interface Waypoint {
  readonly ident: string;
  readonly lat: number;
  readonly lon: number;
  altitudeFt?: number;
}

export interface FlightPlan {
  callsign: string;
  origin: IcaoCode;
  destination: IcaoCode;
  cruiseFL: number;
  route: Waypoint[];
  etd: Date;
}

const METAR_RE = /^(?<station>[A-Z]{4})\s(?<day>\d{2})(?<hour>\d{2})(?<min>\d{2})Z/;
const FEET_PER_FL = 100;
const MAX_FL = 410;

function logPhase(phase: FlightPhase) {
  return (_target: unknown, key: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      console.log(`[${phase}] ${key}()`);
      return original.apply(this, args);
    };
  };
}

export class Flight extends EventEmitter {
  private phase: FlightPhase = FlightPhase.Preflight;
  private fuelKg = 0;

  constructor(public readonly plan: FlightPlan) {
    super();
    if (plan.cruiseFL > MAX_FL) {
      throw new RangeError(`FL${plan.cruiseFL} exceeds service ceiling FL${MAX_FL}`);
    }
  }

  get cruiseAltitudeFt(): number {
    return this.plan.cruiseFL * FEET_PER_FL;
  }

  @logPhase(FlightPhase.Preflight)
  uplift(kg: number): this {
    this.fuelKg += kg;
    this.emit("fuel", this.fuelKg);
    return this;
  }

  @logPhase(FlightPhase.Takeoff)
  async depart(): Promise<void> {
    this.phase = FlightPhase.Takeoff;
    for (const wp of this.plan.route) {
      await this.cross(wp);
    }
    this.phase = FlightPhase.Landed;
  }

  private async cross(wp: Waypoint): Promise<void> {
    const alt = wp.altitudeFt ?? this.cruiseAltitudeFt;
    const burn = Math.round(alt / 1_000) * 12.5;
    this.fuelKg -= burn;
    this.emit("waypoint", { ...wp, altitudeFt: alt, fuelKg: this.fuelKg });
  }

  static parseMetar(raw: string): { station: string; issued: string } | null {
    const m = METAR_RE.exec(raw.trim());
    if (!m?.groups) return null;
    const { station, day, hour, min } = m.groups;
    return { station, issued: `${day}T${hour}:${min}Z` };
  }
}

export async function* readAcars(stream: Readable): AsyncGenerator<string> {
  for await (const chunk of stream) {
    yield String(chunk).toUpperCase();
  }
}

// ---- usage -------------------------------------------------------------
const ac123 = new Flight({
  callsign: "ACA123",
  origin: "CYYZ",
  destination: "CYVR",
  cruiseFL: 370,
  etd: new Date("2026-11-14T13:05:00-05:00"),
  route: [
    { ident: "YYZ", lat: 43.6777, lon: -79.6248 },
    { ident: "YWG", lat: 49.91, lon: -97.2399, altitudeFt: 37_000 },
    { ident: "YVR", lat: 49.1947, lon: -123.1792 },
  ],
});

ac123.on("waypoint", (w) => console.log(`✈  ${w.ident} FL${w.altitudeFt / 100}`));
ac123.uplift(18_400).depart().catch(console.error);

export default ac123;
