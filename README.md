# Comm Time ⏰

English | [日本語](./README.ja.md)

A simple and user-friendly time management application with Meeting Timer and Pomodoro Timer features.

**Live Demo**: [https://comm-time.vercel.app](https://comm-time.vercel.app)

---

## 📋 Table of Contents

- [Features](#features)
- [📚 Documentation](#-documentation)
- [User Guide](#user-guide)
  - [Getting Started](#getting-started)
  - [Meeting Timer](#meeting-timer)
  - [Pomodoro Timer](#pomodoro-timer)
  - [Common Features](#common-features)
  - [FAQ](#faq)
- [Developer Guide](#developer-guide)
  - [Setup Development Environment](#setup-development-environment)
  - [Build and Deploy](#build-and-deploy)
  - [Code Editing](#code-editing)
  - [Troubleshooting](#troubleshooting)

---

## 🎯 Features

### Meeting Timer
- ⏱️ **Elapsed Time Mode**: Track elapsed time from meeting start
- ⏰ **Countdown Mode**: Set end time and display remaining time
- 🔔 **Multiple Alarm Points**: Set alarms at 30min, 50min, 60min, etc.
- 📝 **Real-time Notes**: Record meeting minutes
- ✅ **TODO List**: Manage tasks decided in meetings

### Pomodoro Timer
- 🎯 **Auto-switching**: 25min work → 5min break automatically
- 🔄 **Cycle Counter**: Display completed cycles
- ♾️ **Infinite Mode**: Run continuously until manual stop
- 🔔 **Different Alarms**: Separate sounds for work start and break start
- 📝 **Work Log**: Notes and TODO features for tracking work

### Common Features
- 🔊 **Tick Sound**: Clock ticking sound during timer operation (ON/OFF)
- 📳 **Vibration**: Device vibration on alarm (supported devices only)
- ⚡ **Flash Alert**: Screen-wide white flashing for visual notification
- 🔔 **Browser Notifications**: Alarm notifications even in background
- 💾 **Auto-save**: Automatically save all settings and data (persists after closing browser)
- ☁️ **Cloud Save (NEW!)**: Save TODO/Memo to cloud with user authentication
  - Cross-device sync
  - Supabase integration
  - Secure data storage with Row Level Security
  - REST API for third-party app integration

---

## 📚 Documentation

Comprehensive guides for both users and developers:

### For Users
- **[User Guide](./docs/USER_GUIDE.md)** - Complete guide on how to use Comm Time
  - Basic operations
  - Meeting Timer usage
  - Pomodoro Timer usage
  - TODO and Memo features
  - Cloud Save feature (NEW!)
  - FAQ and troubleshooting

### For Developers
- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Technical documentation for developers
  - Tech stack and project structure
  - Development environment setup
  - Supabase integration guide
  - Implementation details
  - Testing and deployment
  - Troubleshooting

### Supabase Setup
- **[Supabase Setup Guide](./SUPABASE_SETUP.md)** - Step-by-step Supabase configuration
  - Database schema
  - Authentication setup
  - Row Level Security (RLS)
  - REST API usage

---

## 📖 User Guide

### Getting Started

#### Step 1: Access the App

1. Open [https://comm-time.vercel.app](https://comm-time.vercel.app) in your web browser
2. Verify "Comm Time" is displayed at the top with the current time
3. Two tabs are displayed:
   - "Meeting Timer" (for meetings)
   - "Pomodoro Timer" (for focused work)

#### Step 2: Enable Notifications (Recommended)

1. Click the 🔔 button in the top right
2. When browser prompts for notification permission, click "Allow"
3. Button turns blue when enabled
4. Now you'll receive alarms even in background

**Note**: Browser notifications are not available on iOS Safari. Use flash or vibration instead.

---

### Meeting Timer

Perfect for managing meeting and discussion time.

#### Basic Usage

##### Scenario 1: Manage Time for a 60-Minute Meeting

**Steps:**

1. **Click "Meeting Timer" tab**
   - Verify the left tab is selected

2. **Check alarm points**
   - Default: 30min, 50min, 60min
   - Skip this step if using defaults

3. **Start timer**
   - Click large green "Start" button
   - Timer starts counting from "00:00:00"
   - "Start time" and "Estimated end time" appear below current time

4. **During meeting**
   - At 30min: Alarm sounds, screen flashes ("30 minutes elapsed")
   - At 50min: Alarm sounds again ("50 minutes elapsed")
   - At 60min: Final alarm ("60 minutes elapsed")

5. **Stop alarm methods**
   - Tap the screen (if flash is ON)
   - Or click "Stop Alarm" button
   - Automatically stops after 30 seconds

6. **Pause timer**
   - Click red "Pause" button
   - Timer stops
   - Click "Start" again to resume

7. **Reset timer**
   - Click gray "Reset" button
   - Timer returns to 00:00:00
   - Alarm points reset to default

##### Scenario 2: End at 3:30 PM (Countdown Mode)

**Steps:**

1. **Select "Meeting Timer" tab**

2. **Enable countdown mode**
   - Click "Countdown Mode" toggle
   - Turns blue when ON

3. **Set end time**
   - Click time input field
   - Example: Enter `15:30`
   - If current time is 1:00 PM, displays "02:30:00" remaining

4. **Start timer**
   - Click "Start" button
   - Remaining time counts down

5. **When reaching zero**
   - Alarm sounds
   - Message: "Time's up!"
   - Timer stops automatically

#### Customizing Alarm Points

##### Add Alarm Points

**Example: Set alarms at 15min, 45min, 75min**

**Steps:**

1. Find "Alarm Points" section
2. Edit existing points:
   - Click first point's number "30"
   - Enter `15`
3. Edit second point:
   - Change "50" to `45`
4. Edit third point:
   - Change "60" to `75`
5. Settings automatically saved

##### Add New Alarm Point

**Steps:**

1. Click "Add Alarm Point" button
2. New point added (current elapsed time + 1min)
3. Edit number to set desired time
4. Example: Enter `90` for 90min (1h 30min) alarm

##### Delete Alarm Point

**Steps:**

1. Click "×" button on the right of the point to delete
2. Point is deleted
3. Recommend keeping at least one point

#### Customize Alarm Sound

##### Adjust Volume

**Steps:**

1. Scroll to "Meeting Alarm Settings" section
2. Drag "Volume" slider left/right
   - Left: Quieter
   - Right: Louder
3. Check value (0-100)
4. Recommended: 40-60

##### Change Frequency

**Steps:**

1. Click "Frequency" number input field
2. Enter value:
   - Low sound: `200` - `400` Hz
   - Medium sound: `400` - `600` Hz
   - High sound: `600` - `800` Hz
3. Default: `340` Hz

##### Test Playback

**Steps:**

1. Click yellow "Test" button
2. Alarm plays (every 5 seconds for up to 30 seconds)
3. To stop:
   - Tap screen
   - Or click "Stop Alarm" button
4. If sound not satisfactory, adjust volume/frequency and test again

##### Reset Settings

**Steps:**

1. Click "Reset" button
2. Returns to defaults: Volume 44, Frequency 340 Hz

---

### Pomodoro Timer

Ideal for focused work. Automatically switches between work and break time.

#### Basic Usage

##### Scenario: Standard Pomodoro Technique (25min work × 4 sets)

**Steps:**

1. **Click "Pomodoro Timer" tab**

2. **Check settings**
   - Default settings:
     - Work duration: 25min
     - Break duration: 5min
     - Cycles: 4 times
   - Proceed to next step if using defaults

3. **Start timer**
   - Click green "Start" button
   - Work time begins (blue background)
   - Display shows "🎯 Work Time"

4. **After 25 minutes**
   - Alarm sounds (work time end notification)
   - Automatically switches to break time (orange background)
   - Display shows "☕ Break Time"
   - Message: "Great work! Break time"

5. **After 5 minutes (break end)**
   - Alarm sounds (break end notification)
   - Automatically returns to work time (blue background)
   - Message: "Break over! Start working"
   - Cycle counter increases to "1 / 4"

6. **After 4 cycles complete**
   - Timer stops automatically
   - Great job!

7. **To stop midway**
   - Click red "Pause" button
   - Click "Start" to resume

8. **To restart from beginning**
   - Click "Reset" button
   - Cycle counter returns to 0

#### Customize Pomodoro Settings

##### Change Work Duration

**Example: Want 50-minute focus**

**Steps:**

1. Find "Pomodoro Settings" section
2. Click "Work Duration" number field
3. Enter `50`
4. Settings saved
5. Next timer start will use 50-minute work time

##### Change Break Duration

**Example: Want 10-minute break**

**Steps:**

1. Click "Break Duration" number field
2. Enter `10`
3. Settings saved

##### Change Cycle Count

**Example: Want 8 cycles (full workday)**

**Steps:**

1. Click "Cycles" number field
2. Enter `8`
3. Timer automatically stops after 8 cycles complete

##### Use Infinite Mode

**Steps:**

1. Click "Infinite Mode (unlimited cycles)" checkbox
2. When checked, cycle number input grays out
3. Timer repeats work and break forever
4. Continues until manual "Pause" or "Reset"

#### Set Individual Alarm Sounds

Pomodoro timer allows different sounds for work start and break start.

##### Work Time Alarm Settings

**Steps:**

1. Find "🎯 Work Time Alarm Settings" section
2. Adjust volume slider (recommended: 60-70)
3. Set frequency (default: 240 Hz)
   - Lower sound for calm work start notification
4. Confirm with "Test" button

##### Break Time Alarm Settings

**Steps:**

1. Find "☕ Break Time Alarm Settings" section
2. Adjust volume slider (recommended: 30-40)
   - Gentle volume recommended for breaks
3. Set frequency (default: 740 Hz)
   - Higher sound for light break start notification
4. Confirm with "Test" button

---

### Common Features

Features available for both Meeting Timer and Pomodoro Timer.

#### Notes Feature

Record meeting minutes or work content.

**Steps:**

1. Find "📝 Notes" section on the right side of screen
2. Click text area
3. Enter notes freely
   - Example (Meeting):
     ```
     Agenda:
     - Q1 sales report
     - New product planning

     Decisions:
     - Prepare materials by next week
     ```
   - Example (Pomodoro):
     ```
     Today's tasks:
     - Fix bug #123
     - Review specifications
     - Code refactoring
     ```
4. Content automatically saved
5. Content persists after closing browser
6. Meeting and Pomodoro have separate storage

#### TODO List

Manage tasks.

##### Add TODO

**Steps:**

1. Find "✅ TODO List" section on right side of screen
2. Click "Enter new TODO..." field
3. Enter task
   - Example: `Create presentation materials`
4. Press Enter key or click "Add" button
5. Added to list

##### Complete TODO

**Steps:**

1. Click checkmark button on left of completed task
2. Text gets strikethrough, background turns green
3. Click again to mark as incomplete

##### Edit TODO

**Steps:**

1. Click pencil icon on right of TODO to edit
2. Text becomes editable
3. Modify content
   - Example: `Create presentation materials` → `Create and email presentation materials`
4. Click save button (checkmark)
5. Or click × button to cancel

##### Delete TODO

**Steps:**

1. Click × button on right of TODO to delete
2. Deleted immediately without confirmation
3. Deleted TODOs cannot be restored, please be careful

##### Reorder TODOs

**Method 1: Move with buttons**

**Steps:**
1. To move up: Click ↑ button
2. To move down: Click ↓ button
3. Buttons gray out at top or bottom

**Method 2: Drag and drop**

**Steps:**
1. Drag (long press) TODO to move with mouse
2. Move to desired position
3. Release mouse to place at that position

#### Header Settings Buttons

Four settings buttons in top right of screen.

##### Tick Sound 🔊

Plays "tick-tock" clock sound during timer operation.

**Steps:**

1. Click 🔊 button
2. Green: ON (sound plays)
3. Gray: OFF (no sound)
4. Hear ticking sound when timer starts

**Tip**: Turn OFF for concentration, turn ON to be aware of time passing

##### Vibration 📳

Smartphone vibrates on alarm.

**Steps:**

1. Click 📳 button
2. Purple: ON (vibrates)
3. Gray: OFF (no vibration)
4. Effective on smartphones

**Note**: Does not vibrate on computers

##### Flash ⚡

Screen flashes white during alarm.

**Steps:**

1. Click ⚡ button
2. Yellow: ON (screen flashes)
3. Gray: OFF (no flash)
4. On alarm, entire screen turns white with "⏰ TIME UP! ⏰" displayed in center
5. Tap screen to dismiss

**Tip**: Useful when sound alone is not noticeable

##### Notifications 🔔

Notify alarms via browser notifications.

**Steps:**

1. Click 🔔 button for first time
2. Browser requests notification permission
3. Select "Allow"
4. Blue: ON (notifications delivered)
5. Gray: OFF (no notifications)
6. Test notification displays: "Notifications enabled!"

**Benefits**:
- Notifications delivered even when viewing other tabs
- Notice even when not looking at screen
- Notification popup appears on desktop

**Note**: Not available on iOS Safari

#### 4 Ways to Stop Alarm

When alarm is ringing, stop it with these methods:

**Method 1: Tap flash screen**
- Only when flash is ON
- Tap anywhere on white screen
- Stops immediately

**Method 2: Stop alarm button**
- Red "Stop Alarm" button appears in header
- Click this button
- Reliable way to stop

**Method 3: Click screen**
- When flash is OFF
- Click anywhere on screen
- Stops

**Method 4: Auto-stop**
- Leave for 30 seconds
- Stops automatically
- Safety measure if unnoticed

---

### FAQ

#### Q1: Where is data saved?

**A**: All data is saved in browser's local storage.

- Nothing sent to server
- Privacy completely protected
- Retained until browser data cleared
- Not shared across different browsers or devices

#### Q2: How to delete data?

**A**: Clear browser data.

**For Chrome/Edge:**
1. Press F12 to open developer tools
2. Click "Application" tab
3. Expand "Local Storage" on left
4. Click site URL
5. Right-click → Select "Clear"
6. Reload page (F5 key)

**For Safari/Firefox:**
1. Open developer tools
2. Find "Storage" tab
3. Delete Local Storage data

#### Q3: Does it work on smartphones?

**A**: Yes, fully supported.

- Responsive design adapts to screen size automatically
- Optimized for touch operations
- Vibration feature available
- Can add to home screen

**To add to iPhone home screen:**
1. Open in Safari
2. Tap share button at bottom of screen
3. Select "Add to Home Screen"
4. Launch from icon like an app

#### Q4: Does it work offline?

**A**: Works offline after initial access.

- Functions as PWA (Progressive Web App)
- Basic features available without internet connection
- All data saved locally

#### Q5: Notifications not received

**A**: Check the following:

1. **Verify notification button is blue**
   - Click 🔔 button if gray

2. **Check browser notification permission**
   - Chrome: Settings → Privacy and security → Site settings → Notifications
   - Verify site is "Allowed"

3. **Check OS notification settings**
   - Windows: Settings → System → Notifications
   - macOS: System Preferences → Notifications
   - Verify browser notifications allowed

4. **For iOS Safari**
   - Browser notifications not available
   - Use flash and vibration instead

#### Q6: No sound

**A**: Try the following:

1. **Check device volume**
   - Verify not muted
   - Verify volume not at 0

2. **Check if browser tab is muted**
   - Check tab speaker icon

3. **Test with test button**
   - Click "Test" button in alarm settings
   - Verify sound plays

4. **Increase volume setting**
   - Set alarm settings volume slider to 80 or higher

#### Q7: Tick sound not playing (smartphone)

**A**: Mobile browser specification.

- Many mobile browsers restrict automatic audio playback
- Plays after tapping timer start button
- This is browser security feature

#### Q8: Alarm stops after 30 seconds

**A**: This is by design.

- Alarm plays every 5 seconds, stops automatically after 30 seconds
- Designed to prevent endless ringing
- See developer manual to change

#### Q9: Can I use in multiple tabs simultaneously?

**A**: Possible but requires caution.

- Each tab operates independently
- Last updated tab's content is saved
- Recommend using in single tab normally

#### Q10: How to backup data?

**A**: Currently no export feature.

- Data saved in browser's local storage
- Copy and paste important notes elsewhere
- Export feature planned for future

---

## 🛠️ Developer Guide

### Setup Development Environment

#### Requirements

- **Node.js**: 18.x or higher (recommended: 20.x)
- **Package Manager**: npm, yarn, pnpm, or bun
- **Git**: For version control
- **Editor**: VS Code recommended (TypeScript support)

#### Setup Steps

##### 1. Clone Repository

```bash
# Clone via HTTPS
git clone https://github.com/BoxPistols/comm-time.git

# Or clone via SSH
git clone git@github.com:BoxPistols/comm-time.git

# Navigate to directory
cd comm-time
```

##### 2. Install Dependencies

```bash
# With npm
npm install

# With yarn
yarn install

# With pnpm
pnpm install

# With bun
bun install
```

**Installed packages:**
- Next.js 14.x
- React 18.x
- TypeScript
- Tailwind CSS
- Lucide Icons
- react-beautiful-dnd

##### 3. Start Development Server

```bash
# With npm
npm run dev

# With yarn
yarn dev

# With pnpm
pnpm dev

# With bun
bun dev
```

**When successful:**
```
  ▲ Next.js 14.x
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

##### 4. Access in Browser

1. Open [http://localhost:3000](http://localhost:3000) in browser
2. Verify app displays
3. Files auto-reload when edited via hot reload

---

### Build and Deploy

#### Local Build

##### Create Production Build

```bash
# Execute build
npm run build

# .next folder generated when successful
```

##### Test Build

```bash
# Start production server
npm run start

# Open http://localhost:3000 in browser
```

#### Deploy to Vercel

This project auto-deploys on Vercel.

##### Auto Deploy (Recommended)

**Production deploy on main branch push:**

```bash
# Commit changes
git add .
git commit -m "Update: Add feature"

# Push to main branch
git push origin main
```

**Result:**
- Build starts automatically
- Production environment updates in a few minutes
- Accessible at https://comm-time.vercel.app

**Preview environment for pull requests:**

```bash
# Create new branch
git checkout -b feature/new-function

# Commit changes
git add .
git commit -m "Add: New feature"

# Push branch
git push origin feature/new-function
```

**Result:**
- Preview environment automatically generated when creating pull request
- Preview URL displayed in PR comments
- Test without affecting production environment

##### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview environment
vercel

# Deploy to production environment
vercel --prod
```

---

### Code Editing

#### File Structure

```
comm-time/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (metadata, fonts)
│   ├── page.tsx                # Top page (displays CommTimeComponent)
│   ├── globals.css             # Global styles
│   └── fonts/                  # Geist font files
│       ├── GeistVF.woff
│       └── GeistMonoVF.woff
├── components/                 # React components
│   └── comm-time.tsx           # Main component (2000+ lines)
├── lib/                        # Utility functions
│   └── utils.ts                # Tailwind CSS helper
├── public/                     # Static files
│   └── favicon.svg             # Favicon (timer icon)
├── .vscode/                    # VS Code settings
│   └── settings.json           # Editor settings
├── node_modules/               # Dependency packages (in .gitignore)
├── .next/                      # Build output (in .gitignore)
├── package.json                # Project settings
├── tsconfig.json               # TypeScript settings
├── tailwind.config.ts          # Tailwind CSS settings
├── next.config.mjs             # Next.js settings
├── postcss.config.mjs          # PostCSS settings
└── README.md                   # This file
```

#### Main Edit Locations

##### 1. Change Favicon

**File**: `public/favicon.svg`

**Steps:**

1. Open `public/favicon.svg` in SVG editor
2. Edit design
3. Save and reload browser

**SVG code example:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#6366f1"/>
  <circle cx="50" cy="50" r="40" fill="white"/>
  <!-- Add design here -->
</svg>
```

**Verification:**
- Check icon in browser tab
- Verify icon settings in `app/layout.tsx`

##### 2. Change Color Theme

**File**: `components/comm-time.tsx`

**Change gradient example:**

```typescript
// Header gradient (around lines 69-71)
<h1 className="... bg-gradient-to-r from-indigo-600 to-purple-600 ...">
  Comm Time
</h1>

// Change to different colors
<h1 className="... bg-gradient-to-r from-blue-600 to-cyan-600 ...">
  Comm Time
</h1>
```

**Change timer background example:**

```typescript
// Meeting timer (around line 1129)
<div className="bg-gradient-to-br from-indigo-500 to-purple-600 ...">

// Change to different colors
<div className="bg-gradient-to-br from-green-500 to-emerald-600 ...">
```

**Change button color example:**

```typescript
// Start button (around line 1156)
bg-gradient-to-r from-green-500 to-emerald-500

// Change to orange
bg-gradient-to-r from-orange-500 to-red-500
```

**Tailwind color palette:**
- `red`: Red tones
- `orange`: Orange tones
- `yellow`: Yellow tones
- `green`: Green tones
- `blue`: Blue tones
- `indigo`: Indigo tones
- `purple`: Purple tones
- `pink`: Pink tones

Numbers: `50` (light) ~ `900` (dark)

##### 3. Change Default Settings

**File**: `components/comm-time.tsx`

**Change alarm points (lines 53-57):**

```typescript
const initialMeetingAlarmPoints: AlarmPoint[] = [
  { id: "1", minutes: 30, isDone: false, remainingTime: 30 * 60 },
  { id: "2", minutes: 50, isDone: false, remainingTime: 50 * 60 },
  { id: "3", minutes: 60, isDone: false, remainingTime: 60 * 60 },
];

// Example: Change to 15, 30, 45 minutes
const initialMeetingAlarmPoints: AlarmPoint[] = [
  { id: "1", minutes: 15, isDone: false, remainingTime: 15 * 60 },
  { id: "2", minutes: 30, isDone: false, remainingTime: 30 * 60 },
  { id: "3", minutes: 45, isDone: false, remainingTime: 45 * 60 },
];
```

**Meeting alarm settings (lines 59-62):**

```typescript
const initialMeetingAlarmSettings: AlarmSettings = {
  volume: 44,      // Volume (0-100)
  frequency: 340,  // Frequency (Hz)
};

// Example: Louder, lower frequency
const initialMeetingAlarmSettings: AlarmSettings = {
  volume: 70,      // Louder
  frequency: 240,  // Lower sound
};
```

**Pomodoro settings (lines 64-77):**

```typescript
const initialPomodoroSettings = {
  workDuration: 25,      // Work duration (min)
  breakDuration: 5,      // Break duration (min)
  cycles: 4,             // Cycle count
  infiniteMode: false,   // Infinite mode
  workAlarm: {
    volume: 65,
    frequency: 240,
  },
  breakAlarm: {
    volume: 36,
    frequency: 740,
  },
};

// Example: Change to 50min work, 10min break
const initialPomodoroSettings = {
  workDuration: 50,      // 50min work
  breakDuration: 10,     // 10min break
  cycles: 4,
  infiniteMode: false,
  workAlarm: {
    volume: 65,
    frequency: 240,
  },
  breakAlarm: {
    volume: 36,
    frequency: 740,
  },
};
```

##### 4. Change Alarm Duration

**File**: `components/comm-time.tsx` (lines 350-365)

**Alarm repeat count and interval:**

```typescript
// Repeat alarm (every 5s for 30s)
playSound(); // First play
let alarmCount = 0;
alarmIntervalRef.current = setInterval(() => {
  alarmCount++;
  if (alarmCount >= 6) {  // 6 times × 5s = 30s
    stopAlarm();
  } else {
    playSound();
    // Vibration...
  }
}, 5000);  // Every 5 seconds
```

**Example: Play every 10s for 1 minute:**

```typescript
let alarmCount = 0;
alarmIntervalRef.current = setInterval(() => {
  alarmCount++;
  if (alarmCount >= 6) {  // 6 times × 10s = 60s
    stopAlarm();
  } else {
    playSound();
  }
}, 10000);  // Every 10 seconds
```

**Example: Play every 3s for 15 seconds:**

```typescript
let alarmCount = 0;
alarmIntervalRef.current = setInterval(() => {
  alarmCount++;
  if (alarmCount >= 5) {  // 5 times × 3s = 15s
    stopAlarm();
  } else {
    playSound();
  }
}, 3000);  // Every 3 seconds
```

##### 5. Change Flash Duration

**File**: `components/comm-time.tsx` (lines 373-376)

```typescript
// Flash effect (longer)
if (flashEnabled) {
  setIsFlashing(true);
  setTimeout(() => setIsFlashing(false), 30000); // Flash for 30s
}

// Example: Change to 60s flash
if (flashEnabled) {
  setIsFlashing(true);
  setTimeout(() => setIsFlashing(false), 60000); // Flash for 60s
}
```

#### Example of Adding New Feature

##### Example: Add "10 Second Countdown" Button

**Steps:**

1. Open `components/comm-time.tsx`

2. Add state variables (around line 140):

```typescript
const [quickCountdown, setQuickCountdown] = useState(false);
const [quickCountdownSeconds, setQuickCountdownSeconds] = useState(10);
```

3. Add countdown function:

```typescript
const startQuickCountdown = useCallback(() => {
  setQuickCountdown(true);
  setQuickCountdownSeconds(10);

  const interval = setInterval(() => {
    setQuickCountdownSeconds((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        setQuickCountdown(false);
        playAlarm(meetingAlarmSettings, "10 seconds elapsed!");
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
}, [meetingAlarmSettings, playAlarm]);
```

4. Add button to UI (around line 1178, after reset button):

```typescript
<button
  type="button"
  onClick={startQuickCountdown}
  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
>
  10 Second Countdown
</button>
```

5. Add countdown display:

```typescript
{quickCountdown && (
  <div className="text-center text-2xl font-bold text-red-600">
    {quickCountdownSeconds} seconds left
  </div>
)}
```

6. Save and check in browser

---

### Troubleshooting

#### Development Environment Issues

##### Error: `npm install` fails

**Cause**: Node.js version too old

**Solution:**

```bash
# Check Node.js version
node --version

# Update if not 18.x or higher
# Download from https://nodejs.org/

# Or use nvm
nvm install 20
nvm use 20
```

##### Error: Port 3000 in use

**Cause**: Another application using port 3000

**Solution:**

```bash
# Start on different port
PORT=3001 npm run dev

# Or terminate existing process
# Windows
netstat -ano | findstr :3000
taskkill /PID <process ID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

##### Error: TypeScript errors appear

**Cause**: Type definition mismatch

**Solution:**

```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Or
rm -rf node_modules package-lock.json
npm install
```

#### Build Issues

##### Error: Build fails

**Cause**: TypeScript errors or ESLint warnings

**Check:**

```bash
# Check TypeScript
npx tsc --noEmit

# Check ESLint
npm run lint
```

**Solution:**

```bash
# Rebuild after fixing errors
npm run build
```

##### Error: Build fails due to memory shortage

**Cause**: Node.js memory limit

**Solution:**

```bash
# Increase memory limit for build
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### Deploy Issues

##### Build fails on Vercel

**Check:**

1. **Verify build succeeds locally**
```bash
npm run build
```

2. **Check Node.js version in package.json**
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

3. **Check Vercel logs**
   - Login to Vercel dashboard
   - Select project
   - Check error logs in Deployments tab

##### App doesn't work after deploy

**Check:**

1. **Check browser console**
   - Open developer tools with F12
   - Check for errors in Console tab

2. **Verify environment variables set correctly**
   - Check Environment Variables in Vercel settings

3. **Verify static files placed correctly**
   - Check public/favicon.svg exists

#### Application Issues

##### Issue: Data not saved

**Cause 1**: Browser in incognito mode

**Solution**: Use in normal mode

**Cause 2**: Cookies or storage disabled in browser settings

**Solution:**
- Chrome: Settings → Privacy and security → Cookies and other site data
- Set to "Allow all cookies"

##### Issue: Alarm sound not playing

**Debug steps:**

1. **Check browser console**
```javascript
// Open developer tools with F12
// Check Console tab
// Look for messages like "Audio playback error"
```

2. **Test with test playback**
   - Click "Test" button in alarm settings
   - Adjust volume or frequency if no sound

3. **Check browser autoplay policy**
```javascript
// Run in Console
navigator.mediaDevices.enumerateDevices().then(devices => {
  console.log(devices);
});
```

##### Issue: Poor performance

**Cause**: Browser extensions or memory shortage

**Solution:**

1. **Disable browser extensions**
   - Try in incognito mode

2. **Close other tabs**
   - Free up memory

3. **Restart browser**

---

### Debugging Tips

#### React Developer Tools

```bash
# Install React Developer Tools
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/
```

**Usage:**
1. Open developer tools with F12
2. Select "Components" tab
3. Check component tree
4. View state and props values

#### Debug with Console.log

```typescript
// Add to components/comm-time.tsx
useEffect(() => {
  console.log('Timer start:', isMeetingRunning);
  console.log('Elapsed time:', meetingElapsedTime);
}, [isMeetingRunning, meetingElapsedTime]);
```

#### Check Local Storage

```javascript
// Run in browser Console
console.log(localStorage.getItem('alarmPoints'));
console.log(localStorage.getItem('meetingMemo'));

// Check all keys
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});
```

---

## 🤝 Contributing

Pull requests are welcome!

**Steps:**

1. Fork this repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add: Amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Create pull request

---

## 📄 License

This project is published under the MIT License.

---

## 🙏 Credits

- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [Lucide Icons](https://lucide.dev) - Icon library
- [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd) - Drag and drop
- [Vercel](https://vercel.com) - Hosting

---

## 📞 Support

If you encounter issues, please report them in GitHub Issues.

**Repository**: [https://github.com/BoxPistols/comm-time](https://github.com/BoxPistols/comm-time)
