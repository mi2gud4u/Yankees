    const apiUrl = "https://gamefunction-fzdkbcguh9bmhsgx.westus-01.azurewebsites.net";

    function toggleAddGame() {
        const section = document.getElementById("addGameSection");
        section.style.display = section.style.display === "block" ? "none" : "block";
    }

    function toggleCompleted() {
        const section = document.getElementById("completedSection");
        const btn = document.querySelector(".completed-toggle");
    
        if (section.style.display === "none") {
            section.style.display = "block";
            btn.textContent = "Completed Games ▲";
        } else {
            section.style.display = "none";
            btn.textContent = "Completed Games ▼";
        }
    }

    async function loadGames() {
        try {
            // Route updated to standard /api/games
            const response = await fetch(`${apiUrl}/api/games`);
            if (!response.ok) throw new Error("Failed to fetch games");
            
            const games = await response.json();

            // Sort soonest → latest
            games.sort((a, b) => new Date(a.start_ts) - new Date(b.start_ts));

            const upcomingGames = games.filter(g => g.game_status !== "completed");
            const completedGames = games.filter(g => g.game_status === "completed").reverse();

            const visual = document.getElementById("visualSchedule");
            const completedSection = document.getElementById("completedSection");
            
            visual.innerHTML = "";
            completedSection.innerHTML = "";

            upcomingGames.forEach(game => visual.appendChild(renderGameBlock(game)));
            completedGames.forEach(game => completedSection.appendChild(renderGameBlock(game)));

        } catch (err) {
            console.error("Load error:", err);
        }
    }

    function renderGameBlock(game) {
        const now = new Date();
        const start = new Date(game.start_ts);
        const end = new Date(game.end_ts);

        let statusText = "";
        if (game.game_status === "completed") {
            statusText = "FINAL";
        } else if (now >= start && now <= end) {
            statusText = "LIVE";
        } else if (start > now) {
            statusText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + 
                         " @ " + start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        } else {
            statusText = "SCHEDULED";
        }

        const isHome = game.home_away === "home";
        
        // FIX: Handles the new Opponent object structure { name: "..." }
        const oppName = game.opponent_team?.name || "Unknown Opponent";
        const myName = game.myTeam;

        const leftTeamName  = isHome ? oppName : myName;
        const rightTeamName = isHome ? myName : oppName;

        // FIX: Mapping to C# score property names
        const teamScore = game.game_status === "completed" ? (game.score?.team ?? 0) : "";
        const oppScore  = game.game_status === "completed" ? (game.score?.opponent_team ?? 0) : "";

        const leftScore  = isHome ? oppScore : teamScore;
        const rightScore = isHome ? teamScore : oppScore;

        const block = document.createElement("div");
        block.className = "scoreboard-container";
        block.innerHTML = `
            <div class="main-bar">
                <div class="score">${leftScore}</div>
                <div class="player-box left"><div class="player-name">${leftTeamName}</div></div>
                <div class="vs-block"><div class="vs-text">VS</div></div>
                <div class="player-box right"><div class="player-name">${rightTeamName}</div></div>
                <div class="score">${rightScore}</div>
            </div>
            <div class="info-bar">
                <a class="info-link" onclick="viewGame('${game.gameID}')">VIEW</a>
                <div class="info-label">${statusText}</div>
                <a class="info-link delete-link" onclick="deleteGame('${game.gameID}')">DELETE</a>
            </div>
        `;
        return block;
    }

    async function addGame() {
        const teamName = document.getElementById("teamName").value.trim();
        const gameId = document.getElementById("gameId").value.trim();

        if (!teamName || !gameId) {
            alert("Please enter both Team Name and Game ID.");
            return;
        }

        // Send a single object matching your C# AddGameRequest
        const payload = { myTeam: teamName, gameID: gameId };

        try {
            const response = await fetch(`${apiUrl}/api/games`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                document.getElementById("teamName").value = "";
                document.getElementById("gameId").value = "";
                loadGames();
            } else {
                alert("Error adding game.");
            }
        } catch (err) {
            console.error("AddGame error:", err);
        }
    }

    function viewGame(gameID) {
        window.open(`scoreboard.html?gameID=${gameID}`, "_blank");
    }


    async function deleteGame(gameID) {
        if (prompt("Enter admin password:") !== "1234") return;

        try {
            const response = await fetch(`${apiUrl}/api/games/${gameID}`, { method: "DELETE" });
            if (response.ok) loadGames();
        } catch (err) {
            console.error("Delete error:", err);
        }
    }

    loadGames();
