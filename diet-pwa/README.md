# 🫕 Elimination Diet Tracker — PWA

A Progressive Web App for tracking your elimination diet, calories, and gut health.
Installs on iPhone home screen. Works fully offline. Data saved in IndexedDB.

---

## 🚀 Deploy to Vercel (one-time setup, ~10 minutes)

### Step 1 — Install Node.js on your computer
Download from https://nodejs.org and install the LTS version.

### Step 2 — Set up the project locally
Open Terminal (Mac) or Command Prompt (Windows) and run:

```bash
cd diet-pwa
npm install
npm install sharp --save-dev
node generate-icons.mjs
npm run build
```

If `generate-icons.mjs` fails, that's OK — create placeholder icons manually
(any 192x192, 512x512, and 180x180 PNG files named icon-192.png, icon-512.png,
apple-touch-icon.png in the /public folder).

### Step 3 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/diet-tracker.git
git push -u origin main
```

Replace YOUR_USERNAME with your GitHub username.
Create the repository on github.com first (click + → New repository → name it "diet-tracker").

### Step 4 — Deploy on Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New Project"**
3. Select your **diet-tracker** repository
4. Vercel auto-detects Vite — click **Deploy**
5. Wait ~60 seconds → your app is live at `https://diet-tracker-xxx.vercel.app`

### Step 5 — Install on iPhone
1. Open Safari on your iPhone
2. Go to your Vercel URL
3. Tap the **Share** button (box with arrow pointing up)
4. Tap **"Add to Home Screen"**
5. Tap **"Add"**

The app icon appears on your home screen. Tap it — it opens fullscreen like a native app.
Your data is stored in IndexedDB on your iPhone and persists forever.

---

## 🔄 Updating the app

After making changes:
```bash
git add .
git commit -m "Update"
git push
```
Vercel auto-deploys in ~60 seconds. The PWA service worker updates on next open.

---

## 📱 Features
- 🗂 Food tracker with 80+ Indian & global foods
- 🔥 Calorie counter with weight-based calculation
- ⚡ One-tap Indian portion presets
- 📅 7-day meal planner with auto-suggestions
- 🧪 Reintroduction schedule with 72h countdown timers
- 📊 Insights — weekly chart, macro pie, symptom trends
- 👨‍🍳 Recipe builder
- 📋 Symptom log with CSV export
- 📓 Daily journal with mood & energy tracking
- 🛒 Shopping list auto-generated from meal plan
- 💧 Water intake tracker
- 🌙 Dark / light mode
- 💾 **IndexedDB storage** — data survives app restarts, offline use, everything

---

## 🛠 Tech Stack
- React 18 + Vite
- vite-plugin-pwa (Workbox service worker)
- IndexedDB (via custom db.js wrapper)
- Zero external UI dependencies
