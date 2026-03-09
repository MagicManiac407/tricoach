// ============================================================
// PRO BLUEPRINT PAGE — TriCoach
// Expanded roster: 18 athletes, verified 2025 race data
// Sources: Scientific Triathlon pods, PubMed, Norwegian Method Pod,
//          TRI247, Slowtwitch, Triathlete Mag, direct athlete interviews,
//          PTO Stats, T100 Wikipedia, InsideHook, 220 Triathlon
// Includes: Hayden Wilde, Mika Noodt, Morgan Pearson, Marten Van Riel
// Dark theme restyled for TriCoach 2026
// ============================================================

const PRO_ATHLETES = [
  {
    id: 'geens',
    name: 'Jelle Geens',
    country: 'BEL', flag: '🇧🇪',
    age: 32,
    tier: '⭐ 70.3 World Champion 2025',
    wins2025: ['IM 70.3 Geelong', 'IM 70.3 Worlds Marbella'],
    podiums2025: ['1st Geelong', '1st Marbella Worlds'],
    coach: 'Ben Reszel (remote)',
    base: 'Gold Coast, Australia',
    dataQuality: 'CONFIRMED',
    source: 'Scientific Triathlon EP#470 (Aug 2025)',
    keyStats: {
      peakWeekHours: '28–32h',
      recoveryWeek: '22–23h',
      swimPerWeek: '5× / 25–30km total',
      bikePerWeek: '5–6× / 3–4.5h per ride',
      runPerWeek: '4–5× / 80–105 min per run',
      strengthPerWeek: '2× Pilates (45 min)',
      bodyWeight: '62kg',
      swimStrength: 'Limiter — Achilles heel, improving',
      bikeStrength: 'Greatest focus and improvement lever',
      runStrength: 'World-class — 1:07 half-marathon at Worlds',
    },
    weekStructure: {
      mon: { swim: 'Easy 4–5km solo', bike: 'Recovery spin 60 min', run: null },
      tue: { swim: 'Squad hard session 6–6.5km (5×200 on 2:40 + 10×100 + 20×50 on 40s)', bike: 'VO₂ intervals: 35s hard/15s easy ×6 reps per block, 2–3 blocks', run: 'Easy 60–80 min' },
      wed: { swim: null, bike: 'Long ride 3.5–4.5h at low Z2 (~200W)', run: '90 min brick off bike at ~4:20/km steady' },
      thu: { swim: 'Technique moderate 5km', bike: 'Easy recovery 2h', run: 'Threshold: 4×3km alternating threshold/race pace, 2 min recovery' },
      fri: { swim: 'Easy 4km solo', bike: 'Short spin or rest', run: 'Easy 60–70 min' },
      sat: { swim: null, bike: 'Big Day: 90–105 min AM run + 4–4.5h PM ride (6h combined leg load)', run: '90–105 min AM at easy aerobic (~200W bike / 4:20 run = "steady")' },
      sun: { swim: 'Recovery 4km easy', bike: 'Easy 90 min', run: 'Easy 60 min or rest' },
    },
    keySessions: [
      { name: 'Race-Sim Bike (London corners)', detail: '6×(35s VO₂ / 15s easy) ×5min + 1min easy + 4min race pace / 30s harder — repeat 3×, then 20min (1 on/4 off). Simulates corner accelerations in T100 racing.' },
      { name: 'Pure VO₂ Bike Block', detail: '35s hard / 15s easy ×6 reps ×2 sets. Extend to 1min reps → 3min reps @ ~400W. Brutal by final set.' },
      { name: 'Alternating Threshold Run', detail: '4×3km: odd reps threshold (~3:40/km), even reps at 70.3 race pace (~3:25/km), 2 min recovery between each.' },
      { name: 'VO₂ Run Blocks', detail: '40s @ 2:35/km pace / 20s easy ×4 reps = 4 min block. Rest 5 min. Repeat 4–5 times. Self-described as brutal.' },
      { name: 'LT1 Long Run Segments', detail: '6×6min or 3×15min @ 3:45–3:50/km. Often as brick run component after 4h bike.' },
      { name: 'Squad Swim Set', detail: '3km warm-up (pull/band heavy) + 5×200 on 2:40 + 10×100 + 20×50 on 40s = 3km main set = ~6.5km total.' },
    ],
    nutrition: {
      philosophy: 'High carbohydrate training, pragmatic whole food base, no strict calorie counting',
      training: 'Precision Fuel & Hydration gels and electrolytes during training. Carb-rich meals around key sessions.',
      race: 'Precision Fuel & Hydration strategy. Targets 80–100g carbs/hour on bike, gels on run.',
      recovery: 'Protein + carbs within 30–60 min post-session. Daily coach contact for load adjustment.',
    },
    recovery: {
      sleep: '8–9h. Prioritises sleep over early morning sessions when managing family life with 20-month-old daughter.',
      tools: 'Pilates 2×/week (45 min). Injury prevention focus. Never lifts weights — Pilates is full S&C.',
      philosophy: '"Switched-off" mindset after each session — treats training as a job. 3-week build → recovery week at 22–23h.',
      taper: 'Significant volume drop pre-race. Keeps one longer bike session even in taper. No hard swim on race day –1.',
    },
    physiology: {
      estimatedFTP: '~380–400W (inferred from targeting ~400W on 3min VO₂ reps in sessions)',
      runThreshold: '3:25–3:40/km at threshold',
      background: '3× Olympian. Short-course WTS career 2015–2024. Transitioned long-course 2024–25. Won Worlds in debut year.',
      notes: 'Late-starting swimmer (age 15). Swim is genuine limiter but manageable at long-course distance. Bike is biggest improvement lever.',
    },
    raceData2025: [
      { race: 'IM 70.3 Geelong', pos: 1, swim: '—', bike: '—', run: '—', total: '~3:43' },
      { race: 'IM 70.3 Worlds Marbella', pos: 1, swim: 'Front group (crashed on bike, mechanical, still won)', bike: 'Lead group of 9', run: '1:07:xx', total: '3:37:41' },
    ],
  },

  {
    id: 'blummenfelt',
    name: 'Kristian Blummenfelt',
    country: 'NOR', flag: '🇳🇴',
    age: 31,
    tier: '⭐ Olympic Champion + IRONMAN Pro Series 2025 Champion',
    wins2025: ['IM Texas (full)', 'IM Frankfurt (full)', 'IM 70.3 Aix-en-Provence'],
    podiums2025: ['1st Texas', '1st Frankfurt', '1st Aix-en-Provence', '2nd 70.3 Worlds Marbella', '3rd IMWC Nice'],
    coach: 'Self-coached (collaborative group: Blummenfelt, Iden, Stornes)',
    base: 'Bergen, Norway',
    dataQuality: 'CONFIRMED',
    source: 'J Applied Physiology 2024 (PubMed PMID: 39480269); Norwegian Method Podcast; Triathlete.com Oct 2025',
    keyStats: {
      vo2max: '101.1 mL/kg/min (confirmed PubMed)',
      peakEnergyExpenditure: '7,019–8,506 kcal/day during training',
      energyIntake: '4,899–6,360 kcal/day (confirmed deficit managed)',
      annualTrainingHours: '1,308–1,480h/yr (2020–2022 data confirmed)',
      peakWeekHours: '28–35h',
      intensityDistribution: 'Pyramidal: ~80–85% low intensity, ~15–20% lactate-threshold',
      swimPerWeek: '6× sessions',
      bikePerWeek: '5–6×, double sessions 2 days/wk',
      runPerWeek: '5–6×, double sessions 2 days/wk',
    },
    weekStructure: {
      mon: { swim: 'Easy Z1 swim 4–5km + lactate check', bike: null, run: 'Easy run 60 min' },
      tue: { swim: 'AM: Threshold swim (LT2, lactate controlled at 2.5–3mmol)', bike: 'PM: Double threshold bike — 4–6×(10–15min at LT2 power, lactate tested every interval)', run: null },
      wed: { swim: 'AM swim moderate', bike: 'Long Z1 ride 4–5h (200–240km)', run: 'Brick run 60 min off bike' },
      thu: { swim: 'AM: VO₂ swim', bike: 'Easy spin 90 min', run: 'PM: Double threshold run — 4×(3km @ LT2 pace, lactate controlled)' },
      fri: { swim: 'Easy technique 4km', bike: 'Easy 90 min', run: 'Easy recovery 45 min' },
      sat: { swim: null, bike: 'Race simulation or long hard ride with quality blocks', run: 'Key threshold brick run 60–75 min' },
      sun: { swim: 'Easy 4km', bike: 'Long Z1 ride 3–4h or active recovery', run: 'Long easy run 1:30–2h' },
    },
    keySessions: [
      { name: 'Double Threshold Day (Norwegian Method)', detail: 'AM: threshold swim at 2.5–3mmol lactate. PM: threshold bike or run — 4–6×(10–15min at LT2, lactate tested every interval to stay in zone). Allows 2× the threshold stimulus without metabolic breakdown.' },
      { name: '30/10 VO₂ Intervals', detail: '30s at VO₂max power / 10s easy. Confirmed in J.Appl.Physiol. study as key session. Very high aerobic ceiling stimulus with controlled recovery cost.' },
      { name: 'Lactate-Controlled Threshold Run', detail: '4×(3km at LT2 pace). Lactate sample taken after each rep. If >3.5mmol = too fast, slow down. If <2.0mmol = too slow, increase. Precision is the point.' },
      { name: 'Altitude Block', detail: '3–4 weeks Sierra Nevada (2,300m) or Pyrenees (1,800–2,400m) pre-key races. All sessions run at altitude. Haematological adaptation the primary goal.' },
    ],
    nutrition: {
      philosophy: 'High-carb, intuitive eating. Moved away from calorie counting after initial tracking period. Very high energy expenditure demands very high intake.',
      training: 'Carb-fueled threshold sessions (Maurten hydrogel key). Lower carb on easy days. Carb periodisation matches training load.',
      race: '100g+ carbs/hour via hydrogel. 200mg+ caffeine. 180g/hr confirmed at IMWC Nice 2025. Carb loading race week. 8,500 kcal/day total expenditure at peak.',
      recovery: 'Large post-session carb + protein meals. Caffeine matched to training intensity. Sleep #1 priority.',
    },
    recovery: {
      sleep: '8–9h. Essential. Caffeine intake deliberately managed around training schedule.',
      tools: 'Altitude camps (2×/season). Bergen harsh-weather training builds mental toughness. Heavy pre-swim band/press-up warm-up.',
      philosophy: 'Self-coaching via collaborative trio — open dialogue. Lactate guides every session intensity. Process-over-results orientation.',
      taper: '10–14 days. Drops threshold volume, maintains easy frequency. Caffeine periodisation helps pre-race sharpness.',
    },
    physiology: {
      vo2max: '101.1 mL/kg/min (PubMed confirmed)',
      energyExpenditure: '7,019–8,506 kcal/day',
      annualHours: '1,308–1,480h (2020–2022 confirmed)',
      intensityDistribution: 'Pyramidal — ~80–85% low, balance at lactate threshold',
      notes: 'Olympic gold 2021. IM World Champ 2022. IM 70.3 Champ 2022. IRONMAN Pro Series Champion 2025.',
    },
    raceData2025: [
      { race: 'IM 70.3 Aix-en-Provence', pos: 1, swim: 'Top group', bike: 'Built from 4th', run: '1:07:xx', total: '3:41:08' },
      { race: 'IMWC Nice (full)', pos: 3, swim: '46:08', bike: '4:31:20', run: '2:34:38', total: '7:56:36' },
      { race: 'IM 70.3 Worlds Marbella', pos: 2, swim: 'Front group', bike: 'Lead group of 9', run: '1:07:xx', total: '3:37:44' },
    ],
  },

  {
    id: 'stornes',
    name: 'Casper Stornes',
    country: 'NOR', flag: '🇳🇴',
    age: 28,
    tier: '⭐ IRONMAN World Champion 2025 (debut)',
    wins2025: ['IMWC Nice 2025 (course record 7:51:39)'],
    podiums2025: ['1st IMWC Nice CR', '2nd IM 70.3 Aix', '3rd IMWC Frankfurt', '3rd 70.3 Worlds Marbella'],
    coach: 'Self-coached (collaborative group: Blummenfelt, Iden, Stornes)',
    base: 'Bergen, Norway (+Pyrenees altitude pre-Nice)',
    dataQuality: 'CONFIRMED',
    source: 'Slowtwitch Stornes profile Nov 2025; Triathlete.com nutrition Oct 2025',
    keyStats: {
      peakWeekHours: '25–35h depending on phase',
      marathonAt_IMWC: '2:29:49 at IMWC Nice (3rd fastest iron-distance marathon ever)',
      carbsPerHourRace: '180g/hr (gut-trained over months)',
      carbsPreRace: '200g before swim + 80–100g in T1',
      swimPerWeek: '6× including open water. Even rest days: 4.5–5km easy.',
      bikePerWeek: '5–6×',
      runPerWeek: '5–6×',
    },
    weekStructure: {
      mon: { swim: 'Easy Z1 swim 4–5km (never fully off swim)', bike: null, run: 'Easy run 45–60 min' },
      tue: { swim: 'AM: Threshold squad swim (LT2 lactate-controlled)', bike: 'PM: Threshold bike — LT2 intervals with blood lactate testing', run: 'Easy 45–60 min' },
      wed: { swim: 'AM swim 1h', bike: 'Long bike 3–3.5h through course terrain or cols', run: '1h brick run off bike' },
      thu: { swim: 'AM VO₂ swim', bike: 'Easy spin 90 min', run: 'PM threshold run + VO₂ intervals' },
      fri: { swim: 'Easy 4km', bike: 'Easy recovery 60–90 min', run: 'Easy recovery run' },
      sat: { swim: null, bike: 'BRICK DAY: bike to track, outer lane. 3×10min bike@LT2 → 3×2km run → 4×6min bike → 4×1km run → 3×4min bike → 3×1km VO₂', run: 'Incorporated into brick session above' },
      sun: { swim: 'Easy 4–5km', bike: 'Easy 60–90 min', run: 'Long easy run 1:30–2h' },
    },
    keySessions: [
      { name: 'Norwegian Brick (Track Day)', detail: 'Bike to track, ride outer lane. 3×10min bike@LT2 → 3×2km run → 4×6min bike → 4×1km run → 3×4min bike → 3×1km VO₂. Seamless bike-run transitions on track.' },
      { name: 'Race-Course Bike Simulation', detail: 'Full race course at race pace with Blummenfelt and Iden. Done on Marbella course in final weeks of prep. Key confidence session before major race.' },
      { name: 'Rest Day Swim', detail: 'Even on rest days: 4.5–5km at easy pace. "In general, I feel swimming takes more energy than bike and run." Maintains swim feel year-round.' },
      { name: 'Double Threshold (Norwegian Method)', detail: 'AM threshold swim + PM threshold bike or run. Lactate controlled at 2.5–3mmol throughout.' },
    ],
    nutrition: {
      philosophy: 'Extremely aggressive high-carb. Gut-trained specifically over months to handle 180g/hr.',
      training: 'Carb-fueled threshold days. Easy days lower carb. Maurten-style hydrogel approach.',
      race: '200g+ carbs before swim. 80–100g in T1. 180g/hr on bike. Continued on run. All confirmed at IMWC Nice 2025.',
      recovery: 'Power naps during training blocks (mid-day sleep essential).',
    },
    recovery: {
      sleep: '9–10h target. After IMWC Nice win: 2.5 weeks sleep disrupted by media obligations.',
      tools: 'Altitude camp Pyrenees pre-Nice. Course recon rides. Aero testing (calf sleeves alone saved ~3min at IMWC).',
      philosophy: '"I\'ve learned to know my body way more — especially with recovery and making good decisions for myself."',
      taper: 'Significant volume drop. Keeps one longer bike (3–3.5h + 1h run). Key pre-race day: long bike + 1h run + 1h swim.',
    },
    physiology: {
      marathon: '2:29:49 at IMWC Nice — 3rd fastest iron-distance marathon ever',
      swimLevel: 'Second-tier swimmer — exits with Blummenfelt group, typically 30–60s behind leaders',
      raceIntelligence: 'Allowed Iden + Blummenfelt to surge with 15 miles to go at Nice. Held own pace, passed both in final miles.',
      notes: '3× Olympian (Tokyo 11th). Long-course debut 2025. 3rd iron-distance start ever was IMWC win.',
    },
    raceData2025: [
      { race: 'IM 70.3 Aix-en-Provence', pos: 2, swim: 'Top group', bike: 'Lead group', run: '1:07:xx', total: '+0:32 to Blummenfelt' },
      { race: 'IMWC Frankfurt', pos: 3, swim: '—', bike: '—', run: '—', total: '—' },
      { race: 'IMWC Nice (full)', pos: 1, swim: '45:21 (front pack)', bike: '4:31:26', run: '2:29:49 (CR)', total: '7:51:39 (CR)' },
      { race: 'IM 70.3 Worlds Marbella', pos: 3, swim: 'Front group', bike: 'Lead group', run: '1:07:xx', total: '+1:00 to Geens' },
    ],
  },

  {
    id: 'sanders',
    name: 'Lionel Sanders',
    country: 'CAN', flag: '🇨🇦',
    age: 36,
    tier: '🏆 Double 70.3 Winner 2025 / Intensity-Over-Volume Pioneer',
    wins2025: ['IM 70.3 Oceanside', 'IM 70.3 St. George (NA Champs)'],
    podiums2025: ['1st Oceanside', '1st St. George'],
    coach: 'Self-coached (since 2023)',
    base: 'Windsor, Ontario, Canada',
    dataQuality: 'CONFIRMED',
    source: 'lsanderstri.wordpress.com; TRI247 volume debate Feb 2025; Sanders YouTube 2025',
    keyStats: {
      peakWeekHours: '17–20h (intensity-first philosophy, not volume)',
      bikeHoursPerWeek: '~15h/week on bike at peak',
      ftpWatts: '420W (confirmed multiple sources)',
      swimPerWeek: '3–4× (active improvement focus in 2025)',
      runPerWeek: '4–5×',
      intensityDistribution: 'Higher than Norwegian group: more threshold/Z3 work',
    },
    weekStructure: {
      mon: { swim: 'Swim technique session', bike: 'Recovery ride or rest', run: null },
      tue: { swim: null, bike: 'Zwift threshold: 3×(12min @365W / 5min recovery / 2min @420W / 2min recovery)', run: 'Moderate run 60–75 min' },
      wed: { swim: 'Swim focus 45–60 min', bike: 'Moderate fasted ride 90–120 min at easy-moderate', run: 'Moderate 14–15 miles at ~6:45/mile' },
      thu: { swim: null, bike: 'Hard Zwift: 8×(30s @500W + 1.5min @420W + 1.5min recovery)', run: 'Key threshold run session' },
      fri: { swim: 'Swim session', bike: 'Easy recovery', run: 'Easy 45–60 min' },
      sat: { swim: null, bike: 'Tucson Shootout (group ride) or long hard ride 3–4h', run: 'Brick run 30–45 min' },
      sun: { swim: null, bike: 'Long steady ride 3–4h', run: 'Long easy run' },
    },
    keySessions: [
      { name: 'Zwift Super-Threshold Block', detail: '3×(12min @365W with 5min recovery into 2min @420W with 2min recovery). Sustained LT2 with VO₂ spike. Confirmed from his blog with actual power data.' },
      { name: 'Tucson Shootout', detail: "America's fastest group ride, ~2–3h. 6+ consecutive weeks in winter 2025. All-out group effort." },
      { name: '8×30s Anaerobic Spikes', detail: '8×(30s @500W + 1.5min @420W + 1.5min recovery). Confirmed from lsanderstri.wordpress.com blog with exact power data.' },
    ],
    nutrition: {
      philosophy: 'Changed diet 2024 — shifted to more whole food base. High carb around sessions.',
      training: 'Fuels training sessions well. WHOOP guides intensity and recovery readiness.',
      race: 'Carb loading race week. Standard pro gel/drink strategy.',
      recovery: '"Check your ego at the door" — key mantra. Tracks WHOOP data for strain/recovery balance.',
    },
    recovery: {
      sleep: '8h+ target.',
      tools: 'WHOOP band daily tracking. Zwift for controlled indoor efforts.',
      philosophy: 'Intensity > Volume. 17h high-quality beats 30h junk miles.',
      taper: '7–10 days. Volume drop 40–50%. At 36 — recovery window is treasured.',
    },
    physiology: {
      ftp: '420W (confirmed)',
      swimLimiter: 'Exited Oceanside swim 30th of field (26:00). Won race anyway.',
      notes: 'Self-coached since 2023. 30+ IRONMAN 70.3 career wins. Training ~17h/wk while others do 30h+ and winning.',
    },
    raceData2025: [
      { race: 'IM 70.3 Oceanside', pos: 1, swim: '26:00 (30th!)', bike: '2:05:37 (2nd)', run: '1:11:28 (3rd)', total: '3:47:01' },
      { race: 'IM 70.3 St. George (NA Champs)', pos: 1, swim: '—', bike: '—', run: '—', total: '—' },
    ],
  },

  {
    id: 'samlong',
    name: 'Sam Long',
    country: 'USA', flag: '🇺🇸',
    age: 29,
    tier: '🏆 Eagleman CR + Triple 2025 Podium',
    wins2025: ['IM 70.3 Eagleman (CR)', 'IM 70.3 Chattanooga'],
    podiums2025: ['1st Eagleman', '1st Chattanooga', '2nd St. George NA Champs'],
    coach: 'Self-coached (since 2023)',
    base: 'Tucson, Arizona',
    dataQuality: 'CONFIRMED',
    source: 'TRI247 Long/Sanders volume debate Feb 2025; TRI247 nutrition debrief T100 Singapore 2025',
    keyStats: {
      peakWeekHours: '28–32h (self-described 2025)',
      annualHours2024: '~1,200h (23h/wk average)',
      bikeHoursPerWeek: '~15h/week at peak',
      swimPerWeek: '4×',
      runPerWeek: '5×',
      racePhilosophy: '"Volume is the most important metric you can measure."',
    },
    weekStructure: {
      mon: { swim: 'Swim technique focus 45–60 min', bike: 'Rest or easy', run: null },
      tue: { swim: null, bike: 'Threshold group ride or structured intervals', run: 'Moderate 60–80 min' },
      wed: { swim: 'AM swim', bike: 'Moderate fasted ride 90–120 min', run: 'Moderate 14–15 miles at ~6:45/mile' },
      thu: { swim: null, bike: 'Hard ride', run: 'Key threshold run session' },
      fri: { swim: 'Swim session', bike: 'Recovery 60 min', run: 'Easy 45–60 min' },
      sat: { swim: null, bike: 'Tucson Shootout or peak volume long ride 4–5h', run: 'Brick run 30–45 min' },
      sun: { swim: null, bike: 'Long easy ride 3h', run: 'Long easy run 18–22 miles' },
    },
    keySessions: [
      { name: 'Tucson Shootout', detail: "America's fastest group ride. 6+ consecutive weeks winter 2024–25. Getting stronger each week." },
      { name: 'Long Run 18–22 miles', detail: 'Cornerstone of run excellence. Easy pace, high volume. Builds engine for sub-1:10 70.3 half-marathons.' },
      { name: 'T100 Singapore Bike Fueling', detail: 'Confirmed: 310g carbs in 1h50min + 3.5L fluid + 200mg caffeine on bike. "This is wild."' },
    ],
    nutrition: {
      philosophy: 'Fuel for performance. Very transparent on social media about race nutrition.',
      training: 'Carb-fueled hard sessions. Does not overthink nutrition outside race day.',
      race: 'T100 Singapore 2025: Double breakfast. Pre-race 90g carbs. Bike: 310g carbs/1h50min + 3.5L fluid + 200mg caffeine.',
      recovery: 'Family balance. Training adapts around family life.',
    },
    recovery: {
      sleep: '8h+ target. Self-coaching improved sleep quality and mood consistency.',
      tools: 'Self-coaches based on feel + data. No rigid rules — body-listening approach.',
      philosophy: '"Volume is how I build confidence." Reduced total hours by 10% vs coached era but significantly improved.',
      taper: '7–10 days. Reduces to "just enough" to feel fresh.',
    },
    physiology: {
      swimLimiter: 'Exits water far behind field. 21st at Eagleman (27:49). Wins despite massive swim deficit.',
      bikeRun: 'Fastest bike (1:55:14) and fastest run (1:10:49) at Eagleman for course record.',
      notes: '"The Big Unit" — 6ft 4in, ~97kg. Flat/fast courses suit his power. PTO #3 biker ranking.',
    },
    raceData2025: [
      { race: 'IM 70.3 St. George (NA Champs)', pos: 2, swim: '—', bike: '—', run: '—', total: '—' },
      { race: 'IM 70.3 Chattanooga (swim cancelled)', pos: 1, swim: 'CANCELLED', bike: '1:56:50', run: '1:10:21', total: '3:08:08' },
      { race: 'IM 70.3 Eagleman', pos: 1, swim: '27:49 (21st)', bike: '1:55:14 (2nd)', run: '1:10:49 (fastest)', total: '3:36:50 (CR)' },
    ],
  },

  {
    id: 'iden',
    name: 'Gustav Iden',
    country: 'NOR', flag: '🇳🇴',
    age: 29,
    tier: '🏆 IRONMAN World Champion 2022 / 2025 Comeback',
    wins2025: [],
    podiums2025: ['2nd IMWC Nice', '3rd IM 70.3 Oceanside'],
    coach: 'Self-coached (collaborative trio with Blummenfelt + Stornes)',
    base: 'Bergen, Norway',
    dataQuality: 'CONFIRMED (method); specifics moderate',
    source: 'Norwegian Method Podcast; Slowtwitch IMWC Nice race analysis 2025',
    keyStats: {
      peakWeekHours: '28–35h (same Norwegian group)',
      trainingMethod: 'Norwegian Method — identical structure to Blummenfelt/Stornes group',
      swimPerWeek: '6×',
      bikePerWeek: '5–6× with double-threshold days',
      runPerWeek: '5–6×',
      injuryHistory: 'Multiple serious injuries 2022–2024. 2025 = comeback season.',
    },
    weekStructure: {
      mon: { swim: 'Easy Z1 swim 4–5km', bike: null, run: 'Easy 60 min' },
      tue: { swim: 'AM: Threshold swim (lactate-controlled)', bike: 'PM: Double threshold bike (LT2 intervals)', run: null },
      wed: { swim: 'AM swim moderate', bike: 'Long Z1 ride 4–5h', run: 'Brick run 60 min' },
      thu: { swim: 'AM VO₂ swim', bike: 'Easy spin', run: 'PM: Threshold run (double threshold day)' },
      fri: { swim: 'Easy technique', bike: 'Easy 90 min', run: 'Easy 45 min' },
      sat: { swim: null, bike: 'Race simulation or hard ride', run: 'Threshold brick run' },
      sun: { swim: 'Easy 4km', bike: 'Long easy ride 3–4h', run: 'Long easy run 1:30–2h' },
    },
    keySessions: [
      { name: 'Norwegian Double Threshold', detail: 'AM threshold swim + PM threshold run or bike. Lactate-controlled 2.5–3mmol throughout. The Norwegian method foundation.' },
      { name: 'Altitude Block', detail: 'Sierra Nevada + Pyrenees with Blummenfelt + Stornes. 3–4 week blocks. VO₂max ceiling elevation is the goal.' },
    ],
    nutrition: {
      philosophy: 'High-carb intuitive eating (same Norwegian trio philosophy). Gut-trained for high race intake.',
      training: 'Maurten fueling on threshold days. Recovery nutrition careful given injury history.',
      race: '100g+/hr on bike via hydrogel. Carb loading race week.',
      recovery: 'Extra care with load management given injury history.',
    },
    recovery: {
      sleep: '9h+ target',
      tools: 'Altitude camps. Collaborative self-coaching gives fine-grained load management.',
      philosophy: 'Highly cautious 2022–2024 given repeated injuries. 2025 = fully committed return.',
      taper: 'Standard Norwegian 10–14 day taper.',
    },
    physiology: {
      marathonCapacity: 'Sub-2:30 iron-distance capability when healthy',
      notes: 'IM World Champ 2022. 70.3 World Champ 2019 + 2021. Multiple injury setbacks. Clear 2025 comeback — 2nd IMWC Nice.',
    },
    raceData2025: [
      { race: 'IM 70.3 Oceanside', pos: 3, swim: '23:59', bike: '2:07:11', run: '1:13:34', total: '3:48:06' },
      { race: 'IMWC Nice (full)', pos: 2, swim: '~47min', bike: '~4:32', run: '~2:31', total: '7:54:13' },
    ],
  },

  {
    id: 'ditlev',
    name: 'Magnus Ditlev',
    country: 'DEN', flag: '🇩🇰',
    age: 25,
    tier: '🚴 PTO #2 Biker / Extreme Volume Pioneer',
    wins2025: ['IM 70.3 Cascais Portugal'],
    podiums2025: ['1st Cascais', 'Top-10 IMWC Nice'],
    coach: 'Kasper Pedersen',
    base: 'Girona, Spain',
    dataQuality: 'CONFIRMED',
    source: 'Scientific Triathlon EP#448 — Kasper Pedersen (coach confirms exact peak week figures)',
    keyStats: {
      confirmedPeakWeek: '25km swim + 466km bike + 131km run = 33h total',
      normalBike: '350–400km/week',
      normalRun: '100–120km/week',
      normalSwim: '20–25km/week',
      ptoBikeRanking: 'World #2 best biker (PTO ranking)',
      age: '25 — likely still improving',
    },
    weekStructure: {
      mon: { swim: 'Recovery 3–4km', bike: 'Easy 2h', run: 'Easy 45–60 min' },
      tue: { swim: '6–7km hard set', bike: 'Key interval session 4–5h', run: null },
      wed: { swim: '5km moderate', bike: '6–7h long ride Z1-Z2 (~150–180km in Girona terrain)', run: 'Brick run 45 min off bike' },
      thu: { swim: '5km hard', bike: 'Threshold or VO₂ session 3–4h', run: 'Key run session 20–25km' },
      fri: { swim: 'Easy 4km', bike: 'Recovery 2h', run: 'Easy 10km' },
      sat: { swim: null, bike: '5–6h medium-hard (~150km)', run: 'Brick run 60–75 min' },
      sun: { swim: '4–5km easy', bike: 'Easy 3h', run: 'Long easy run 25–30km' },
    },
    keySessions: [
      { name: 'Wednesday Monster Ride', detail: '6–7h long ride ~150–180km at Z1-Z2. Girona terrain includes significant climbing. Similar to Grand Tour cyclists base rides.' },
      { name: 'Confirmed Peak Volume Block', detail: 'Coach confirmed: 466km bike + 131km run + 25km swim in one week = 33 total hours. Periodic peak volume blocks in deep base phase.' },
    ],
    nutrition: {
      philosophy: 'Must fuel extreme volume. Very high caloric intake. Carb-centric.',
      training: 'Carries food on 6–7h rides — solid food (bananas, bars) + liquid carbs.',
      race: 'High carb standard.',
      recovery: 'Volume demands serious recovery nutrition. Sleep is non-negotiable.',
    },
    recovery: {
      sleep: '9–10h required (volume absorption demands it)',
      tools: 'Girona base — world-class cycling roads, warm climate, cyclist community.',
      philosophy: 'Volume = adaptation for him. More similar to Grand Tour cyclist approach than traditional triathlete.',
      taper: '2 weeks. Massive volume drop from extreme high.',
    },
    physiology: {
      notes: 'PTO world #2 ranked biker. Age 25 — arguably the youngest star with the most upside.',
    },
    raceData2025: [
      { race: 'IM 70.3 Cascais Portugal', pos: 1, swim: '—', bike: '—', run: '—', total: '—' },
    ],
  },

  {
    id: 'laidlow',
    name: 'Sam Laidlow',
    country: 'FRA', flag: '🇫🇷',
    age: 26,
    tier: '🏆 IRONMAN World Champion 2023 / PTO #1 Biker',
    wins2025: [],
    podiums2025: ['5th IMWC Nice'],
    coach: 'Richard Laidlow (father, confirmed coach)',
    base: 'Pyrenees, France',
    dataQuality: 'CONFIRMED',
    source: 'Scientific Triathlon EP#403 — Richard Laidlow (coach/father)',
    keyStats: {
      ptoBikeRanking: 'World #1 biker (PTO ranking)',
      peakWeekHours: '~30h',
      swimPerWeek: '4×',
      bikePerWeek: '5–6× with Pyrenees climbing daily',
      runPerWeek: '5–6×',
      pyreneesBenefits: 'Trains on Tour de France cols (Tourmalet, Aubisque, La Mongie) daily',
    },
    weekStructure: {
      mon: { swim: 'Easy 3–4km', bike: 'Recovery spin 1.5h', run: null },
      tue: { swim: 'Hard session 5–6km AM', bike: 'Threshold ride 3–4h with intervals', run: 'Easy 45 min' },
      wed: { swim: 'Moderate 5km', bike: 'Long ride 4.5–5h in Pyrenees (climbs daily)', run: 'Brick run 45min–1h off bike' },
      thu: { swim: 'Hard 5km AM', bike: 'Moderate 2.5–3h', run: 'Key run: threshold intervals 2×20min or long reps' },
      fri: { swim: 'Easy technique', bike: 'Easy recovery', run: 'Easy 45–60 min' },
      sat: { swim: null, bike: '5h medium-hard', run: 'Brick run 60 min' },
      sun: { swim: '4km easy', bike: 'Easy 2h', run: 'Long easy run 25–30km' },
    },
    keySessions: [
      { name: 'Pyrenees Col Ride', detail: '4–5h in mountains including sustained 20–40min col ascents at threshold power. Creates exceptional bike power + endurance unique to his base.' },
      { name: 'Father-Coach Daily Check-In', detail: 'Father watches every session data in real-time. Daily adjustments. More granular monitoring than most athletes have access to.' },
    ],
    nutrition: {
      philosophy: 'Fuels big Pyrenees volume. High carb with French whole food culture.',
      training: 'Carries solid food on 5h+ Pyrenees rides — bananas, bars, sports drink.',
      race: 'Very high bike intake required given his race-pace efforts.',
      recovery: 'Father coaches = granular recovery monitoring. Daily load discussion.',
    },
    recovery: {
      sleep: '9h',
      tools: 'Altitude Pyrenees base. Family coaching = personalised recovery management.',
      philosophy: 'Quality-focused coaching in tight family unit. Every session has purpose.',
      taper: '10–14 days. Maintains some bike intensity but drops overall volume significantly.',
    },
    physiology: {
      bikeRanking: 'PTO World #1 biker',
      notes: 'Won IMWC 2023 at age 23. Kona 2024: overcooked bike, walked parts of run. Nice 2025: Led bike, 5th overall. Run execution still developing.',
    },
    raceData2025: [
      { race: 'IMWC Nice (full)', pos: 5, swim: '—', bike: 'Attacked front group', run: '~2:38', total: '8:03:55' },
    ],
  },

  {
    id: 'vonberg',
    name: 'Rudy Von Berg',
    country: 'USA', flag: '🇺🇸',
    age: 28,
    tier: '💪 Gold Race Specialist (Nice-based)',
    wins2025: [],
    podiums2025: ['2nd IM 70.3 Oceanside'],
    coach: 'Professional (unpublished)',
    base: 'Nice, France (year-round)',
    dataQuality: 'MODERATE',
    source: 'PTO stats 2025; Triathlete IMWC Nice coverage',
    keyStats: {
      niceBase: 'Lives and trains year-round on IMWC Nice course.',
      swimStrength: 'Good front-pack swimmer',
      bikeStrength: 'Strong biker — Nice-based = daily col climbing',
      runLevel: 'Solid 70.3 runner; iron-distance marathon still developing',
    },
    weekStructure: {
      mon: { swim: 'Recovery 3–4km', bike: 'Easy', run: null },
      tue: { swim: 'Hard set AM', bike: 'Interval session 3–4h', run: 'Easy run' },
      wed: { swim: 'Moderate', bike: 'Long ride on Nice col routes (Col de Vence / La Madone)', run: 'Brick run 45 min' },
      thu: { swim: 'Hard AM', bike: 'Moderate 2.5h', run: 'Key threshold run' },
      fri: { swim: 'Easy', bike: 'Recovery', run: 'Easy' },
      sat: { swim: null, bike: 'Medium-hard 4h Nice terrain', run: 'Brick run' },
      sun: { swim: '4km easy', bike: 'Long easy', run: 'Long easy run' },
    },
    keySessions: [
      { name: 'Nice Descent Practice', detail: 'Year-round training on actual IMWC Nice descent (Col de Vence) — course mastery is a documented tactical advantage.' },
    ],
    nutrition: { philosophy: 'Standard high-carb pro approach', training: 'Fuels training volume appropriately', race: 'High carb on bike. Electrolytes for Nice heat.', recovery: 'Nice climate = year-round consistent training conditions.' },
    recovery: { sleep: '8–9h', tools: 'Year-round Nice base training.', philosophy: 'Consistency of training on race course = reduced race-day variables.', taper: 'Standard 10-day taper.' },
    physiology: { notes: 'Strong swimmer-biker at 70.3. Top-10 IMWC Nice 2025. Nice base = biggest long-term strategic advantage.' },
    raceData2025: [
      { race: 'IM 70.3 Oceanside', pos: 2, swim: '23:53 (15th)', bike: '2:05:57 (3rd)', run: '1:14:26', total: '3:47:42' },
    ],
  },

  {
    id: 'kanute',
    name: 'Ben Kanute',
    country: 'USA', flag: '🇺🇸',
    age: 31,
    tier: '💪 Olympic Silver Medallist / Elite Swimmer',
    wins2025: [],
    podiums2025: ['5th IM 70.3 Oceanside'],
    coach: 'Professional',
    base: 'Tempe, Arizona',
    dataQuality: 'MODERATE',
    source: 'PTO stats 2025; general triathlon media',
    keyStats: {
      olympicMedal: '2016 Rio Olympic silver (super-sprint mixed relay)',
      swimStrength: 'Elite front-pack swimmer — exits with leaders consistently',
      bikeStrength: 'Strong 70.3 biker',
      heatTraining: 'Arizona base = year-round heat acclimatisation advantage',
    },
    weekStructure: {
      mon: { swim: 'Easy 4km', bike: 'Recovery', run: null },
      tue: { swim: 'Hard quality swim set', bike: 'Threshold bike 3h', run: 'Easy' },
      wed: { swim: 'Moderate 4–5km', bike: 'Long ride 4–5h', run: 'Brick 45 min' },
      thu: { swim: 'Speed set AM', bike: 'Moderate', run: 'Key threshold run session' },
      fri: { swim: 'Easy', bike: 'Recovery', run: 'Easy' },
      sat: { swim: null, bike: '4–5h medium', run: 'Brick run' },
      sun: { swim: 'Easy', bike: 'Easy or rest', run: 'Long easy run' },
    },
    keySessions: [
      { name: 'Elite Swim Speed Sessions', detail: 'Olympic swimmer background — uses speed advantage to exit with front pack and preserve energy for bike/run.' },
      { name: 'Arizona Heat Adaptation', detail: 'Year-round Tempe desert training builds significant heat acclimatisation advantage for hot-weather races.' },
    ],
    nutrition: { philosophy: 'High carb race fueling, standard pro approach', training: 'Fuels training. Heat nutrition knowledge.', race: 'High carb + electrolytes.', recovery: 'Standard pro protocols.' },
    recovery: { sleep: '8h', tools: 'Arizona desert training. Heat adaptation.', philosophy: 'Olympic background brings professional discipline and periodisation knowledge.', taper: 'Standard 10-day.' },
    physiology: { notes: '2016 Rio Olympic silver. Elite swimmer by background — rare attribute in field.' },
    raceData2025: [
      { race: 'IM 70.3 Oceanside', pos: 5, swim: '23:30 (7th)', bike: '2:07:27 (7th)', run: '1:14:55', total: '3:49:24' },
    ],
  },

  {
    id: 'mcelroy',
    name: 'Matt McElroy',
    country: 'USA', flag: '🇺🇸',
    age: 27,
    tier: '🌟 Rising American Star — Elite Runner',
    wins2025: [],
    podiums2025: ['2nd IM 70.3 Chattanooga (fastest run 1:08:34)'],
    coach: 'Professional',
    base: 'USA',
    dataQuality: 'MODERATE',
    source: 'TRI247 Chattanooga 2025; besttriathletes.com race report',
    keyStats: {
      runStrength: '1:08:34 half-marathon off bike — fastest at Chattanooga.',
      overallProfile: 'Run-strong athlete making strong moves through field on the run leg.',
    },
    weekStructure: {
      mon: { swim: 'Recovery swim', bike: 'Easy', run: null },
      tue: { swim: 'Hard set', bike: 'Threshold bike 3h', run: 'Easy' },
      wed: { swim: 'Moderate', bike: 'Long ride 4h', run: 'Brick run 45 min' },
      thu: { swim: 'Hard AM', bike: 'Moderate', run: 'Key run: threshold tempo 2×20min or long intervals' },
      fri: { swim: 'Easy', bike: 'Recovery', run: 'Easy' },
      sat: { swim: null, bike: 'Medium-hard 4h', run: 'Long brick run 60 min' },
      sun: { swim: 'Easy', bike: 'Easy', run: 'Long easy run 18–22 miles' },
    },
    keySessions: [
      { name: 'Long Run Volume', detail: 'High easy-pace long runs 18–22 miles. Builds the aerobic base for consistently fast 70.3 half-marathons.' },
      { name: 'Negative Split Race Strategy', detail: 'Chattanooga: conservative bike exit, progressively faster run splits. Ran 1:08:34 — fastest in entire field despite going 2nd overall.' },
    ],
    nutrition: { philosophy: 'Standard pro high-carb', training: 'High carb around run sessions', race: 'Standard high-carb race day', recovery: 'Run-focused recovery — ice, sleep, protein.' },
    recovery: { sleep: '8–9h', tools: 'Standard', philosophy: 'Building toward consistent top-5.', taper: 'Standard 10 days.' },
    physiology: { notes: '1:08:34 half-marathon off bike at Chattanooga = fastest in field. Watch for breakthrough 2026.' },
    raceData2025: [
      { race: 'IM 70.3 Chattanooga (no swim)', pos: 2, swim: 'CANCELLED', bike: '2:02:28', run: '1:08:34 (fastest field)', total: '3:11:57' },
    ],
  },

  {
    id: 'west',
    name: 'Jason West',
    country: 'USA', flag: '🇺🇸',
    age: 30,
    tier: '🌟 Augusta Champion / Run Specialist',
    wins2025: ['IM 70.3 Augusta'],
    podiums2025: ['1st Augusta', '3rd IM 70.3 Chattanooga'],
    coach: 'Professional / hybrid self-coached',
    base: 'USA',
    dataQuality: 'MODERATE',
    source: 'TRI247 Chattanooga 2025; PTO race results',
    keyStats: {
      runStrength: '1:08:14 at Chattanooga — among fastest in field.',
      wins2025: 'Augusta 70.3 winner — first Gold-level career win.',
    },
    weekStructure: {
      mon: { swim: 'Easy', bike: 'Recovery', run: null },
      tue: { swim: 'Hard set', bike: 'Threshold 3h', run: 'Easy' },
      wed: { swim: 'Moderate', bike: 'Long ride 4h', run: 'Brick' },
      thu: { swim: 'Hard AM', bike: 'Moderate', run: 'Key threshold run' },
      fri: { swim: 'Easy', bike: 'Recovery', run: 'Easy' },
      sat: { swim: null, bike: '4h medium-hard', run: 'Brick run' },
      sun: { swim: 'Easy', bike: 'Easy', run: 'Long easy run 18–20 miles' },
    },
    keySessions: [
      { name: 'Track Interval Run', detail: 'Track intervals 400m–1mile reps at 5K race pace. Builds raw speed for fast 70.3 half-marathons.' },
    ],
    nutrition: { philosophy: 'Standard high-carb', training: 'Fuels run volume well', race: 'High carb race day', recovery: 'Standard' },
    recovery: { sleep: '8h', tools: 'Standard', philosophy: 'Developing top-5 consistency.', taper: 'Standard 10 days.' },
    physiology: { notes: 'Consistent fast runner at 70.3. Augusta win 2025 = breakthrough career result.' },
    raceData2025: [
      { race: 'IM 70.3 Chattanooga (no swim)', pos: 3, swim: 'CANCELLED', bike: '2:03:35', run: '1:08:14 (fastest)', total: '3:12:48' },
      { race: 'IM 70.3 Augusta', pos: 1, swim: '—', bike: '—', run: '—', total: '—' },
    ],
  },

  {
    id: 'rider',
    name: 'Seth Rider',
    country: 'USA', flag: '🇺🇸',
    age: 28,
    tier: '🌟 Rising American Swimmer-Biker',
    wins2025: [],
    podiums2025: ['4th IM 70.3 Oceanside', '4th IM 70.3 St. George'],
    coach: 'Professional',
    base: 'USA',
    dataQuality: 'MODERATE',
    source: 'PTO stats Oceanside + St George 2025',
    keyStats: {
      swimStrength: 'Elite front-pack swimmer — 3rd out of water at Oceanside (22:54)',
      bikeStrength: 'Strong biker',
      consistency: 'Two consecutive top-4 finishes at Gold events spring 2025',
    },
    weekStructure: {
      mon: { swim: 'Recovery', bike: 'Easy', run: null },
      tue: { swim: 'Hard set', bike: 'Threshold 3h', run: 'Easy' },
      wed: { swim: 'Moderate', bike: 'Long 4h', run: 'Brick 45 min' },
      thu: { swim: 'Hard', bike: 'Moderate', run: 'Key run session' },
      fri: { swim: 'Easy', bike: 'Recovery', run: 'Easy' },
      sat: { swim: null, bike: '4h medium', run: 'Brick' },
      sun: { swim: 'Easy', bike: 'Easy', run: 'Long run' },
    },
    keySessions: [
      { name: 'Front-Pack Swim', detail: 'Elite swim exit creates race advantage — exits with leaders and transitions into bike with clean road ahead.' },
    ],
    nutrition: { philosophy: 'Standard pro high-carb', training: 'Fuels volume', race: 'High carb', recovery: 'Standard' },
    recovery: { sleep: '8h', tools: 'Standard', philosophy: 'Building top-5 consistency in Gold-level field.', taper: 'Standard' },
    physiology: { notes: 'Exited Oceanside swim 3rd overall (22:54). Consistent top-5 American showing strong development.' },
    raceData2025: [
      { race: 'IM 70.3 Oceanside', pos: 4, swim: '22:54 (3rd)', bike: '2:07:59', run: '1:14:52', total: '3:49:18' },
    ],
  },

  {
    id: 'wilde',
    name: 'Hayden Wilde',
    country: 'NZL', flag: '🇳🇿',
    age: 27,
    tier: '🏆 2025 T100 World Champion',
    wins2025: ['T100 Singapore', 'T100 London', 'T100 French Riviera', 'T100 Spain', 'T100 Wollongong', 'T100 Qatar (World Champs)'],
    podiums2025: ['1st Singapore', '1st London (comeback from crash)', '1st French Riviera', '1st Spain', '1st Wollongong', '1st Qatar Final — perfect 195 pts'],
    coach: 'Craig Kirkwood (since 2016, Tauranga NZ)',
    base: 'Tauranga, New Zealand / Abu Dhabi (race season)',
    dataQuality: 'CONFIRMED',
    source: 'T100 2025 Wikipedia, TRI247, InsideHook Jan 2026, Triathlete.com Dec 2025',
    keyStats: {
      peakWeekHours: '~25–30h (trains up to 4× per day)',
      swimPerWeek: '6× sessions/week',
      bikePerWeek: '6× sessions/week',
      runPerWeek: '5× sessions/week',
      bodyWeight: '~72kg',
      swimStrength: 'Open-water specialist — pool swimming is weaker. Crashed at Tokyo T1 World Cup due to poor pool swim.',
      bikeStrength: 'Explosive and aggressive — powerful bike-to-run transition athlete. Won T100 races from the front on bike.',
      runStrength: 'World-class — fastest or near-fastest run split in most T100 races. Primary weapon.',
    },
    weekStructure: {
      mon: { swim: 'Easy/recovery', bike: 'Recovery ride 60–90 min', run: null },
      tue: { swim: 'Hard squad session', bike: 'High-intensity intervals', run: 'Easy 60 min' },
      wed: { swim: 'Moderate 5–6km', bike: 'Long endurance 4–5h', run: '60–90 min brick or standalone' },
      thu: { swim: 'Hard session', bike: 'Threshold/VO₂ session', run: 'Key threshold run' },
      fri: { swim: 'Easy/recovery', bike: 'Short spin', run: 'Easy 50–60 min' },
      sat: { swim: null, bike: 'Race-sim or long ride 4h', run: '90–120 min long run or brick' },
      sun: { swim: 'Recovery easy', bike: 'Easy 90 min', run: 'Easy or rest' },
    },
    keySessions: [
      { name: 'Open-Water Swim Specificity', detail: 'Focused on open-water drafting and sighting rather than pure pool speed. Self-described weaker pool swimmer but elite open-water racer. Coach Kirkwood tailors swim to open-water race skills.' },
      { name: 'Explosive Bike Efforts', detail: 'Bike training emphasises accelerations and power surges to match T100 racing dynamics. The 20m draft rule in T100 means riders must be truly strong — Wilde uses short maximal efforts to simulate race attacks.' },
      { name: 'Multi-Discipline Brick Days', detail: 'Up to 4 training sessions per day during peak blocks. Combines swim + bike + run in the same day. Builds race-specific fatigue tolerance. "It\'s intense, but this is my job."' },
      { name: 'Adventure/Off-Road Base', detail: 'Youth background in adventure racing, orienteering, mountain biking, and XTERRA gave Wilde unusual durability and bike handling. Coach Kirkwood has maintained cross-training elements to preserve this quality.' },
    ],
    nutrition: {
      philosophy: 'High-carb athlete, pragmatic approach. Enjoys food — "if I get a coffee I\'m probably getting a slice of carrot cake too."',
      training: 'Fuels for training load. High carbohydrate intake around key sessions.',
      race: 'T100-specific fuelling strategy on 80km bike — high carb per hour. Gels and electrolytes on run.',
      recovery: 'Good diet baseline but doesn\'t restrict. Prioritises sleep and mental recovery — video games, coffee with mates.',
    },
    recovery: {
      sleep: '8–9h. Strong mental recovery practices — does not listen to triathlon podcasts in downtime.',
      tools: 'Red Bull Performance Centre (used during 2025 injury rehab in Austria). Mental reset key.',
      philosophy: '"You need to relax and get out of the sport." Forces proper off-switch after training. Trains with mates to stay motivated on low-energy days.',
      taper: 'Race-specific — T100 peaking strategy. Kept racing through 2025 season even while partially injured to maintain race sharpness.',
    },
    physiology: {
      background: 'Paris 2024 Olympic silver medallist. Tokyo 2020 bronze. 2× XTERRA World Champion. NZ Olympian since 2021. First world title came at 2025 T100 despite multiple near-misses in short-course WTCS.',
      injury2025: 'Bike crash in Japan (broken ribs, punctured lung, shoulder fracture). Returned to racing in <100 days — won T100 London on comeback. Remarkable.',
      notes: 'Won 6 of 7 T100 starts in 2025. Only "loss" was due to lap-counting error in Dubai where he was leading. Dominant from every angle: swim (open-water), bike (explosive), run (fastest).',
    },
    raceData2025: [
      { race: 'T100 Singapore', pos: 1, swim: 'Front pack', bike: 'Race leader', run: 'Fastest split', total: '~3:04' },
      { race: 'T100 London', pos: 1, swim: 'Top 10', bike: 'Front', run: 'Race-winning run', total: '~3:07' },
      { race: 'T100 French Riviera', pos: 1, swim: '—', bike: '—', run: '—', total: '—' },
      { race: 'T100 Spain', pos: 1, swim: '—', bike: '—', run: '—', total: '—' },
      { race: 'T100 Wollongong', pos: 1, swim: '—', bike: '—', run: '—', total: '—' },
      { race: 'T100 Qatar (World Champs)', pos: 1, swim: 'Superb — race leader', bike: 'Led race', run: '1:37 margin at bell', total: '3:06:08' },
    ],
  },

  {
    id: 'noodt',
    name: 'Mika Noodt',
    country: 'GER', flag: '🇩🇪',
    age: 25,
    tier: '⭐ 2025 T100 Top-3 Overall',
    wins2025: ['Multiple T100 podiums'],
    podiums2025: ['2nd T100 London', '4th T100 Qatar Final', '4× T100 podiums total in 2025'],
    coach: 'Personal coach (3+ year relationship)',
    base: 'Darmstadt, Germany',
    dataQuality: 'CONFIRMED',
    source: 'Scientific Triathlon Podcast EP#667, Nov 2025 (full training deep-dive)',
    keyStats: {
      peakWeekHours: '25–30h',
      swimPerWeek: 'Multiple sessions — 50m outdoor pool access in Darmstadt',
      bikePerWeek: '5–6× — Darmstadt terrain ideal for TT training (flat roads)',
      runPerWeek: '4–5×',
      strengthPerWeek: 'Epic strength blocks (see below)',
      bodyWeight: '~70kg',
      swimStrength: 'Solid T100 swimmer — exits with front groups, swims 2km in elite pack',
      bikeStrength: 'Strong TT biker. Darmstadt terrain = world-class TT training. Can absorb 1-min penalty and still podium (T100 Cairns 2025).',
      runStrength: 'Improving rapidly — consistent T100 podium runner',
    },
    weekStructure: {
      mon: { swim: 'Easy/active recovery', bike: 'Recovery ride', run: null },
      tue: { swim: 'Hard squad session', bike: 'High-intensity VO₂ or threshold', run: 'Easy' },
      wed: { swim: 'Moderate technique', bike: 'Long endurance ride 4–5h', run: 'Brick run 60–90 min' },
      thu: { swim: 'Hard intervals', bike: 'Threshold session', run: 'Key run session' },
      fri: { swim: 'Easy', bike: 'Recovery or short sharpener', run: 'Easy 60 min' },
      sat: { swim: null, bike: 'Long ride or race-sim', run: '90–120 min long run' },
      sun: { swim: 'Easy recovery', bike: 'Easy 90 min', run: 'Easy or rest' },
    },
    keySessions: [
      { name: 'Strength Training Blocks (Unconventional)', detail: 'Noodt runs dedicated multi-week strength blocks — rare among T100 athletes. Heavy compound lifting in focused blocks to build power base. Calls them "epic." Integrated into off-season and early build.' },
      { name: 'TT Bike Intervals (Darmstadt)', detail: 'Darmstadt\'s flat roads are described as world-class for TT work. Mika uses sustained threshold and sub-threshold efforts on local roads that even beat altitude venues for TT specificity.' },
      { name: 'Altitude Camp Sessions', detail: 'Sierra Nevada (May, pool-based sessions) + Tignes French Alps (pre-London, cycling with WorldTour teams). Each block produces immediate and delayed performance boosts 10–20 days post-camp.' },
      { name: 'Race-Sim T100 Pacing', detail: 'Focused on T100-specific pacing: controlled effort on 80km bike to preserve run. Studied T100 vs 70.3 dynamics. 2km swim → 80km bike → 18km run requires different pacing to 70.3.' },
    ],
    nutrition: {
      philosophy: 'Structured athlete nutrition. Meal prep approach — prefers not to cook. Simple meals: rice, vegetables, chicken.',
      training: 'High carbohydrate during training days. Precision Fuel & Hydration partnership.',
      race: 'Optimised for T100 distance fuelling. High carb on bike, managed run fuelling.',
      recovery: '8pm evening routine: meal prep + emails + downtime. Prioritises sleep.',
    },
    recovery: {
      sleep: '8–9h. Does not train in extreme heat unnecessarily — prefers controlled home environment.',
      tools: 'Strength training blocks as injury prevention. Avoids heat camps (prefers altitude over heat).',
      philosophy: 'Prefers home training base (Darmstadt) and dislikes constant travel. "Modern schedules are increasingly international — travel fatigue is a real challenge." Arrives race venues early to adapt.',
      taper: 'Arrived Wollongong early (did not do late altitude camp). Adapts to climate and time zone. Avoids winter training camps with informal competitions.',
    },
    physiology: {
      background: 'Born 2000. Started triathlon 2013 (aged ~12). COVID lockdowns accelerated development in 2020–21. Turned professional end of 2021. Former e-sports competitor — ranked World #60 in F1 2011 game at age 10.',
      notes: 'Described as "quiet assassin" on the T100 circuit. Finished T100 Cairns podium despite serving a 1-min penalty. Ranked #2 T100 World Tour standings before Qatar Final. Lost Qatar Final 3rd by inches to Marten Van Riel.',
    },
    raceData2025: [
      { race: 'T100 Cairns (pre-season)', pos: 3, swim: 'Top group', bike: 'Podium despite 1-min penalty', run: 'Strong', total: '—' },
      { race: 'T100 London', pos: 2, swim: '—', bike: '—', run: '—', total: '~3:08' },
      { race: 'T100 Wollongong', pos: 2, swim: '—', bike: '—', run: '—', total: '—' },
      { race: 'T100 Qatar (World Champs)', pos: 4, swim: '—', bike: '—', run: 'Edged out by Van Riel', total: '~3:09' },
    ],
  },

  {
    id: 'pearson',
    name: 'Morgan Pearson',
    country: 'USA', flag: '🇺🇸',
    age: 31,
    tier: '🌟 T100 Qatar 2nd — Elite Run Speed',
    wins2025: ['Multiple T100 top-3s'],
    podiums2025: ['2nd T100 Qatar (World Champs)', 'Multiple T100 podiums through season'],
    coach: 'Ryan Bolton (Boulder, CO)',
    base: 'Boulder, Colorado, USA',
    dataQuality: 'CONFIRMED',
    source: 'The Triathlon Hour Podcast Jan 2025, Wikipedia, Triathlete.com, PTO Stats',
    keyStats: {
      peakWeekHours: '~25–28h',
      swimPerWeek: '4–5× — pool-based in Boulder. Swim is self-described limiter. Works on speed with fast training partners.',
      bikePerWeek: '5–6× — roads and trails around Boulder, CO',
      runPerWeek: '6–7× — former NCAA runner (7× All-American, Univ. Colorado). Running is elite weapon.',
      bodyWeight: '~67kg',
      swimStrength: 'Acknowledged weakest discipline. Prioritises pool speed work with faster training partners.',
      bikeStrength: 'Solid T100 biker — builds position on bike to set up run. Not a dominant biker.',
      runStrength: 'ELITE — among fastest runners in T100 field. "Blazed through the field on the run" at Qatar Final. Background: 7× NCAA All-American, sub-28 10km runner.',
    },
    weekStructure: {
      mon: { swim: 'Easy or pool technique', bike: 'Recovery ride', run: null },
      tue: { swim: 'Hard pool intervals — speed focus', bike: 'Threshold 2–3h', run: 'Easy 60 min' },
      wed: { swim: 'Moderate open water or pool', bike: 'Long ride 4–5h (Boulder terrain, trails)', run: 'Brick 45–60 min' },
      thu: { swim: 'Hard session with fast training partners', bike: 'Moderate', run: 'Key run session — track or tempo' },
      fri: { swim: 'Easy/recovery', bike: 'Short spin', run: 'Easy 50–60 min' },
      sat: { swim: null, bike: 'Long ride 4–5h', run: '90–120 min long run (Boulder trails/roads)' },
      sun: { swim: 'Easy or rest', bike: 'Easy 60–90 min', run: 'Easy 60 min or full rest' },
    },
    keySessions: [
      { name: 'Speed Swim Work (25s focus)', detail: 'Trains with faster swimmers in Boulder to compensate for being a natural runner-first. All-out 25s with different gear. "Training the speed in the swim is super important for me because my weakness is in the water."' },
      { name: 'Boulder Long Run', detail: '90–120 min trail/road long run in Boulder. Altitude (~1650m) adds aerobic stimulus. Background in collegiate cross-country means these are high-quality aerobic runs.' },
      { name: 'T100 Run Execution', detail: 'At Qatar 2025: "blazed through the field on the run" to take 2nd overall. Strategy is to stay in contact through swim/bike and use run speed on the back end. 18km T100 run suits his physiology.' },
      { name: 'Zone 2 Long Bike', detail: 'Famous for Zone 2 base building (subject of internet memes within triathlon community). Extensive Z2 aerobic base rides form backbone of bike training, supporting run-heavy training load.' },
    ],
    nutrition: {
      philosophy: 'High carbohydrate, Boulder endurance athlete standard. Loves burritos post-workout.',
      training: 'Post-track or post-brick: giant burritos with rice, cheese, avocado, beans, sour cream, protein. Extra calories before long afternoon rides.',
      race: 'T100 race fuelling — high carb on bike, managed on run.',
      recovery: 'Boulder endurance community culture. Outdoor swimming in warmer months. Invigorating pool in all seasons.',
    },
    recovery: {
      sleep: '8–9h. Boulder lifestyle with outdoor pool swimming year-round.',
      tools: 'Training group environment in Boulder — surrounded by strong endurance athletes. Competition in training elevates performance.',
      philosophy: 'Competitive training environment is key. "I\'m surrounded by a strong group of endurance athletes and supportive friends to train alongside, which continually fuel my competitive energy."',
      taper: 'Standard pre-race protocol. Maintains swimming speed work in taper. Focuses on staying sharp on run.',
    },
    physiology: {
      background: '2020 + 2024 Olympic silver medallist (mixed relay). 7× NCAA All-American runner at University of Colorado. Grew up in New Jersey. Run is generational talent — came to triathlon via running, not swimming.',
      notes: 'Known as "King of Zone 2" in triathlon community after meme went viral. Signed T100 contract for 2025 after Jelle Geens publicly questioned his "Hot Shot" credentials — used the motivation to finish 2nd at World Champs.',
    },
    raceData2025: [
      { race: 'T100 Qatar (World Champs)', pos: 2, swim: 'Mid-pack exit', bike: 'Steady build', run: 'Fastest/near-fastest split', total: '3:07:23' },
    ],
  },

  {
    id: 'vanriel',
    name: 'Marten Van Riel',
    country: 'BEL', flag: '🇧🇪',
    age: 32,
    tier: '🏆 2024 T100 World Champion / 2025 T100 Top-5',
    wins2025: ['IM 70.3 Nice', 'T100 podiums through season'],
    podiums2025: ['1st IM 70.3 Nice (June 2025)', '3rd T100 Qatar Final', 'Multiple T100 podiums'],
    coach: 'Glenn Poleunis / PTC Coaching (Girona, Spain)',
    base: 'Girona, Spain (training) / Wuustwezel, Belgium (home)',
    dataQuality: 'CONFIRMED',
    source: '220 Triathlon interview Feb 2025, MartenVanRiel.be, TRI247, PTO Stats 2025',
    keyStats: {
      peakWeekHours: '30+ hours — "weeks of more than 30 hours are no exception"',
      swimPerWeek: '5–6×',
      bikePerWeek: '6× — Girona is cycling paradise. Favourite discipline: cycling ("my way of discovering the world").',
      runPerWeek: '5×',
      strengthPerWeek: 'None specified — focused purely on swim/bike/run',
      bodyWeight: '~68kg',
      swimStrength: 'Solid — exits with lead groups consistently in T100',
      bikeStrength: 'Exceptional. Girona-based training, WorldTour cycling contacts, loves cycling above all. Won 3 T100 races on bike strength in 2024.',
      runStrength: 'Strong T100 runner — battles Geens on run in most races. Beat Noodt in late Qatar duel for 3rd.',
    },
    weekStructure: {
      mon: { swim: 'Easy recovery', bike: 'Recovery ride', run: null },
      tue: { swim: 'Hard intervals', bike: 'VO₂ or threshold session', run: 'Easy' },
      wed: { swim: 'Moderate', bike: 'Long Girona ride 4–5h', run: 'Brick 60 min' },
      thu: { swim: 'Hard', bike: 'Threshold session', run: 'Key run session' },
      fri: { swim: 'Easy', bike: 'Recovery or short', run: 'Easy 60 min' },
      sat: { swim: null, bike: 'Big ride 4–5h or race-sim', run: '90+ min long run' },
      sun: { swim: 'Recovery easy', bike: 'Easy 2h', run: 'Easy or full rest' },
    },
    keySessions: [
      { name: 'Girona Long Ride', detail: 'World-class cycling terrain in Girona — same roads used by WorldTour teams. 4–5h rides combining climbs, TT roads, and varied terrain. "Cycling is my way of discovering the world." Core of training identity.' },
      { name: 'PTC Coaching Group Sessions', detail: 'Trains with Glenn Poleunis\'s PTC Coaching group in Girona. Multi-athlete environment elevates performance. Regular contact with top European pros. Professional setup with full coaching staff.' },
      { name: 'T100 Race-Specific Bike Effort', detail: 'Won 3 T100 races in 2024 by building decisive bike gaps. 2025 focus on maintaining bike dominance while recovering from ankle injury. Targets bike as primary weapon in 80km T100 segment.' },
      { name: 'Mental Recovery Protocol', detail: 'Struggled with mental health and injury in 2025 (ankle sprain + poor form pre-injury). Openly shared on Instagram. Recovered to finish 3rd at T100 Qatar World Champs. Models vulnerability and resilience.' },
    ],
    nutrition: {
      philosophy: 'Simple, structured. Dislikes cooking — uses meal prep. "Dinner is often meal-prepped by someone else, or something very simple like rice with vegetables and chicken."',
      training: 'High carbohydrate to support 30h+ training weeks.',
      race: 'T100 and IRONMAN 70.3 fuelling protocols. Won 70.3 Nice 2025 and multiple T100 podiums.',
      recovery: 'Meal prep + rest. Separates training life from personal life.',
    },
    recovery: {
      sleep: '8h. 8pm: check emails, Instagram, TV. Disciplined evening structure.',
      tools: 'PTC Coaching professional support staff in Girona. Open about mental health challenges — shared mid-season struggles publicly.',
      philosophy: 'Total training commitment — 30+ hour weeks. "Nothing more rewarding than feeling like I am doing everything to reach my dreams." Shifted focus to long-course after Olympics.',
      taper: 'Managed ankle injury carefully to make Qatar Final. Showed elite ability to manage load around injury.',
    },
    physiology: {
      background: 'Triple Olympian (Rio 6th, Tokyo 4th, Paris 22nd). Transitioned from short-course to long-course post-Paris 2024. Won inaugural T100 World Championship 2024 with 3 wins (San Francisco, Ibiza, Dubai) + silver Las Vegas. 2025 was defending champion.',
      notes: 'Began dreaming of being a zookeeper as a child — "the animals\' loss was multisport\'s gain." Started in Belgium swimming club at 7. PTC Coaching group in Girona transformed him from anonymous WTS pack member to world champion. 30h+ training weeks standard.',
    },
    raceData2025: [
      { race: 'IM 70.3 Nice', pos: 1, swim: 'Front group', bike: 'Dominant', run: 'Winning run', total: '~3:38' },
      { race: 'T100 Qatar (World Champs)', pos: 3, swim: '—', bike: '—', run: 'Beat Noodt in late battle', total: '~3:08' },
    ],
  },
];

