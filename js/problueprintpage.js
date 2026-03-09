// ============================================================
// PRO BLUEPRINT PAGE — TriCoach
// Expanded roster: 14 athletes, verified 2025 race data
// Sources: Scientific Triathlon pods, PubMed, Norwegian Method Pod,
//          TRI247, Slowtwitch, Triathlete Mag, direct athlete interviews
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
      recovery: 'Large post-session carb + protein meals. Caffeine matched to training intensity (more on hard weekends, less midweek). Sleep #1 priority.',
    },
    recovery: {
      sleep: '8–9h. Essential. Caffeine intake deliberately managed around training schedule.',
      tools: 'Altitude camps (2×/season). Bergen harsh-weather training builds mental toughness. Heavy pre-swim band/press-up warm-up. Strength work for swim power (upper body).',
      philosophy: 'Self-coaching via collaborative trio — open dialogue. Lactate guides every session intensity. Process-over-results orientation.',
      taper: '10–14 days. Drops threshold volume, maintains easy frequency. Mental disconnection from social media pre-race. Caffeine periodisation helps pre-race sharpness.',
    },
    physiology: {
      vo2max: '101.1 mL/kg/min (PubMed confirmed)',
      energyExpenditure: '7,019–8,506 kcal/day',
      annualHours: '1,308–1,480h (2020–2022 confirmed)',
      intensityDistribution: 'Pyramidal — ~80–85% low, balance at lactate threshold',
      notes: 'Olympic gold 2021. IM World Champ 2022. IM 70.3 Champ 2022. IRONMAN Pro Series Champion 2025. Won 3 major races in 2025 despite "average season" personal assessment.',
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
    source: 'Slowtwitch Stornes profile Nov 2025; Slowtwitch forum Sep 2025 (Norwegian week structure); Triathlete.com nutrition Oct 2025',
    keyStats: {
      peakWeekHours: '25–35h depending on phase',
      marathonAt_IMWC: '2:29:49 at IMWC Nice (3rd fastest iron-distance marathon ever)',
      carbsPerHourRace: '180g/hr (gut-trained over months)',
      carbsPreRace: '200g before swim + 80–100g in T1',
      swimPerWeek: '6× including open water. Even rest days: 4.5–5km easy.',
      bikePerWeek: '5–6×',
      runPerWeek: '5–6×',
      selfCoachingSince: '2025 (previously externally coached). Coaches alongside Blummenfelt + Iden.',
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
      { name: 'Double Threshold (Norwegian Method)', detail: 'Same as Blummenfelt group. AM threshold swim + PM threshold bike or run. Lactate controlled at 2.5–3mmol throughout.' },
    ],
    nutrition: {
      philosophy: 'Extremely aggressive high-carb. Gut-trained specifically over months to handle 180g/hr. Pre-race carb bolus strategy refined all season.',
      training: 'Carb-fueled threshold days. Easy days lower carb. Maurten-style hydrogel approach.',
      race: '200g+ carbs before swim. 80–100g in T1. 180g/hr on bike. Continued on run. All confirmed at IMWC Nice 2025 via Triathlete.com nutrition breakdown.',
      recovery: 'Power naps during training blocks (mid-day sleep essential). Post-race weeks deliberately very light — first 2.5 weeks after Nice had no power naps due to media obligations.',
    },
    recovery: {
      sleep: '9–10h target. After IMWC Nice win: 2.5 weeks sleep disrupted by media — openly cited as challenge heading into Marbella.',
      tools: 'Altitude camp Pyrenees pre-Nice. Course recon rides on Marbella bike course. Aero testing (calf sleeves alone saved ~3min at IMWC — 30s in T1, ~3min saved on bike). Pinarello road frame for Nice (lighter than TT for climbing).',
      philosophy: 'Self-coaching in collaborative trio. "I've learned to know my body way more — especially with recovery and making good decisions for myself." Full rest days still include an easy swim.',
      taper: 'Significant volume drop. Keeps one longer bike (3–3.5h + 1h run). Tests different taper protocols each season. Key pre-race day: long bike + 1h run + 1h swim. Race day –1: short easy run + bike check.',
    },
    physiology: {
      marathon: '2:29:49 at IMWC Nice — 3rd fastest iron-distance marathon ever',
      swimLevel: 'Second-tier swimmer — exits with Blummenfelt group, typically 30–60s behind leaders',
      raceIntelligence: 'Allowed Iden + Blummenfelt to surge with 15 miles to go at Nice. Held own pace, passed both in final miles. Elite-level pacing discipline.',
      notes: '3× Olympian (Tokyo 11th). Long-course debut 2025. 3rd iron-distance start ever was IMWC win. Youngest of the trio. Arguably most complete athlete in 2025.',
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
    source: 'lsanderstri.wordpress.com; TRI247 volume debate Feb 2025; Sanders YouTube 2025; multiple published Zwift workouts',
    keyStats: {
      peakWeekHours: '17–20h (intensity-first philosophy, not volume)',
      bikeHoursPerWeek: '~15h/week on bike at peak',
      ftpWatts: '420W (confirmed multiple sources)',
      swimPerWeek: '3–4× (active improvement focus in 2025)',
      runPerWeek: '4–5×',
      intensityDistribution: 'Higher than Norwegian group: more threshold/Z3 work, fewer pure Z1 hours',
      selfCoachingSince: '2023 — moved from Ryan Bolton (5 yrs) → Dan Plews (brief) → self',
    },
    weekStructure: {
      mon: { swim: 'Swim technique session', bike: 'Recovery ride or rest', run: null },
      tue: { swim: null, bike: 'Zwift threshold: 3×(12min @365W / 5min recovery / 2min @420W / 2min recovery)', run: 'Moderate run 60–75 min' },
      wed: { swim: 'Swim focus 45–60 min', bike: 'Moderate fasted ride 90–120 min at easy-moderate (changed from hard day in self-coached era)', run: 'Moderate 14–15 miles at ~6:45/mile (deliberately not hard — reduced from previous Wed intensity)' },
      thu: { swim: null, bike: 'Hard Zwift: 8×(30s @500W + 1.5min @420W + 1.5min recovery)', run: 'Key threshold run session' },
      fri: { swim: 'Swim session', bike: 'Easy recovery', run: 'Easy 45–60 min' },
      sat: { swim: null, bike: 'Tucson Shootout (group ride) or long hard ride 3–4h', run: 'Brick run 30–45 min' },
      sun: { swim: null, bike: 'Long steady ride 3–4h', run: 'Long easy run' },
    },
    keySessions: [
      { name: 'Zwift Super-Threshold Block', detail: '3×(12min @365W with 5min recovery into 2min @420W with 2min recovery). Sustained LT2 with VO₂ spike. Confirmed from his blog with actual power data.' },
      { name: 'Tucson Shootout', detail: "America's fastest group ride, ~2–3h. 6+ consecutive weeks in winter 2025. All-out group effort — \"every week I've gotten stronger.\"" },
      { name: '8×30s Anaerobic Spikes', detail: '8×(30s @500W + 1.5min @420W + 1.5min recovery). Anaerobic capacity + VO₂max combo. Confirmed from lsanderstri.wordpress.com blog with exact power data.' },
      { name: 'Race-Specific Volume Bike', detail: "2025 philosophy: ride 4h at Z2 before expecting to race 4h at Z2. 'Can I ride 2h and expect to race 4h at that intensity? No.' Specificity of duration is key." },
    ],
    nutrition: {
      philosophy: 'Changed diet 2024 due to health scare — shifted to more whole food base, reduced processed food. High carb around sessions, adequate recovery nutrition.',
      training: 'Fuels training sessions well. High carb before/during hard sessions. WHOOP guides intensity and recovery readiness.',
      race: 'Carb loading race week. Standard pro gel/drink strategy on bike and run. Swim is his limiter so pre-race minimises anxiety around swim.',
      recovery: '"Check your ego at the door" — key mantra. Post-session fueling. Tracks WHOOP data for strain/recovery balance.',
    },
    recovery: {
      sleep: '8h+ target. Better sleep was noted improvement after self-coaching transition and reducing stress.',
      tools: 'WHOOP band daily tracking. Zwift for controlled indoor efforts (avoids traffic/weather/social stress). Hard days are genuinely hard; easy days are genuinely easy.',
      philosophy: 'Intensity > Volume. 17h high-quality beats 30h junk miles. Volume serves specificity: train the duration and intensity you will race. Quote: "The fine art of coaching lies in making adjustments and having confidence doing it."',
      taper: '7–10 days. Volume drop 40–50%. Shorter intensity sessions kept in. Mental prep and race visualisation. At 36 — recovery window is treasured.',
    },
    physiology: {
      ftp: '420W (confirmed)',
      swimLimiter: 'Exited Oceanside swim 30th of field (26:00). Won race anyway. Swim is #1 ongoing development priority.',
      notes: 'Self-coached since 2023. Multiple WR attempts. Iconic Canadian triathlete. 30+ IRONMAN 70.3 career wins. Intensity-pioneer: training ~17h/wk while others do 30h+ and winning.',
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
    source: 'TRI247 Long/Sanders volume debate Feb 2025; Triathlete.com Grand Reinvention 2023; TRI247 nutrition debrief T100 Singapore 2025',
    keyStats: {
      peakWeekHours: '28–32h (self-described 2025)',
      annualHours2024: '~1,200h (23h/wk average)',
      bikeHoursPerWeek: '~15h/week at peak',
      swimPerWeek: '4× (active improvement focus throughout 2025)',
      runPerWeek: '5×',
      swimChallenge: 'Exits water 3–6min behind field in most races. Entire race strategy = bike/run comeback.',
      racePhilosophy: '"Volume is the most important metric you can measure."',
    },
    weekStructure: {
      mon: { swim: 'Swim technique focus 45–60 min', bike: 'Rest or easy', run: null },
      tue: { swim: null, bike: 'Threshold group ride (Shootout) or structured intervals', run: 'Moderate 60–80 min' },
      wed: { swim: 'AM swim', bike: 'Moderate fasted ride 90–120 min (deliberately NOT hard — changed from previous hard Wednesday)', run: 'Moderate 14–15 miles at ~6:45/mile (moderate bridge day)' },
      thu: { swim: null, bike: 'Hard ride', run: 'Key threshold run session' },
      fri: { swim: 'Swim session', bike: 'Recovery 60 min', run: 'Easy 45–60 min' },
      sat: { swim: null, bike: 'Tucson Shootout or peak volume long ride 4–5h', run: 'Brick run 30–45 min' },
      sun: { swim: null, bike: 'Long easy ride 3h', run: 'Long easy run 18–22 miles' },
    },
    keySessions: [
      { name: 'Tucson Shootout', detail: "America's fastest group ride. 6+ consecutive weeks winter 2024–25. Getting stronger each week: 'This is now week six in a row and every week I've gotten stronger.'" },
      { name: 'Peak Volume Week', detail: '"Peak week = hardest week in volume AND intensity combined." Often trains with Sanders in these blocks. Both describe it as brutally hard.' },
      { name: 'Long Run 18–22 miles', detail: 'Cornerstone of run excellence. Easy pace, high volume. Long run at easy aerobic is how he builds the engine for sub-1:10 70.3 half-marathons.' },
      { name: 'Swim Focus Block', detail: 'Early 2025: 3-week swim-focused build before St. George. Swim described as "active development" — making progress but against a very fast-moving target.' },
    ],
    nutrition: {
      philosophy: 'Fuel for performance. Very transparent on social media about race nutrition. High carb race day, pragmatic whole food base.',
      training: 'Carb-fueled hard sessions. Pragmatic. Does not overthink nutrition outside race day.',
      race: 'T100 Singapore 2025 confirmed: Double breakfast (3 eggs + lots of toast at 7am + toast at 10am). Pre-race: 90g carbs + energy drink. Bike: ASTOUNDING 310g carbs in 1h50min + 3.5L fluid + 200mg caffeine. Self-described: "This is wild."',
      recovery: 'Family balance — son Leo is priority. Training adapts around family life. Rest when body needs it.',
    },
    recovery: {
      sleep: '8h+ target. Self-coaching transition in 2023 improved sleep quality and mood consistency. "I have more energy in my day-to-day life."',
      tools: 'Self-coaches based on feel + data. No rigid rules — body-listening approach.',
      philosophy: '"Volume is how I build confidence." Contrasts with Sanders philosophy. Believes volume tolerance = performance. Reduced total hours by 10% vs coached era but significantly improved performance.',
      taper: '7–10 days. Reduces to "just enough" to feel fresh. Mental prep via YouTube community. Doesn\'t overanalyse.',
    },
    physiology: {
      swimLimiter: 'Exits water far behind field in essentially every race. 30th at Oceanside (26:00), 21st at Eagleman (27:49). Race wins despite massive swim deficit.',
      bikeRun: 'World-class combination off the bike. Fastest bike (1:55:14) and fastest run (1:10:49) at Eagleman for course record.',
      notes: '"The Big Unit" — 6ft 4in, ~97kg. Flat/fast courses suit his power. Eagleman course record 2025. PTO #3 biker ranking.',
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
    source: 'Norwegian Method Podcast; Slowtwitch IMWC Nice race analysis 2025; Triathlete.com',
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
      { name: 'Norwegian Double Threshold', detail: 'Identical to Blummenfelt group. AM threshold swim + PM threshold run or bike. Lactate-controlled 2.5–3mmol throughout. The Norwegian method foundation.' },
      { name: 'Altitude Block', detail: 'Sierra Nevada + Pyrenees with Blummenfelt + Stornes. 3–4 week blocks. VO₂max ceiling elevation is the goal.' },
      { name: 'IMWC Nice Bike Conservation', detail: 'Rarely put nose in wind on Nice bike. Accepted gaps forming and saved energy for run. Surged at mile 15 of marathon — Stornes held pace and eventually passed him. Classic delayed execution.' },
    ],
    nutrition: {
      philosophy: 'High-carb intuitive eating (same Norwegian trio philosophy). Gut-trained for high race intake.',
      training: 'Maurten fueling on threshold days. Carb periodisation. Recovery nutrition careful given injury history.',
      race: 'Same methodology as Blummenfelt — 100g+/hr on bike via hydrogel. Carb loading race week.',
      recovery: 'Extra care with load management given injury history. Deliberately conservative in post-injury return phases.',
    },
    recovery: {
      sleep: '9h+ target',
      tools: 'Altitude camps. Collaborative self-coaching gives fine-grained load management ability.',
      philosophy: 'Highly cautious 2022–2024 given repeated injuries. 2025 = fully committed return with careful monitoring.',
      taper: 'Standard Norwegian 10–14 day taper. Drop threshold volume, maintain easy frequency.',
    },
    physiology: {
      marathonCapacity: 'Sub-2:30 iron-distance capability when healthy',
      notes: 'IM World Champ 2022. 70.3 World Champ 2019 + 2021. Multiple injury setbacks. Clear 2025 comeback — 2nd IMWC Nice. Exceptional long-course marathon speed when healthy and fresh.',
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
      confirmedPeakWeek: '25km swim + 466km bike + 131km run = 33h total (single confirmed week from coach)',
      normalBike: '350–400km/week',
      normalRun: '100–120km/week',
      normalSwim: '20–25km/week',
      ptoBikeRanking: 'World #2 best biker (PTO ranking)',
      age: '25 — likely still improving',
    },
    weekStructure: {
      mon: { swim: 'Recovery 3–4km', bike: 'Easy 2h', run: 'Easy 45–60 min' },
      tue: { swim: '6–7km hard set', bike: 'Key interval session 4–5h (quality intervals included)', run: null },
      wed: { swim: '5km moderate', bike: '6–7h long ride Z1-Z2 (~150–180km in Girona terrain)', run: 'Brick run 45 min off bike' },
      thu: { swim: '5km hard', bike: 'Threshold or VO₂ session 3–4h', run: 'Key run session 20–25km' },
      fri: { swim: 'Easy 4km', bike: 'Recovery 2h', run: 'Easy 10km' },
      sat: { swim: null, bike: '5–6h medium-hard (~150km)', run: 'Brick run 60–75 min' },
      sun: { swim: '4–5km easy', bike: 'Easy 3h', run: 'Long easy run 25–30km' },
    },
    keySessions: [
      { name: 'Wednesday Monster Ride', detail: '6–7h long ride ~150–180km at Z1-Z2. Core of extreme volume week. Girona terrain includes significant climbing. Similar to Grand Tour cyclists\' base rides.' },
      { name: 'Confirmed Peak Volume Block', detail: 'Coach confirmed: 466km bike + 131km run + 25km swim in one week = 33 total hours. Periodic peak volume blocks in deep base phase. Not every week.' },
      { name: 'Back-to-Back Quality Days', detail: 'Tuesday hard bike + Thursday hard run. Two quality sessions separated by Wednesday volume day. High-stress / high-adapt cycle.' },
    ],
    nutrition: {
      philosophy: 'Must fuel extreme volume. Very high caloric intake. Carb-centric.',
      training: 'Carries food on 6–7h rides — solid food (bananas, bars) + liquid carbs. Gels for intervals.',
      race: 'High carb standard. T100 and IRONMAN-level fueling.',
      recovery: 'Volume demands serious recovery nutrition. Large post-ride meals prioritised. Sleep is non-negotiable.',
    },
    recovery: {
      sleep: '9–10h required (volume absorption demands it)',
      tools: 'Girona base — world-class cycling roads, warm climate, cyclist community (trains near Pogacar, Evenepoel routes). Coach Kasper monitors load carefully.',
      philosophy: 'Volume = adaptation for him. More similar to Grand Tour cyclist approach than traditional triathlete. Girona is optimal base for year-round volume.',
      taper: '2 weeks. Massive volume drop from extreme high. Maintains moderate intensity on bike.',
    },
    physiology: {
      notes: 'PTO world #2 ranked biker. Age 25 — arguably the youngest star in this field with the most upside. Dane training out of Girona Spain.',
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
    source: 'Scientific Triathlon EP#403 — Richard Laidlow (coach/father) describes weekly structure in detail',
    keyStats: {
      ptoBikeRanking: 'World #1 biker (PTO ranking)',
      peakWeekHours: '~30h',
      swimPerWeek: '4×',
      bikePerWeek: '5–6× with Pyrenees climbing daily',
      runPerWeek: '5–6×',
      pyreneesBenefits: 'Trains on Tour de France cols (Tourmalet, Aubisque, La Mongie) daily — creates exceptional sustained climbing power',
    },
    weekStructure: {
      mon: { swim: 'Easy 3–4km', bike: 'Recovery spin 1.5h', run: null },
      tue: { swim: 'Hard session 5–6km AM', bike: 'Threshold ride 3–4h with intervals', run: 'Easy 45 min' },
      wed: { swim: 'Moderate 5km', bike: 'Long ride 4.5–5h in Pyrenees (climbs daily)', run: 'Brick run 45min–1h off bike' },
      thu: { swim: 'Hard 5km AM', bike: 'Moderate 2.5–3h', run: 'Key run: threshold intervals 2×20min or long reps' },
      fri: { swim: 'Easy technique', bike: 'Easy recovery', run: 'Easy 45–60 min' },
      sat: { swim: null, bike: '5h medium-hard (confirmed in EP403 structure)', run: 'Brick run 60 min' },
      sun: { swim: '4km easy', bike: 'Easy 2h', run: 'Long easy run 25–30km' },
    },
    keySessions: [
      { name: 'Pyrenees Col Ride', detail: 'Daily climbing on Tour de France cols. 4–5h in mountains including sustained 20–40min col ascents at threshold power. Creates exceptional bike power + endurance unique to his base.' },
      { name: 'Father-Coach Daily Check-In', detail: 'Father watches every session data in real-time. Daily adjustments. More granular monitoring than most athletes have access to.' },
      { name: 'Swim-Bike Block', detail: 'Hard AM swim directly into bike session — simulates race transition fatigue. Confirmed in EP403 structure.' },
    ],
    nutrition: {
      philosophy: 'Fuels big Pyrenees volume. High carb with French whole food culture. Father as coach includes nutrition monitoring.',
      training: 'Carries solid food on 5h+ Pyrenees rides — bananas, bars, sports drink. Gels for intensity blocks.',
      race: 'Very high bike intake required given his race-pace efforts. Typically attacks bike aggressively.',
      recovery: 'Father coaches = granular recovery monitoring. Daily load discussion.',
    },
    recovery: {
      sleep: '9h',
      tools: 'Altitude Pyrenees base. Family coaching = personalised recovery management. Father can see exact training file and adjust.',
      philosophy: 'Quality-focused coaching in tight family unit. Every session has purpose.',
      taper: '10–14 days. Maintains some bike intensity but drops overall volume significantly.',
    },
    physiology: {
      bikeRanking: 'PTO World #1 biker — likely most powerful sustained cyclist in field',
      notes: 'Won IMWC 2023 at age 23. Kona 2024: overcooked bike, walked parts of run. Nice 2025: Similar pattern — led/pushed bike, 5th overall. Run execution still developing for iron distance.',
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
    dataQuality: 'MODERATE — race data confirmed; training structure inferred',
    source: 'PTO stats 2025; Triathlete IMWC Nice coverage; general media',
    keyStats: {
      niceBase: 'Lives and trains year-round on IMWC Nice course. Enormous course knowledge advantage.',
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
      { name: 'Nice Descent Practice', detail: 'Year-round training on actual IMWC Nice descent (Col de Vence) — course mastery is a documented tactical advantage. Documented course knowledge.' },
      { name: '70.3 Bike Build', detail: 'Flat-course bike specialist — Oceanside 2025: 2:05:57 (3rd fastest bike of day) to finish 2nd overall.' },
    ],
    nutrition: { philosophy: 'Standard high-carb pro approach', training: 'Fuels training volume appropriately', race: 'High carb on bike. Electrolytes for Nice heat.', recovery: 'Nice climate = year-round consistent training conditions.' },
    recovery: { sleep: '8–9h', tools: 'Year-round Nice base training. Course familiarity.', philosophy: 'Consistency of training on race course = reduced race-day variables.', taper: 'Standard 10-day taper. Course knowledge reduces anxiety.' },
    physiology: { notes: 'Strong swimmer-biker at 70.3. Iron-distance marathon still developing. Top-10 IMWC Nice 2025. Nice base = biggest long-term strategic advantage.' },
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
      runStrength: 'Good 70.3 runner',
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
      { name: 'Elite Swim Speed Sessions', detail: 'Olympic swimmer background — uses speed advantage to exit with front pack and preserve energy for bike/run. Swim is a strength, not a limiter.' },
      { name: 'Arizona Heat Adaptation', detail: 'Year-round Tempe desert training builds significant heat acclimatisation advantage for hot-weather races.' },
    ],
    nutrition: { philosophy: 'High carb race fueling, standard pro approach', training: 'Fuels training. Heat nutrition knowledge.', race: 'High carb + electrolytes. Heat experience guides fluid strategy.', recovery: 'Standard pro protocols.' },
    recovery: { sleep: '8h', tools: 'Arizona desert training. Heat adaptation.', philosophy: 'Olympic background brings professional discipline and periodisation knowledge.', taper: 'Standard 10-day.' },
    physiology: { notes: '2016 Rio Olympic silver. Consistent PTO top-10 triathlete. Elite swimmer by background — rare attribute in field.' },
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
    dataQuality: 'MODERATE — race data confirmed; training structure limited',
    source: 'TRI247 Chattanooga 2025; besttriathletes.com race report',
    keyStats: {
      runStrength: '1:08:34 half-marathon off bike — fastest at Chattanooga. Consistent fast runner.',
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
    physiology: { notes: '1:08:34 half-marathon off bike at Chattanooga = fastest in field. Clear top American run talent. Watch for breakthrough 2026.' },
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
    source: 'TRI247 Chattanooga 2025; besttriathletes.com; PTO race results',
    keyStats: {
      runStrength: '1:08:14 at Chattanooga — among fastest in field. Consistent 70.3 run performer.',
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
      { name: 'Track Interval Run', detail: 'Track intervals 400m–1mile reps at 5K race pace. Builds raw speed that carries to fast 70.3 half-marathons.' },
      { name: 'Augusta Race Build', detail: 'Specific preparation for flat, fast Augusta course. Bike power + fast run pace. Won 2025.' },
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
];

const SESSION_MATRIX = [
  { session: 'Double Threshold Day', athletes: ['Blummenfelt', 'Stornes', 'Iden'], detail: 'AM threshold swim + PM threshold bike or run. Lactate-controlled at 2.5–3mmol throughout both sessions. Can only be done with lactate testing for precision.', frequency: '2× per week (Tue + Thu)', benefit: 'Maximises threshold stimulus without exceeding metabolic capacity. Cornerstone of Norwegian group dominance since 2021.' },
  { session: '35s/15s VO₂ Intervals', athletes: ['Geens', 'Blummenfelt', 'Stornes'], detail: '35s at VO₂max intensity / 15s easy × 6 reps per block = 4 min block. 2–4 blocks per session. Can be on bike or run. Very high aerobic ceiling stimulus, low recovery cost.', frequency: '1× per week per discipline', benefit: 'Huge aerobic ceiling stimulus with manageable recovery. 6 reps = can complete 3–4 blocks in one session. Geens confirmed targeting ~400W on bike version.' },
  { session: 'Norwegian Track Brick', athletes: ['Stornes', 'Blummenfelt', 'Iden'], detail: 'Bike to track, ride outer lane. 3×10min bike@LT2 → 3×2km run → 4×6min bike → 4×1km run → 3×4min bike → 3×1km VO₂. All transitions happen on track.', frequency: '1× per week (Saturday)', benefit: 'Three disciplines in one 3h session. Race-specific transition practice. Neuromuscular specificity for bike-to-run switchover.' },
  { session: 'Tucson Shootout', athletes: ['Sanders', 'Sam Long'], detail: "America's fastest group ride, 2–3h, all out. Pro cyclists, elite triathletes. Sustained high-intensity group racing dynamics. Cannot replicate solo.", frequency: 'Weekly in winter block (6+ consecutive weeks)', benefit: 'Real competitive race-pace cycling in group. Develops bike power, race tactics, mental toughness in adversarial environment.' },
  { session: 'Monster Volume Ride (6–7h)', athletes: ['Ditlev', 'Laidlow'], detail: '6–7h long ride at Z1-Z2 pace. ~150–180km. Ditlev in Girona, Laidlow in Pyrenees. Builds aerobic base and fat oxidation for 4h+ iron-distance bike.', frequency: '1× per week (Wednesday)', benefit: 'Extreme aerobic base. Trains body to oxidise fat at race pace. Creates the engine that can maintain race power for full 180km.' },
  { session: 'Long Brick Big Day', athletes: ['Geens', 'Blummenfelt', 'Stornes'], detail: '90–105 min AM easy run + 4–4.5h PM bike = 6h combined leg load. Simulates race-day accumulated fatigue. Legs must work off pre-fatigued state.', frequency: '1× per week (Saturday)', benefit: 'Pre-fatigues legs before key bike/run work. Forces body to perform when glycogen-depleted and muscles fatigued. Race-specific stress.' },
  { session: 'Race-Course Bike Recon', athletes: ['Stornes', 'Blummenfelt', 'Iden', 'Von Berg'], detail: 'Full race-course bike at race pace with training partners. Stornes did on Marbella course; Von Berg does on Nice course year-round.', frequency: 'Once or twice pre-major race', benefit: 'Eliminates course uncertainty. Builds race-specific pacing confidence. Can identify exact where to push and where to conserve.' },
  { session: 'Altitude Block (3–4 weeks)', athletes: ['Blummenfelt', 'Stornes', 'Iden', 'Laidlow'], detail: 'Sierra Nevada (2,300m) or Pyrenees (1,800–2,400m). All sessions at altitude for 3–4 weeks. Full camp, not just a visit.', frequency: '1–2× per season pre-key races', benefit: 'Haematological adaptation — increased red blood cell mass, VO₂max ceiling elevation, improved oxygen delivery to muscles.' },
];

// ─────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────
function renderProBlueprint() {
  const container = document.getElementById('page-problueprintpage');
  if (!container) return;
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:24px 20px 0;';
  header.innerHTML = `
    <h2 style="font-size:1.5rem;font-weight:700;color:#1e293b;margin:0 0 4px;">🏆 Pro Blueprint</h2>
    <p style="color:#64748b;font-size:0.9rem;margin:0 0 16px;">${PRO_ATHLETES.length} athletes · 2025 verified race data · Training, nutrition &amp; recovery deep-dives</p>
  `;
  container.appendChild(header);

  // Filter bar
  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:8px;padding:0 20px 16px;flex-wrap:wrap;';
  const filterDefs = [
    { label: 'All Athletes', fn: () => true },
    { label: '⭐ World Champions', fn: a => a.tier.includes('World Champion') || a.tier.includes('Pro Series') },
    { label: '🇳🇴 Norway Group', fn: a => a.country === 'NOR' },
    { label: '🇺🇸 Americans', fn: a => a.country === 'USA' },
    { label: '✅ Confirmed Data', fn: a => a.dataQuality === 'CONFIRMED' },
  ];
  filterDefs.forEach((f, i) => {
    const btn = document.createElement('button');
    btn.textContent = f.label;
    btn.style.cssText = `padding:6px 14px;border-radius:20px;border:1.5px solid ${i===0?'#3b82f6':'#e2e8f0'};background:${i===0?'#3b82f6':'#fff'};color:${i===0?'#fff':'#475569'};font-size:0.8rem;cursor:pointer;font-weight:${i===0?'600':'400'};`;
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('button').forEach(b => { b.style.background='#fff'; b.style.color='#475569'; b.style.borderColor='#e2e8f0'; b.style.fontWeight='400'; });
      btn.style.background='#3b82f6'; btn.style.color='#fff'; btn.style.borderColor='#3b82f6'; btn.style.fontWeight='600';
      grid.querySelectorAll('[data-athlete-id]').forEach(card => {
        const a = PRO_ATHLETES.find(x => x.id === card.dataset.athleteId);
        card.style.display = (a && f.fn(a)) ? '' : 'none';
      });
    });
    filterBar.appendChild(btn);
  });
  container.appendChild(filterBar);

  // Stats banner
  const banner = document.createElement('div');
  banner.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 20px 20px;';
  const confirmed = PRO_ATHLETES.filter(a => a.dataQuality === 'CONFIRMED').length;
  const totalWins = PRO_ATHLETES.reduce((s, a) => s + a.wins2025.length, 0);
  [
    { n: PRO_ATHLETES.length, l: 'Athletes' },
    { n: confirmed, l: 'Confirmed' },
    { n: totalWins, l: '2025 Wins' },
    { n: 6, l: 'Nationalities' },
  ].forEach(s => {
    const d = document.createElement('div');
    d.style.cssText = 'background:#eff6ff;border-radius:10px;padding:10px;text-align:center;';
    d.innerHTML = `<div style="font-size:1.4rem;font-weight:700;color:#1d4ed8;">${s.n}</div><div style="font-size:0.75rem;color:#475569;">${s.l}</div>`;
    banner.appendChild(d);
  });
  container.appendChild(banner);

  // Athlete grid
  const grid = document.createElement('div');
  grid.id = 'pb-athlete-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:0 20px;';
  PRO_ATHLETES.forEach(a => grid.appendChild(buildAthleteCard(a)));
  container.appendChild(grid);

  // Session Matrix section
  const matSection = document.createElement('div');
  matSection.style.cssText = 'padding:28px 20px 16px;';
  matSection.innerHTML = `<h3 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin:0 0 4px;">🔑 Key Sessions Matrix</h3><p style="color:#64748b;font-size:0.82rem;margin:0 0 14px;">Cross-athlete session comparison — confirmed from sources</p>`;
  const matGrid = document.createElement('div');
  matGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;';
  SESSION_MATRIX.forEach(s => {
    const c = document.createElement('div');
    c.style.cssText = 'background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;';
    c.innerHTML = `
      <div style="font-weight:700;color:#1e293b;font-size:0.88rem;margin-bottom:4px;">${s.session}</div>
      <div style="color:#3b82f6;font-size:0.76rem;margin-bottom:6px;">Used by: ${s.athletes.join(' · ')}</div>
      <div style="color:#475569;font-size:0.8rem;line-height:1.45;margin-bottom:8px;">${s.detail}</div>
      <div style="background:#eff6ff;border-radius:8px;padding:8px;font-size:0.78rem;color:#1d4ed8;"><strong>Why it works:</strong> ${s.benefit}</div>
      <div style="margin-top:6px;"><span style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:0.72rem;">⏱ ${s.frequency}</span></div>
    `;
    matGrid.appendChild(c);
  });
  matSection.appendChild(matGrid);
  container.appendChild(matSection);

  // AI section
  const aiSection = document.createElement('div');
  aiSection.style.cssText = 'padding:16px 20px 40px;';
  aiSection.innerHTML = `
    <h3 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin:0 0 4px;">🤖 AI Pro Insights</h3>
    <p style="color:#64748b;font-size:0.82rem;margin:0 0 14px;">Ask Claude to analyse, compare, and apply pro training to your racing</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:14px;">
      ${[
        {icon:'🎯',label:'Athlete Match',p:'Which of these 14 pro athletes does my triathlon profile most closely resemble, and what are the top 3 things I can learn from their specific approach?'},
        {icon:'📋',label:'Build My Week',p:'Using the training patterns of the pro athletes above, design me a complete training week scaled to a 12-hour/week age-group triathlete preparing for a 70.3.'},
        {icon:'📊',label:'Volume Gap',p:'Analyse how a typical 12-hour/week age-group athlete\'s training volume compares to these pros, and where the most impactful gaps are.'},
        {icon:'🍌',label:'Race Nutrition',p:'Explain the race nutrition strategies used by Stornes (180g/hr), Sam Long (310g/hr on bike), and Geens in simple terms and how I can apply them to my next 70.3.'},
        {icon:'😴',label:'Recovery Plan',p:'Design a weekly recovery schedule using what these pros actually do: sleep hours, taper structure, rest day activities, and post-session protocols.'},
        {icon:'🔍',label:'Limiter Fix',p:'Based on the pro data above, help me understand which of the three disciplines is most likely to be my limiter and how pros attack that weakness.'},
      ].map(b => `
        <button onclick="runProBlueprintAI('${b.p.replace(/'/g,'\\\'')}')" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px 12px;cursor:pointer;text-align:left;transition:all 0.15s;">
          <div style="font-size:1.3rem;margin-bottom:5px;">${b.icon}</div>
          <div style="font-weight:600;color:#1e293b;font-size:0.82rem;">${b.label}</div>
        </button>
      `).join('')}
    </div>
    <div id="pb-ai-output" style="display:none;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div id="pb-ai-text" style="color:#1e293b;font-size:0.88rem;line-height:1.65;white-space:pre-wrap;"></div>
    </div>
  `;
  container.appendChild(aiSection);

  // Modal overlay
  if (!document.getElementById('pb-modal-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'pb-modal-overlay';
    ov.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:1000;overflow-y:auto;padding:20px;box-sizing:border-box;';
    ov.addEventListener('click', e => { if(e.target===ov) closePBModal(); });
    document.body.appendChild(ov);
  }
}

// ─────────────────────────────────────────────────────────────
// ATHLETE CARD
// ─────────────────────────────────────────────────────────────
function buildAthleteCard(a) {
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px;transition:all 0.2s;';
  card.dataset.athleteId = a.id;
  const badgeBg = a.dataQuality === 'CONFIRMED' ? '#f0fdf4' : '#fefce8';
  const badgeBorder = a.dataQuality === 'CONFIRMED' ? '#86efac' : '#fde047';
  const badgeLabel = a.dataQuality === 'CONFIRMED' ? '✅ Verified' : '⚠ Moderate';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div>
        <div style="font-size:1.5rem;">${a.flag}</div>
        <div style="font-weight:700;color:#1e293b;font-size:0.98rem;margin-top:2px;">${a.name}</div>
        <div style="color:#94a3b8;font-size:0.75rem;">${a.country} · Age ${a.age} · ${a.base}</div>
      </div>
      <span style="background:${badgeBg};border:1px solid ${badgeBorder};padding:2px 8px;border-radius:10px;font-size:0.7rem;color:#374151;white-space:nowrap;">${badgeLabel}</span>
    </div>
    <div style="font-size:0.76rem;color:#7c3aed;font-weight:600;margin-bottom:8px;">${a.tier}</div>
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
      <span style="background:#eff6ff;color:#1d4ed8;padding:3px 8px;border-radius:8px;font-size:0.73rem;">🏆 ${a.wins2025.length} win${a.wins2025.length!==1?'s':''}</span>
      <span style="background:#f5f3ff;color:#6d28d9;padding:3px 8px;border-radius:8px;font-size:0.73rem;">🎖 ${a.podiums2025.length} podiums</span>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:8px;margin-bottom:10px;font-size:0.78rem;color:#475569;line-height:1.5;">
      <strong>Peak week:</strong> ${a.keyStats.peakWeekHours || '—'}<br>
      <strong>Coach:</strong> ${a.coach}
    </div>
    <button onclick="openPBModal('${a.id}')" style="width:100%;background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:9px;font-size:0.84rem;font-weight:600;cursor:pointer;">View Full Blueprint →</button>
  `;
  card.addEventListener('mouseenter', () => { card.style.borderColor='#3b82f6'; card.style.transform='translateY(-2px)'; card.style.boxShadow='0 4px 16px rgba(59,130,246,0.15)'; });
  card.addEventListener('mouseleave', () => { card.style.borderColor='#e2e8f0'; card.style.transform=''; card.style.boxShadow=''; });
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
  modal.style.cssText = 'background:#fff;border-radius:16px;max-width:820px;margin:0 auto;overflow:hidden;';

  // Header
  const mh = document.createElement('div');
  mh.style.cssText = 'background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:20px 24px;';
  mh.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:2rem;">${a.flag}</div>
        <div style="font-size:1.35rem;font-weight:700;margin-top:4px;">${a.name}</div>
        <div style="opacity:0.85;font-size:0.82rem;margin-top:2px;">${a.tier} · ${a.base}</div>
      </div>
      <button onclick="closePBModal()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1.2rem;line-height:1;">×</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      ${a.wins2025.map(w=>`<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:10px;font-size:0.76rem;">🏆 ${w}</span>`).join('')}
      <span style="background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:10px;font-size:0.76rem;">Coach: ${a.coach}</span>
    </div>
  `;
  modal.appendChild(mh);

  // Tabs
  const TABS = ['Overview', 'Week Structure', 'Key Sessions', 'Nutrition & Recovery', 'Race Data', '🤖 AI'];
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;overflow-x:auto;border-bottom:1px solid #e2e8f0;background:#f8fafc;';
  const content = document.createElement('div');
  content.style.cssText = 'padding:20px 24px;max-height:62vh;overflow-y:auto;';

  TABS.forEach((t, i) => {
    const tb = document.createElement('button');
    tb.textContent = t;
    const active = () => { tb.style.background='#fff'; tb.style.color='#1d4ed8'; tb.style.fontWeight='700'; tb.style.borderBottom='2px solid #3b82f6'; };
    const inactive = () => { tb.style.background='transparent'; tb.style.color='#64748b'; tb.style.fontWeight='400'; tb.style.borderBottom='2px solid transparent'; };
    tb.style.cssText = `padding:11px 15px;border:none;cursor:pointer;font-size:0.8rem;white-space:nowrap;`;
    if (i===0) active(); else inactive();
    tb.addEventListener('click', () => { tabBar.querySelectorAll('button').forEach(inactive); active(); renderModalTab(content, a, t); });
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
    content.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
      ${Object.entries(a.keyStats).map(([k,v])=>`<div style="background:#f8fafc;border-radius:8px;padding:11px;"><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;">${k.replace(/([A-Z])/g,' $1').trim()}</div><div style="font-weight:600;color:#1e293b;font-size:0.86rem;line-height:1.4;">${v}</div></div>`).join('')}
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:12px;"><div style="font-weight:700;color:#15803d;margin-bottom:4px;">📚 Data Source</div><div style="font-size:0.84rem;color:#374151;">${a.source}</div></div>`;
  }

  else if (tab === 'Week Structure') {
    const days = [{k:'mon',l:'Monday'},{k:'tue',l:'Tuesday'},{k:'wed',l:'Wednesday'},{k:'thu',l:'Thursday'},{k:'fri',l:'Friday'},{k:'sat',l:'Saturday'},{k:'sun',l:'Sunday'}];
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p style="font-size:0.78rem;color:#64748b;margin:0 0 12px;">Typical training week — from ${a.source}</p>`;
    days.forEach(d => {
      const day = a.weekStructure[d.k];
      if (!day) return;
      const sessions = [day.swim?`🏊 ${day.swim}`:null, day.bike?`🚴 ${day.bike}`:null, day.run?`🏃 ${day.run}`:null].filter(Boolean);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;';
      row.innerHTML = `<div style="min-width:88px;font-weight:700;color:#1e293b;font-size:0.83rem;padding-top:3px;">${d.l}</div>
        <div style="flex:1;">${sessions.length?sessions.map(s=>`<div style="background:#f8fafc;border-radius:6px;padding:6px 10px;font-size:0.8rem;color:#334155;margin-bottom:4px;line-height:1.4;">${s}</div>`).join(''):'<div style="color:#94a3b8;font-size:0.8rem;padding:6px 10px;">Rest / Recovery only</div>'}</div>`;
      wrap.appendChild(row);
    });
    content.appendChild(wrap);
  }

  else if (tab === 'Key Sessions') {
    a.keySessions.forEach(s => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;';
      card.innerHTML = `<div style="font-weight:700;color:#1e293b;margin-bottom:6px;">🎯 ${s.name}</div>
        <div style="color:#475569;font-size:0.84rem;line-height:1.5;margin-bottom:10px;">${s.detail}</div>
        <button onclick="scaleSession('${a.id}','${encodeURIComponent(s.name)}','${encodeURIComponent(s.detail)}')" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;">⚡ Scale to My Fitness</button>`;
      content.appendChild(card);
    });
  }

  else if (tab === 'Nutrition & Recovery') {
    [['🍌 Nutrition', a.nutrition], ['😴 Recovery & Sleep', a.recovery], ['🧬 Physiology', a.physiology]].forEach(([label, data]) => {
      const block = document.createElement('div');
      block.style.cssText = 'margin-bottom:16px;';
      block.innerHTML = `<div style="font-weight:700;color:#1e293b;margin-bottom:8px;">${label}</div>`;
      Object.entries(data).forEach(([k,v]) => {
        block.innerHTML += `<div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:6px;"><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">${k.replace(/([A-Z])/g,' $1').trim()}</div><div style="color:#1e293b;font-size:0.83rem;line-height:1.5;">${v}</div></div>`;
      });
      content.appendChild(block);
    });
  }

  else if (tab === 'Race Data') {
    if (!a.raceData2025?.length) { content.innerHTML = '<p style="color:#64748b;">No confirmed 2025 race splits available.</p>'; return; }
    const t = document.createElement('table');
    t.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.8rem;';
    t.innerHTML = `<thead><tr style="background:#f1f5f9;">${['Race','Pos','Swim','Bike','Run','Total'].map(h=>`<th style="text-align:${h==='Race'?'left':'center'};padding:8px 10px;color:#475569;font-weight:600;">${h}</th>`).join('')}</tr></thead>
      <tbody>${a.raceData2025.map(r=>`<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 10px;font-weight:600;color:#1e293b;">${r.race}</td>
        <td style="padding:8px;text-align:center;font-weight:700;color:${r.pos===1?'#16a34a':r.pos===2?'#ea580c':r.pos===3?'#b45309':'#475569'};">${r.pos===1?'🥇':r.pos===2?'🥈':r.pos===3?'🥉':r.pos}</td>
        <td style="padding:8px;text-align:center;color:#475569;">${r.swim||'—'}</td>
        <td style="padding:8px;text-align:center;color:#475569;">${r.bike||'—'}</td>
        <td style="padding:8px;text-align:center;color:#475569;">${r.run||'—'}</td>
        <td style="padding:8px;text-align:center;font-weight:600;color:#1e293b;">${r.total||'—'}</td>
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
      ].map(b=>`<button onclick="runProBlueprintAI('${b.p.replace(/'/g,"\\'")}','${a.id}')" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;cursor:pointer;text-align:left;"><div style="font-size:1.1rem;">${b.icon}</div><div style="font-weight:600;color:#1e293b;font-size:0.8rem;margin-top:4px;">${b.label}</div></button>`).join('')}
    </div>
    <div id="pb-modal-ai-output" style="display:none;background:#f0fdf4;border-radius:10px;padding:14px;">
      <div id="pb-modal-ai-text" style="color:#1e293b;font-size:0.84rem;line-height:1.65;white-space:pre-wrap;"></div>
    </div>`;
    content.appendChild(wrap);
  }
}

// ─────────────────────────────────────────────────────────────
// AI FUNCTIONS
// ─────────────────────────────────────────────────────────────
async function runProBlueprintAI(prompt, athleteId) {
  const inModal = document.getElementById('pb-modal-overlay')?.style.display !== 'none';
  const outBox = inModal ? document.getElementById('pb-modal-ai-output') : document.getElementById('pb-ai-output');
  const outText = inModal ? document.getElementById('pb-modal-ai-text') : document.getElementById('pb-ai-text');
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
  const sessionName = decodeURIComponent(nameEnc);
  const sessionDetail = decodeURIComponent(detailEnc);
  const a = PRO_ATHLETES.find(x => x.id === athleteId);
  const prompt = `Scale this pro session from ${a?.name || 'a pro triathlete'} to an age-group athlete:\n\nSession: ${sessionName}\nDetail: ${sessionDetail}\n\nProvide:\n1. The scaled version for someone training 12h/week\n2. Specific targets: pace (assume ~4:50/km run threshold, ~240W bike threshold)\n3. The key purpose\n4. Common mistakes to avoid`;

  const outBox = document.getElementById('pb-modal-ai-output');
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
        system: 'You are TriCoach\'s session scaling AI. Take elite pro sessions and make them practical for age-group athletes. Be specific with numbers and pacing. Keep it concise and actionable.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    outText.textContent = data?.content?.map(c => c.text||'').join('') || 'No response.';
  } catch (err) {
    outText.textContent = `❌ Error: ${err.message}`;
  }
}
