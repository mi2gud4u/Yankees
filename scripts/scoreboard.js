const apiUrl = "https://gamefunction-fzdkbcguh9bmhsgx.westus-01.azurewebsites.net";
const params = new URLSearchParams(window.location.search);
const gameID = params.get("gameID");
let isHomeGlobal = null;

function renderInnings(guest, home) {
    const gInn = [...(guest || [])];
    const hInn = [...(home || [])];

    while (gInn.length < 9) gInn.push("");
    while (hInn.length < 9) hInn.push("");

    for (let i = 0; i < 9; i++) {
        document.getElementById("g" + (i + 1)).innerHTML =
            gInn[i] !== "" ? gInn[i] : "&nbsp;";

        document.getElementById("h" + (i + 1)).innerHTML =
            hInn[i] !== "" ? hInn[i] : "&nbsp;";
    }

    const gTotal = gInn.reduce((a, b) => a + (parseInt(b) || 0), 0);
    const hTotal = hInn.reduce((a, b) => a + (parseInt(b) || 0), 0);

    document.getElementById("gTotal").textContent = gTotal;
    document.getElementById("hTotal").textContent = hTotal;

    document.getElementById("opponentScore").textContent =
        isHomeGlobal ? hTotal : gTotal;

    document.getElementById("yourScore").textContent =
        isHomeGlobal ? gTotal : hTotal;
}

async function loadGame() {
    const res = await fetch(`${apiUrl}/api/games/${gameID}`);
    const game = await res.json();

    isHomeGlobal = game.home_away === "home";
    const isHome = isHomeGlobal;
    const isSimulated = game.game_status === "simulated";

    const myName = game.myTeam;
    const oppName = game.opponent_team.name;

    const leftTeamName  = isHome ? oppName : myName;
    const rightTeamName = isHome ? myName : oppName;

    document.getElementById("teamName").textContent = `${leftTeamName} @ ${rightTeamName}`;
    document.getElementById("leftTeam").textContent = leftTeamName;
    document.getElementById("rightTeam").textContent = rightTeamName;

    const now = new Date();
    const start = new Date(game.start_ts);
    const end = new Date(game.end_ts);

    let statusText = "";
    let statusClass = "";

    if (game.game_status === "completed") {
        statusText = "FINAL";
        statusClass = "final";
        document.getElementById("simulateBtn").style.display = "none";
    }
    else if (now >= start && now <= end) {
        statusText = "LIVE";
        statusClass = "live";
    }
    else if (game.game_status === null) {
        if (start > now) {
            statusText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                         " @ " + start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            statusClass = "future";
        } else {
            statusText = "CANCELLED";
            statusClass = "cancelled";
        }
    }
    else if (start > now) {
        statusText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                     " @ " + start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        statusClass = "future";
    }
    else {
        statusText = "CANCELLED";
        statusClass = "cancelled";
    }

    const statusEl = document.getElementById("gameStatus");
    statusEl.textContent = statusText;
    statusEl.className = statusClass;

    if (!isSimulated)
    {
        const guestInn = isHome ? game.line_score.opponent_team.scores : game.line_score.team.scores;
        const homeInn  = isHome ? game.line_score.team.scores : game.line_score.opponent_team.scores;
    }

    renderInnings(guestInn, homeInn);
}

loadGame();

const simApiUrl = "https://livescoreapi-2hbs.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const simulateBtn = document.querySelector("button");

    if (simulateBtn) {
        simulateBtn.addEventListener("click", () => {
            simulateGame();
        });
    }
});

function simulateGame() {
    const gameID = new URLSearchParams(window.location.search).get("gameID");

    window.open(`live.html?gameID=${gameID}`, "_blank", "noopener,noreferrer");

    fetch(`${simApiUrl}/api/sim/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            home_away: isHomeGlobal ? "home" : "away"
        })
    });

    setInterval(async () => {
        try {
            const res = await fetch(`${simApiUrl}/api/sim-game`);
            const sim = await res.json();
            updateFromSim(sim);
        } catch (err) {
            console.error("Sim error:", err);
        }
    }, 1000);
}



function updateFromSim(sim) {
    document.getElementById("currentInning").textContent = sim.inning;
    document.getElementById("gameStatus").textContent = "SIMULATED";

    document.getElementById("pitchesGuest").textContent = sim.oppPitchCount;
    document.getElementById("pitchesHome").textContent = sim.teamPitchCount;

    document.getElementById("balls").textContent = sim.balls;
    document.getElementById("strikes").textContent = sim.strikes;
    document.getElementById("outs").textContent = sim.outs;

    document.getElementById("base1").classList.toggle("on", sim.runnerOn1);
    document.getElementById("base2").classList.toggle("on", sim.runnerOn2);
    document.getElementById("base3").classList.toggle("on", sim.runnerOn3);

    // FIXED BATTING ORDER LOGIC
    let guest, home;

    if (isHomeGlobal) {
        guest = sim.oppScores;  // opponent bats first
        home  = sim.teamScores; // home bats second
    } else {
        guest = sim.teamScores; // away bats first
        home  = sim.oppScores;  // opponent bats second
    }

    renderInnings(guest, home);
}