const SESSION_MATRIX = [
  { session: 'Double Threshold Day', athletes: ['Blummenfelt', 'Stornes', 'Iden'], detail: 'AM threshold swim + PM threshold bike or run. Lactate-controlled at 2.5–3mmol throughout both sessions.', frequency: '2× per week (Tue + Thu)', benefit: 'Maximises threshold stimulus without exceeding metabolic capacity. Cornerstone of Norwegian group dominance since 2021.' },
  { session: '35s/15s VO₂ Intervals', athletes: ['Geens', 'Blummenfelt', 'Stornes'], detail: '35s at VO₂max intensity / 15s easy × 6 reps per block = 4 min block. 2–4 blocks per session.', frequency: '1× per week per discipline', benefit: 'Huge aerobic ceiling stimulus with manageable recovery. Geens confirmed targeting ~400W on bike version.' },
  { session: 'Norwegian Track Brick', athletes: ['Stornes', 'Blummenfelt', 'Iden'], detail: 'Bike to track, ride outer lane. 3×10min bike@LT2 → 3×2km run → 4×6min bike → 4×1km run → 3×4min bike → 3×1km VO₂.', frequency: '1× per week (Saturday)', benefit: 'Three disciplines in one 3h session. Race-specific transition practice. Neuromuscular specificity for bike-to-run.' },
  { session: 'Tucson Shootout', athletes: ['Sanders', 'Sam Long'], detail: "America's fastest group ride, 2–3h, all out. Sustained high-intensity group racing dynamics.", frequency: 'Weekly in winter block (6+ consecutive weeks)', benefit: 'Real competitive race-pace cycling in group. Develops bike power, race tactics, mental toughness.' },
  { session: 'Monster Volume Ride (6–7h)', athletes: ['Ditlev', 'Laidlow'], detail: '6–7h long ride at Z1-Z2 pace. ~150–180km. Ditlev in Girona, Laidlow in Pyrenees.', frequency: '1× per week (Wednesday)', benefit: 'Extreme aerobic base. Trains body to oxidise fat at race pace. Creates the engine for full 180km.' },
  { session: 'Long Brick Big Day', athletes: ['Geens', 'Blummenfelt', 'Stornes'], detail: '90–105 min AM easy run + 4–4.5h PM bike = 6h combined leg load. Forces body to perform when fatigued.', frequency: '1× per week (Saturday)', benefit: 'Pre-fatigues legs before key bike/run work. Race-specific stress.' },
  { session: 'Altitude Block (3–4 weeks)', athletes: ['Blummenfelt', 'Stornes', 'Iden', 'Laidlow'], detail: 'Sierra Nevada (2,300m) or Pyrenees (1,800–2,400m). All sessions at altitude for 3–4 weeks.', frequency: '1–2× per season pre-key races', benefit: 'Haematological adaptation — increased red blood cell mass, VO₂max ceiling elevation.' },
];

