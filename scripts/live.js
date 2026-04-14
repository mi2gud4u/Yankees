const simApiUrl = "https://livescoreapi-2hbs.onrender.com";

const apiUrl = "https://gamefunction-fzdkbcguh9bmhsgx.westus-01.azurewebsites.net";
const params = new URLSearchParams(window.location.search);
const gameID = params.get("gameID");

async function loadTeams() {
    const res = await fetch(`${apiUrl}/api/games/${gameID}`);
    const game = await res.json();
    
    const isHome = game.home_away === "home";
    const myName = game.myTeam;
    const oppName = game.opponent_team.name;
    
    const leftTeamName  = isHome ? oppName : myName;
    const rightTeamName = isHome ? myName : oppName;
    
    document.getElementById("game-id").textContent =`${leftTeamName} @ ${rightTeamName}`;
    document.getElementById("leftTeam").textContent =`${leftTeamName}`;
    document.getElementById("rightTeam").textContent =`${rightTeamName}`;
}

loadTeams();

setInterval(async () => {
  try {
      const res = await fetch(`${simApiUrl}/api/sim-game`);
      const sim = await res.json();
      updateFromSim(sim);
  } catch (err) {
      console.error("Sim error:", err);
  }
}, 1000);

  
function updateFromSim(sim) {
    if(sim.inning === 1)
    {
       document.getElementById("inning-box").textContent = `${sim.inning}ST INNING`;
    } else if(sim.inning === 2) {
       document.getElementById("inning-box").textContent = `${sim.inning}ND INNING`;
    } else if(sim.inning === 3) {
       document.getElementById("inning-box").textContent = `${sim.inning}RD INNING`;
    } else {
       document.getElementById("inning-box").textContent = `${sim.inning}TH INNING`;
    }

    document.getElementById("balls").textContent = sim.balls;
    document.getElementById("strikes").textContent = sim.strikes;
    document.getElementById("outs").textContent = sim.outs;
    
    document.getElementById("base1").classList.toggle("active", sim.runnerOn1);
    document.getElementById("base2").classList.toggle("active", sim.runnerOn2);
    document.getElementById("base3").classList.toggle("active", sim.runnerOn3);
    
    document.getElementById("pitchType").textContent = sim.lastPitch;
    document.getElementById("teamHits").textContent = sim.teamHits;
    document.getElementById("oppHits").textContent = sim.oppHits;
    
    const currentBatter = (sim.inning === "top") 
      ? sim.oppBatters[sim.oppBatterIndex] 
      : sim.teamBatters[sim.teamBatterIndex];
    
    document.getElementById("batterName").textContent = currentBatter;
    
    const pbp = document.getElementById("playByPlay");
    const latest = document.getElementById("pbp-latest");
    
    if (Array.isArray(sim.playByPlay) && sim.playByPlay.length > 0) {
      latest.textContent = sim.playByPlay[sim.playByPlay.length - 1];
    
      pbp.innerHTML = sim.playByPlay
          .map(line => `<div class="pbp-line">${line}</div>`)
          .join("");
    
    } else {
      latest.textContent = "Waiting for first pitch...";
    }
       
    updateInnings(sim);
}

function updateInnings(sim) {
    const guest = sim.oppScores;
    const home  = sim.teamScores;

    const gRuns = guest.reduce((a,b)=>a+b,0);
    const hRuns = home.reduce((a,b)=>a+b,0);

    document.getElementById("gTotal").textContent = gRuns;
    document.getElementById("hTotal").textContent = hRuns;

    document.getElementById("gScoreBox").textContent = gRuns;
    document.getElementById("hScoreBox").textContent = hRuns;
}


function startSim() {
    fetch(`${simApiUrl}/api/sim/start`, { method: "POST" });
}

function stopSim() {
    fetch(`${simApiUrl}/api/sim/stop`, { method: "POST" });
}

function resetSim() {
    fetch(`${simApiUrl}/api/sim/reset`, { method: "POST" });
}

document.getElementById("pbp-toggle").addEventListener("click", () => {
    const pbp = document.getElementById("playByPlay");
    const toggle = document.getElementById("pbp-toggle");

    pbp.classList.toggle("collapsed");

    if (pbp.classList.contains("collapsed")) {
        toggle.textContent = "PLAY BY PLAY ►";
    } else {
        toggle.textContent = "PLAY BY PLAY ▼";
    }
});
