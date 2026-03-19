import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { dbGet, dbSet, dbDelete } from './db.js'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DB_KEY = 'diet:v1'

const DEFAULT_RECIPES = [
  { id:1, name:'My Khichdi', icon:'🫕', items:[{food:'Khichdi (plain)',g:200},{food:'Ghee',g:5},{food:'Cooked Carrots',g:60}] },
  { id:2, name:'Dal Chawal', icon:'🍚', items:[{food:'White Rice (cooked)',g:180},{food:'Moong Dal (cooked)',g:150}] },
]
const DEFAULT_PLANNER = DAYS.map(d => ({ day:d, meals:{ Breakfast:[], Lunch:[], Dinner:[], Snack:[] } }))

const THEMES = {
  dark:  { bg:'#0a0e0d', surface:'#0d1f17', card:'#0d1a14', input:'#0a1a12', border:'#1a3028', text:'#e8f0ec', muted:'#5a8a70', sub:'#8ab89e', accent:'#3ecf8e', hdr:'linear-gradient(135deg,#0d1f17,#0a1a12)' },
  light: { bg:'#f0f7f3', surface:'#ffffff', card:'#f5faf7', input:'#edf7f2', border:'#c5ddd1', text:'#1a2e22', muted:'#4a8a65', sub:'#2d6e4a', accent:'#1a9e6a', hdr:'linear-gradient(135deg,#d0ede0,#e8f5ee)' },
}

const PRESETS = [
  { label:'1 roti',         food:'Roti (plain wheat)',   grams:40  },
  { label:'1 katori dal',   food:'Moong Dal (cooked)',   grams:150 },
  { label:'1 cup rice',     food:'White Rice (cooked)',  grams:180 },
  { label:'1 katori curd',  food:'Curd / Plain Yogurt',  grams:100 },
  { label:'2 idli',         food:'Idli (plain)',          grams:80  },
  { label:'1 bowl khichdi', food:'Khichdi (plain)',       grams:200 },
  { label:'1 banana',       food:'Banana',                grams:120 },
  { label:'1 egg',          food:'Eggs',                  grams:55  },
  { label:'1 tsp ghee',     food:'Ghee',                  grams:5   },
  { label:'1 cup poha',     food:'Poha',                  grams:160 },
]

const REINTRO = [
  { food:'Cooked Tomato',        day:1,  cat:'Vegetables' },
  { food:'Aloo (potato)',        day:4,  cat:'Indian'     },
  { food:'Toor Dal',             day:7,  cat:'Indian'     },
  { food:'Dosa (plain)',         day:10, cat:'Indian'     },
  { food:'Paneer',               day:13, cat:'Indian'     },
  { food:'Onion (cooked)',       day:16, cat:'Vegetables' },
  { food:'Garlic (small amt)',   day:19, cat:'Vegetables' },
  { food:'Broccoli',             day:22, cat:'Vegetables' },
  { food:'Cauliflower',          day:25, cat:'Vegetables' },
  { food:"Cow's Milk",           day:28, cat:'Dairy'      },
  { food:'Rajma (kidney beans)', day:31, cat:'Indian'     },
  { food:'Chhole (chickpeas)',   day:34, cat:'Indian'     },
  { food:'Wheat Bread',          day:37, cat:'Grains'     },
  { food:'Coffee',               day:40, cat:'Drinks'     },
  { food:'Mango',                day:43, cat:'Fruits'     },
  { food:'Apples',               day:46, cat:'Fruits'     },
]

const SUGGESTIONS = {
  Breakfast:[
    { name:'Khichdi Bowl', items:[{food:'Khichdi (plain)',g:200},{food:'Curd / Plain Yogurt',g:80}] },
    { name:'Idli Plate',   items:[{food:'Idli (plain)',g:120},{food:'Coconut Chutney',g:40}] },
    { name:'Oat Bowl',     items:[{food:'Oats (plain)',g:80},{food:'Banana',g:120}] },
    { name:'Poha',         items:[{food:'Poha',g:160}] },
  ],
  Lunch:[
    { name:'Dal Rice',     items:[{food:'White Rice (cooked)',g:180},{food:'Moong Dal (cooked)',g:150}] },
    { name:'Chicken Rice', items:[{food:'Chicken (grilled)',g:150},{food:'White Rice (cooked)',g:180}] },
    { name:'Roti Dal',     items:[{food:'Roti (plain wheat)',g:80},{food:'Moong Dal (cooked)',g:150}] },
  ],
  Dinner:[
    { name:'Salmon Upma',   items:[{food:'Salmon',g:150},{food:'Upma (plain suji)',g:180}] },
    { name:'Khichdi Light', items:[{food:'Khichdi (plain)',g:200},{food:'Buttermilk (chaas)',g:150}] },
    { name:'Chicken Veg',   items:[{food:'Chicken (grilled)',g:120},{food:'Spinach (cooked)',g:100}] },
  ],
  Snack:[
    { name:'Fruit Chai', items:[{food:'Banana',g:120},{food:'Herbal Tea',g:200}] },
    { name:'Berry Cup',  items:[{food:'Blueberries',g:100},{food:'Curd / Plain Yogurt',g:80}] },
    { name:'Chaas',      items:[{food:'Buttermilk (chaas)',g:200}] },
  ],
}

