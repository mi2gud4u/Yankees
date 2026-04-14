    const apiUrl = "https://gamefunction-fzdkbcguh9bmhsgx.westus-01.azurewebsites.net";
    const params = new URLSearchParams(window.location.search);
    const gameID = params.get("gameID");
    let isHomeGlobal = null;
    
    async function loadGame() {
        const res = await fetch(`${apiUrl}/api/games/${gameID}`);
        const game = await res.json();

        isHomeGlobal = game.home_away === "home";
        const isHome = game.home_away === "home";
        const myName = game.myTeam;
        const oppName = game.opponent_team.name;
        
        const leftTeamName  = isHome ? oppName : myName;
        const rightTeamName = isHome ? myName : oppName;
        
        document.getElementById("teamName").textContent =`${leftTeamName} @ ${rightTeamName}`;
        document.getElementById("leftTeam").textContent =`${leftTeamName}`;
        document.getElementById("rightTeam").textContent =`${rightTeamName}`;

        const now = new Date();
        const start = new Date(game.start_ts);
        const end = new Date(game.end_ts);
            
        let statusText = "";
        let statusClass = "";
        
        // 1. Completed
        if (game.game_status === "completed") {
            statusText = "FINAL";
            statusClass = "final";
            document.getElementById("simulateBtn").style.display = "none";
        }
        
        // 2. Live
        else if (now >= start && now <= end) {
            statusText = "LIVE";
            statusClass = "live";
        }
        
        // 3. Null status → future = show date, past = cancelled
        else if (game.game_status === null) {
        
            if (start > now) {
                // Future game → show date/time
                statusText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                             " @ " + start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                statusClass = "future";
            } else {
                // Past game with no status → cancelled
                statusText = "CANCELLED";
                statusClass = "cancelled";
            }
        }
        
        // 4. Everything else → show date/time (non-null but future)
        else if (start > now) {
            statusText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                         " @ " + start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            statusClass = "future";
        }
        
        // 5. Past but not completed → cancelled
        else {
            statusText = "CANCELLED";
            statusClass = "cancelled";
        }
        
        const statusEl = document.getElementById("gameStatus");
        statusEl.textContent = statusText;
        statusEl.className = statusClass;

        if (game.game_status === null || game.game_status === "simulated")
        {
            return;
        }
        else
        {
            // 3. Score Mapping (Match 'team' and 'opponent_team' from your JSON)
            const teamTotalScore = game.score?.team ?? 0;
            const oppTotalScore = game.score?.opponent_team ?? 0;
        
            const leftScore  = isHome ? oppTotalScore : teamTotalScore;
            const rightScore = isHome ? teamTotalScore : oppTotalScore;
        
            // 4. Inning Logic (Match 'team' and 'opponent_team' inside 'line_score')
            const guestInn = isHome ? game.line_score.opponent_team.scores : game.line_score.team.scores;
            const homeInn  = isHome ? game.line_score.team.scores : game.line_score.opponent_team.scores;
        
            // 5. Totals (Match 'totals' array)
            const guestTotal = isHome ? game.line_score.opponent_team.totals[0] : game.line_score.team.totals[0];
            const homeTotal  = isHome ? game.line_score.team.totals[0] : game.line_score.opponent_team.totals[0];

            document.getElementById("yourScore").textContent = leftScore;
            document.getElementById("opponentScore").textContent = rightScore;
            document.getElementById("gTotal").textContent = guestTotal ?? 0;
            document.getElementById("hTotal").textContent = homeTotal ?? 0;

            // INNING PADDING
            const gInn = [...(guestInn || [])];
            const hInn = [...(homeInn || [])];
            while (gInn.length < 9) gInn.push("");
            while (hInn.length < 9) hInn.push("");
    
            for (let i = 0; i < 9; i++) {
                document.getElementById("g" + (i + 1)).innerHTML =
                    gInn[i] !== undefined && gInn[i] !== "" ? gInn[i] : "&nbsp;";
            
                document.getElementById("h" + (i + 1)).innerHTML =
                    hInn[i] !== undefined && hInn[i] !== "" ? hInn[i] : "&nbsp;";
            }
        }
    }
    
    loadGame();
    
    const simApiUrl = "https://livescoreapi-2hbs.onrender.com";
    
    document.addEventListener("DOMContentLoaded", () => {
        const simulateBtn = document.querySelector("button"); // or #simulateBtn if it has an ID
    
        if (simulateBtn) {
            simulateBtn.addEventListener("click", () => {
                console.log("Simulate Game clicked");
                simulateGame();
            });
        }
    });

    function simulateGame() {
        const gameID = new URLSearchParams(window.location.search).get("gameID");
    
        window.open(`live.html?gameID=${gameID}`, "_blank");
    
        fetch(`${simApiUrl}/api/sim/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                home_away: isHomeGlobal ? "home" : "away"
            })
        });
    }



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
        
        updateInnings(sim);
    }
    
    function updateInnings(sim, isHome) {
        let guest, home;
    
        if (isHome) {
            guest = sim.oppScores || [];  // opponent bats first
            home  = sim.teamScores || []; // you bat second
        } else {
            guest = sim.teamScores || []; // you bat first
            home  = sim.oppScores || [];  // opponent bats second
        }
    
        const gRuns = guest.reduce((a,b)=>a+b,0);
        const hRuns = home.reduce((a,b)=>a+b,0);
    
        document.getElementById("gTotal").textContent = gRuns;
        document.getElementById("hTotal").textContent = hRuns;
    
        document.getElementById("opponentScore").textContent = isHome ? gRuns : hRuns;
        document.getElementById("yourScore").textContent     = isHome ? hRuns : gRuns;
    
        for (let i = 0; i < 9; i++) {
            const inningNum = i + 1;
    
            const gCell = document.getElementById(`g${inningNum}`);
            const hCell = document.getElementById(`h${inningNum}`);
    
            const gVal = guest[i];
            const hVal = home[i];
    
            gCell.innerHTML = gVal !== undefined ? gVal : "&nbsp;";
            hCell.innerHTML = hVal !== undefined ? hVal : "&nbsp;";
        }
    }
