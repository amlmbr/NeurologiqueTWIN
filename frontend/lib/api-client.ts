/**
 * NeurologiqueTWIN API Client
 *
 * Type-safe HTTP client for the FastAPI backend.
 * Base URL defaults to the NEXT_PUBLIC_API_URL env variable,
 * falling back to http://localhost:8000 for local development.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeatureContribution {
  name: string;
  value: number;
  contribution: number;
  direction: "increases_risk" | "decreases_risk" | "neutral";
  normal_range: [number, number];
  unit: string;
}

export interface RiskResponse {
  seizure_risk: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  dominant_driver: string;
  clinical_note: string;
  state: "stable" | "preictal" | "ictal";
  trend: number;
  maps_link: string;
  explanation: FeatureContribution[];
}

export interface FeaturesRequest {
  hr?: number;
  eda?: number;
  eeg_energy?: number;
  hrv?: number;
  steps?: number;
  stress?: number;
  tremor?: number;
  lat?: number;
  lon?: number;
}

export interface HealthResponse {
  status: "ok" | "error";
  uptime_s: number;
  models_available: { gasf: boolean; mtf: boolean; rp: boolean };
  version: string;
}

export interface EEGProcessResponse {
  n_samples: number;
  fs: number;
  signal: number[];
  stats: { min: number; max: number; mean: number; std: number };
}

export interface EEGFeaturesResponse {
  eeg_energy: number;
  band_powers: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
  n_samples: number;
  fs: number;
}

export interface TransformResponse {
  method: string;
  shape: number[];
  dtype: string;
  image_b64?: string;
  image?: number[][];
}

export interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  n_steps: number;
  n_patients: number;
  n_hospitals: number;
  risk_threshold: number;
}

export interface SimulationEvent {
  clock: number;
  type: string;
  data: Record<string, unknown>;
}

export interface SimulationSnapshot {
  clock: number;
  time_min: number;
  patients: Record<string, {
    name: string;
    lat: number;
    lon: number;
    state: string;
    HR: number;
    EDA: number;
    EEG_EN: number;
  }>;
  ambulances: Record<string, unknown>;
  twin_risks: Record<string, number>;
}

export interface SimulationResult {
  scenario: {
    id: string;
    name: string;
    description: string;
    n_steps: number;
    risk_threshold: number;
  };
  events: SimulationEvent[];
  snapshots: SimulationSnapshot[];
  summary: {
    n_alerts: number;
    n_dispatches: number;
    n_arrivals: number;
    max_risk: number;
    avg_eta_min: number;
    total_ticks: number;
  };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const health = {
  check: () => request<HealthResponse>("/health"),
};

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

export const inference = {
  /**
   * Predict seizure risk from physiological features.
   * Returns an explainable risk score with per-feature attribution.
   */
  predict: (features: FeaturesRequest) =>
    request<RiskResponse>("/api/v1/predict", {
      method: "POST",
      body: JSON.stringify(features),
    }),

  /**
   * Predict from a base64-encoded 64×64 float32 RGB image.
   */
  predictImage: (params: {
    image_b64: string;
    transform?: string;
    hr?: number;
    eda?: number;
    eeg_energy?: number;
  }) =>
    request<{ seizure_risk: number; risk_level: string; explanation: FeatureContribution[] }>(
      "/api/v1/predict/image",
      { method: "POST", body: JSON.stringify(params) }
    ),

  /**
   * Retrieve rolling inference history (last N results).
   */
  history: (limit = 50) =>
    request<{ count: number; history: RiskResponse[] }>(
      `/api/v1/predict/history?limit=${limit}`
    ),

  clearHistory: () =>
    request<{ status: string }>("/api/v1/predict/history", { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// EEG processing
// ---------------------------------------------------------------------------

export const eeg = {
  /**
   * Preprocess a raw EEG segment (filter + denoise + normalise).
   */
  process: (params: {
    signal: number[];
    fs?: number;
    lowcut?: number;
    highcut?: number;
  }) =>
    request<EEGProcessResponse>("/api/v1/eeg/process", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /**
   * Convert an EEG epoch to a GASF / MTF / RP / RGB image.
   */
  transform: (params: {
    signal: number[];
    method?: "gasf" | "mtf" | "rp" | "rgb";
    image_size?: number;
    return_base64?: boolean;
  }) =>
    request<TransformResponse>("/api/v1/eeg/transform", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /**
   * Extract band-power spectral features from an EEG epoch.
   */
  features: (params: { signal: number[]; fs?: number }) =>
    request<EEGFeaturesResponse>("/api/v1/eeg/features", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /**
   * Full pipeline: preprocess → transform → risk predict in one call.
   */
  fullPipeline: (params: {
    signal: number[];
    fs?: number;
    method?: string;
    hr?: number;
    eda?: number;
  }) =>
    request<{
      eeg_energy: number;
      band_powers: EEGFeaturesResponse["band_powers"];
      image: TransformResponse;
      risk: { seizure_risk: number; risk_level: string; clinical_note: string };
      explanation: FeatureContribution[];
    }>("/api/v1/eeg/full-pipeline", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export const simulation = {
  /**
   * List all available pre-defined scenarios.
   */
  listScenarios: () =>
    request<{ scenarios: ScenarioMeta[] }>("/api/v1/simulation/scenarios"),

  /**
   * Run a full scenario synchronously.
   */
  run: (params: {
    scenario_id: string;
    model_path?: string;
    use_ensemble?: boolean;
  }) =>
    request<SimulationResult>("/api/v1/simulation/run", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /**
   * Start an interactive tick-by-tick simulation.
   */
  startInteractive: (params: { scenario_id: string }) =>
    request<{ status: string; clock: number; snapshot: SimulationSnapshot }>(
      "/api/v1/simulation/interactive/start",
      { method: "POST", body: JSON.stringify(params) }
    ),

  /**
   * Advance the interactive simulation by N ticks.
   */
  step: (n_steps = 1) =>
    request<{
      clock: number;
      events: SimulationEvent[];
      snapshot: SimulationSnapshot;
    }>("/api/v1/simulation/interactive/step", {
      method: "POST",
      body: JSON.stringify({ n_steps }),
    }),

  /**
   * Get the current snapshot of the active simulation.
   */
  snapshot: () =>
    request<SimulationSnapshot>("/api/v1/simulation/interactive/snapshot"),

  /**
   * Reset the active simulation.
   */
  reset: () =>
    request<{ status: string }>("/api/v1/simulation/interactive/reset", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};

// ---------------------------------------------------------------------------
// Digital Brain Twin
// ---------------------------------------------------------------------------

export interface TwinInferenceRequest {
  patient_id?: string;
  signal?: number[];
  fs?: number;
  hr?: number;
  eda?: number;
  eeg_energy?: number;
  hrv?: number;
  channel_scores?: Record<string, number>;
  dominant_channels?: string[];
  lat?: number;
  lon?: number;
  fall_detected?: boolean;
}

export interface TwinRegion {
  region_name: string | null;
  lobe: string | null;
  side: string | null;
  localization_confidence: string;
  disclaimer: string;
  function: string;
  color_normal: string;
  color_alert: string;
}

export interface TwinStateResponse {
  patient_id: string;
  status: string;
  status_label: string;
  status_color: string;
  seizure_risk: number;
  seizure_type: string | null;
  alert_level: string;
  active_region: TwinRegion | null;
  regions: Array<{
    name: string; lobe: string; side: string;
    x: number; y: number; z: number;
    is_active: boolean; activation: number;
    color_normal: string; color_alert: string; color_current: string;
    function: string;
  }>;
  recent_events: Array<{
    timestamp: number; brain_status: string; seizure_risk: number;
    seizure_type: string | null; region_name: string | null; lobe: string | null;
    alert_level: string; maps_link: string | null; notes: string;
  }>;
  maps_link: string | null;
}

export const twin = {
  inference: (params: TwinInferenceRequest) =>
    request<{
      patient_id: string;
      twin: TwinStateResponse;
      region: TwinRegion;
      alert: Record<string, unknown> | null;
      risk_history: number[];
      seizure_type: string | null;
      band_powers: Record<string, number>;
      eeg_energy: number;
    }>("/api/v1/twin/inference", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getState: (patient_id: string) =>
    request<TwinStateResponse>(`/api/v1/twin/state/${patient_id}`),

  reset: (patient_id: string) =>
    request<{ patient_id: string; status: string; timestamp: number }>(
      `/api/v1/twin/reset/${patient_id}`, { method: "POST", body: "{}" }
    ),

  listPatients: () =>
    request<{ patients: string[] }>("/api/v1/twin/patients"),
};

// ---------------------------------------------------------------------------
// Default export — grouped client
// ---------------------------------------------------------------------------

const apiClient = { health, inference, eeg, simulation, twin };
export default apiClient;
