const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. startOnlineMatch signature
const startMatchTarget = `  const startOnlineMatch = (matchData: {
    roomId: string;
    gameMode: GameMode;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation?: string;
  }) => {
    const isCorsa = matchData.gameMode === "corsa";
    const isAmazons = matchData.gameMode === "amazons";
    const effectiveTheme: BoardTheme =
      matchData.gameMode === "corsa"`;

const startMatchReplace = `  const startOnlineMatch = (matchData: {
    roomId: string;
    gameMode: GameMode;
    boardTheme?: string;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation?: string;
  }) => {
    const isCorsa = matchData.gameMode === "corsa";
    const isAmazons = matchData.gameMode === "amazons";
    const effectiveTheme: BoardTheme =
      matchData.boardTheme ? (matchData.boardTheme as BoardTheme) :
      matchData.gameMode === "corsa"`;
code = code.replace(startMatchTarget, startMatchReplace);

// 2. Add handleOnlineAbandon
const abandonTarget = `  const resetGameToMenu = () => {`;
const abandonReplace = `  const handleOnlineAbandon = () => {
    if (onlineMatchSession && db) {
      try {
        updateDoc(doc(db, "online_rooms", onlineMatchSession.roomId), {
          status: "abandoned",
          abandonedBy: onlineMatchSession.myPlayerIndex,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {}
      setStats(prev => {
        const newStats = { ...prev };
        newStats.totalScore = Math.max(0, (newStats.totalScore || 0) - 2);
        saveStorageItem("wallgo_stats", JSON.stringify(newStats));
        return newStats;
      });
      alert(language === "it" ? "Hai abbandonato la partita. Penalità: -2 punti." : "You abandoned the match. Penalty: -2 points.");
      setOnlineMatchSession(null);
    }
    resetGameToMenu(true);
  };

  const resetGameToMenu = (skipOnlineClear = false) => {
    if (!skipOnlineClear && onlineMatchSession && db) {`;
code = code.replace(abandonTarget, abandonReplace);

// 3. Update the `isOnlineExitConfirmOpen` leave button onClick
const leaveBtnTarget = `              <button
                onClick={() => {
                  setIsOnlineExitConfirmOpen(false);
                  resetGameToMenu();
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              >`;
const leaveBtnReplace = `              <button
                onClick={() => {
                  setIsOnlineExitConfirmOpen(false);
                  handleOnlineAbandon();
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-white uppercase tracking-wider active:scale-95 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.4)]"
              >`;
code = code.replace(leaveBtnTarget, leaveBtnReplace);

// 4. Firebase onSnapshot changes
const onSnapTarget = `      if (data.status === "aborted") {
        alert(language === "it" ? "L'avversario ha abbandonato la partita." : "Opponent left the match.");
        resetGameToMenu();
        return;
      }`;
const onSnapReplace = `      if (data.status === "aborted" || data.status === "abandoned") {
        if (data.status === "abandoned" && data.abandonedBy && data.abandonedBy !== onlineMatchSession.myPlayerIndex) {
            setStats(prev => {
                const newStats = { ...prev };
                newStats.totalScore = (newStats.totalScore || 0) + 4;
                saveStorageItem("wallgo_stats", JSON.stringify(newStats));
                return newStats;
            });
            alert(language === "it" ? "L'avversario ha abbandonato la partita. Vittoria! +4 punti." : "Opponent abandoned the match. You win! +4 points.");
        } else if (data.status === "aborted") {
            alert(language === "it" ? "La partita online è stata interrotta." : "Online match was interrupted.");
        }
        setOnlineMatchSession(null);
        resetGameToMenu(true);
        return;
      }`;
code = code.replace(onSnapTarget, onSnapReplace);

// 5. Update OnlinePlayerSearchModal usage in App.tsx
const searchModalTarget = `      <OnlinePlayerSearchModal
        isOpen={isOnlineSearchOpen}
        onClose={() => setIsOnlineSearchOpen(false)}
        currentDeviceId={deviceId}
        currentUserName={userName}
        currentUserLocation={userLocation}
        selectedGameMode={gameMode}
        onSelectGameMode={(m) => setGameMode(m)}
        onStartOnlineMatch={startOnlineMatch}
        language={language}
      />`;
const searchModalReplace = `      <OnlinePlayerSearchModal
        isOpen={isOnlineSearchOpen}
        onClose={() => setIsOnlineSearchOpen(false)}
        currentDeviceId={deviceId}
        currentUserName={userName}
        currentUserLocation={userLocation}
        selectedGameMode={gameMode}
        currentBoardTheme={boardTheme}
        onSelectGameMode={(m) => setGameMode(m)}
        onSelectBoardTheme={(t) => setBoardTheme(t as any)}
        onStartOnlineMatch={startOnlineMatch}
        language={language}
      />`;
code = code.replace(searchModalTarget, searchModalReplace);