// ─────────────────────────────────────────────────────────────
// DARK THEME PALETTE (matches TriCoach CSS variables)
// ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#080c10',
  surface:   '#0f1520',
  surface2:  '#141d2a',
  surface3:  '#1a2535',
  border:    '#1e2d3d',
  border2:   '#243447',
  blue:      '#2196f3',
  blueGlow:  'rgba(33,150,243,.15)',
  green:     '#00e676',
  greenDim:  'rgba(0,230,118,.08)',
  orange:    '#ff9800',
  orangeDim: 'rgba(255,152,0,.08)',
  red:       '#f44336',
  purple:    '#ce93d8',
  cyan:      '#26c6da',
  yellow:    '#ffd54f',
  text:      '#e8edf2',
  textDim:   '#5a7080',
  textMid:   '#8aa0b0',
};

// ─────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────
function renderProBlueprint() {
  const container = document.getElementById('page-problueprintpage');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText = `background:${T.bg};min-height:100vh;padding-bottom:40px;`;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:24px 20px 0;';
  header.innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:3px;color:${T.blue};">🏆 PRO BLUEPRINT</div>
    <div style="color:${T.textDim};font-size:12px;margin-top:4px;margin-bottom:16px;">${PRO_ATHLETES.length} athletes · 2025 verified race data · Training, nutrition &amp; recovery deep-dives</div>
  `;
  container.appendChild(header);

  // Stats banner
  const banner = document.createElement('div');
  banner.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 20px 16px;';
  const confirmed = PRO_ATHLETES.filter(a => a.dataQuality === 'CONFIRMED').length;
  const totalWins = PRO_ATHLETES.reduce((s, a) => s + a.wins2025.length, 0);
  [
    { n: PRO_ATHLETES.length, l: 'Athletes', c: T.blue },
    { n: confirmed, l: 'Confirmed', c: T.green },
    { n: totalWins, l: '2025 Wins', c: T.yellow },
    { n: 8, l: 'Nations', c: T.cyan },
  ].forEach(s => {
    const d = document.createElement('div');
    d.style.cssText = `background:${T.surface};border:1px solid ${T.border};border-radius:10px;padding:10px;text-align:center;`;
    d.innerHTML = `<div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:${s.c};">${s.n}</div><div style="font-size:10px;color:${T.textDim};letter-spacing:1px;text-transform:uppercase;">${s.l}</div>`;
    banner.appendChild(d);
  });
  container.appendChild(banner);

  // Filter bar
  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:8px;padding:0 20px 16px;flex-wrap:wrap;';
  const filterDefs = [
    { label: 'All Athletes', fn: () => true },
    { label: '🏆 T100 Series', fn: a => a.wins2025.some(w => w.includes('T100')) || (a.podiums2025 && a.podiums2025.some(p => p.includes('T100'))) },
    { label: '⭐ World Champs', fn: a => a.tier.includes('World Champion') || a.tier.includes('Pro Series') },
    { label: '🇳🇴 Norway Group', fn: a => a.country === 'NOR' },
    { label: '🇺🇸 Americans', fn: a => a.country === 'USA' },
    { label: '✅ Confirmed Data', fn: a => a.dataQuality === 'CONFIRMED' },
  ];
  filterDefs.forEach((f, i) => {
    const btn = document.createElement('button');
    btn.textContent = f.label;
    const activeStyle = `padding:6px 14px;border-radius:20px;border:1.5px solid ${T.blue};background:${T.blueGlow};color:${T.blue};font-size:11px;cursor:pointer;font-weight:600;font-family:'DM Sans',sans-serif;`;
    const inactiveStyle = `padding:6px 14px;border-radius:20px;border:1.5px solid ${T.border};background:${T.surface2};color:${T.textMid};font-size:11px;cursor:pointer;font-weight:400;font-family:'DM Sans',sans-serif;`;
    btn.style.cssText = i === 0 ? activeStyle : inactiveStyle;
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('button').forEach(b => b.style.cssText = inactiveStyle);
      btn.style.cssText = activeStyle;
      grid.querySelectorAll('[data-athlete-id]').forEach(card => {
        const a = PRO_ATHLETES.find(x => x.id === card.dataset.athleteId);
        card.style.display = (a && f.fn(a)) ? '' : 'none';
      });
    });
    filterBar.appendChild(btn);
  });
  container.appendChild(filterBar);

  // Athlete grid
  const grid = document.createElement('div');
  grid.id = 'pb-athlete-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:0 20px;';
  PRO_ATHLETES.forEach(a => grid.appendChild(buildAthleteCard(a)));
  container.appendChild(grid);

  // Session Matrix section
  const matSection = document.createElement('div');
  matSection.style.cssText = 'padding:28px 20px 16px;';
  matSection.innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:${T.text};margin-bottom:4px;">🔑 KEY SESSIONS MATRIX</div>
    <div style="color:${T.textDim};font-size:12px;margin-bottom:14px;">Cross-athlete session comparison — confirmed from sources</div>
  `;
  const matGrid = document.createElement('div');
  matGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;';
  SESSION_MATRIX.forEach(s => {
    const c = document.createElement('div');
    c.style.cssText = `background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:14px;`;
    c.innerHTML = `
      <div style="font-weight:700;color:${T.text};font-size:0.88rem;margin-bottom:4px;">${s.session}</div>
      <div style="color:${T.blue};font-size:0.76rem;margin-bottom:6px;font-family:'DM Mono',monospace;">Used by: ${s.athletes.join(' · ')}</div>
      <div style="color:${T.textMid};font-size:0.8rem;line-height:1.45;margin-bottom:8px;">${s.detail}</div>
      <div style="background:${T.greenDim};border:1px solid rgba(0,230,118,.2);border-radius:8px;padding:8px;font-size:0.78rem;color:${T.green};"><strong>Why it works:</strong> ${s.benefit}</div>
      <div style="margin-top:6px;"><span style="background:${T.surface2};color:${T.textMid};padding:2px 8px;border-radius:10px;font-size:0.72rem;border:1px solid ${T.border};">⏱ ${s.frequency}</span></div>
    `;
    matGrid.appendChild(c);
  });
  matSection.appendChild(matGrid);
  container.appendChild(matSection);

  // AI section
  const aiSection = document.createElement('div');
  aiSection.style.cssText = 'padding:16px 20px 40px;';
  aiSection.innerHTML = `
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:${T.text};margin-bottom:4px;">🤖 AI PRO INSIGHTS</div>
    <div style="color:${T.textDim};font-size:12px;margin-bottom:14px;">Ask Claude to analyse, compare, and apply pro training to your racing</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:14px;">
      ${[
        {icon:'🎯',label:'Athlete Match',p:'Which of these 14 pro athletes does my triathlon profile most closely resemble, and what are the top 3 things I can learn from their specific approach?'},
        {icon:'📋',label:'Build My Week',p:'Using the training patterns of the pro athletes above, design me a complete training week scaled to a 12-hour/week age-group triathlete preparing for a 70.3.'},
        {icon:'📊',label:'Volume Gap',p:"Analyse how a typical 12-hour/week age-group athlete's training volume compares to these pros, and where the most impactful gaps are."},
        {icon:'🍌',label:'Race Nutrition',p:'Explain the race nutrition strategies used by Stornes (180g/hr), Sam Long (310g/hr on bike), and Geens in simple terms and how I can apply them to my next 70.3.'},
        {icon:'😴',label:'Recovery Plan',p:'Design a weekly recovery schedule using what these pros actually do: sleep hours, taper structure, rest day activities, and post-session protocols.'},
        {icon:'🔍',label:'Limiter Fix',p:'Based on the pro data above, help me understand which of the three disciplines is most likely to be my limiter and how pros attack that weakness.'},
      ].map(b => `
        <button onclick="runProBlueprintAI('${b.p.replace(/'/g,"\\'")}') " style="background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:14px 12px;cursor:pointer;text-align:left;transition:all 0.15s;" onmouseover="this.style.borderColor='${T.blue}'" onmouseout="this.style.borderColor='${T.border}'">
          <div style="font-size:1.3rem;margin-bottom:5px;">${b.icon}</div>
          <div style="font-weight:600;color:${T.text};font-size:0.82rem;">${b.label}</div>
        </button>
      `).join('')}
    </div>
    <div id="pb-ai-output" style="display:none;background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:16px;">
      <div id="pb-ai-text" style="color:${T.text};font-size:0.88rem;line-height:1.65;white-space:pre-wrap;"></div>
    </div>
  `;
  container.appendChild(aiSection);

  // Modal overlay
  if (!document.getElementById('pb-modal-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'pb-modal-overlay';
    ov.style.cssText = `display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:1000;overflow-y:auto;padding:20px;box-sizing:border-box;`;
    ov.addEventListener('click', e => { if(e.target===ov) closePBModal(); });
    document.body.appendChild(ov);
  }
}

// ─────────────────────────────────────────────────────────────
// ATHLETE CARD
// ─────────────────────────────────────────────────────────────
function buildAthleteCard(a) {
  const card = document.createElement('div');
  card.style.cssText = `background:${T.surface};border:1px solid ${T.border};border-radius:14px;padding:16px;transition:all 0.2s;cursor:pointer;`;
  card.dataset.athleteId = a.id;
  const verified = a.dataQuality === 'CONFIRMED';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div>
        <div style="font-size:1.5rem;">${a.flag}</div>
        <div style="font-weight:700;color:${T.text};font-size:0.98rem;margin-top:2px;">${a.name}</div>
        <div style="color:${T.textDim};font-size:11px;font-family:'DM Mono',monospace;">${a.country} · Age ${a.age}</div>
      </div>
      <span style="background:${verified ? T.greenDim : T.orangeDim};border:1px solid ${verified ? 'rgba(0,230,118,.3)' : 'rgba(255,152,0,.3)'};padding:2px 8px;border-radius:10px;font-size:10px;color:${verified ? T.green : T.orange};white-space:nowrap;">${verified ? '✅ Verified' : '⚠ Moderate'}</span>
    </div>
    <div style="font-size:11px;color:${T.purple};font-weight:600;margin-bottom:8px;">${a.tier}</div>
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
      <span style="background:${T.blueGlow};color:${T.blue};padding:3px 8px;border-radius:8px;font-size:11px;border:1px solid rgba(33,150,243,.2);">🏆 ${a.wins2025.length} win${a.wins2025.length!==1?'s':''}</span>
      <span style="background:rgba(206,147,216,.08);color:${T.purple};padding:3px 8px;border-radius:8px;font-size:11px;border:1px solid rgba(206,147,216,.2);">🎖 ${a.podiums2025.length} podiums</span>
    </div>
    <div style="background:${T.surface2};border-radius:8px;padding:8px;margin-bottom:10px;font-size:11px;color:${T.textMid};line-height:1.5;border:1px solid ${T.border};">
      <span style="color:${T.textDim};">Peak week:</span> <span style="color:${T.text};">${a.keyStats.peakWeekHours || '—'}</span><br>
      <span style="color:${T.textDim};">Coach:</span> <span style="color:${T.text};">${a.coach}</span>
    </div>
    <button onclick="openPBModal('${a.id}')" style="width:100%;background:${T.blue};color:#fff;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:.03em;">View Full Blueprint →</button>
  `;
  card.addEventListener('mouseenter', () => { card.style.borderColor=T.blue; card.style.transform='translateY(-2px)'; card.style.boxShadow=`0 4px 20px ${T.blueGlow}`; });
  card.addEventListener('mouseleave', () => { card.style.borderColor=T.border; card.style.transform=''; card.style.boxShadow=''; });
  return card;
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
function openPBModal(athleteId) {
  const a = PRO_ATHLETES.find(x => x.id === athleteId);
  if (!a) return;
  const overlay = document.getElementById('pb-modal-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  overlay.style.display = 'block';

  const modal = document.createElement('div');
  modal.style.cssText = `background:${T.surface};border:1px solid ${T.border2};border-radius:16px;max-width:820px;margin:0 auto;overflow:hidden;`;

  // Header
  const mh = document.createElement('div');
  mh.style.cssText = `background:linear-gradient(135deg,#0d2137,${T.surface2});border-bottom:1px solid ${T.border2};color:${T.text};padding:20px 24px;`;
  mh.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:2rem;">${a.flag}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:${T.text};margin-top:4px;">${a.name}</div>
        <div style="color:${T.textDim};font-size:11px;margin-top:2px;">${a.tier} · ${a.base}</div>
      </div>
      <button onclick="closePBModal()" style="background:${T.surface3};border:1px solid ${T.border};color:${T.text};width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1.2rem;line-height:1;">×</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      ${a.wins2025.map(w=>`<span style="background:${T.blueGlow};border:1px solid rgba(33,150,243,.25);color:${T.blue};padding:3px 10px;border-radius:10px;font-size:11px;">🏆 ${w}</span>`).join('')}
      <span style="background:${T.surface3};border:1px solid ${T.border};color:${T.textMid};padding:3px 10px;border-radius:10px;font-size:11px;">Coach: ${a.coach}</span>
    </div>
  `;
  modal.appendChild(mh);

  // Tabs
  const TABS = ['Overview', 'Week Structure', 'Key Sessions', 'Nutrition & Recovery', 'Race Data', '🤖 AI'];
  const tabBar = document.createElement('div');
  tabBar.style.cssText = `display:flex;overflow-x:auto;border-bottom:1px solid ${T.border};background:${T.surface2};`;
  const content = document.createElement('div');
  content.style.cssText = `padding:20px 24px;max-height:62vh;overflow-y:auto;background:${T.surface};`;

  const activeTabStyle  = `padding:11px 15px;border:none;cursor:pointer;font-size:11px;white-space:nowrap;background:${T.surface};color:${T.blue};font-weight:700;border-bottom:2px solid ${T.blue};font-family:'DM Sans',sans-serif;`;
  const inactiveTabStyle = `padding:11px 15px;border:none;cursor:pointer;font-size:11px;white-space:nowrap;background:transparent;color:${T.textDim};font-weight:400;border-bottom:2px solid transparent;font-family:'DM Sans',sans-serif;`;

  TABS.forEach((t, i) => {
    const tb = document.createElement('button');
    tb.textContent = t;
    tb.style.cssText = i === 0 ? activeTabStyle : inactiveTabStyle;
    tb.addEventListener('click', () => {
      tabBar.querySelectorAll('button').forEach(b => b.style.cssText = inactiveTabStyle);
      tb.style.cssText = activeTabStyle;
      renderModalTab(content, a, t);
    });
    tabBar.appendChild(tb);
  });
  modal.appendChild(tabBar);
  renderModalTab(content, a, 'Overview');
  modal.appendChild(content);
  overlay.appendChild(modal);
}

function closePBModal() {
  const ov = document.getElementById('pb-modal-overlay');
  if (ov) ov.style.display = 'none';
}

function renderModalTab(content, a, tab) {
  content.innerHTML = '';

  if (tab === 'Overview') {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;';
    Object.entries(a.keyStats).forEach(([k,v]) => {
      const cell = document.createElement('div');
      cell.style.cssText = `background:${T.surface2};border:1px solid ${T.border};border-radius:8px;padding:11px;`;
      cell.innerHTML = `<div style="font-size:10px;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;font-family:'DM Mono',monospace;">${k.replace(/([A-Z])/g,' $1').trim()}</div><div style="font-weight:600;color:${T.text};font-size:0.85rem;line-height:1.4;">${v}</div>`;
      grid.appendChild(cell);
    });
    content.appendChild(grid);
    const src = document.createElement('div');
    src.style.cssText = `background:${T.greenDim};border:1px solid rgba(0,230,118,.2);border-radius:8px;padding:12px;`;
    src.innerHTML = `<div style="font-weight:700;color:${T.green};margin-bottom:4px;font-size:11px;font-family:'DM Mono',monospace;letter-spacing:1px;">📚 DATA SOURCE</div><div style="font-size:12px;color:${T.textMid};">${a.source}</div>`;
    content.appendChild(src);
  }

  else if (tab === 'Week Structure') {
    const days = [{k:'mon',l:'Mon'},{k:'tue',l:'Tue'},{k:'wed',l:'Wed'},{k:'thu',l:'Thu'},{k:'fri',l:'Fri'},{k:'sat',l:'Sat'},{k:'sun',l:'Sun'}];
    const note = document.createElement('div');
    note.style.cssText = `font-size:11px;color:${T.textDim};margin:0 0 12px;`;
    note.textContent = `Typical training week — from ${a.source}`;
    content.appendChild(note);
    days.forEach(d => {
      const day = a.weekStructure[d.k];
      if (!day) return;
      const sessions = [
        day.swim ? `🏊 ${day.swim}` : null,
        day.bike ? `🚴 ${day.bike}` : null,
        day.run  ? `🏃 ${day.run}`  : null,
      ].filter(Boolean);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;';
      row.innerHTML = `<div style="min-width:34px;font-family:'DM Mono',monospace;font-size:10px;color:${T.blue};padding-top:7px;letter-spacing:1px;">${d.l}</div>
        <div style="flex:1;">${sessions.length
          ? sessions.map(s=>`<div style="background:${T.surface2};border:1px solid ${T.border};border-radius:6px;padding:6px 10px;font-size:11px;color:${T.textMid};margin-bottom:4px;line-height:1.4;">${s}</div>`).join('')
          : `<div style="color:${T.textDim};font-size:11px;padding:6px 10px;">Rest / Recovery only</div>`
        }</div>`;
      content.appendChild(row);
    });
  }

  else if (tab === 'Key Sessions') {
    a.keySessions.forEach(s => {
      const card = document.createElement('div');
      card.style.cssText = `background:${T.surface2};border:1px solid ${T.border};border-radius:10px;padding:14px;margin-bottom:10px;`;
      card.innerHTML = `<div style="font-weight:700;color:${T.text};margin-bottom:6px;font-size:13px;">🎯 ${s.name}</div>
        <div style="color:${T.textMid};font-size:12px;line-height:1.5;margin-bottom:10px;">${s.detail}</div>
        <button onclick="scaleSession('${a.id}','${encodeURIComponent(s.name)}','${encodeURIComponent(s.detail)}')" style="background:rgba(206,147,216,.15);color:${T.purple};border:1px solid rgba(206,147,216,.3);border-radius:6px;padding:7px 14px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">⚡ Scale to My Fitness</button>`;
      content.appendChild(card);
    });
  }

  else if (tab === 'Nutrition & Recovery') {
    [['🍌 Nutrition', a.nutrition], ['😴 Recovery & Sleep', a.recovery], ['🧬 Physiology', a.physiology]].forEach(([label, data]) => {
      const block = document.createElement('div');
      block.style.cssText = 'margin-bottom:16px;';
      block.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:${T.textDim};text-transform:uppercase;margin-bottom:8px;">${label}</div>`;
      Object.entries(data).forEach(([k,v]) => {
        block.innerHTML += `<div style="background:${T.surface2};border:1px solid ${T.border};border-radius:8px;padding:10px;margin-bottom:6px;"><div style="font-size:10px;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;font-family:'DM Mono',monospace;">${k.replace(/([A-Z])/g,' $1').trim()}</div><div style="color:${T.text};font-size:12px;line-height:1.5;">${v}</div></div>`;
      });
      content.appendChild(block);
    });
  }

  else if (tab === 'Race Data') {
    if (!a.raceData2025?.length) {
      content.innerHTML = `<p style="color:${T.textDim};">No confirmed 2025 race splits available.</p>`;
      return;
    }
    const t = document.createElement('table');
    t.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
    t.innerHTML = `<thead><tr style="background:${T.surface2};">${['Race','Pos','Swim','Bike','Run','Total'].map(h=>`<th style="text-align:${h==='Race'?'left':'center'};padding:8px 10px;color:${T.textDim};font-weight:600;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;">${h.toUpperCase()}</th>`).join('')}</tr></thead>
      <tbody>${a.raceData2025.map(r=>`<tr style="border-bottom:1px solid ${T.border};">
        <td style="padding:8px 10px;font-weight:600;color:${T.text};">${r.race}</td>
        <td style="padding:8px;text-align:center;font-weight:700;color:${r.pos===1?T.green:r.pos===2?T.orange:r.pos===3?T.yellow:T.textMid};">${r.pos===1?'🥇':r.pos===2?'🥈':r.pos===3?'🥉':r.pos}</td>
        <td style="padding:8px;text-align:center;color:${T.textMid};">${r.swim||'—'}</td>
        <td style="padding:8px;text-align:center;color:${T.textMid};">${r.bike||'—'}</td>
        <td style="padding:8px;text-align:center;color:${T.textMid};">${r.run||'—'}</td>
        <td style="padding:8px;text-align:center;font-weight:600;color:${T.cyan};">${r.total||'—'}</td>
      </tr>`).join('')}</tbody>`;
    content.appendChild(t);
  }

  else if (tab === '🤖 AI') {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      ${[
        {icon:'🎯',label:'Match Me',p:`How does my triathlon profile compare to ${a.name}? What are the top 3 things to take from their training?`},
        {icon:'📋',label:'Scale Sessions',p:`Take ${a.name}'s key sessions and scale them to a 12-hour/week age-group triathlete. Give specific numbers.`},
        {icon:'🍌',label:'Nutrition Copy',p:`Explain ${a.name}'s race nutrition strategy in practical terms and exactly how an age-grouper can apply it.`},
        {icon:'😴',label:'Recovery Lessons',p:`What are the top 3 recovery lessons from ${a.name}'s approach that I should implement this week?`},
      ].map(b=>`<button onclick="runProBlueprintAI('${b.p.replace(/'/g,"\\'")}','${a.id}')" style="background:${T.surface2};border:1px solid ${T.border};border-radius:10px;padding:12px;cursor:pointer;text-align:left;" onmouseover="this.style.borderColor='${T.blue}'" onmouseout="this.style.borderColor='${T.border}'"><div style="font-size:1.1rem;">${b.icon}</div><div style="font-weight:600;color:${T.text};font-size:11px;margin-top:4px;">${b.label}</div></button>`).join('')}
    </div>
    <div id="pb-modal-ai-output" style="display:none;background:${T.greenDim};border:1px solid rgba(0,230,118,.2);border-radius:10px;padding:14px;">
      <div id="pb-modal-ai-text" style="color:${T.text};font-size:12px;line-height:1.65;white-space:pre-wrap;"></div>
    </div>`;
    content.appendChild(wrap);
  }
}

// ─────────────────────────────────────────────────────────────
// AI FUNCTIONS
// ─────────────────────────────────────────────────────────────
async function runProBlueprintAI(prompt, athleteId) {
  const inModal = document.getElementById('pb-modal-overlay')?.style.display !== 'none';
  const outBox  = inModal ? document.getElementById('pb-modal-ai-output') : document.getElementById('pb-ai-output');
  const outText = inModal ? document.getElementById('pb-modal-ai-text')   : document.getElementById('pb-ai-text');
  if (!outBox || !outText) return;
  outBox.style.display = 'block';
  outText.textContent = '⏳ Generating insights...';

  let context = '';
  if (athleteId) {
    const a = PRO_ATHLETES.find(x => x.id === athleteId);
    if (a) context = `\n\nATHLETE CONTEXT — ${a.name} (${a.country}):\nTier: ${a.tier}\n2025 Wins: ${a.wins2025.join(', ')||'none'}\nCoach: ${a.coach} | Base: ${a.base}\nKey Stats: ${JSON.stringify(a.keyStats,null,1)}\nNutrition: ${JSON.stringify(a.nutrition,null,1)}\nRecovery: ${JSON.stringify(a.recovery,null,1)}\nSource: ${a.source}`;
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 850,
        system: `You are TriCoach's Pro Blueprint AI. You provide specific, actionable triathlon coaching insights based on verified pro athlete training data. Be direct, practical and sport-specific. Use clear formatting with headers when helpful. Focus on what an age-group triathlete training 10–15 hours per week can actually implement.${context}`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    outText.textContent = data?.content?.map(c => c.text||'').join('') || 'No response received.';
  } catch (err) {
    outText.textContent = `❌ Error: ${err.message}`;
  }
}

