# GreenWave – adaptive, connected traffic signals

**Team Cubitx · VISTERA 2026**
Chandra Shekar Ch · Poornsri B · Shreeja P · Mahesh N · Rajesh B

A working prototype of a traffic signal that **sees** the queue on each road with a camera, **decides** the green from that queue instead of a fixed timer, **coordinates** with the next junction so vehicles meet a green wave, **learns** better timings for every hour of the day, and gives an **ambulance** a clear path as an extra feature.

Everything runs in your browser plus one small Python server. No hardware, no cloud, no account.

---

## 1. How to run it

**You need:** Windows, Python 3, and Chrome or Edge. Be online the first time (the detection model and the default video download once, then everything works offline).

```bash
git clone https://github.com/RohitMunnuru9/greenwave.git
cd greenwave
run.bat
```

`run.bat` starts the local server on http://localhost:8765 and opens three tabs:

| Tab | What it is |
|---|---|
| **Junction A** | The live junction. The camera feed starts by itself and the signal is controlled from what the camera sees. This is the main screen. |
| **Junction B** | The next junction, 400 m down the corridor. It receives platoon and ambulance messages from A. |
| **Control room** | The city view of all junctions and the feed of every message between them. |

Keep the black `run.bat` window open while you use the app. Close it to stop.

If the tabs do not open by themselves, open the three links by hand:

```
http://localhost:8765/index.html#junction=A&auto
http://localhost:8765/index.html#junction=B&auto
http://localhost:8765/index.html#control
```

Keep **Junction A visible** on screen. A browser only plays video in a tab you can see, so the detector pauses when that tab is hidden.

---

## 2. What to click (in order, about four minutes)

1. **See the traffic.** The feed is already running on a real CCTV view of a busy Indian four-way crossroads. Green boxes are moving vehicles. Yellow boxes are vehicles that have stopped at the red. Only the stopped ones count as the queue. The picture is split into four regions, one per road (North top, South bottom, West left, East right).
2. **Smarter signals.** The signal holds green while the busy road still has a queue, switches when the other road is longer, and never makes any road wait more than 75 s. The green box explains every decision in plain words.
3. **Connected roads.** The 3D city. J-01 Market Road is Junction A, J-02 Central Junction is Junction B, J-03 Hospital Road runs on simulated timing. Amber cars are the real queues, the signal heads are the live phases, cars gliding along the corridor are platoons that A announced to B. Click a junction card to read why its signal changed. Toggle 3D view / Top view, drag to pan, + / − to zoom.
4. **Emergency first.** Press **Simulate ambulance** (or set Source to *Ambulance test clip* and Start feed, and the camera flags the ambulance by itself after about 10 s). Junction A protects its green, Junction B shows a red banner with a countdown and clears its own green 12 s before the ambulance arrives, then acknowledges.
5. **A smoother commute.** Average waiting time, live. Green is GreenWave, red is the old fixed timer on the same traffic. **Run 30 s + 30 s comparison** measures both.
6. **Learn every day.** The table of what the junction learned for this time of day and the minimum greens it now uses. It is remembered in the browser between runs.

Shortcut: **Run 60-second demo** on Junction A does steps 1, 4 and 5 for you.

### Other things you can do

- **Your own video:** set Source to *YouTube link*, paste a link, press Start feed. The server downloads it once (progress shows on the card) and plays it. It is then listed under *Downloaded videos*. To change the clip that starts every run, edit the `DEFAULT_YOUTUBE` line near the top of the script in `index.html`.
- **Region layout:** if your clip is a two-way road, change the layout from four regions to left/right or top/bottom. For a free-flowing highway, set count to *all vehicles*.
- **Evidence:** *Download log (CSV)* gives every decision with queues and waiting time. *Download lessons (CSV)* gives the learning table.
- **Forget everything** clears what the junction learned.

---

## 3. What is in this folder

| File | What it does |
|---|---|
| `index.html` | The whole app: the pages, the vehicle detector, the signal controller, the messaging between junctions, the learning, the charts. One file. |
| `iso.js` | Draws the 3D city (buildings, roads, signal heads, queued cars, platoons, ambulance) from the live junction states. |
| `server.py` | A tiny local web server. Serves the app and, when you paste a YouTube link, downloads the video with yt-dlp into `videos/`. |
| `run.bat` | Starts the server and opens the three tabs. |
| `get_video.bat` | Downloads a YouTube video by hand, if you prefer. |
| `videos/` | The default crossroads clip (also the offline *Sample CCTV clip*) and two ambulance clips. |
| `README.txt` | The short text version of this guide. |
| `GreenWave_Prototype_Master_Plan.pdf` | Full design: what each part does, limits, how the pilot would differ. |
| `GreenWave_Demo_Script.pdf` | What to say and click, minute by minute, plus likely judge questions. |
| `index_v1_backup.html`, `index_v2_backup.html` | Earlier versions, kept for reference. |

---

## 4. How it works, in simple words

**The problem.** Today a junction runs on an ATC plan or a fixed timer. The timings were set in advance, so they are wrong the moment the real traffic changes: one road gets a long green with nobody on it while the other road queues. GreenWave replaces that with control from the real queue.

**See.** A neural network (COCO-SSD, running inside the browser with TensorFlow.js) finds every car, bus, truck and motorbike in each video frame. The frame is split into four regions, one per road. A vehicle that has not moved for a few frames is marked *queued*. So each road's queue number comes straight from the picture, several times a second.

**Decide.** The controller looks at the queues ten times a second and follows a few rules that are easy to say out loud:
- hold green while the road with the green still has a queue;
- switch when the other road's queue is clearly longer;
- never give a green shorter than 8 s or longer than 45 s, always 2.5 s of amber, and never make any road wait more than 75 s (fairness);
- write down the reason for every decision in plain words.

**Coordinate.** When Junction A releases a platoon, it sends a small message to Junction B: how many vehicles, and when they will arrive. B times its green to meet them. That is the green wave. In this prototype the message goes over a browser channel; in a real pilot the same message goes over MQTT on the city network.

**Learn.** At the end of every signal cycle the junction records which road carried more of the demand at this time of day and the waiting time it achieved. After two cycles it starts each green from what it learned: the busier road gets a longer minimum green at that hour. So Monday 9 a.m. gets better every Monday. The lessons are saved in the browser.

**Ambulance (extra feature).** The detector looks for the red-and-white signature of an ambulance body and light bar, held for four frames. When it sees one, or when you press the button, the junction overrides the normal queue logic: it protects a green for the ambulance and tells the next junction the arrival time. The next junction clears its own green 12 s early and acknowledges. When the ambulance has passed, control goes straight back to the queues.

**Measure.** The waiting-time chart runs the adaptive controller and the old fixed timer on the same traffic so you can see the difference, and every decision can be downloaded as CSV.

**What the pilot would change.** The camera becomes the junction's own CCTV stream, the controller runs on a small box in the signal cabinet, messages travel over MQTT, and the rule set is replaced by a reinforcement-learning policy trained in SUMO behind the same safety guard.
