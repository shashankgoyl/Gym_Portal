import {
  Activity, Apple, ArrowRight, BedDouble, Bot, Brain, Check, ChevronRight,
  CircleEllipsis, Clock3, Coffee, Dumbbell, Droplets, Flame, Footprints,
  HeartPulse, Leaf, Moon, Plus, Salad, Send, ShieldCheck, SkipForward,
  Sparkles, Sun, Timer, X, Zap,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import MeasurementTracker from "@/components/MeasurementTracker";

type View = "today" | "routine" | "fuel" | "health";
type RoutineState = "pending" | "done" | "skipped" | "replaced";
type ModalState = "exercise" | "food" | "activity" | null;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayNumbers = [18, 19, 20, 21, 22, 23, 24];

const workoutPlans = [
  { day: "Mon", focus: "Chest + Triceps", duration: "34 min", intent: "A controlled push session built for stable shoulders and progressive overload.", exercises: [
    { id: "bench", name: "Barbell bench press", target: "Chest · Triceps", sets: "4 × 8", rest: "90 sec", tip: "Drive your feet into the floor and keep your shoulder blades tucked.", safety: "Use a spotter on your final working set." },
    { id: "incline", name: "Incline dumbbell press", target: "Upper chest · Shoulders", sets: "3 × 10", rest: "75 sec", tip: "Lower with control until elbows sit just below the bench.", safety: "Keep the incline low enough to avoid shoulder strain." },
    { id: "fly", name: "Cable fly", target: "Chest", sets: "3 × 12", rest: "60 sec", tip: "Keep a soft bend in the elbow and squeeze at chest height.", safety: "Do not let the cable pull your shoulders forward." },
  ] },
  { day: "Tue", focus: "Back + Biceps", duration: "36 min", intent: "Build a strong pull with a quiet torso and deliberate shoulder control.", exercises: [
    { id: "pulldown", name: "Neutral-grip lat pulldown", target: "Lats · Biceps", sets: "4 × 10", rest: "75 sec", tip: "Pull elbows toward your ribs without leaning back.", safety: "Use a load that keeps your shoulders away from your ears." },
    { id: "row", name: "Chest-supported dumbbell row", target: "Mid-back · Rear delts", sets: "3 × 10", rest: "75 sec", tip: "Pause briefly when your elbows pass your torso.", safety: "Keep your neck neutral against the bench." },
    { id: "curl", name: "Alternating dumbbell curl", target: "Biceps", sets: "3 × 12", rest: "60 sec", tip: "Keep your upper arm still and control the lowering phase.", safety: "Avoid swinging the dumbbell from your lower back." },
  ] },
  { day: "Wed", focus: "Legs + Core", duration: "40 min", intent: "Train lower-body strength with controlled range and a braced trunk.", exercises: [
    { id: "goblet-squat", name: "Goblet squat", target: "Quads · Glutes", sets: "4 × 10", rest: "90 sec", tip: "Keep ribs stacked over the pelvis as you sit between your hips.", safety: "Reduce depth if you lose foot pressure or feel joint pain." },
    { id: "rdl", name: "Dumbbell Romanian deadlift", target: "Hamstrings · Glutes", sets: "3 × 10", rest: "90 sec", tip: "Push hips back and keep dumbbells close to your legs.", safety: "Stop the descent before your lower back rounds." },
    { id: "plank", name: "Forearm plank", target: "Core", sets: "3 × 35 sec", rest: "45 sec", tip: "Breathe behind a gently braced abdomen.", safety: "End the set if your hips sag or shoulders feel pinched." },
  ] },
  { day: "Thu", focus: "Shoulders + Core", duration: "32 min", intent: "Develop shoulder control and core stability without chasing load.", exercises: [
    { id: "press", name: "Seated dumbbell shoulder press", target: "Shoulders · Triceps", sets: "3 × 10", rest: "75 sec", tip: "Press slightly back, finishing with biceps by your ears.", safety: "Use a neutral grip if overhead range feels restricted." },
    { id: "lateral-raise", name: "Cable lateral raise", target: "Side delts", sets: "3 × 12", rest: "60 sec", tip: "Lead with the elbow and stop around shoulder height.", safety: "Avoid shrugging or swinging through the bottom." },
    { id: "dead-bug", name: "Dead bug", target: "Deep core", sets: "3 × 8 / side", rest: "45 sec", tip: "Keep the lower back gently connected to the floor.", safety: "Shorten the lever if you cannot keep a steady pelvis." },
  ] },
  { day: "Fri", focus: "Arms + Core", duration: "30 min", intent: "Finish the week with purposeful arm work and an anti-rotation core drill.", exercises: [
    { id: "hammer-curl", name: "Hammer curl", target: "Biceps · Forearms", sets: "3 × 12", rest: "60 sec", tip: "Keep wrists neutral and elbows near your sides.", safety: "Lower slowly instead of dropping through the range." },
    { id: "pressdown", name: "Rope triceps pressdown", target: "Triceps", sets: "3 × 12", rest: "60 sec", tip: "Pin elbows close to the torso and separate the rope at the bottom.", safety: "Do not lean your bodyweight into the cable." },
    { id: "pallof", name: "Pallof press", target: "Core · Obliques", sets: "3 × 10 / side", rest: "45 sec", tip: "Press away without letting the torso rotate.", safety: "Use a light resistance and control the return." },
  ] },
  { day: "Sat", focus: "Conditioning + Mobility", duration: "28 min", intent: "Build an easy aerobic base and finish with joint-friendly movement.", exercises: [
    { id: "walk", name: "Incline treadmill walk", target: "Cardio · Lower body", sets: "15 min", rest: "Easy pace", tip: "Choose a pace that lets you speak in full sentences.", safety: "Hold the rails only for balance, not to reduce the load." },
    { id: "carry", name: "Farmer carry", target: "Grip · Core", sets: "3 × 30 sec", rest: "60 sec", tip: "Walk tall with short, quiet steps.", safety: "Choose dumbbells you can carry without leaning sideways." },
    { id: "mobility", name: "Hip and thoracic mobility", target: "Hips · Upper back", sets: "2 × 5 min", rest: "As needed", tip: "Move slowly through a comfortable range of motion.", safety: "Do not force end-range positions." },
  ] },
  { day: "Sun", focus: "Rest + Recovery", duration: "18 min", intent: "Recover deliberately so the next week starts with energy rather than fatigue.", exercises: [
    { id: "breathing", name: "Slow nasal breathing", target: "Recovery", sets: "5 min", rest: "Free", tip: "Let the exhale run slightly longer than the inhale.", safety: "Stop if you feel lightheaded." },
    { id: "walk-recovery", name: "Easy outdoor walk", target: "Recovery · Activity", sets: "15 min", rest: "Free", tip: "Keep the pace conversational and leave your headphones off for a few minutes.", safety: "Choose stable, well-lit ground." },
    { id: "journal", name: "Weekly check-in", target: "Consistency", sets: "3 prompts", rest: "Free", tip: "Note one win, one barrier, and one adjustment for next week.", safety: "Keep the reflection practical rather than self-critical." },
  ] },
];

const workoutExerciseLookup = Object.fromEntries(workoutPlans.flatMap((plan) => plan.exercises.map((exercise) => [exercise.id, exercise])));

const mealPlan = [
  { id: "breakfast", type: "Breakfast", name: "Moong chilla + curd", detail: "28g protein · 420 kcal", icon: Coffee },
  { id: "lunch", type: "Lunch", name: "Dal, rice & seasonal vegetables", detail: "23g protein · 610 kcal", icon: Salad },
  { id: "snack", type: "Snack", name: "Roasted chana & fruit", detail: "11g protein · 230 kcal", icon: Apple },
];

const weeklySplit = [
  { day: "Mon", focus: "Chest + Triceps", tone: "active" }, { day: "Tue", focus: "Back + Biceps", tone: "" },
  { day: "Wed", focus: "Legs + Core", tone: "" }, { day: "Thu", focus: "Shoulders + Core", tone: "" },
  { day: "Fri", focus: "Chest + Arms", tone: "" }, { day: "Sat", focus: "Conditioning + Mobility", tone: "" },
  { day: "Sun", focus: "Rest + Recovery", tone: "rest" },
];

const initialRoutine = [
  { id: "wake", time: "06:30", title: "Wake, hydrate & sunlight", description: "500ml water · 5 min balcony light", state: "done" as RoutineState, icon: Sun },
  { id: "gym", time: "07:00", title: "Chest strength session", description: "45 min · Gym floor", state: "pending" as RoutineState, icon: Dumbbell },
  { id: "breakfast", time: "08:15", title: "Protein breakfast", description: "Moong chilla + curd", state: "pending" as RoutineState, icon: Coffee },
  { id: "office", time: "10:00", title: "Start focused work", description: "Office · posture reset every 60 min", state: "pending" as RoutineState, icon: Brain },
  { id: "walk", time: "13:15", title: "Lunch walk", description: "10 min movement after lunch", state: "pending" as RoutineState, icon: Footprints },
  { id: "winddown", time: "22:30", title: "Wind-down for sleep", description: "Screens down · lights soft", state: "pending" as RoutineState, icon: Moon },
];

function getTimeCopy() {
  const hour = new Date().getHours();
  if (hour < 10) return { label: "Good morning", message: "Your body is primed for a focused start." };
  if (hour < 13) return { label: "Good late morning", message: "Keep the momentum clear and steady." };
  if (hour < 18) return { label: "Good afternoon", message: "A small reset now protects your energy later." };
  return { label: "Good evening", message: "Close the day with intention, not pressure." };
}

function ScoreRing({ score }: { score: number }) {
  return <svg className="arc" viewBox="0 0 92 92" aria-hidden="true"><circle className="arc-bg" cx="46" cy="46" r="38" /><circle className="arc-value" cx="46" cy="46" r="38" style={{ strokeDashoffset: 239 - (239 * score) / 100 }} /></svg>;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<View>("today");
  const [routine, setRoutine] = useState(initialRoutine);
  const [water, setWater] = useState(1250);
  const [sleepHours, setSleepHours] = useState(7.2);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [replacementReason, setReplacementReason] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [customWater, setCustomWater] = useState(false);
  const [customWaterValue, setCustomWaterValue] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [mealLogged, setMealLogged] = useState<Record<string, boolean>>({});
  const [servings, setServings] = useState<Record<string, number>>({ breakfast: 1, lunch: 1, snack: 1 });
  const [sleepEditor, setSleepEditor] = useState(false);
  const [bedtime, setBedtime] = useState("23:18");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [preferences, setPreferences] = useState<string[]>(["Vegetarian", "High protein"]);
  const [reminders, setReminders] = useState<Record<string, boolean>>({ morning: true, water: false, winddown: true });
  const [logDate] = useState(() => new Date().toISOString().slice(0, 10));
  const dayInput = useMemo(() => ({ date: logDate }), [logDate]);
  const persistedDay = trpc.health.getDay.useQuery(dayInput, { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false });
  const saveWater = trpc.health.addWater.useMutation();
  const saveRoutine = trpc.health.updateRoutine.useMutation();
  const saveReplacement = trpc.health.recordReplacement.useMutation();
  const saveSleep = trpc.health.saveSleep.useMutation();
  const savePreferences = trpc.health.savePreferences.useMutation();
  const saveReminders = trpc.health.saveReminders.useMutation();
  const saveMeasurement = trpc.health.saveMeasurement.useMutation();
  const savedSettings = trpc.health.settings.useQuery(undefined, { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false });
  const measurements = trpc.health.measurements.useQuery(undefined, { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false });
  const assistantChat = trpc.assistant.chat.useMutation();
  const reportUpload = trpc.reports.uploadPdf.useMutation();
  const reportLibrary = trpc.reports.list.useQuery(undefined, { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: false });

  const timeCopy = getTimeCopy();
  const workoutDone = routine.find((item) => item.id === "gym")?.state === "done";
  const nutritionDone = Boolean(mealLogged.breakfast) || routine.find((item) => item.id === "breakfast")?.state === "done";
  const scoreParts = useMemo(() => {
    const completed = routine.filter((item) => item.state === "done").length;
    return [
      { label: "Workout", value: workoutDone ? 18 : 8, max: 18 }, { label: "Nutrition", value: nutritionDone ? 16 : 8, max: 16 },
      { label: "Water", value: Math.min(16, Math.round((water / 2500) * 16)), max: 16 }, { label: "Sleep", value: Math.min(17, sleepHours >= 7 ? 17 : Math.round(sleepHours / 7 * 17)), max: 17 },
      { label: "Activity", value: routine.find((item) => item.id === "walk")?.state === "done" ? 16 : 10, max: 16 }, { label: "Consistency", value: Math.min(17, 10 + completed * 5), max: 17 },
    ];
  }, [mealLogged, nutritionDone, routine, sleepHours, water, workoutDone]);
  const score = useMemo(() => scoreParts.reduce((total, part) => total + part.value, 0), [scoreParts]);

  useEffect(() => {
    if (!persistedDay.data) return;
    if (typeof persistedDay.data.water_ml === "number") setWater(persistedDay.data.water_ml);
    if (typeof persistedDay.data.sleep_minutes === "number") setSleepHours(+(persistedDay.data.sleep_minutes / 60).toFixed(1));
  }, [persistedDay.data]);

  useEffect(() => {
    const settings = savedSettings.data;
    if (!settings) return;
    if (Array.isArray(settings.food_preferences) && settings.food_preferences.length) setPreferences(settings.food_preferences);
    if (settings.reminder_preferences && Object.keys(settings.reminder_preferences).length) setReminders((current) => ({ ...current, ...settings.reminder_preferences }));
  }, [savedSettings.data]);

  const persistRoutine = (id: string, status: "pending" | "completed" | "skipped" | "replaced", movedTo?: string | null) => {
    const item = routine.find((entry) => entry.id === id);
    if (!isAuthenticated || !item) return;
    saveRoutine.mutate({ date: logDate, routineKey: item.id, title: item.title, scheduledTime: item.time, movedTo, status });
  };
  const completeRoutine = (id: string) => {
    const item = routine.find((entry) => entry.id === id);
    const status = item?.state === "done" ? "pending" : "completed";
    setRoutine((items) => items.map((entry) => entry.id === id ? { ...entry, state: status === "completed" ? "done" : "pending" } : entry));
    persistRoutine(id, status);
  };
  const skipRoutine = (id: string) => {
    setRoutine((items) => items.map((item) => item.id === id ? { ...item, state: "skipped" } : item));
    persistRoutine(id, "skipped");
  };
  const moveRoutine = (id: string) => setRoutine((items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0 || index === items.length - 1) return items;
    const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]];
    persistRoutine(id, "pending", next[index + 1].time);
    return next;
  });
  const addWater = (amount: number) => {
    setWater((current) => Math.min(5000, current + amount));
    if (isAuthenticated) saveWater.mutate({ date: logDate, amountMl: amount });
  };
  const openExerciseReplace = (exerciseId: string) => { setSelectedItem(exerciseId); setReplacementReason(""); setModal("exercise"); };
  const openFoodReplace = (mealId: string) => { setSelectedItem(mealId); setReplacementReason(""); setModal("food"); };
  const openActivityReplace = (routineId: string) => { setSelectedItem(routineId); setReplacementReason(""); setModal("activity"); };
  const selectReplacement = (replacement: string) => {
    const sourceKind = modal === "food" ? "food" : "exercise";
    const targetGroup = sourceKind === "exercise" && selectedItem ? workoutExerciseLookup[selectedItem]?.target : undefined;
    if (modal === "activity" && selectedItem) { setRoutine((items) => items.map((item) => item.id === selectedItem ? { ...item, state: "replaced" } : item)); persistRoutine(selectedItem, "replaced"); }
    else if (isAuthenticated && selectedItem) saveReplacement.mutate({ date: logDate, sourceKind, originalItem: selectedItem, replacementItem: replacement, reason: replacementReason.trim(), targetGroup });
    if (selectedItem === "bench" || selectedItem === "incline" || selectedItem === "fly") setActiveExercise(`${selectedItem}:${replacement}`);
    setModal(null); setSelectedItem(null);
  };
  const logMeal = (mealId: string) => { const nextLogged = !mealLogged[mealId]; setMealLogged((items) => ({ ...items, [mealId]: nextLogged })); if (isAuthenticated) { const meal = mealPlan.find((item) => item.id === mealId); if (meal) saveRoutine.mutate({ date: logDate, routineKey: `meal-${meal.id}`, title: meal.name, scheduledTime: meal.id === "breakfast" ? "08:15" : meal.id === "lunch" ? "13:00" : "16:30", status: nextLogged ? "completed" : "pending" }); } };
  const updateServing = (mealId: string) => setServings((items) => ({ ...items, [mealId]: items[mealId] === 1.5 ? .5 : +(items[mealId] + .5).toFixed(1) }));
  const saveSleepLog = () => { const [bedHour, bedMinute] = bedtime.split(":").map(Number); const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number); let minutes = (wakeHour * 60 + wakeMinute) - (bedHour * 60 + bedMinute); if (minutes <= 0) minutes += 24 * 60; setSleepHours(+(minutes / 60).toFixed(1)); if (isAuthenticated) saveSleep.mutate({ date: logDate, bedtime, wakeTime, sleepMinutes: minutes }); setSleepEditor(false); };
  const togglePreference = (preference: string) => { const next = preferences.includes(preference) ? preferences.filter((item) => item !== preference) : [...preferences, preference]; setPreferences(next); if (isAuthenticated) savePreferences.mutate({ foodPreferences: next, healthGoals: ["Stronger routine", "Better energy"] }); };
  const toggleReminder = (reminder: string) => setReminders((items) => { const next = { ...items, [reminder]: !items[reminder] }; if (isAuthenticated) saveReminders.mutate({ morning: Boolean(next.morning), water: Boolean(next.water), winddown: Boolean(next.winddown) }); return next; });
  const logMeasurement = (input: { weightKg: number | null; waistCm: number | null; restingPulse: number | null; notes: string | null }) => {
    if (!isAuthenticated) { setAssistantAnswer("Sign in to privately save a body measurement and view its progress trend."); return; }
    saveMeasurement.mutate({ measuredOn: logDate, ...input }, { onSuccess: () => measurements.refetch() });
  };
  const logWorkoutExercise = (exerciseId: string, completed: boolean) => { if (!isAuthenticated) return; const exercise = workoutExerciseLookup[exerciseId]; if (exercise) saveRoutine.mutate({ date: logDate, routineKey: `exercise-${exercise.id}`, title: exercise.name, scheduledTime: "07:00", status: completed ? "completed" : "pending" }); };
  const askAssistant = () => {
    const question = assistantQuery.trim();
    if (!question) return;
    if (isAuthenticated) {
      assistantChat.mutate({ question, localTime: new Date().toISOString() }, {
        onSuccess: (result) => setAssistantAnswer(result.answer),
        onError: () => setAssistantAnswer("The assistant could not respond right now. Your tracking data remains safely available; please try again shortly."),
      });
    } else {
      const request = question.toLowerCase();
      if (request.includes("vitamin") || request.includes("d")) setAssistantAnswer("Your report shows Vitamin D at 7.9 ng/mL, marked deficient. This app can help you track questions for your clinician; discuss a plan and repeat-test timing with them before changing supplements.");
      else if (request.includes("workout")) setAssistantAnswer("Today’s session is chest-focused. Begin with a gradual warm-up, keep two reps in reserve on your first working set, and choose a replacement if a movement feels unsuitable.");
      else setAssistantAnswer("Sign in to use your personal routine and report context. Gemini will provide personalised conversations once GEMINI_API_KEY is configured.");
    }
    setAssistantQuery("");
  };
  const uploadHealthReport = (file: File | undefined) => {
    if (!file) return;
    if (!isAuthenticated) { setAssistantAnswer("Sign in first to upload and privately store a health-report PDF."); return; }
    if (file.type !== "application/pdf" || file.size > 7_000_000) { setAssistantAnswer("Please select a valid PDF smaller than 7 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const fileBase64 = String(reader.result).split(",")[1];
      if (!fileBase64) { setAssistantAnswer("The PDF could not be prepared for upload. Please try again."); return; }
      reportUpload.mutate({ fileName: file.name, fileBase64 }, {
        onSuccess: (result) => setAssistantAnswer(result.analysis.available ? result.analysis.summary : "Your PDF has been stored privately. Add GEMINI_API_KEY when you are ready for extraction and explanation."),
        onError: () => setAssistantAnswer("The report could not be uploaded right now. Please try again with a PDF smaller than 7 MB."),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="hp-app">
      <main className="hp-shell">
        <header className="hp-topbar">
          <div className="hp-wordmark"><span className="hp-mark"><HeartPulse size={17} /></span><span>HP</span><span className="hp-live"><i />Personal protocol</span></div>
          <button className="profile-button" aria-label="Open profile">SG</button>
        </header>

        {view === "today" && <TodayView score={score} scoreParts={scoreParts} water={water} sleepHours={sleepHours} routine={routine} workoutDone={workoutDone} nutritionDone={nutritionDone} onNavigate={setView} onComplete={completeRoutine} onWater={addWater} />}
        {view === "routine" && <RoutineView routine={routine} onComplete={completeRoutine} onSkip={skipRoutine} onMove={moveRoutine} onReplace={openExerciseReplace} onActivityReplace={openActivityReplace} onWorkoutLog={logWorkoutExercise} />}
        {view === "fuel" && <FuelView water={water} sleepHours={sleepHours} bedtime={bedtime} wakeTime={wakeTime} sleepEditor={sleepEditor} mealLogged={mealLogged} servings={servings} customWater={customWater} customWaterValue={customWaterValue} onWater={addWater} onToggleCustom={() => setCustomWater(!customWater)} onCustomValue={setCustomWaterValue} onCustomAdd={() => { const amount = Number(customWaterValue); if (amount > 0) addWater(amount); setCustomWaterValue(""); setCustomWater(false); }} onSleepEditor={() => setSleepEditor(!sleepEditor)} onBedtime={setBedtime} onWakeTime={setWakeTime} onSaveSleep={saveSleepLog} onLogMeal={logMeal} onServing={updateServing} onReplace={openFoodReplace} />}
        {view === "health" && <><HealthView score={score} reports={reportLibrary.data ?? []} preferences={preferences} reminders={reminders} onTogglePreference={togglePreference} onToggleReminder={toggleReminder} isAuthenticated={isAuthenticated} isAsking={assistantChat.isPending} isUploading={reportUpload.isPending} assistantAnswer={assistantAnswer} assistantQuery={assistantQuery} setAssistantQuery={setAssistantQuery} onAsk={askAssistant} onUpload={uploadHealthReport} /><MeasurementTracker measurements={measurements.data ?? []} isAuthenticated={isAuthenticated} isSaving={saveMeasurement.isPending} onSave={logMeasurement} /></>}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavButton label="Today" icon={Activity} active={view === "today"} onClick={() => setView("today")} />
        <NavButton label="Routine" icon={Clock3} active={view === "routine"} onClick={() => setView("routine")} />
        <NavButton label="Fuel" icon={Apple} active={view === "fuel"} onClick={() => setView("fuel")} />
        <NavButton label="Health" icon={HeartPulse} active={view === "health"} onClick={() => setView("health")} />
      </nav>

      {modal && <ReplaceModal type={modal} selectedItem={selectedItem} reason={replacementReason} setReason={setReplacementReason} onClose={() => setModal(null)} onSelect={selectReplacement} />}
    </div>
  );
}

function NavButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Activity; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><Icon size={17} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span></button>;
}

function TodayView({ score, scoreParts, water, sleepHours, routine, workoutDone, nutritionDone, onNavigate, onComplete, onWater }: { score: number; scoreParts: Array<{ label: string; value: number; max: number }>; water: number; sleepHours: number; routine: typeof initialRoutine; workoutDone: boolean; nutritionDone: boolean; onNavigate: (view: View) => void; onComplete: (id: string) => void; onWater: (amount: number) => void }) {
  const copy = getTimeCopy();
  const next = routine.find((item) => item.state === "pending") ?? routine[0];
  return <>
    <section className="today-heading"><p className="eyebrow">Wednesday · 20 August</p><h1 className="heading">{copy.label},<br /><strong>Shashank.</strong></h1><p className="subheading">{copy.message} Your next choice is the only one that needs attention.</p></section>
    <div className="day-strip" aria-label="Week calendar">{days.map((day, index) => <button className={`day-button ${index === 2 ? "active" : ""}`} key={day}><span>{day}</span><b>{dayNumbers[index]}</b></button>)}</div>
    <div className="hero-grid">
      <section className="score-card"><p className="eyebrow">Today’s health score</p><div className="score-line"><span className="score-number">{score}</span><span className="score-unit">/ 100</span></div><p className="score-label">Consistency is building. Complete one focused session to unlock your strongest score today.</p><ScoreRing score={score} /></section>
      <section className="next-card"><div className="next-card-head"><span className="next-icon"><next.icon size={19} /></span><span className="next-time">{next.time}</span></div><h3>{next.title}</h3><p>{next.description}</p><button className="text-link" onClick={() => { onComplete(next.id); onNavigate(next.id === "gym" ? "routine" : "today"); }}>{next.id === "gym" ? "Open session" : "Mark complete"} <ArrowRight size={13} /></button></section>
    </div>
    <section className="section"><div className="section-heading"><h2 className="section-title">Your day, at a glance</h2><span className="section-caption">Live progress</span></div><div className="status-grid">
      <button className="status-card" onClick={() => onNavigate("routine")}><span className="status-icon"><Dumbbell size={16} /></span><b>Workout</b><small>{workoutDone ? "Session complete" : "Chest · 45 min"}</small><div className="progress"><span style={{ width: workoutDone ? "100%" : "15%" }} /></div></button>
      <button className="status-card" onClick={() => onNavigate("fuel")}><span className="status-icon"><Apple size={16} /></span><b>Nutrition</b><small>{nutritionDone ? "Breakfast logged" : "1 meal to log"}</small><div className="progress"><span style={{ width: nutritionDone ? "55%" : "18%" }} /></div></button>
      <button className="status-card" onClick={() => onWater(250)}><span className="status-icon"><Droplets size={16} /></span><b>Water</b><small>{water.toLocaleString()} / 2,500 ml</small><div className="progress"><span style={{ width: `${Math.min(100, water / 25)}%` }} /></div></button>
      <button className="status-card" onClick={() => onNavigate("fuel")}><span className="status-icon"><Moon size={16} /></span><b>Sleep</b><small>{sleepHours}h · on target</small><div className="progress"><span style={{ width: `${Math.min(100, sleepHours / 8 * 100)}%` }} /></div></button>
    </div></section>
    <section className="section"><div className="section-heading"><h2 className="section-title">The rhythm of today</h2><button className="text-link" onClick={() => onNavigate("routine")}>Full plan <ChevronRight size={13} /></button></div><div className="agenda">{routine.slice(0, 4).map((item) => <div className={`agenda-item ${item.state === "done" ? "is-done" : ""} ${item.state === "skipped" ? "is-skipped" : ""}`} key={item.id}><span className="agenda-time">{item.time}</span><span className="agenda-dot">{item.state === "done" ? <Check size={13} /> : <item.icon size={12} />}</span><span className="agenda-copy"><b>{item.title}</b><small>{item.description}</small></span><button className="agenda-action" aria-label={`Mark ${item.title} complete`} onClick={() => onComplete(item.id)}>{item.state === "done" ? <Check size={15} /> : <CircleEllipsis size={17} />}</button></div>)}</div></section>
    <section className="section"><div className="section-heading"><h2 className="section-title">Score composition</h2><span className="section-caption">6 signals</span></div><div className="score-breakdown">{scoreParts.map((part) => <div className="score-part" key={part.label}><span>{part.label}</span><b>{part.value}/{part.max}</b><div className="progress"><span style={{ width: `${part.value / part.max * 100}%` }} /></div></div>)}</div></section>
    <section className="section"><div className="tip-card"><span className="tip-icon"><Sparkles size={16} /></span><div><span className="section-caption">One small improvement</span><p>Keep a water bottle on your desk after your gym session. One 250ml tap now moves you closer to today’s 2.5L target.</p></div></div></section>
  </>;
}

function RoutineView({ routine, onComplete, onSkip, onMove, onReplace, onActivityReplace, onWorkoutLog }: { routine: typeof initialRoutine; onComplete: (id: string) => void; onSkip: (id: string) => void; onMove: (id: string) => void; onReplace: (id: string) => void; onActivityReplace: (id: string) => void; onWorkoutLog: (id: string, completed: boolean) => void }) {
  const [selectedDay, setSelectedDay] = useState("Mon");
  const selectedPlan = workoutPlans.find((plan) => plan.day === selectedDay) ?? workoutPlans[0];
  return <><ViewHeader eyebrow="Your personal day" title="Routine, with room to adapt." copy="The plan begins with a 6–7 AM wake-up window and flexes when real life does." aside="WED · 20 AUG" />
  {routine.map((item) => <article className="routine-card" key={item.id}><div className="routine-card-top"><div><span className="routine-meta">{item.time} · {item.state === "done" ? "Completed" : item.state === "skipped" ? "Skipped" : item.state === "replaced" ? "Replaced" : "Planned"}</span><h3>{item.title}</h3><p>{item.description}</p></div><span className="next-icon"><item.icon size={17} /></span></div><div className="routine-actions"><button className="mini-button" onClick={() => onComplete(item.id)}><Check size={12} /> {item.state === "done" ? "Undo" : "Complete"}</button><button className="mini-button warn" onClick={() => onSkip(item.id)}><SkipForward size={12} /> Skip</button><button className="mini-button" onClick={() => item.id === "gym" ? onReplace("bench") : onActivityReplace(item.id)}><Sparkles size={12} /> Replace</button><button className="mini-button" onClick={() => onMove(item.id)}><Clock3 size={12} /> Move later</button></div></article>)}
  <section className="section"><div className="section-heading"><h2 className="section-title">Weekly split</h2><span className="section-caption">Tap a day for its protocol</span></div><div className="weekly-split">{weeklySplit.map((item) => <button className={`split-day ${item.tone} ${selectedDay === item.day ? "selected" : ""}`} onClick={() => setSelectedDay(item.day)} key={item.day}><b>{item.day}</b><span>{item.focus}</span></button>)}</div></section>
  <section className="section"><div className="section-heading"><h2 className="section-title">Gym protocol</h2><span className="section-caption">{selectedPlan.day} · {selectedPlan.focus}</span></div><WorkoutList plan={selectedPlan} onReplace={onReplace} onLog={onWorkoutLog} /></section></>;
}

function WorkoutList({ plan, onReplace, onLog }: { plan: typeof workoutPlans[number]; onReplace: (id: string) => void; onLog: (id: string, completed: boolean) => void }) {
  const [doneExercises, setDoneExercises] = useState<string[]>([]);
  const toggleExercise = (id: string) => setDoneExercises((current) => { const completed = !current.includes(id); onLog(id, completed); return completed ? [...current, id] : current.filter((item) => item !== id); });
  return <><div className="workout-hero"><div className="workout-art"><span className="art-bar" /></div><div className="workout-hero-copy"><p className="eyebrow">Guided session</p><h3>{plan.focus}, with intent.</h3><p>{plan.intent}</p><div className="workout-stat-line"><span>{plan.exercises.length} exercises</span><span>{plan.duration}</span><span>guided pacing</span></div></div></div>{plan.exercises.map((exercise, index) => <article className={`exercise-card ${doneExercises.includes(exercise.id) ? "done" : ""}`} key={exercise.id}><div className="exercise-row"><span className="exercise-number">0{index + 1}</span><div><h3>{exercise.name}</h3><p>{exercise.target}</p></div><button className="icon-button" onClick={() => toggleExercise(exercise.id)}>{doneExercises.includes(exercise.id) ? <Check size={15} /> : <Plus size={15} />}</button></div><div className="exercise-info"><span className="info-pill">{exercise.sets}</span><span className="info-pill"><Timer size={10} /> {exercise.rest}</span><a className="info-pill demo-link" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} correct form demonstration`)}`} target="_blank" rel="noreferrer"><Activity size={10} /> View form demo</a></div><p className="form-tip"><b>Form:</b> {exercise.tip} <b>Safety:</b> {exercise.safety}</p><button className="replace-link" onClick={() => onReplace(exercise.id)}>I don’t want to do this <ArrowRight size={10} /></button></article>)}</>;
}