// 6. Fix points logic in End Game!
const scoreLogicTarget = `        if (sfxVolume > 0) {
          SoundManager.stopBackgroundMusic();
          setTimeout(() => {
            if (winnerId === 1) SoundManager.playVictory();
            else if (winnerId !== "draw") SoundManager.playDefeat();
          }, 200);
        }
        const key = updatedPlayers.length as 2 | 3 | 4;
        const newStats = { ...stats };
        newStats[key] = { ...stats[key] };
        if (!newStats.badges) newStats.badges = [];
        else newStats.badges = [...(stats.badges || [])];
        if (newStats.totalScore === undefined) newStats.totalScore = 0;
        if (newStats.totalFugaScore === undefined) newStats.totalFugaScore = 0;
        if (newStats.totalAmazonsScore === undefined)
          newStats.totalAmazonsScore = 0;
        if (newStats.totalDomineeringScore === undefined)
          newStats.totalDomineeringScore = 0;
        if (newStats.totalAbaloneScore === undefined)
          newStats.totalAbaloneScore = 0;
        if (newStats.totalHexScore === undefined) newStats.totalHexScore = 0;
        if (newStats.totalOrbitoScore === undefined)
          newStats.totalOrbitoScore = 0;
        if (newStats.totalChainTriangleScore === undefined)
          newStats.totalChainTriangleScore = 0;
        if (newStats.totalPenteScore === undefined)
          newStats.totalPenteScore = 0;
        if (newStats.totalShobuScore === undefined)
          newStats.totalShobuScore = 0;
        if (newStats.totalYinshScore === undefined)
          newStats.totalYinshScore = 0;
        if (newStats.totalOnitamaScore === undefined)
          newStats.totalOnitamaScore = 0;
        if (newStats.totalBadukScore === undefined)
          newStats.totalBadukScore = 0;

        const oldScore =
          gameState.gameMode === "yinsh"
            ? newStats.totalYinshScore
            : gameState.gameMode === "pente"
              ? newStats.totalPenteScore
              : gameState.gameMode === "shobu"
                ? newStats.totalShobuScore
                : gameState.gameMode === "orbito"
                  ? newStats.totalOrbitoScore
                  : gameState.gameMode === "chain_triangle"
                    ? newStats.totalChainTriangleScore
                    : gameState.gameMode === "hex"
                      ? newStats.totalHexScore
                      : gameState.gameMode === "abalone"
                        ? newStats.totalAbaloneScore
                        : gameState.gameMode === "domineering"
                          ? newStats.totalDomineeringScore
                          : gameState.gameMode === "onitama"
                            ? newStats.totalOnitamaScore
                            : gameState.gameMode === "baduk"
                              ? newStats.totalBadukScore
                              : isCorsa
                                ? newStats.totalFugaScore
                                : isAmazons
                                  ? newStats.totalAmazonsScore
                                  : newStats.totalScore;
        const oldBadgeIds = newStats.badges.map((b) =>
          typeof b === "string"
            ? \`\${b}-normale\`
            : \`\${b.id}-\${b.difficulty || "normale"}\`,
        );

        let scoreChange = 0;
        if (winnerId === 1) {`;

