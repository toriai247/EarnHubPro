
const fs = require('fs');

function getCrashResult() {
    // 5% chance of instant crash at 1.00x (Risk Factor)
    const r = Math.random();
    if (r < 0.05) return 1.00;

    // Pareto distribution: Multiplier = (1 - HouseEdge) / (1 - r)
    // House Edge of 5% (0.95 factor)
    let multiplier = 0.95 / (1.0 - r);
    
    // Clamp to 1.00 minimum
    if (multiplier < 1.00) multiplier = 1.00;
    
    // Cap at 100x
    if (multiplier > 100) multiplier = 100; 

    return Math.floor(multiplier * 100) / 100;
}

const TOTAL_ROUNDS = 5000;
const data = [];

console.log(`Generating ${TOTAL_ROUNDS} simulated crash rounds...`);

let currentTime = Date.now();

for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const crash = getCrashResult();
    
    // Formula for flight time: t = ln(M) / k
    // k ≈ 0.23025 (Derived from 100x in 20s)
    const flightTimeSec = Math.log(crash) / 0.23025;
    const flightTimeMs = Math.min(20000, flightTimeSec * 1000);
    
    const roundDuration = 7000 + flightTimeMs + 2000; // Bet (7s) + Fly + Delay (2s)
    currentTime += roundDuration;
    
    const date = new Date(currentTime);
    const timeStr = date.toLocaleTimeString('en-US', { hour12: false });
    
    data.push({
        round: i + 1,
        approx_time: timeStr,
        crash: crash.toFixed(2) + 'x'
    });
}

fs.writeFileSync('crash_data.json', JSON.stringify(data, null, 2));
console.log(`Success! Generated ${data.length} rounds. Saved to crash_data.json`);