function FuelView({ water, sleepHours, bedtime, wakeTime, sleepEditor, mealLogged, servings, customWater, customWaterValue, onWater, onToggleCustom, onCustomValue, onCustomAdd, onSleepEditor, onBedtime, onWakeTime, onSaveSleep, onLogMeal, onServing, onReplace }: { water: number; sleepHours: number; bedtime: string; wakeTime: string; sleepEditor: boolean; mealLogged: Record<string, boolean>; servings: Record<string, number>; customWater: boolean; customWaterValue: string; onWater: (amount: number) => void; onToggleCustom: () => void; onCustomValue: (value: string) => void; onCustomAdd: () => void; onSleepEditor: () => void; onBedtime: (value: string) => void; onWakeTime: (value: string) => void; onSaveSleep: () => void; onLogMeal: (id: string) => void; onServing: (id: string) => void; onReplace: (id: string) => void }) {
  return <><ViewHeader eyebrow="Fuel with clarity" title="Eat for the day you want." copy="A familiar, vegetarian-first structure with easy swaps when plans change." aside="1,260 KCAL" />
  <div className="food-summary"><div className="macro-card"><b>62g</b><small>Protein logged</small></div><div className="macro-card"><b>1,260</b><small>Calories planned</small></div></div>
  <section>{mealPlan.map((meal) => <article className={`meal-card ${mealLogged[meal.id] ? "logged" : ""}`} key={meal.id}><span className="meal-art"><meal.icon size={20} /></span><div><span className="routine-meta">{meal.type} · {servings[meal.id]} serving{servings[meal.id] === 1 ? "" : "s"}</span><h3>{meal.name}</h3><p>{meal.detail}</p><div className="meal-actions"><button className="replace-link" onClick={() => onReplace(meal.id)}>Replace <ArrowRight size={10} /></button><button className="replace-link" onClick={() => onServing(meal.id)}>Serving</button><button className="replace-link" onClick={() => onLogMeal(meal.id)}>{mealLogged[meal.id] ? "Logged ✓" : "Log meal"}</button></div></div><ChevronRight size={16} color="#9aaca4" /></article>)}</section>
  <section className="water-card"><div className="water-top"><div><h3>Water rhythm</h3><p>{Math.max(0, 2500 - water).toLocaleString()} ml remaining to your 2.5L target.</p></div><span className="water-amount">{water / 1000}L</span></div><div className="water-progress"><span style={{ width: `${Math.min(100, water / 25)}%` }} /></div><div className="water-buttons"><button onClick={() => onWater(250)}>+ 250ml</button><button onClick={() => onWater(500)}>+ 500ml</button><button onClick={onToggleCustom}>+ Custom</button></div>{customWater && <div className="assistant-prompt"><input value={customWaterValue} onChange={(event) => onCustomValue(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Enter ml" inputMode="numeric" /><button onClick={onCustomAdd}><Send size={13} /></button></div>}</section>
  <section className="sleep-card"><span className="sleep-icon"><Moon size={21} /></span><div><h3>Sleep check-in</h3><p>{bedtime} → {wakeTime} · weekly average 7h 08m · consistent within 24 min</p></div><button className="sleep-amount" onClick={onSleepEditor} title="Edit sleep log">{sleepHours}h</button></section>{sleepEditor && <div className="sleep-editor"><label>Bedtime<input type="time" value={bedtime} onChange={(event) => onBedtime(event.target.value)} /></label><label>Wake time<input type="time" value={wakeTime} onChange={(event) => onWakeTime(event.target.value)} /></label><button className="cta-button" onClick={onSaveSleep}>Save sleep</button></div>}
  <p className="disclaimer">Wellness tracking is not a substitute for medical care. Use your clinician’s guidance for any symptom, treatment, or supplement decision.</p></>;
}

function HealthView({ score, reports, preferences, reminders, onTogglePreference, onToggleReminder, isAuthenticated, isAsking, isUploading, assistantAnswer, assistantQuery, setAssistantQuery, onAsk, onUpload }: { score: number; reports: Array<{ id: string; original_filename: string; created_at: string; findings: Array<{ name: string; value: string; status: string }> }>; preferences: string[]; reminders: Record<string, boolean>; onTogglePreference: (value: string) => void; onToggleReminder: (value: string) => void; isAuthenticated: boolean; isAsking: boolean; isUploading: boolean; assistantAnswer: string; assistantQuery: string; setAssistantQuery: (value: string) => void; onAsk: () => void; onUpload: (file?: File) => void }) {
  return <><ViewHeader eyebrow="Health snapshot" title="Know your signals." copy="A practical view of your measurable progress and report markers." aside={`${score} / 100 TODAY`} /><div className="health-grid"><section className="metric-panel"><h3>Progress markers</h3><p>Log check-ins over time to make patterns easier to discuss.</p><table className="metric-table"><tbody><tr><td>Weight</td><td>74.6 kg</td></tr><tr><td>Waist</td><td>84 cm</td></tr><tr><td>Resting pulse</td><td>68 bpm</td></tr><tr><td>Weekly movement</td><td>4 / 5 days</td></tr></tbody></table><div className="trend-strip"><span>4-week movement trend</span><div className="trend-bars"><i style={{ height: "36%" }} /><i style={{ height: "52%" }} /><i style={{ height: "68%" }} /><i style={{ height: "82%" }} /></div><b>Steadier</b></div></section><section className="report-panel"><div className="next-card-head"><div><h3>Lab report focus</h3><p>Redcliffe Labs · October 2025 · values shown exactly as supplied.</p></div><label className="upload-control">{isUploading ? "Uploading…" : "Upload PDF"}<input type="file" accept="application/pdf,.pdf" disabled={isUploading} onChange={(event) => onUpload(event.target.files?.[0])} /></label></div><ReportFlag name="Vitamin D" value="7.9" note="deficient" tone="rose" /><ReportFlag name="HDL" value="38.5" note="low" /><ReportFlag name="hs-CRP" value="1.2" note="borderline" /><ReportFlag name="IgE" value="109" note="high" tone="rose" /><ReportFlag name="HbA1c" value="5.6" note="near-threshold" /></section></div><section className="report-library"><div><span className="section-caption">Private report library</span><h3>Saved health reports</h3></div>{reports.length ? reports.map((report) => <div className="report-library-row" key={report.id}><span><b>{report.original_filename}</b><small>{new Date(report.created_at).toLocaleDateString()} · {report.findings.length} extracted markers</small></span><Check size={15} /></div>) : <p>{isAuthenticated ? "Upload a PDF to create your private report history." : "Sign in to view your private report history."}</p>}</section><section className="preference-panel"><span className="section-caption">Food preferences</span><h3>What should future meal suggestions respect?</h3><div className="preference-chips">{["Vegetarian", "High protein", "Quick prep", "Office-friendly"].map((item) => <button key={item} className={preferences.includes(item) ? "selected" : ""} onClick={() => onTogglePreference(item)}>{preferences.includes(item) ? <Check size={11} /> : <Plus size={11} />}{item}</button>)}</div></section><section className="reminder-panel"><span className="section-caption">Gentle reminders</span><h3>Keep the essentials visible.</h3>{[{ id: "morning", label: "Morning start", time: "06:30" }, { id: "water", label: "Midday water reset", time: "13:30" }, { id: "winddown", label: "Wind-down", time: "22:30" }].map((reminder) => <button className="reminder-row" key={reminder.id} onClick={() => onToggleReminder(reminder.id)}><span><b>{reminder.label}</b><small>{reminder.time}</small></span><i className={reminders[reminder.id] ? "on" : ""} /></button>)}<p>These controls prepare your routine preferences; they are not emergency or medical alerts.</p></section>
  <section className="assistant-panel"><div className="next-card-head"><span className="next-icon"><Bot size={18} /></span><span className="section-caption" style={{ color: "#a7d6ad" }}>{isAuthenticated ? "Gemini-ready" : "Sign in for context"}</span></div><h3>Ask your health companion</h3><p>It will use your time, logged routine, preferences and report data after <code>GEMINI_API_KEY</code> is configured.</p><div className="assistant-prompt"><input value={assistantQuery} onChange={(event) => setAssistantQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onAsk(); }} placeholder="What should I focus on today?" /><button onClick={onAsk} disabled={isAsking}>{isAsking ? <Activity size={13} /> : <Send size={13} />}</button></div>{assistantAnswer && <div className="assistant-answer">{assistantAnswer}</div>}</section><p className="disclaimer">This companion offers wellness information, not a medical diagnosis. Review consequential results and treatment decisions with a qualified clinician.</p></>;
}

function ViewHeader({ eyebrow, title, copy, aside }: { eyebrow: string; title: string; copy: string; aside: string }) { return <header className="view-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{copy}</p></div><span className="week-pill">{aside}</span></header>; }
function ReportFlag({ name, value, note, tone }: { name: string; value: string; note: string; tone?: "rose" }) { return <div className="report-flag"><span className={`flag-dot ${tone ?? ""}`} /><div><b>{name}</b><small>{note}</small></div><span className="report-value">{value}</span></div>; }

function ReplaceModal({ type, selectedItem, reason, setReason, onClose, onSelect }: { type: ModalState; selectedItem: string | null; reason: string; setReason: (value: string) => void; onClose: () => void; onSelect: (value: string) => void }) {
  const [choice, setChoice] = useState("");
  const exerciseOptions = [{ name: "Dumbbell floor press", detail: "Chest · 4 × 10 · stable shoulder position" }, { name: "Machine chest press", detail: "Chest · 3 × 12 · guided path" }, { name: "Push-ups", detail: "Chest · 3 × AMRAP · no equipment" }];
  const foodOptions = [{ name: "Paneer bhurji + roti", detail: "Similar protein profile · quick preparation" }, { name: "Tofu masala bowl", detail: "Plant-forward · easy office meal" }, { name: "Greek yogurt + fruit + nuts", detail: "No-cook · compact snack replacement" }];
  const activityOptions = [{ name: "Five-minute mobility reset", detail: "Gentle movement · works at home or office" }, { name: "Short outdoor walk", detail: "10 minutes · light activity and daylight" }, { name: "Desk breathing break", detail: "3 minutes · low-friction reset" }];
  const options = type === "exercise" ? exerciseOptions : type === "food" ? foodOptions : activityOptions;
  const title = type === "exercise" ? "Choose an alternative" : type === "food" ? "Find a food swap" : "Adapt this activity";
  const helper = type === "exercise" ? "Every alternative keeps the target muscle group in focus. Your reason helps future recommendations adapt." : type === "food" ? "Choose what fits now. Your replacement reason will shape future meal suggestions." : "Choose a smaller action that still supports the rhythm of your day.";
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="replace-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Personalize your plan</p><h2 id="replace-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={16} /></button></div><p>{helper}</p>{options.map((option) => <button className={`choice-card ${choice === option.name ? "selected" : ""}`} key={option.name} onClick={() => setChoice(option.name)}><span className="choice-icon">{type === "exercise" ? <Dumbbell size={17} /> : type === "food" ? <Leaf size={17} /> : <Activity size={17} />}</span><span><b>{option.name}</b><small>{option.detail}</small></span></button>)}<label className="reason-label">Why are you replacing this? <span style={{ fontWeight: 400 }}>(required and saved for personalization)</span><textarea className="reason-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={type === "exercise" ? "e.g. Equipment busy, shoulder feels tender..." : type === "food" ? "e.g. No time to cook, eating out..." : "e.g. Working late, travel, low energy..."} /></label><button className="cta-button" disabled={!choice || reason.trim().length < 2} style={{ opacity: !choice || reason.trim().length < 2 ? .45 : 1 }} onClick={() => onSelect(choice)}><ShieldCheck size={13} /> Save replacement</button><p className="disclaimer">Selected: {selectedItem ?? "item"}. Replacement reasons are stored privately when you are signed in.</p></section></div>;
}
