import { Activity, Plus, TrendingUp } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Measurement = {
  id: string;
  measured_on: string;
  weight_kg: number | string | null;
  waist_cm: number | string | null;
  resting_pulse: number | null;
  notes: string | null;
};

type Props = {
  measurements: Measurement[];
  isAuthenticated: boolean;
  isSaving: boolean;
  onSave: (input: { weightKg: number | null; waistCm: number | null; restingPulse: number | null; notes: string | null }) => void;
};

const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);

export default function MeasurementTracker({ measurements, isAuthenticated, isSaving, onSave }: Props) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [pulse, setPulse] = useState("");
  const [notes, setNotes] = useState("");
  const weights = useMemo(() => measurements.filter((item) => item.weight_kg != null).slice(0, 4).reverse(), [measurements]);
  const numericWeights = weights.map((item) => Number(item.weight_kg));
  const min = numericWeights.length ? Math.min(...numericWeights) : 0;
  const max = numericWeights.length ? Math.max(...numericWeights) : 0;
  const latest = measurements[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = { weightKg: numberOrNull(weight), waistCm: numberOrNull(waist), restingPulse: numberOrNull(pulse), notes: notes.trim() || null };
    if (input.weightKg == null && input.waistCm == null && input.restingPulse == null && input.notes == null) return;
    onSave(input);
    setWeight(""); setWaist(""); setPulse(""); setNotes("");
  };

  return <section className="measurement-panel">
    <div className="section-heading"><div><span className="section-caption">Private check-ins</span><h3>Measurement history</h3></div><span className="measurement-lock">{isAuthenticated ? "Saved to your profile" : "Sign in to save"}</span></div>
    <p className="measurement-copy">Log only the signals that help you notice a useful pattern. A check-in is not a diagnosis.</p>
    <div className="measurement-summary">
      <div><small>Latest weight</small><b>{latest?.weight_kg != null ? `${latest.weight_kg} kg` : "Not logged"}</b></div>
      <div><small>Latest waist</small><b>{latest?.waist_cm != null ? `${latest.waist_cm} cm` : "Not logged"}</b></div>
      <div><small>Resting pulse</small><b>{latest?.resting_pulse != null ? `${latest.resting_pulse} bpm` : "Not logged"}</b></div>
    </div>
    {weights.length > 1 && <div className="measurement-trend"><span><TrendingUp size={14} /> Weight check-ins</span><div className="measurement-bars">{weights.map((item) => { const value = Number(item.weight_kg); const height = max === min ? 58 : 28 + ((value - min) / (max - min)) * 58; return <i key={item.id} style={{ height: `${height}%` }} title={`${item.measured_on}: ${value} kg`} />; })}</div><small>Latest {Number(latest?.weight_kg)} kg</small></div>}
    {measurements.length > 0 && <div className="measurement-list">{measurements.slice(0, 4).map((item) => <div key={item.id}><span>{new Date(`${item.measured_on}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><b>{item.weight_kg != null ? `${item.weight_kg} kg` : "—"}</b><b>{item.waist_cm != null ? `${item.waist_cm} cm` : "—"}</b><b>{item.resting_pulse != null ? `${item.resting_pulse} bpm` : "—"}</b></div>)}</div>}
    <form className="measurement-form" onSubmit={submit}>
      <label>Weight (kg)<input value={weight} inputMode="decimal" onChange={(event) => setWeight(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 74.6" /></label>
      <label>Waist (cm)<input value={waist} inputMode="decimal" onChange={(event) => setWaist(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 84" /></label>
      <label>Resting pulse<input value={pulse} inputMode="numeric" onChange={(event) => setPulse(event.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 68" /></label>
      <label className="measurement-notes">Optional note<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. after a restful week" /></label>
      <button className="measurement-save" disabled={!isAuthenticated || isSaving} type="submit">{isSaving ? <Activity size={13} /> : <Plus size={13} />}{isSaving ? "Saving" : "Save check-in"}</button>
    </form>
  </section>;
}