const INITIAL_FOODS = [
  {id:1,  name:'White Rice (cooked)',    cat:'Grains',     phase:'safe',     icon:'🍚', cal:130, note:'Easily digestible, low fiber'},
  {id:2,  name:'Oats (plain)',           cat:'Grains',     phase:'safe',     icon:'🌾', cal:389, note:'Gluten-free if certified'},
  {id:3,  name:'Banana',               cat:'Fruits',     phase:'safe',     icon:'🍌', cal:89,  note:'Low FODMAP, binding'},
  {id:4,  name:'Blueberries',          cat:'Fruits',     phase:'safe',     icon:'🫐', cal:57,  note:'Low FODMAP, antioxidant'},
  {id:5,  name:'Cooked Carrots',       cat:'Vegetables', phase:'safe',     icon:'🥕', cal:35,  note:'Easy on digestion'},
  {id:6,  name:'Zucchini',             cat:'Vegetables', phase:'safe',     icon:'🥒', cal:17,  note:'Low fiber, gentle'},
  {id:7,  name:'Spinach (cooked)',     cat:'Vegetables', phase:'safe',     icon:'🥬', cal:23,  note:'Cooked better than raw'},
  {id:8,  name:'Chicken (grilled)',    cat:'Proteins',   phase:'safe',     icon:'🍗', cal:165, note:'Lean, easy to digest'},
  {id:9,  name:'Salmon',              cat:'Proteins',   phase:'safe',     icon:'🐟', cal:208, note:'Anti-inflammatory omega-3s'},
  {id:10, name:'Eggs',                cat:'Proteins',   phase:'safe',     icon:'🥚', cal:155, note:'Test first – common allergen'},
  {id:11, name:'Olive Oil',           cat:'Fats',       phase:'safe',     icon:'🫙', cal:884, note:'Anti-inflammatory'},
  {id:12, name:'Coconut Oil',         cat:'Fats',       phase:'safe',     icon:'🥥', cal:862, note:'Medium-chain fats'},
  {id:13, name:'Herbal Tea',          cat:'Drinks',     phase:'safe',     icon:'🫖', cal:1,   note:'Chamomile, ginger good'},
  {id:14, name:'Water',              cat:'Drinks',     phase:'safe',     icon:'💧', cal:0,   note:'Plain, filtered'},
  {id:40, name:'Khichdi (plain)',     cat:'Indian',     phase:'safe',     icon:'🫕', cal:110, note:'Rice+moong dal – gut-friendly'},
  {id:41, name:'Moong Dal (cooked)', cat:'Indian',     phase:'safe',     icon:'🫘', cal:105, note:'Easiest lentil to digest'},
  {id:42, name:'Poha',              cat:'Indian',     phase:'safe',     icon:'🍽', cal:130, note:'Flattened rice – light & easy'},
  {id:43, name:'Idli (plain)',       cat:'Indian',     phase:'safe',     icon:'🫓', cal:58,  note:'Steamed, fermented – probiotic'},
  {id:44, name:'Roti (plain wheat)', cat:'Indian',     phase:'safe',     icon:'🫓', cal:300, note:'Moderate portion, no butter'},
  {id:45, name:'Ghee',              cat:'Indian',     phase:'safe',     icon:'🧈', cal:900, note:'Small amounts aid digestion'},
  {id:46, name:'Turmeric',          cat:'Indian',     phase:'safe',     icon:'🌿', cal:312, note:'Anti-inflammatory'},
  {id:47, name:'Ginger (fresh)',     cat:'Indian',     phase:'safe',     icon:'🫚', cal:80,  note:'Reduces nausea & bloating'},
  {id:48, name:'Cumin (jeera)',      cat:'Indian',     phase:'safe',     icon:'🌿', cal:375, note:'Digestive spice'},
  {id:49, name:'Coriander leaves',   cat:'Indian',     phase:'safe',     icon:'🌿', cal:23,  note:'Fresh herb, well tolerated'},
  {id:50, name:'Curd / Plain Yogurt',cat:'Indian',     phase:'safe',     icon:'🥛', cal:61,  note:'Probiotic – test lactose'},
  {id:51, name:'Sabudana (cooked)', cat:'Indian',     phase:'safe',     icon:'🫙', cal:175, note:'Tapioca pearls – easy on gut'},
  {id:52, name:'Upma (plain suji)', cat:'Indian',     phase:'safe',     icon:'🍽', cal:145, note:'Semolina – mild, easy'},
  {id:66, name:'Daliya (broken wheat)',cat:'Indian',  phase:'safe',     icon:'🌾', cal:342, note:'High fiber – go slow'},
  {id:67, name:'Coconut Chutney',   cat:'Indian',     phase:'safe',     icon:'🥥', cal:160, note:'Fresh coconut – easy to digest'},
  {id:68, name:'Buttermilk (chaas)',cat:'Indian',     phase:'safe',     icon:'🥛', cal:40,  note:'Diluted curd – probiotic'},
  {id:69, name:'Besan Cheela',      cat:'Indian',     phase:'safe',     icon:'🫓', cal:180, note:'Chickpea flour pancake'},
  {id:70, name:'Methi (fenugreek)', cat:'Indian',     phase:'safe',     icon:'🌿', cal:49,  note:'Digestive, reduces gas'},
  {id:15, name:'Broccoli',          cat:'Vegetables', phase:'test',     icon:'🥦', cal:34,  note:'High FODMAP – slow intro'},
  {id:16, name:'Cauliflower',       cat:'Vegetables', phase:'test',     icon:'🥦', cal:25,  note:'Gassy for many people'},
  {id:17, name:'Onion',            cat:'Vegetables', phase:'test',     icon:'🧅', cal:40,  note:'High fructans – common trigger'},
  {id:18, name:'Garlic',           cat:'Vegetables', phase:'test',     icon:'🧄', cal:149, note:'Fructans, strong trigger'},
  {id:19, name:'Wheat Bread',       cat:'Grains',     phase:'test',     icon:'🍞', cal:265, note:'Gluten + fructans'},
  {id:20, name:'Lentils (masoor dal)',cat:'Proteins', phase:'test',     icon:'🫘', cal:116, note:'High fiber, may cause gas'},
  {id:21, name:"Cow's Milk",        cat:'Dairy',      phase:'test',     icon:'🥛', cal:61,  note:'Lactose – major trigger'},
  {id:22, name:'Cheese',           cat:'Dairy',      phase:'test',     icon:'🧀', cal:402, note:'Aged cheese lower lactose'},
  {id:23, name:'Apples',           cat:'Fruits',     phase:'test',     icon:'🍎', cal:52,  note:'High fructose & sorbitol'},
  {id:24, name:'Mango',            cat:'Fruits',     phase:'test',     icon:'🥭', cal:60,  note:'High FODMAP in large amounts'},
  {id:25, name:'Coffee',           cat:'Drinks',     phase:'test',     icon:'☕', cal:2,   note:'Stimulates gut motility'},
  {id:26, name:'Beer / Alcohol',    cat:'Drinks',     phase:'test',     icon:'🍺', cal:43,  note:'Fermented – common trigger'},
  {id:53, name:'Rajma (kidney beans)',cat:'Indian',   phase:'test',     icon:'🫘', cal:127, note:'High FODMAP – test carefully'},
  {id:54, name:'Chhole (chickpeas)', cat:'Indian',    phase:'test',     icon:'🫘', cal:164, note:'Oligosaccharides – gas trigger'},
  {id:55, name:'Paneer',            cat:'Indian',     phase:'test',     icon:'🧀', cal:265, note:'High fat dairy – test lactose'},
  {id:56, name:'Lassi (plain)',      cat:'Indian',     phase:'test',     icon:'🥛', cal:70,  note:'Dairy-based – test with care'},
  {id:57, name:'Dosa (plain)',       cat:'Indian',     phase:'test',     icon:'🫓', cal:133, note:'Fermented rice-lentil'},
  {id:58, name:'Aloo (potato)',      cat:'Indian',     phase:'test',     icon:'🥔', cal:77,  note:'Nightshade – test if sensitive'},
  {id:59, name:'Tomato',            cat:'Indian',     phase:'test',     icon:'🍅', cal:18,  note:'Nightshade + acidic'},
  {id:60, name:'Toor Dal (cooked)', cat:'Indian',     phase:'test',     icon:'🫘', cal:115, note:'Higher FODMAP than moong dal'},
  {id:71, name:'Urad Dal (cooked)', cat:'Indian',     phase:'test',     icon:'🫘', cal:120, note:'Used in idli/dosa – test'},
  {id:72, name:'Peas (matar)',       cat:'Indian',     phase:'test',     icon:'🫛', cal:81,  note:'Moderate FODMAP'},
  {id:73, name:'Capsicum (shimla)',  cat:'Indian',     phase:'test',     icon:'🫑', cal:31,  note:'Nightshade – may trigger'},
  {id:27, name:'Beans / Legumes',   cat:'Proteins',   phase:'rejected', icon:'🫘', cal:131, note:'Oligosaccharides ferment'},
  {id:28, name:'Cabbage (raw)',      cat:'Vegetables', phase:'rejected', icon:'🥬', cal:25,  note:'Sulfur compounds → gas'},
  {id:29, name:'Carbonated Drinks', cat:'Drinks',     phase:'rejected', icon:'🥤', cal:41,  note:'CO₂ = instant bloating'},
  {id:30, name:'Artificial Sweeteners',cat:'Other',   phase:'rejected', icon:'🍬', cal:0,   note:'Sorbitol, xylitol – osmotic'},
  {id:31, name:'Fried Foods',        cat:'Other',      phase:'rejected', icon:'🍟', cal:312, note:'Slow gastric emptying'},
  {id:32, name:'Chewing Gum',        cat:'Other',      phase:'rejected', icon:'🫧', cal:11,  note:'Swallowed air + sweeteners'},
  {id:61, name:'Puri / Bhatura',     cat:'Indian',     phase:'rejected', icon:'🫓', cal:340, note:'Deep fried – slows digestion'},
  {id:62, name:'Samosa',            cat:'Indian',     phase:'rejected', icon:'🥟', cal:262, note:'Fried + maida + heavy filling'},
  {id:63, name:'Pakora / Bhajiya',  cat:'Indian',     phase:'rejected', icon:'🍤', cal:290, note:'Fried besan – gas + bloat'},
  {id:64, name:'Pav Bhaji',         cat:'Indian',     phase:'rejected', icon:'🍞', cal:175, note:'Butter + mixed veg – heavy'},
  {id:65, name:'Biryani (rich)',     cat:'Indian',     phase:'rejected', icon:'🍛', cal:186, note:'Spicy, oily, mixed triggers'},
  {id:74, name:'Chole Bhature',     cat:'Indian',     phase:'rejected', icon:'🥟', cal:290, note:'Fried bread + heavy legumes'},
  {id:75, name:'Butter Chicken',    cat:'Indian',     phase:'rejected', icon:'🍛', cal:170, note:'Heavy cream + spices'},
  {id:76, name:'Aloo Paratha (fried)',cat:'Indian',   phase:'rejected', icon:'🫓', cal:258, note:'Oil-heavy + nightshade'},
]

const CATS = ['All','Grains','Fruits','Vegetables','Proteins','Dairy','Fats','Drinks','Indian','Other']

const PC_DARK = {
  safe:     {label:'✅ Safe',    bg:'#0d2b1f', border:'#3ecf8e', text:'#3ecf8e', badge:'#3ecf8e22'},
  test:     {label:'🧪 Testing',bg:'#2b1e0d', border:'#f6a623', text:'#f6a623', badge:'#f6a62322'},
  rejected: {label:'❌ Rejected',bg:'#2b0d0d', border:'#e05d5d', text:'#e05d5d', badge:'#e05d5d22'},
}
const PC_LIGHT = {
  safe:     {label:'✅ Safe',    bg:'#e8f9f1', border:'#1a9e6a', text:'#1a7a50', badge:'#1a9e6a22'},
  test:     {label:'🧪 Testing',bg:'#fff8ec', border:'#d48a00', text:'#9a6300', badge:'#f6a62322'},
  rejected: {label:'❌ Rejected',bg:'#fff0f0', border:'#c04040', text:'#8b2020', badge:'#e05d5d22'},
}