const scoreLogicReplace = `        const isWin = onlineMatchSession ? winnerId === onlineMatchSession.myPlayerIndex : winnerId === 1;
        const isLoss = onlineMatchSession ? (winnerId !== "draw" && winnerId !== onlineMatchSession.myPlayerIndex) : (winnerId !== "draw" && winnerId !== 1);

        if (sfxVolume > 0) {
          SoundManager.stopBackgroundMusic();
          setTimeout(() => {
            if (isWin) SoundManager.playVictory();
            else if (isLoss) SoundManager.playDefeat();
          }, 200);
        }
        const key = updatedPlayers.length as 2 | 3 | 4;
        const newStats = { ...stats };
        newStats[key] = { ...stats[key] };
        if (!newStats.badges) newStats.badges = [];
        else newStats.badges = [...(stats.badges || [])];
        if (newStats.totalScore === undefined) newStats.totalScore = 0;
        if (newStats.totalFugaScore === undefined) newStats.totalFugaScore = 0;
        if (newStats.totalAmazonsScore === undefined)
          newStats.totalAmazonsScore = 0;
        if (newStats.totalDomineeringScore === undefined)
          newStats.totalDomineeringScore = 0;
        if (newStats.totalAbaloneScore === undefined)
          newStats.totalAbaloneScore = 0;
        if (newStats.totalHexScore === undefined) newStats.totalHexScore = 0;
        if (newStats.totalOrbitoScore === undefined)
          newStats.totalOrbitoScore = 0;
        if (newStats.totalChainTriangleScore === undefined)
          newStats.totalChainTriangleScore = 0;
        if (newStats.totalPenteScore === undefined)
          newStats.totalPenteScore = 0;
        if (newStats.totalShobuScore === undefined)
          newStats.totalShobuScore = 0;
        if (newStats.totalYinshScore === undefined)
          newStats.totalYinshScore = 0;
        if (newStats.totalOnitamaScore === undefined)
          newStats.totalOnitamaScore = 0;
        if (newStats.totalBadukScore === undefined)
          newStats.totalBadukScore = 0;

        const oldScore =
          gameState.gameMode === "yinsh"
            ? newStats.totalYinshScore
            : gameState.gameMode === "pente"
              ? newStats.totalPenteScore
              : gameState.gameMode === "shobu"
                ? newStats.totalShobuScore
                : gameState.gameMode === "orbito"
                  ? newStats.totalOrbitoScore
                  : gameState.gameMode === "chain_triangle"
                    ? newStats.totalChainTriangleScore
                    : gameState.gameMode === "hex"
                      ? newStats.totalHexScore
                      : gameState.gameMode === "abalone"
                        ? newStats.totalAbaloneScore
                        : gameState.gameMode === "domineering"
                          ? newStats.totalDomineeringScore
                          : gameState.gameMode === "onitama"
                            ? newStats.totalOnitamaScore
                            : gameState.gameMode === "baduk"
                              ? newStats.totalBadukScore
                              : isCorsa
                                ? newStats.totalFugaScore
                                : isAmazons
                                  ? newStats.totalAmazonsScore
                                  : newStats.totalScore;
        const oldBadgeIds = newStats.badges.map((b) =>
          typeof b === "string"
            ? \`\${b}-normale\`
            : \`\${b.id}-\${b.difficulty || "normale"}\`,
        );

        let scoreChange = 0;
        if (onlineMatchSession) {
          if (isWin) {
            if (gameState.gameMode === "orbito" || gameState.gameMode === "chain_triangle") scoreChange = 10;
            else if (gameState.gameMode === "pente" || gameState.gameMode === "hex") scoreChange = 15;
            else if (gameState.gameMode === "abalone" || gameState.gameMode === "onitama" || gameState.gameMode === "domineering" || gameState.gameMode === "shobu" || gameState.gameMode === "dominio" || gameState.gameMode === "corsa") scoreChange = 20;
            else if (isAmazons) scoreChange = 25;
            else if (gameState.gameMode === "yinsh") scoreChange = 30;
            else if (gameState.gameMode === "baduk") {
              if (activeTheme === "baduk-19") scoreChange = 75;
              else if (activeTheme === "baduk-13") scoreChange = 50;
              else scoreChange = 35;
            } else {
              scoreChange = 20;
            }
          }
        } else if (winnerId === 1) {`;

code = code.replace(scoreLogicTarget, scoreLogicReplace);

// 7. Fix the logic for losses as well in single player vs online
const lossLogicTarget = `        } else if (winnerId !== "draw") {
          if (gameState.gameMode === "hex") {`;
const lossLogicReplace = `        } else if (!onlineMatchSession && winnerId !== "draw") {
          if (gameState.gameMode === "hex") {`;
code = code.replace(lossLogicTarget, lossLogicReplace);

const winsLossesTarget = `        if (winnerId === 1) {
          newStats[key].wins += 1;`;
const winsLossesReplace = `        if (isWin) {
          newStats[key].wins += 1;`;
code = code.replace(winsLossesTarget, winsLossesReplace);

const winsLossesTarget2 = `        } else if (winnerId !== "draw") {
          newStats[key].losses += 1;`;
const winsLossesReplace2 = `        } else if (isLoss) {
          newStats[key].losses += 1;`;
code = code.replace(winsLossesTarget2, winsLossesReplace2);

const winsLossesTarget3 = `        if (winnerId === 1) {
          newStats[statKey][diffKey].wins += 1;
        } else if (winnerId !== "draw") {
          newStats[statKey][diffKey].losses += 1;
        }`;
const winsLossesReplace3 = `        if (isWin) {
          newStats[statKey][diffKey].wins += 1;
        } else if (isLoss) {
          newStats[statKey][diffKey].losses += 1;
        }`;
code = code.replace(winsLossesTarget3, winsLossesReplace3);

const missionWinTarget = `        if (winnerId === 1 && dailyMissions) {`;
const missionWinReplace = `        if (isWin && dailyMissions) {`;
code = code.replace(missionWinTarget, missionWinReplace);

const syncFirebaseTarget = `        if (winnerId !== "draw") {
          const saveToFirebase = async () => {
            try {
              if (deviceId) {
                const info = { osVersion: "unknown", model: navigator.userAgent, platform: "web" };
                const now = new Date().toISOString();
                const isWin = winnerId === 1;`;
const syncFirebaseReplace = `        if (winnerId !== "draw") {
          const saveToFirebase = async () => {
            try {
              if (deviceId) {
                const info = { osVersion: "unknown", model: navigator.userAgent, platform: "web" };
                const now = new Date().toISOString();
                // isWin is already defined outside`;
code = code.replace(syncFirebaseTarget, syncFirebaseReplace);

fs.writeFileSync('App.tsx', code);
console.log("Updated App.tsx");
