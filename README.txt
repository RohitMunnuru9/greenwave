GreenWave prototype (Team Cubitx, VISTERA 2026)

1. Be online the first time (the detection model downloads once).
2. Double-click run.bat. It opens three tabs: Junction A (camera), Junction B, Control room. Both junctions start the default YouTube video by themselves: a fixed CCTV view of a busy Indian four-way crossroads with a signal (youtube.com/watch?v=_l99w_CKwCU) (downloaded once, then played from the videos folder). To use a different video for every run, change the DEFAULT_YOUTUBE line near the top of the script in index.html, or just paste another link in the box and press Start feed.
3. The feed is already running in Junction A (the same crossroads clip is also under Source: "Sample CCTV clip", so it works offline). Green boxes = moving vehicles, yellow = stopped (queued). The frame is split into four approach regions (top North, bottom South, left West, right East); change the layout to match your clip. For a free-flowing highway clip set count to "all vehicles".
4. Your own junction video from YouTube: set Source to "YouTube link", paste the link, click Start feed. The local server downloads it (progress shows on the feed card) and it starts playing. Downloaded videos stay under Source: "Downloaded videos". Junction B can play a clip too.
5. Camera-triggered ambulance: in Junction A set Source to "Ambulance test clip" and Start feed; about 10 seconds in, the camera itself flags the ambulance and alerts Junction B. Easiest overall: click "Run 60-second demo" in Junction A. It starts the feed, fires an ambulance at 20 s, switches to the fixed timer at 45 s and back. Or click "Simulate ambulance" yourself and watch Junction B and the Control room react.
6. "Switch to fixed timer" shows the waiting time rise when the adaptive control is off; "Run 30 s + 30 s comparison" does it for you and reports both numbers.
7. "Connected roads" (and the Control room) show the North corridor as a 3D city: J-01 Market Road is Junction A, J-02 Central Junction is Junction B, J-03 Hospital Road runs on simulated timing. Signal heads, queued vehicles (amber), platoons and the ambulance move with the live data. Click a junction card to read why its signal changed; use 3D view / Top view, drag to pan, + / - to zoom.
8. "Learn every day" shows what the junction learned for this time of day (NS share of demand and the minimum greens it now uses). It is remembered in the browser between runs; "Forget everything" clears it.

Needs: Python 3 (for the local server) and Chrome or Edge. Keep the run.bat window open while presenting.
Full details: GreenWave_Prototype_Master_Plan.pdf
9. "Download log (CSV)" and "Download lessons (CSV)" export the evidence: every decision with queues and waiting time, and the learning table.
Demo words and clicks: GreenWave_Demo_Script.pdf