function buildDefaultStore() {
  return {
    onboarded:false, userName:'', theme:'dark',
    maxCals:1800, macroGoal:{protein:25,carbs:50,fat:25},
    foods:INITIAL_FOODS, customFoods:[],
    symptomLog:[], journal:[], counterItems:[],
    recipes:DEFAULT_RECIPES, plannerDays:DEFAULT_PLANNER,
    reintroStart:null, reintroChecked:{}, reintroResults:{},
    waterGlasses:0,
  }
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [d, setD] = useState({ name:'', goal:'gut_healing', activity:'moderate', sex:'female', age:30, weight:65, height:165 })
  const goals = [
    {k:'weight_loss',label:'Weight Loss',  icon:'⚖️', m:0.85},
    {k:'maintenance',label:'Maintenance',  icon:'🎯', m:1.0 },
    {k:'gut_healing',label:'Gut Healing',  icon:'🫁', m:0.9 },
    {k:'muscle_gain',label:'Muscle Gain',  icon:'💪', m:1.15},
  ]
  const acts = [
    {k:'sedentary',label:'Sedentary',        f:1.2  },
    {k:'light',    label:'Lightly Active',   f:1.375},
    {k:'moderate', label:'Moderately Active',f:1.55 },
    {k:'active',   label:'Very Active',      f:1.725},
  ]
  const tdee = () => {
    const bmr = d.sex==='male' ? 10*d.weight+6.25*d.height-5*d.age+5 : 10*d.weight+6.25*d.height-5*d.age-161
    return Math.round(bmr * (acts.find(a=>a.k===d.activity)?.f||1.55) * (goals.find(g=>g.k===d.goal)?.m||1))
  }
  const inp = (ex={}) => ({ width:'100%', background:'#0a1a12', border:'1px solid #1a3028', borderRadius:7, padding:'9px 12px', color:'#e8f0ec', fontFamily:'Georgia,serif', fontSize:13, outline:'none', ...ex })
  const steps = ['Welcome 👋','Goal 🎯','Details 📊','Activity 🏃']
  return (
    <div style={{ minHeight:'100vh', background:'#0a0e0d', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#0d1f17', border:'1px solid #1a3028', borderRadius:16, padding:28, maxWidth:440, width:'100%' }}>
        <div style={{ display:'flex', gap:5, marginBottom:20 }}>
          {steps.map((_,x)=><div key={x} style={{ flex:1, height:3, borderRadius:2, background:x<=step?'#3ecf8e':'#1a3028' }}/>)}
        </div>
        <div style={{ fontSize:9, color:'#3ecf8e', letterSpacing:4, textTransform:'uppercase', marginBottom:4 }}>Step {step+1}/{steps.length}</div>
        <h2 style={{ color:'#e8f0ec', fontSize:20, fontWeight:700, margin:'0 0 16px' }}>{steps[step]}</h2>

        {step===0 && (
          <div>
            <label style={{ fontSize:9, color:'#5a8a70', display:'block', marginBottom:4, letterSpacing:2 }}>YOUR NAME (optional)</label>
            <input value={d.name} onChange={e=>setD(x=>({...x,name:e.target.value}))} placeholder='e.g. Priya' style={inp()}/>
            <div style={{ marginTop:16, padding:12, background:'#0a1a12', borderRadius:9, border:'1px solid #1a3028' }}>
              {['Personalised calorie & macro targets','80+ Indian & global foods tracked','Symptom-food correlation analysis','7-day meal planner with suggestions','Reintroduction schedule with timers','Data saved offline on your iPhone'].map((f,x)=>(
                <div key={x} style={{ fontSize:11, color:'#8ab89e', marginBottom:3 }}>✓ {f}</div>
              ))}
            </div>
          </div>
        )}
        {step===1 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {goals.map(g=>(
              <div key={g.k} onClick={()=>setD(x=>({...x,goal:g.k}))} style={{ background:d.goal===g.k?'#0d2b1f':'#0a1a12', border:`2px solid ${d.goal===g.k?'#3ecf8e':'#1a3028'}`, borderRadius:10, padding:14, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{g.icon}</div>
                <div style={{ color:'#e8f0ec', fontSize:12, fontWeight:700 }}>{g.label}</div>
              </div>
            ))}
          </div>
        )}
        {step===2 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[{label:'AGE',k:'age'},{label:'WEIGHT (kg)',k:'weight'},{label:'HEIGHT (cm)',k:'height'}].map(f=>(
              <div key={f.k}>
                <label style={{ fontSize:9, color:'#5a8a70', display:'block', marginBottom:3, letterSpacing:2 }}>{f.label}</label>
                <input type='number' value={d[f.k]} onChange={e=>setD(x=>({...x,[f.k]:+e.target.value}))} style={inp()}/>
              </div>
            ))}
            <div>
              <label style={{ fontSize:9, color:'#5a8a70', display:'block', marginBottom:3, letterSpacing:2 }}>SEX</label>
              <div style={{ display:'flex', gap:6 }}>
                {['female','male'].map(s=>(
                  <button key={s} onClick={()=>setD(x=>({...x,sex:s}))} style={{ flex:1, background:d.sex===s?'#3ecf8e':'#0a1a12', color:d.sex===s?'#0a0e0d':'#5a8a70', border:'1px solid #1a3028', borderRadius:7, padding:'9px 0', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:12, textTransform:'capitalize' }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step===3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {acts.map(a=>(
              <div key={a.k} onClick={()=>setD(x=>({...x,activity:a.k}))} style={{ background:d.activity===a.k?'#0d2b1f':'#0a1a12', border:`2px solid ${d.activity===a.k?'#3ecf8e':'#1a3028'}`, borderRadius:9, padding:'10px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#e8f0ec', fontSize:13 }}>{a.label}</span>
                {d.activity===a.k && <span style={{ color:'#3ecf8e' }}>✓</span>}
              </div>
            ))}
            <div style={{ background:'#0a1a12', borderRadius:9, padding:12, border:'1px solid #1a3028', marginTop:4 }}>
              <div style={{ fontSize:10, color:'#5a8a70', marginBottom:3 }}>Your estimated daily target</div>
              <div style={{ fontSize:26, fontWeight:700, color:'#3ecf8e' }}>{tdee()} <span style={{ fontSize:12, color:'#5a8a70' }}>kcal/day</span></div>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          {step>0 && <button onClick={()=>setStep(s=>s-1)} style={{ flex:1, background:'#0a1a12', border:'1px solid #1a3028', borderRadius:9, padding:'11px 0', color:'#8ab89e', fontFamily:'Georgia,serif', fontSize:13, cursor:'pointer' }}>← Back</button>}
          <button onClick={()=>{ if(step<3) setStep(s=>s+1); else onDone({...d,maxCals:tdee()}) }} style={{ flex:2, background:'#3ecf8e', border:'none', borderRadius:9, padding:'11px 0', color:'#0a0e0d', fontFamily:'Georgia,serif', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            {step<3?'Continue →':'Start Tracking 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── All hooks unconditionally at top ──────────────────────────────────────
  const [store,   setStoreRaw] = useState(null)
  const [loaded,  setLoaded]   = useState(false)
  const [savedMsg,setSavedMsg] = useState(false)

  const [activeTab,     setActiveTab]     = useState('tracker')
  const [filterCat,     setFilterCat]     = useState('All')
  const [filterPhase,   setFilterPhase]   = useState('all')
  const [trackerSearch, setTrackerSearch] = useState('')
  const [symptomForm,   setSymptomForm]   = useState({ food:'', symptoms:'', severity:'mild', date:new Date().toISOString().split('T')[0] })
  const [journalText,   setJournalText]   = useState('')
  const [journalMood,   setJournalMood]   = useState('😊')
  const [journalEnergy, setJournalEnergy] = useState(3)
  const [cSearch,       setCSearch]       = useState('')
  const [cWeight,       setCWeight]       = useState(100)
  const [cSelected,     setCSelected]     = useState(null)
  const [showCustForm,  setShowCustForm]  = useState(false)
  const [custForm,      setCustForm]      = useState({ name:'', cal:'', icon:'🍽', cat:'Other', note:'', phase:'safe' })
  const [showRecForm,   setShowRecForm]   = useState(false)
  const [recForm,       setRecForm]       = useState({ name:'', icon:'🍽', items:[] })
  const [recSearch,     setRecSearch]     = useState('')
  const [recItemSel,    setRecItemSel]    = useState(null)
  const [recItemG,      setRecItemG]      = useState(100)
  const [planSearch,    setPlanSearch]    = useState('')
  const [planWeight,    setPlanWeight]    = useState(100)
  const [planSel,       setPlanSel]       = useState(null)
  const [planDay,       setPlanDay]       = useState('Monday')
  const [planMeal,      setPlanMeal]      = useState('Breakfast')
  const [now,           setNow]           = useState(Date.now())

  const saveTimer  = useRef(null)
  const firstSave  = useRef(false)
  const savedTimer = useRef(null)

  // ── Load from IndexedDB on mount ──────────────────────────────────────────
  useEffect(() => {
    dbGet(DB_KEY).then(saved => {
      setStoreRaw(saved ? JSON.parse(saved) : buildDefaultStore())
      setLoaded(true)
    }).catch(() => {
      setStoreRaw(buildDefaultStore())
      setLoaded(true)
    })
  }, [])

  // ── Save to IndexedDB whenever store changes (debounced 600ms) ────────────
  useEffect(() => {
    if (!store || !firstSave.current) { firstSave.current = true; return }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await dbSet(DB_KEY, JSON.stringify(store))
        setSavedMsg(true)
        clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSavedMsg(false), 1500)
      } catch(e) { console.warn('Save failed', e) }
    }, 600)
    return () => clearTimeout(saveTimer.current)
  }, [store])

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  // ── Derived state (all useMemo — no hooks after this block) ───────────────
  const foods          = useMemo(() => store?.foods          ?? INITIAL_FOODS,   [store])
  const customFoods    = useMemo(() => store?.customFoods    ?? [],              [store])
  const symptomLog     = useMemo(() => store?.symptomLog     ?? [],              [store])
  const journalEntries = useMemo(() => store?.journal        ?? [],              [store])
  const counterItems   = useMemo(() => store?.counterItems   ?? [],              [store])
  const recipes        = useMemo(() => store?.recipes        ?? DEFAULT_RECIPES, [store])
  const plannerDays    = useMemo(() => store?.plannerDays    ?? DEFAULT_PLANNER, [store])
  const reintroStart   = useMemo(() => store?.reintroStart   ?? null,            [store])
  const reintroResults = useMemo(() => store?.reintroResults ?? {},              [store])
  const maxCals        = useMemo(() => store?.maxCals        ?? 1800,            [store])
  const macroGoal      = useMemo(() => store?.macroGoal      ?? {protein:25,carbs:50,fat:25}, [store])
  const userName       = useMemo(() => store?.userName       ?? '',              [store])
  const theme          = useMemo(() => store?.theme          ?? 'dark',          [store])
  const onboarded      = useMemo(() => store?.onboarded      ?? false,           [store])
  const waterGlasses   = useMemo(() => store?.waterGlasses   ?? 0,              [store])

  const allFoods   = useMemo(() => [...foods, ...customFoods], [foods, customFoods])
  const calDB      = useMemo(() => allFoods.map(f=>({id:f.id,name:f.name,icon:f.icon,cal:f.cal,phase:f.phase,cat:f.cat})), [allFoods])
  const T          = useMemo(() => THEMES[theme]||THEMES.dark, [theme])
  const PC         = useMemo(() => theme==='dark'?PC_DARK:PC_LIGHT, [theme])
  const filtered   = useMemo(() => allFoods.filter(f=>(filterCat==='All'||f.cat===filterCat)&&(filterPhase==='all'||f.phase===filterPhase)&&(trackerSearch===''||f.name.toLowerCase().includes(trackerSearch.toLowerCase()))), [allFoods,filterCat,filterPhase,trackerSearch])
  const counts     = useMemo(() => ({safe:allFoods.filter(f=>f.phase==='safe').length,test:allFoods.filter(f=>f.phase==='test').length,rejected:allFoods.filter(f=>f.phase==='rejected').length}), [allFoods])
  const totalCals  = useMemo(() => counterItems.reduce((s,i)=>s+i.cals,0), [counterItems])
  const dayTotals  = useMemo(() => plannerDays.map(d=>({day:d.day,total:Object.values(d.meals).flat().reduce((s,e)=>s+e.cals,0)})), [plannerDays])
  const weekChart  = useMemo(() => dayTotals.map(d=>({...d,pct:Math.min(100,Math.round(d.total/maxCals*100))})), [dayTotals,maxCals])
  const triggers   = useMemo(() => { const m={}; symptomLog.forEach(e=>{ const k=e.food.trim().toLowerCase(); if(!m[k])m[k]={food:e.food,count:0,sev:0}; m[k].count++; if(e.severity==='severe')m[k].sev++ }); return Object.values(m).sort((a,b)=>b.count-a.count).slice(0,5) }, [symptomLog])
  const shopping   = useMemo(() => { const it={}; plannerDays.forEach(d=>Object.values(d.meals).flat().forEach(e=>{ if(!it[e.name])it[e.name]={name:e.name,icon:e.icon,g:0}; it[e.name].g+=e.weight })); return Object.values(it).sort((a,b)=>a.name.localeCompare(b.name)) }, [plannerDays])
  const selDayData  = useMemo(() => plannerDays.find(d=>d.day===planDay), [plannerDays,planDay])
  const selDayTotal = useMemo(() => dayTotals.find(d=>d.day===planDay)?.total||0, [dayTotals,planDay])
  const filtCDB    = useMemo(() => cSearch.length>=2?calDB.filter(f=>f.name.toLowerCase().includes(cSearch.toLowerCase())):[], [calDB,cSearch])
  const filtPDB    = useMemo(() => planSearch.length>=2?calDB.filter(f=>f.name.toLowerCase().includes(planSearch.toLowerCase())):[], [calDB,planSearch])
  const filtRDB    = useMemo(() => recSearch.length>=2?calDB.filter(f=>f.name.toLowerCase().includes(recSearch.toLowerCase())):[], [calDB,recSearch])
  const calPct     = useMemo(() => Math.min(100,Math.round(totalCals/maxCals*100)), [totalCals,maxCals])
  const calColor   = calPct>95?'#e05d5d':calPct>80?'#f6a623':'#3ecf8e'

  // ══ NO MORE HOOKS BELOW ══

  const upd = useCallback((patch) => {
    setStoreRaw(prev => ({...prev,...(typeof patch==='function'?patch(prev):patch)}))
  }, [])

  const inp = (ex={}) => ({ background:T.input, border:`1px solid ${T.border}`, borderRadius:6, padding:'8px 10px', color:T.text, fontFamily:'Georgia,serif', fontSize:13, boxSizing:'border-box', width:'100%', outline:'none', ...ex })
  const btn = (on,ex={}) => ({ background:on?T.accent:T.input, color:on?(theme==='dark'?'#0a0e0d':'#fff'):T.muted, border:`1px solid ${on?T.accent:T.border}`, borderRadius:7, padding:'7px 13px', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:12, ...ex })

  const calsFor = (name,g) => { const f=calDB.find(x=>x.name===name); return f?Math.round(f.cal*g/100):0 }

  const addToCounter = (fId,g,label) => {
    const f=calDB.find(x=>x.id===fId); if(!f) return
    const w=parseFloat(g)||100
    upd(s=>({counterItems:[...(s.counterItems??[]),{id:Date.now(),name:label||f.name,icon:f.icon,weight:w,cals:Math.round(f.cal*w/100),phase:f.phase}]}))
  }

  const addToPlanner = () => {
    if(!planSel) return
    const f=calDB.find(x=>x.id===planSel); if(!f) return
    const w=parseFloat(planWeight)||100
    const entry={id:Date.now(),name:f.name,icon:f.icon,weight:w,cals:Math.round(f.cal*w/100),phase:f.phase}
    upd(s=>({plannerDays:(s.plannerDays??DEFAULT_PLANNER).map(d=>d.day===planDay?{...d,meals:{...d.meals,[planMeal]:[...d.meals[planMeal],entry]}}:d)}))
    setPlanSel(null); setPlanWeight(100); setPlanSearch('')
  }

  const addSuggestion = (sug,meal) => {
    sug.items.forEach(item => {
      const f=calDB.find(x=>x.name===item.food); if(!f) return
      const entry={id:Date.now()+Math.random(),name:f.name,icon:f.icon,weight:item.g,cals:Math.round(f.cal*item.g/100),phase:f.phase}
      upd(s=>({plannerDays:(s.plannerDays??DEFAULT_PLANNER).map(d=>d.day===planDay?{...d,meals:{...d.meals,[meal]:[...d.meals[meal],entry]}}:d)}))
    })
  }

  const removeFromPlanner = (day,meal,id) => upd(s=>({plannerDays:(s.plannerDays??DEFAULT_PLANNER).map(d=>d.day===day?{...d,meals:{...d.meals,[meal]:d.meals[meal].filter(e=>e.id!==id)}}:d)}))

  const getReintroStatus = (item) => {
    if(!reintroStart) return 'pending'
    const target=new Date(reintroStart).getTime()+(item.day-1)*86400000
    if(now<target) return 'upcoming'
    if(reintroResults[item.food]==='safe') return 'safe'
    if(reintroResults[item.food]==='rejected') return 'rejected'
    return 'ready'
  }
  const msUntil = (item) => {
    if(!reintroStart) return null
    const diff=new Date(reintroStart).getTime()+(item.day-1)*86400000-now
    if(diff<=0) return null
    const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000)
    return d>0?`${d}d ${h}h`:`${h}h`
  }

  const recTotal = (rec) => rec.items.reduce((s,it)=>s+calsFor(it.food,it.g),0)

  const handleOnboard = (data) => {
    const macro = data.goal==='muscle_gain'?{protein:30,carbs:45,fat:25}:data.goal==='weight_loss'?{protein:30,carbs:40,fat:30}:{protein:25,carbs:50,fat:25}
    upd({onboarded:true,userName:data.name||'',maxCals:data.maxCals||1800,macroGoal:macro})
  }

  const resetAll = async () => {
    if(!window.confirm('Reset ALL data? This cannot be undone.')) return
    try { await dbDelete(DB_KEY) } catch(_) {}
    window.location.reload()
  }

  const dlCSV = (rows,name) => { const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')); a.download=name; a.click() }
  const dlTxt = (txt,name) => { const a=document.createElement('a'); a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(txt); a.download=name; a.click() }

  // ══ Conditional returns — safe, all hooks already ran ══
  if (!loaded) return (
    <div style={{ minHeight:'100vh', background:'#0a0e0d', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <div style={{ fontSize:40 }}>🫕</div>
      <div style={{ color:'#3ecf8e', fontSize:13, letterSpacing:3 }}>Loading your data…</div>
      <div style={{ width:100, height:3, background:'#1a3028', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:'50%', height:'100%', background:'#3ecf8e', borderRadius:2, animation:'pulse 1.2s ease-in-out infinite alternate' }}/>
      </div>
      <style>{`@keyframes pulse{from{transform:translateX(-80px)}to{transform:translateX(100px)}}`}</style>
    </div>
  )

  if (!onboarded) return <Onboarding onDone={handleOnboard}/>

  const TABS = [
    {id:'tracker', label:'🗂 Foods'},
    {id:'counter', label:'🔥 Calories'},
    {id:'planner', label:'📅 Planner'},
    {id:'reintro', label:'🧪 Reintro'},
    {id:'insights',label:'📊 Insights'},
    {id:'recipes', label:'👨‍🍳 Recipes'},
    {id:'symptoms',label:'📋 Symptoms'},
    {id:'journal', label:'📓 Journal'},
    {id:'shopping',label:'🛒 Shopping'},
    {id:'guide',   label:'📖 Guide'},
  ]

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text, fontFamily:"Georgia,'Times New Roman',serif", paddingBottom:60 }}>

      {/* HEADER */}
      <div style={{ background:T.hdr, borderBottom:`1px solid ${T.border}`, padding:'16px 14px 12px' }}>
        <div style={{ maxWidth:980, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:5, color:T.accent, textTransform:'uppercase', marginBottom:2 }}>Gut Health · Indian Edition</div>
            <h1 style={{ fontSize:'clamp(16px,3.5vw,28px)', fontWeight:700, color:T.text, margin:'0 0 2px', letterSpacing:-0.5 }}>{userName?`${userName}'s `:''}Diet Tracker</h1>
            <p style={{ color:T.muted, fontSize:10, margin:0 }}>
              Track · Heal · <span style={{ color:savedMsg?T.accent:T.muted, transition:'color 0.3s' }}>{savedMsg?'Saved to IndexedDB ✓':'Auto-saves to device'}</span>
            </p>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:'4px 9px' }}>
              <span style={{ fontSize:10, color:T.muted }}>💧</span>
              <button onClick={()=>upd(s=>({waterGlasses:Math.max(0,(s.waterGlasses??0)-1)}))} style={{ ...btn(false), padding:'1px 7px', fontSize:14 }}>−</button>
              <span style={{ color:T.accent, fontWeight:700, fontSize:13, minWidth:14, textAlign:'center' }}>{waterGlasses}</span>
              <button onClick={()=>upd(s=>({waterGlasses:(s.waterGlasses??0)+1}))} style={{ ...btn(false), padding:'1px 7px', fontSize:14 }}>+</button>
              <span style={{ color:T.muted, fontSize:10 }}>/8</span>
            </div>
            <button onClick={()=>upd(s=>({theme:s.theme==='dark'?'light':'dark'}))} style={{ ...btn(false), padding:'5px 10px', fontSize:11 }}>
              {theme==='dark'?'☀️':'🌙'}
            </button>
            <button onClick={resetAll} style={{ background:'transparent', border:'1px solid #e05d5d44', color:'#e05d5d', borderRadius:7, padding:'5px 9px', cursor:'pointer', fontFamily:'inherit', fontSize:10 }}>🗑</button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'flex', background:T.surface, borderBottom:`1px solid ${T.border}`, overflowX:'auto' }}>
        {[{key:'safe',label:'Safe',icon:'✅',col:'#3ecf8e'},{key:'test',label:'Testing',icon:'🧪',col:'#f6a623'},{key:'rejected',label:'Rejected',icon:'❌',col:'#e05d5d'}].map(s=>(
          <div key={s.key} onClick={()=>setFilterPhase(filterPhase===s.key?'all':s.key)} style={{ flex:1, minWidth:55, padding:'8px 3px', textAlign:'center', borderRight:`1px solid ${T.border}`, cursor:'pointer', background:filterPhase===s.key?T.card:'transparent' }}>
            <div style={{ fontSize:15, fontWeight:700, color:s.col }}>{counts[s.key]}</div>
            <div style={{ fontSize:9, color:T.muted }}>{s.icon} {s.label}</div>
          </div>
        ))}
        <div style={{ flex:1, minWidth:55, padding:'8px 3px', textAlign:'center', borderRight:`1px solid ${T.border}` }}>
          <div style={{ fontSize:15, fontWeight:700, color:calColor }}>{totalCals}</div>
          <div style={{ fontSize:9, color:T.muted }}>🔥 kcal</div>
        </div>
        <div style={{ flex:1, minWidth:55, padding:'8px 3px', textAlign:'center', borderRight:`1px solid ${T.border}` }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.accent }}>{maxCals}</div>
          <div style={{ fontSize:9, color:T.muted }}>🎯 limit</div>
        </div>
        <div style={{ flex:1, minWidth:55, padding:'8px 3px', textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:waterGlasses>=8?'#3ecf8e':T.muted }}>{waterGlasses}/8</div>
          <div style={{ fontSize:9, color:T.muted }}>💧 water</div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', background:T.card, borderBottom:`1px solid ${T.border}`, overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ background:activeTab===t.id?T.surface:'transparent', border:'none', borderBottom:activeTab===t.id?`2px solid ${T.accent}`:'2px solid transparent', color:activeTab===t.id?T.accent:T.muted, padding:'9px 11px', fontSize:11, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:980, margin:'0 auto', padding:'14px 12px' }}>

        {/* FOOD TRACKER */}
        {activeTab==='tracker' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
              <input value={trackerSearch} onChange={e=>setTrackerSearch(e.target.value)} placeholder='🔍 Search foods...' style={{ ...inp({flex:'1 1 140px',minWidth:120}) }}/>
              <button onClick={()=>setShowCustForm(x=>!x)} style={btn(showCustForm)}>+ Custom Food</button>
            </div>
            {showCustForm && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:13, marginBottom:11 }}>
                <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:8 }}>Add Custom Food</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:7 }}>
                  {[{l:'NAME',k:'name',t:'text',ph:'My food'},{l:'KCAL/100g',k:'cal',t:'number',ph:'200'},{l:'ICON',k:'icon',t:'text',ph:'🍽'},{l:'NOTES',k:'note',t:'text',ph:'Notes'}].map(f=>(
                    <div key={f.k}>
                      <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>{f.l}</label>
                      <input type={f.t} value={custForm[f.k]} onChange={e=>setCustForm(c=>({...c,[f.k]:e.target.value}))} placeholder={f.ph} style={inp()}/>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>CATEGORY</label>
                    <select value={custForm.cat} onChange={e=>setCustForm(c=>({...c,cat:e.target.value}))} style={inp()}>{CATS.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select>
                  </div>
                  <div>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>PHASE</label>
                    <select value={custForm.phase} onChange={e=>setCustForm(c=>({...c,phase:e.target.value}))} style={inp()}>
                      <option value='safe'>✅ Safe</option><option value='test'>🧪 Test</option><option value='rejected'>❌ Rejected</option>
                    </select>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button onClick={()=>{ if(!custForm.name||!custForm.cal) return; upd(s=>({customFoods:[...(s.customFoods??[]),{...custForm,id:Date.now(),cal:parseFloat(custForm.cal)}]})); setCustForm({name:'',cal:'',icon:'🍽',cat:'Other',note:'',phase:'safe'}); setShowCustForm(false) }} style={{ ...btn(true), padding:'7px 14px' }}>Save</button>
                  <button onClick={()=>setShowCustForm(false)} style={{ ...btn(false), padding:'7px 11px' }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:5, marginBottom:11, flexWrap:'wrap' }}>
              {CATS.map(c=><button key={c} onClick={()=>setFilterCat(c)} style={{ ...btn(filterCat===c), borderRadius:20, padding:'3px 11px', fontSize:11 }}>{c}</button>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
              {filtered.map(food=>{ const cfg=PC[food.phase]; return (
                <div key={food.id} style={{ background:cfg.bg, border:`1px solid ${cfg.border}44`, borderRadius:10, padding:'10px 11px', transition:'border-color 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=cfg.border}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=cfg.border+'44'}>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ fontSize:22 }}>{food.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:1 }}>
                        <span style={{ fontWeight:700, fontSize:12, color:T.text }}>{food.name}</span>
                        <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:cfg.badge, color:cfg.text }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize:10, color:T.muted, marginBottom:2 }}>{food.cat} · <span style={{ color:'#f6a623' }}>{food.cal} kcal/100g</span></div>
                      <div style={{ fontSize:11, color:T.sub, marginBottom:7 }}>{food.note}</div>
                      <div style={{ display:'flex', gap:4 }}>
                        {['safe','test','rejected'].map(p=>(
                          <button key={p} onClick={()=>upd(s=>({foods:(s.foods??INITIAL_FOODS).map(f=>f.id===food.id?{...f,phase:p}:f),customFoods:(s.customFoods??[]).map(f=>f.id===food.id?{...f,phase:p}:f)}))} style={{ background:food.phase===p?PC[p].text:'transparent', color:food.phase===p?(theme==='dark'?'#0a0e0d':'#fff'):PC[p].text, border:`1px solid ${PC[p].text}55`, borderRadius:5, padding:'2px 6px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                            {p==='safe'?'✅':p==='test'?'🧪':'❌'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
            {filtered.length===0 && <div style={{ textAlign:'center', color:T.muted, padding:40 }}>No foods found.</div>}
          </div>
        )}

        {/* CALORIE COUNTER */}
        {activeTab==='counter' && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:8 }}>⚙️ Daily Targets</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:8 }}>
                <div>
                  <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>MAX KCAL/DAY</label>
                  <input type='number' value={maxCals} onChange={e=>upd({maxCals:+e.target.value})} style={inp()}/>
                </div>
                {[['protein','PROTEIN %'],['carbs','CARBS %'],['fat','FAT %']].map(([k,lbl])=>(
                  <div key={k}>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>{lbl}</label>
                    <input type='number' value={macroGoal[k]} onChange={e=>upd(s=>({macroGoal:{...(s.macroGoal??{protein:25,carbs:50,fat:25}),[k]:+e.target.value}}))} style={inp()} min={0} max={100}/>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {[{l:'Protein',k:'protein',c:'#3ecf8e',d:4},{l:'Carbs',k:'carbs',c:'#f6a623',d:4},{l:'Fat',k:'fat',c:'#c084fc',d:9}].map(m=>{ const kcal=Math.round(maxCals*macroGoal[m.k]/100), g=Math.round(kcal/m.d); return (
                <div key={m.l} style={{ background:T.surface, border:`1px solid ${m.c}33`, borderRadius:10, padding:11 }}>
                  <div style={{ color:m.c, fontSize:9, marginBottom:2, letterSpacing:1 }}>{m.l.toUpperCase()}</div>
                  <div style={{ fontSize:19, fontWeight:700, color:T.text }}>{g}g</div>
                  <div style={{ fontSize:10, color:T.muted }}>{kcal} kcal</div>
                  <div style={{ height:4, background:T.border, borderRadius:2, marginTop:5 }}>
                    <div style={{ width:macroGoal[m.k]+'%', height:'100%', background:m.c, borderRadius:2 }}/>
                  </div>
                </div>
              )})}
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, flexWrap:'wrap', gap:3 }}>
                <span style={{ fontSize:12, color:T.sub }}>🔥 Today</span>
                <span style={{ fontSize:12 }}><span style={{ color:calColor, fontWeight:700 }}>{totalCals}</span><span style={{ color:T.muted }}> / {maxCals} kcal</span></span>
              </div>
              <div style={{ height:16, background:T.border, borderRadius:8, overflow:'hidden', marginBottom:5 }}>
                <div style={{ width:calPct+'%', height:'100%', background:`linear-gradient(90deg,#3ecf8e,${calColor})`, borderRadius:8, transition:'width 0.4s' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                <span style={{ color:T.muted }}>Left: <b style={{ color:T.accent }}>{Math.max(0,maxCals-totalCals)} kcal</b></span>
                {totalCals>maxCals && <span style={{ color:'#e05d5d' }}>⚠️ Over by {totalCals-maxCals}</span>}
              </div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:8 }}>⚡ Quick Presets</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {PRESETS.map(p=>{ const f=calDB.find(x=>x.name===p.food); const c=f?Math.round(f.cal*p.grams/100):0; return (
                  <button key={p.label} onClick={()=>{ const food=calDB.find(x=>x.name===p.food); if(food) addToCounter(food.id,p.grams,p.label) }} style={{ background:T.input, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 9px', cursor:'pointer', fontFamily:'inherit' }}>
                    <div style={{ fontSize:11, color:T.text }}>{p.label}</div>
                    <div style={{ fontSize:10, color:'#f6a623' }}>{c} kcal</div>
                  </button>
                )})}
              </div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.accent}33`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:8 }}>+ Add by Weight</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 75px auto', gap:7, alignItems:'end' }}>
                <div style={{ position:'relative' }}>
                  <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>SEARCH FOOD</label>
                  <input value={cSearch} onChange={e=>{setCSearch(e.target.value);setCSelected(null)}} placeholder='Type food name…' style={inp()}/>
                  {filtCDB.length>0 && !cSelected && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, zIndex:20, maxHeight:200, overflowY:'auto' }}>
                      {filtCDB.map(f=>(
                        <div key={f.id} onClick={()=>{setCSelected(f.id);setCSearch(f.name)}} style={{ padding:'7px 11px', cursor:'pointer', fontSize:12, display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${T.border}` }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.card} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <span>{f.icon} {f.name}</span><span style={{ color:'#f6a623', fontSize:10 }}>{f.cal}/100g</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>GRAMS</label>
                  <input type='number' value={cWeight} onChange={e=>setCWeight(e.target.value)} style={inp()} min={1}/>
                </div>
                <button onClick={()=>{ if(cSelected){addToCounter(cSelected,cWeight);setCSelected(null);setCWeight(100);setCSearch('')}}} style={{ ...btn(!!cSelected), padding:'7px 13px', alignSelf:'end' }}>Add</button>
              </div>
              {cSelected && (()=>{ const f=calDB.find(x=>x.id===cSelected); const w=parseFloat(cWeight)||100; return f?(<div style={{ marginTop:6, fontSize:11, color:T.sub, background:T.card, padding:'6px 10px', borderRadius:7 }}>{f.icon} <b style={{ color:T.text }}>{f.name}</b> → <span style={{ color:T.accent, fontWeight:700 }}>{Math.round(f.cal*w/100)} kcal</span> for {w}g</div>):null })()}
            </div>
            {counterItems.length===0
              ? <div style={{ textAlign:'center', color:T.muted, padding:24, background:T.surface, borderRadius:11, border:`1px solid ${T.border}` }}>No food logged yet.</div>
              : <>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {counterItems.map(item=>(
                      <div key={item.id} style={{ background:T.surface, border:`1px solid ${PC[item.phase]?.border||T.border}44`, borderRadius:9, padding:'8px 11px', display:'flex', alignItems:'center', gap:9 }}>
                        <span style={{ fontSize:18 }}>{item.icon}</span>
                        <div style={{ flex:1 }}><div style={{ fontWeight:700, color:T.text, fontSize:12 }}>{item.name}</div><div style={{ fontSize:10, color:T.muted }}>{item.weight}g</div></div>
                        <div style={{ fontWeight:700, color:'#f6a623', fontSize:14 }}>{item.cals} kcal</div>
                        <button onClick={()=>upd(s=>({counterItems:(s.counterItems??[]).filter(i=>i.id!==item.id)}))} style={{ background:'transparent', border:'none', color:'#e05d5d', cursor:'pointer', fontSize:14 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:9, alignItems:'center' }}>
                    <span style={{ color:T.sub, fontSize:12 }}>Total: <b style={{ color:calColor }}>{totalCals} kcal</b></span>
                    <div style={{ display:'flex', gap:7 }}>
                      <button onClick={()=>dlCSV([['Food','Weight(g)','Calories'],...counterItems.map(i=>[i.name,i.weight,i.cals])],'calorie-log.csv')} style={{ ...btn(false), fontSize:11 }}>⬇ CSV</button>
                      <button onClick={()=>upd({counterItems:[]})} style={{ background:'#2b0d0d', border:'1px solid #e05d5d44', color:'#e05d5d', borderRadius:7, padding:'5px 11px', cursor:'pointer', fontFamily:'inherit', fontSize:11 }}>Clear</button>
                    </div>
                  </div>
                </>
            }
          </div>
        )}

        {/* PLANNER */}
        {activeTab==='planner' && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:8 }}>📊 Week Overview</div>
              <div style={{ display:'flex', gap:5, alignItems:'flex-end', height:75 }}>
                {weekChart.map(d=>{ const col=d.pct>95?'#e05d5d':d.pct>80?'#f6a623':'#3ecf8e'; return (
                  <div key={d.day} onClick={()=>setPlanDay(d.day)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer' }}>
                    <div style={{ fontSize:9, color:col, fontWeight:700, marginBottom:2 }}>{d.total>0?d.total:''}</div>
                    <div style={{ width:'100%', background:d.total>0?col:T.border, height:Math.max(4,d.pct*0.65)+'px', borderRadius:'3px 3px 0 0', opacity:planDay===d.day?1:0.5 }}/>
                    <div style={{ height:3, width:'100%', background:planDay===d.day?T.accent:T.border }}/>
                    <div style={{ fontSize:9, color:planDay===d.day?T.accent:T.muted, marginTop:2 }}>{d.day.slice(0,3)}</div>
                  </div>
                )})}
              </div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, overflow:'hidden' }}>
              <div style={{ display:'flex', overflowX:'auto', borderBottom:`1px solid ${T.border}` }}>
                {DAYS.map(d=>{ const dt=dayTotals.find(x=>x.day===d); const col=dt.total>maxCals?'#e05d5d':dt.total>maxCals*0.8?'#f6a623':T.muted; return (
                  <button key={d} onClick={()=>setPlanDay(d)} style={{ flex:1, minWidth:48, background:planDay===d?T.card:'transparent', border:'none', borderBottom:planDay===d?`2px solid ${T.accent}`:'2px solid transparent', color:planDay===d?T.accent:T.muted, padding:'7px 2px', cursor:'pointer', fontFamily:'inherit', fontSize:10 }}>
                    <div>{d.slice(0,3)}</div>
                    <div style={{ color:col, fontSize:9 }}>{dt.total||''}</div>
                  </button>
                )})}
              </div>
              <div style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, background:T.card }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 65px 95px auto', gap:6, alignItems:'end' }}>
                  <div style={{ position:'relative' }}>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>FOOD</label>
                    <input value={planSearch} onChange={e=>{setPlanSearch(e.target.value);setPlanSel(null)}} placeholder='Search…' style={inp()}/>
                    {filtPDB.length>0 && !planSel && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, zIndex:20, maxHeight:160, overflowY:'auto' }}>
                        {filtPDB.map(f=>(
                          <div key={f.id} onClick={()=>{setPlanSel(f.id);setPlanSearch(f.name)}} style={{ padding:'7px 10px', cursor:'pointer', fontSize:12, display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${T.border}` }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.card} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <span>{f.icon} {f.name}</span><span style={{ color:'#f6a623', fontSize:10 }}>{f.cal}/100g</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>GRAMS</label>
                    <input type='number' value={planWeight} onChange={e=>setPlanWeight(e.target.value)} style={inp()} min={1}/>
                  </div>
                  <div>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>MEAL</label>
                    <select value={planMeal} onChange={e=>setPlanMeal(e.target.value)} style={inp()}>
                      {['Breakfast','Lunch','Dinner','Snack'].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <button onClick={addToPlanner} style={{ ...btn(!!planSel), padding:'7px 11px', alignSelf:'end' }}>+</button>
                </div>
              </div>
              {['Breakfast','Lunch','Dinner','Snack'].map(meal=>{ const items=selDayData?.meals[meal]||[]; const mealTotal=items.reduce((s,i)=>s+i.cals,0); return (
                <div key={meal} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ padding:'7px 12px', background:T.card, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:T.sub, fontWeight:700, fontSize:12 }}>{meal==='Breakfast'?'🌅':meal==='Lunch'?'☀️':meal==='Dinner'?'🌙':'🍎'} {meal}</span>
                    <span style={{ color:'#f6a623', fontSize:11, fontWeight:700 }}>{mealTotal} kcal</span>
                  </div>
                  <div style={{ padding:'4px 12px', display:'flex', gap:5, flexWrap:'wrap', borderBottom:`1px solid ${T.border}` }}>
                    {(SUGGESTIONS[meal]||[]).map((s,i)=>{ const sc=s.items.reduce((t,it)=>t+calsFor(it.food,it.g),0); return (
                      <button key={i} onClick={()=>addSuggestion(s,meal)} style={{ background:T.input, border:`1px solid ${T.border}`, borderRadius:7, padding:'3px 8px', cursor:'pointer', fontFamily:'inherit' }}>
                        <div style={{ fontSize:10, color:T.text }}>✨ {s.name}</div>
                        <div style={{ fontSize:9, color:'#f6a623' }}>~{sc} kcal</div>
                      </button>
                    )})}
                  </div>
                  {items.length===0 ? <div style={{ padding:'6px 12px', color:T.muted, fontSize:11, opacity:0.5 }}>— Add food above —</div>
                  : items.map(item=>(
                    <div key={item.id} style={{ padding:'5px 12px', display:'flex', alignItems:'center', gap:8, borderTop:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:14 }}>{item.icon}</span>
                      <span style={{ flex:1, fontSize:12, color:T.text }}>{item.name} <span style={{ color:T.muted }}>({item.weight}g)</span></span>
                      <span style={{ color:'#f6a623', fontSize:12, fontWeight:700 }}>{item.cals} kcal</span>
                      <button onClick={()=>removeFromPlanner(planDay,meal,item.id)} style={{ background:'transparent', border:'none', color:'#e05d5d', cursor:'pointer', fontSize:13 }}>✕</button>
                    </div>
                  ))}
                </div>
              )})}
              <div style={{ padding:'9px 12px', display:'flex', justifyContent:'space-between', background:T.card }}>
                <span style={{ fontSize:11, color:T.muted }}>Day Total</span>
                <span style={{ fontWeight:700, fontSize:13, color:selDayTotal>maxCals?'#e05d5d':T.accent }}>{selDayTotal} / {maxCals} kcal</span>
              </div>
            </div>
          </div>
        )}

        {/* REINTRO */}
        {activeTab==='reintro' && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.accent}33`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:5 }}>🗓 Start Date</div>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <input type='date' value={reintroStart||''} onChange={e=>upd({reintroStart:e.target.value})} style={{ ...inp({width:'auto',flex:'1 1 150px'}) }}/>
                {!reintroStart && <span style={{ fontSize:11, color:T.muted }}>Set after 2 weeks of elimination</span>}
                {reintroStart && <span style={{ fontSize:11, color:T.accent }}>✓ Active · one food every 3 days</span>}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {REINTRO.map((item,i)=>{ const status=getReintroStatus(item); const cd=msUntil(item); const col=status==='ready'?'#f6a623':status==='safe'?'#3ecf8e':status==='rejected'?'#e05d5d':T.muted; return (
                <div key={i} style={{ background:T.surface, border:`2px solid ${col}33`, borderRadius:10, padding:'10px 12px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ minWidth:28, height:28, borderRadius:'50%', background:col+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:col }}>{item.day}</div>
                  <div style={{ flex:1, minWidth:120 }}>
                    <div style={{ fontWeight:700, color:T.text, fontSize:12 }}>{item.food}</div>
                    <div style={{ fontSize:10, color:T.muted }}>{item.cat}</div>
                  </div>
                  <div style={{ fontSize:11, color:col, minWidth:75 }}>
                    {status==='pending'&&!reintroStart&&'⏳ Set date'}
                    {status==='upcoming'&&cd&&`⏰ in ${cd}`}
                    {status==='ready'&&'🟡 Test now!'}
                    {status==='safe'&&'✅ Tolerated'}
                    {status==='rejected'&&'❌ Rejected'}
                  </div>
                  {status==='ready' && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>upd(s=>({reintroResults:{...(s.reintroResults??{}),[item.food]:'safe'},foods:(s.foods??INITIAL_FOODS).map(f=>f.name===item.food?{...f,phase:'safe'}:f)}))} style={{ ...btn(false), background:'#0d2b1f', border:'1px solid #3ecf8e', color:'#3ecf8e', fontSize:11 }}>✅ OK</button>
                      <button onClick={()=>upd(s=>({reintroResults:{...(s.reintroResults??{}),[item.food]:'rejected'},foods:(s.foods??INITIAL_FOODS).map(f=>f.name===item.food?{...f,phase:'rejected'}:f)}))} style={{ ...btn(false), background:'#2b0d0d', border:'1px solid #e05d5d', color:'#e05d5d', fontSize:11 }}>❌ No</button>
                    </div>
                  )}
                  {(status==='safe'||status==='rejected') && <button onClick={()=>upd(s=>{ const r={...(s.reintroResults??{})}; delete r[item.food]; return {reintroResults:r,foods:(s.foods??INITIAL_FOODS).map(f=>f.name===item.food?{...f,phase:'test'}:f)} })} style={{ ...btn(false), fontSize:10, color:T.muted }}>↩</button>}
                </div>
              )})}
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        {activeTab==='insights' && (
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:13 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:9 }}>📊 Weekly Calories</div>
              <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:85 }}>
                {weekChart.map(d=>{ const col=d.pct>95?'#e05d5d':d.pct>80?'#f6a623':'#3ecf8e'; return (
                  <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ fontSize:9, color:col, fontWeight:700, marginBottom:2 }}>{d.total||0}</div>
                    <div style={{ width:'100%', background:d.total>0?col:T.border, height:Math.max(4,d.pct*0.8)+'px', borderRadius:'3px 3px 0 0' }}/>
                    <div style={{ height:2, width:'100%', background:T.border }}/>
                    <div style={{ fontSize:9, color:T.muted, marginTop:2 }}>{d.day.slice(0,3)}</div>
                  </div>
                )})}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, marginTop:10, borderTop:`1px solid ${T.border}`, paddingTop:9 }}>
                {[{label:'Week Total',val:dayTotals.reduce((s,d)=>s+d.total,0)+' kcal',col:T.accent},{label:'Daily Avg',val:Math.round(dayTotals.reduce((s,d)=>s+d.total,0)/7)+' kcal',col:'#f6a623'},{label:'On Target',val:dayTotals.filter(d=>d.total>0&&d.total<=maxCals).length+'/7',col:'#3ecf8e'}].map((s,i)=>(
                  <div key={i} style={{ textAlign:'center' }}><div style={{ fontSize:15, fontWeight:700, color:s.col }}>{s.val}</div><div style={{ fontSize:10, color:T.muted }}>{s.label}</div></div>
                ))}
              </div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:13 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:9 }}>🥧 Macro Split</div>
              <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                <svg width={84} height={84} viewBox='0 0 36 36'>
                  {(()=>{ let cum=0; return [{p:macroGoal.protein,c:'#3ecf8e'},{p:macroGoal.carbs,c:'#f6a623'},{p:macroGoal.fat,c:'#c084fc'}].map((s,i)=>{ const a1=(cum/100)*2*Math.PI-Math.PI/2, a2=((cum+s.p)/100)*2*Math.PI-Math.PI/2; cum+=s.p; const x1=18+16*Math.cos(a1),y1=18+16*Math.sin(a1),x2=18+16*Math.cos(a2),y2=18+16*Math.sin(a2),lg=s.p>50?1:0; return <path key={i} d={`M18,18 L${x1},${y1} A16,16 0 ${lg},1 ${x2},${y2} Z`} fill={s.c} opacity={0.85}/> }) })()}
                </svg>
                <div style={{ flex:1 }}>
                  {[{l:'Protein',p:macroGoal.protein,c:'#3ecf8e',d:4},{l:'Carbs',p:macroGoal.carbs,c:'#f6a623',d:4},{l:'Fat',p:macroGoal.fat,c:'#c084fc',d:9}].map((m,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                      <div style={{ width:9, height:9, borderRadius:2, background:m.c }}/>
                      <span style={{ fontSize:12, color:T.text, flex:1 }}>{m.l}</span>
                      <span style={{ fontSize:11, color:m.c, fontWeight:700 }}>{m.p}% · {Math.round(maxCals*m.p/100/m.d)}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:13 }}>
              <div style={{ color:'#e05d5d', fontWeight:700, fontSize:12, marginBottom:9 }}>⚠️ Top Triggers</div>
              {triggers.length===0 ? <div style={{ color:T.muted, fontSize:12, textAlign:'center', padding:10 }}>Log symptoms to see patterns.</div>
              : triggers.map((t,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#e05d5d22', color:'#e05d5d', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</div>
                  <div style={{ flex:1, fontSize:12, color:T.text }}>{t.food}</div>
                  <div style={{ fontSize:10, color:T.muted }}>{t.count} report{t.count!==1?'s':''}</div>
                  <div style={{ width:50, height:5, background:T.border, borderRadius:3 }}>
                    <div style={{ width:(t.count/Math.max(...triggers.map(x=>x.count)))*100+'%', height:'100%', background:'#e05d5d', borderRadius:3 }}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:13 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:9 }}>📈 Symptom Trend</div>
              {symptomLog.length===0 ? <div style={{ color:T.muted, fontSize:12, textAlign:'center', padding:8 }}>No data yet.</div>
              : <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:52, overflowX:'auto' }}>
                  {[...symptomLog].reverse().slice(0,24).map((e,i)=>{ const h=e.severity==='severe'?46:e.severity==='moderate'?28:12; const c=e.severity==='severe'?'#e05d5d':e.severity==='moderate'?'#f6a623':'#3ecf8e'; return <div key={i} title={`${e.date}: ${e.food}`} style={{ flex:'0 0 14px', background:c, height:h+'px', borderRadius:'2px 2px 0 0', opacity:0.8 }}/> })
                  }
                </div>
              }
              <div style={{ display:'flex', gap:10, marginTop:5, fontSize:10 }}><span>🟢 Mild</span><span>🟡 Moderate</span><span>🔴 Severe</span></div>
            </div>
          </div>
        )}

        {/* RECIPES */}
        {activeTab==='recipes' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:11 }}>
              <div style={{ fontWeight:700, fontSize:13, color:T.text }}>👨‍🍳 My Recipes</div>
              <button onClick={()=>setShowRecForm(x=>!x)} style={btn(showRecForm)}>+ New Recipe</button>
            </div>
            {showRecForm && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:13, marginBottom:13 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:8 }}>
                  <div>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>NAME</label>
                    <input value={recForm.name} onChange={e=>setRecForm(r=>({...r,name:e.target.value}))} placeholder='e.g. My Khichdi' style={inp()}/>
                  </div>
                  <div><label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>ICON</label><input value={recForm.icon} onChange={e=>setRecForm(r=>({...r,icon:e.target.value}))} style={{ ...inp({width:50}) }}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 65px auto', gap:6, alignItems:'end', marginBottom:8 }}>
                  <div style={{ position:'relative' }}>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>INGREDIENT</label>
                    <input value={recSearch} onChange={e=>{setRecSearch(e.target.value);setRecItemSel(null)}} placeholder='Search…' style={inp()}/>
                    {filtRDB.length>0 && !recItemSel && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, zIndex:20, maxHeight:140, overflowY:'auto' }}>
                        {filtRDB.map(f=>(
                          <div key={f.id} onClick={()=>{setRecItemSel(f.id);setRecSearch(f.name)}} style={{ padding:'6px 10px', cursor:'pointer', fontSize:12, borderBottom:`1px solid ${T.border}` }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.card} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            {f.icon} {f.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div><label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>g</label><input type='number' value={recItemG} onChange={e=>setRecItemG(e.target.value)} style={inp()} min={1}/></div>
                  <button onClick={()=>{ if(!recItemSel) return; const f=calDB.find(x=>x.id===recItemSel); if(!f) return; setRecForm(r=>({...r,items:[...r.items,{food:f.name,g:parseFloat(recItemG)||100}]})); setRecItemSel(null); setRecSearch(''); setRecItemG(100) }} style={{ ...btn(!!recItemSel), padding:'7px 10px', alignSelf:'end', fontSize:12 }}>+</button>
                </div>
                {recForm.items.length>0 && (
                  <div style={{ marginBottom:8 }}>
                    {recForm.items.map((it,i)=>{ const f=calDB.find(x=>x.name===it.food); return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'3px 0', borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:13 }}>{f?.icon||'🍽'}</span>
                        <span style={{ flex:1, fontSize:11, color:T.text }}>{it.food} ({it.g}g)</span>
                        <span style={{ fontSize:10, color:'#f6a623' }}>{f?Math.round(f.cal*it.g/100):0} kcal</span>
                        <button onClick={()=>setRecForm(r=>({...r,items:r.items.filter((_,j)=>j!==i)}))} style={{ background:'transparent', border:'none', color:'#e05d5d', cursor:'pointer', fontSize:12 }}>✕</button>
                      </div>
                    )})}
                    <div style={{ fontSize:11, color:'#f6a623', fontWeight:700, paddingTop:4 }}>Total: {recForm.items.reduce((s,it)=>s+calsFor(it.food,it.g),0)} kcal</div>
                  </div>
                )}
                <div style={{ display:'flex', gap:7 }}>
                  <button onClick={()=>{ if(!recForm.name||recForm.items.length===0) return; upd(s=>({recipes:[...(s.recipes??DEFAULT_RECIPES),{...recForm,id:Date.now()}]})); setRecForm({name:'',icon:'🍽',items:[]}); setShowRecForm(false) }} style={{ ...btn(true), padding:'7px 14px' }}>Save</button>
                  <button onClick={()=>{setShowRecForm(false);setRecForm({name:'',icon:'🍽',items:[]})}} style={{ ...btn(false), padding:'7px 11px' }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
              {recipes.map(rec=>{ const total=recTotal(rec); const hasBad=rec.items.some(it=>{ const f=allFoods.find(x=>x.name===it.food); return f&&f.phase==='rejected' }); const allSafe=rec.items.every(it=>{ const f=allFoods.find(x=>x.name===it.food); return !f||f.phase==='safe' }); const bc=hasBad?'#e05d5d':allSafe?'#3ecf8e':'#f6a623'; return (
                <div key={rec.id} style={{ background:T.surface, border:`1px solid ${bc}44`, borderRadius:11, padding:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                      <span style={{ fontSize:22 }}>{rec.icon}</span>
                      <div><div style={{ fontWeight:700, color:T.text, fontSize:13 }}>{rec.name}</div><div style={{ fontSize:10, color:'#f6a623' }}>{total} kcal</div></div>
                    </div>
                    <div style={{ fontSize:9, color:bc }}>{hasBad?'⚠️ Triggers':allSafe?'✅ Safe':'🧪 Test'}</div>
                  </div>
                  {rec.items.map((it,i)=>{ const f=calDB.find(x=>x.name===it.food); return <div key={i} style={{ fontSize:10, color:T.sub, marginBottom:2 }}>{f?.icon||'🍽'} {it.food} ({it.g}g) · {calsFor(it.food,it.g)} kcal</div> })}
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    <button onClick={()=>{ rec.items.forEach(it=>{ const f=calDB.find(x=>x.name===it.food); if(f) addToCounter(f.id,it.g,`${rec.name} – ${f.name}`) }) }} style={{ ...btn(true), flex:1, fontSize:11 }}>+ Add to Today</button>
                    <button onClick={()=>upd(s=>({recipes:(s.recipes??DEFAULT_RECIPES).filter(r=>r.id!==rec.id)}))} style={{ background:'transparent', border:'1px solid #e05d5d44', color:'#e05d5d', borderRadius:7, padding:'5px 9px', cursor:'pointer', fontFamily:'inherit', fontSize:11 }}>🗑</button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* SYMPTOMS */}
        {activeTab==='symptoms' && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.accent}33`, borderRadius:11, padding:12, marginBottom:13 }}>
              <div style={{ color:T.accent, fontWeight:700, marginBottom:10, fontSize:12 }}>Log a Symptom</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[{l:'FOOD EATEN',k:'food',t:'text',ph:'e.g. Rajma curry'},{l:'DATE',k:'date',t:'date',ph:''},{l:'SYMPTOMS',k:'symptoms',t:'text',ph:'e.g. Bloating, gas'}].map(f=>(
                  <div key={f.k}>
                    <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>{f.l}</label>
                    <input type={f.t} value={symptomForm[f.k]} onChange={e=>setSymptomForm(s=>({...s,[f.k]:e.target.value}))} placeholder={f.ph} style={inp()}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:2, letterSpacing:2 }}>SEVERITY</label>
                  <select value={symptomForm.severity} onChange={e=>setSymptomForm(s=>({...s,severity:e.target.value}))} style={inp()}>
                    <option value='mild'>🟡 Mild</option><option value='moderate'>🟠 Moderate</option><option value='severe'>🔴 Severe</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:7, marginTop:10 }}>
                <button onClick={()=>{ if(!symptomForm.food||!symptomForm.symptoms) return; upd(s=>({symptomLog:[{...symptomForm,id:Date.now()},...(s.symptomLog??[])]})); setSymptomForm({food:'',symptoms:'',severity:'mild',date:new Date().toISOString().split('T')[0]}) }} style={{ ...btn(true), padding:'7px 16px' }}>+ Log</button>
                {symptomLog.length>0 && <button onClick={()=>dlCSV([['Date','Food','Symptoms','Severity'],...symptomLog.map(e=>[e.date,e.food,e.symptoms,e.severity])],'symptom-log.csv')} style={{ ...btn(false), fontSize:11 }}>⬇ CSV</button>}
              </div>
            </div>
            {symptomLog.length===0 ? <div style={{ textAlign:'center', color:T.muted, padding:24, background:T.surface, borderRadius:11, border:`1px solid ${T.border}` }}>No entries yet.</div>
            : symptomLog.map(entry=>(
              <div key={entry.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:9, padding:'8px 11px', display:'flex', gap:9, marginBottom:6 }}>
                <div style={{ fontSize:18 }}>{entry.severity==='mild'?'🟡':entry.severity==='moderate'?'🟠':'🔴'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontWeight:700, color:T.text, fontSize:12 }}>{entry.food}</span><span style={{ fontSize:10, color:T.muted }}>{entry.date}</span></div>
                  <div style={{ fontSize:11, color:T.sub, marginTop:2 }}>{entry.symptoms}</div>
                </div>
                <button onClick={()=>upd(s=>({symptomLog:(s.symptomLog??[]).filter(x=>x.id!==entry.id)}))} style={{ background:'transparent', border:'none', color:'#e05d5d', cursor:'pointer', fontSize:13 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* JOURNAL */}
        {activeTab==='journal' && (
          <div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:12, marginBottom:12 }}>
              <div style={{ color:T.accent, fontWeight:700, fontSize:12, marginBottom:8 }}>📓 Today's Entry</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                <div>
                  <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:3, letterSpacing:2 }}>MOOD</label>
                  <div style={{ display:'flex', gap:4 }}>
                    {['😊','😐','😟','😴','🤢'].map(m=>(
                      <button key={m} onClick={()=>setJournalMood(m)} style={{ background:journalMood===m?T.accent+'33':T.input, border:`1px solid ${journalMood===m?T.accent:T.border}`, borderRadius:7, padding:'4px 7px', cursor:'pointer', fontSize:15 }}>{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:9, color:T.muted, display:'block', marginBottom:3, letterSpacing:2 }}>ENERGY (1–5)</label>
                  <div style={{ display:'flex', gap:3 }}>
                    {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setJournalEnergy(n)} style={{ flex:1, background:n<=journalEnergy?'#f6a623':T.input, border:`1px solid ${T.border}`, borderRadius:6, padding:'6px 0', cursor:'pointer', color:n<=journalEnergy?'#0a0e0d':T.muted, fontSize:11, fontFamily:'inherit' }}>{n}</button>)}
                  </div>
                </div>
              </div>
              <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder='How you felt, what you ate, gut observations…' style={{ ...inp({height:80,resize:'vertical'}) }}/>
              <button onClick={()=>{ if(!journalText.trim()) return; upd(s=>({journal:[{id:Date.now(),date:new Date().toLocaleDateString(),text:journalText,mood:journalMood,energy:journalEnergy},...(s.journal??[])]})); setJournalText(''); setJournalMood('😊'); setJournalEnergy(3) }} style={{ ...btn(true), padding:'7px 16px', marginTop:8 }}>Save Entry</button>
            </div>
            {journalEntries.length===0 ? <div style={{ textAlign:'center', color:T.muted, padding:24, background:T.surface, borderRadius:11, border:`1px solid ${T.border}` }}>No journal entries yet.</div>
            : journalEntries.map(entry=>(
              <div key={entry.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:11, marginBottom:7 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <span style={{ fontSize:17 }}>{entry.mood}</span>
                    <div style={{ display:'flex', gap:2 }}>{[1,2,3,4,5].map(n=><div key={n} style={{ width:7, height:7, borderRadius:2, background:n<=entry.energy?'#f6a623':T.border }}/>)}</div>
                  </div>
                  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:T.muted }}>{entry.date}</span>
                    <button onClick={()=>upd(s=>({journal:(s.journal??[]).filter(x=>x.id!==entry.id)}))} style={{ background:'transparent', border:'none', color:'#e05d5d', cursor:'pointer', fontSize:12 }}>✕</button>
                  </div>
                </div>
                <div style={{ fontSize:12, color:T.sub, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{entry.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* SHOPPING */}
        {activeTab==='shopping' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:11 }}>
              <div><div style={{ fontWeight:700, fontSize:13, color:T.text }}>🛒 Shopping List</div><div style={{ color:T.muted, fontSize:10 }}>From your week plan</div></div>
              {shopping.length>0 && <button onClick={()=>dlTxt(shopping.map(i=>`☐ ${i.name} – ${i.g}g`).join('\n'),'shopping-list.txt')} style={{ ...btn(false), fontSize:11 }}>⬇ Export</button>}
            </div>
            {shopping.length===0 ? <div style={{ textAlign:'center', color:T.muted, padding:24, background:T.surface, borderRadius:11, border:`1px solid ${T.border}` }}>Add foods to the Week Planner.</div>
            : CATS.filter(c=>c!=='All').map(cat=>{ const its=shopping.filter(it=>{ const f=allFoods.find(x=>x.name===it.name); return f&&f.cat===cat }); if(its.length===0) return null; return (
              <div key={cat} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden', marginBottom:8 }}>
                <div style={{ background:T.card, padding:'6px 12px', borderBottom:`1px solid ${T.border}`, color:T.accent, fontWeight:700, fontSize:11 }}>{cat}</div>
                {its.map((item,i)=>{ const f=allFoods.find(x=>x.name===item.name); return (
                  <div key={i} style={{ padding:'6px 12px', display:'flex', alignItems:'center', gap:8, borderBottom:i<its.length-1?`1px solid ${T.border}`:'none' }}>
                    <span style={{ fontSize:16 }}>{item.icon}</span>
                    <span style={{ flex:1, fontSize:12, color:T.text }}>{item.name}</span>
                    <span style={{ fontSize:11, color:'#f6a623' }}>{item.g}g</span>
                    {f && <span style={{ fontSize:9, color:PC[f.phase]?.text||T.muted }}>{PC[f.phase]?.label}</span>}
                  </div>
                )})}
              </div>
            )})}
          </div>
        )}

        {/* GUIDE */}
        {activeTab==='guide' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              {step:'01',title:'Elimination (Week 1–2)',color:'#3ecf8e',content:['Remove ALL trigger foods at once.','Eat only ✅ Safe foods for 2 full weeks.','Indian staples: Khichdi, Poha, Idli, plain roti, moong dal.','Cook simply — no rich masalas, no frying.']},
              {step:'02',title:'Reintroduction (Week 3–6)',color:'#f6a623',content:['Use 🧪 Reintro tab — guided 72h countdown timers.','Add ONE test food every 72 hours.','Click ✅ OK or ❌ No — food list updates automatically.','Key Indian: rajma, chhole, paneer, onion, garlic, aloo.']},
              {step:'03',title:'Build Your Diet (Week 7+)',color:'#e05d5d',content:['Rejected foods stay out permanently.','Use 📅 Planner + suggestions for weekly meals.','Use 🛒 Shopping to get groceries in one tap.','Use 📊 Insights to track symptom trends.']},
              {step:'💾',title:'PWA + IndexedDB Storage',color:'#c084fc',content:['This app is installed on your iPhone home screen.','Data is stored in IndexedDB — survives browser restarts.','Works fully offline — no internet needed after install.','Use 🗑 to reset everything and start fresh.']},
            ].map((s,i)=>(
              <div key={i} style={{ background:T.surface, border:`1px solid ${s.color}33`, borderRadius:11, padding:'13px 16px' }}>
                <div style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                  <div style={{ background:s.color+'22', color:s.color, fontSize:10, fontWeight:700, fontFamily:'monospace', padding:'2px 8px', borderRadius:5, whiteSpace:'nowrap', marginTop:2 }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:T.text, marginBottom:7 }}>{s.title}</div>
                    <ul style={{ margin:0, padding:'0 0 0 13px', display:'flex', flexDirection:'column', gap:3 }}>
                      {s.content.map((c,j)=><li key={j} style={{ fontSize:11, color:T.sub, lineHeight:1.6 }}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:9, padding:'9px 12px', fontSize:10, color:T.muted, textAlign:'center' }}>
              ⚕️ Educational only. Consult a doctor or dietitian before starting.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