async function scaleSession(athleteId, nameEnc, detailEnc) {
  const sessionName   = decodeURIComponent(nameEnc);
  const sessionDetail = decodeURIComponent(detailEnc);
  const a = PRO_ATHLETES.find(x => x.id === athleteId);
  const prompt = `Scale this pro session from ${a?.name || 'a pro triathlete'} to an age-group athlete:\n\nSession: ${sessionName}\nDetail: ${sessionDetail}\n\nProvide:\n1. The scaled version for someone training 12h/week\n2. Specific targets: pace (assume ~4:50/km run threshold, ~240W bike threshold)\n3. The key purpose\n4. Common mistakes to avoid`;

  const outBox  = document.getElementById('pb-modal-ai-output');
  const outText = document.getElementById('pb-modal-ai-text');
  if (!outBox || !outText) return;
  outBox.style.display = 'block';
  outText.textContent = '⏳ Scaling session to your fitness level...';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        system: "You are TriCoach's session scaling AI. Take elite pro sessions and make them practical for age-group athletes. Be specific with numbers and pacing. Keep it concise and actionable.",
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    outText.textContent = data?.content?.map(c => c.text||'').join('') || 'No response.';
  } catch (err) {
    outText.textContent = `❌ Error: ${err.message}`;
  }
}
