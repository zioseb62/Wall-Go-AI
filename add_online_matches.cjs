const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const abandonTarget = `        const newStats = { ...prev };
        newStats.totalScore = Math.max(0, (newStats.totalScore || 0) - 2);
        saveStorageItem("wallgo_stats", JSON.stringify(newStats));`;

const abandonReplace = `        const newStats = { ...prev };
        newStats.totalScore = Math.max(0, (newStats.totalScore || 0) - 2);
        newStats.totalOnlineMatches = (newStats.totalOnlineMatches || 0) + 1;
        saveStorageItem("wallgo_stats", JSON.stringify(newStats));`;
code = code.replace(abandonTarget, abandonReplace);

const abandonWinTarget = `                const newStats = { ...prev };
                newStats.totalScore = (newStats.totalScore || 0) + 4;
                saveStorageItem("wallgo_stats", JSON.stringify(newStats));`;
const abandonWinReplace = `                const newStats = { ...prev };
                newStats.totalScore = (newStats.totalScore || 0) + 4;
                newStats.totalOnlineMatches = (newStats.totalOnlineMatches || 0) + 1;
                saveStorageItem("wallgo_stats", JSON.stringify(newStats));`;
code = code.replace(abandonWinTarget, abandonWinReplace);

const winTarget = `        const newStats = { ...stats };
        newStats[key] = { ...stats[key] };
        if (!newStats.badges) newStats.badges = [];
        else newStats.badges = [...(stats.badges || [])];
        if (newStats.totalScore === undefined) newStats.totalScore = 0;`;
const winReplace = `        const newStats = { ...stats };
        newStats[key] = { ...stats[key] };
        if (!newStats.badges) newStats.badges = [];
        else newStats.badges = [...(stats.badges || [])];
        if (onlineMatchSession) newStats.totalOnlineMatches = (newStats.totalOnlineMatches || 0) + 1;
        if (newStats.totalScore === undefined) newStats.totalScore = 0;`;
code = code.replace(winTarget, winReplace);

const syncFirebaseTarget = `                  totalScore: newStats.totalScore || 0,
                  totalFugaScore: newStats.totalFugaScore || 0,`;
const syncFirebaseReplace = `                  totalScore: newStats.totalScore || 0,
                  totalOnlineMatches: newStats.totalOnlineMatches || 0,
                  totalFugaScore: newStats.totalFugaScore || 0,`;
code = code.replace(syncFirebaseTarget, syncFirebaseReplace);

// Let's also make sure syncUserDataToFirebase handles it
const syncUserTarget = `    totalScore: stats.totalScore || 0,
    totalFugaScore: stats.totalFugaScore || 0,`;
const syncUserReplace = `    totalScore: stats.totalScore || 0,
    totalOnlineMatches: stats.totalOnlineMatches || 0,
    totalFugaScore: stats.totalFugaScore || 0,`;
code = code.replace(syncUserTarget, syncUserReplace);

// Let's also restore it in maxScore aggregation
const aggregationTarget = `                  if (typeof lbData.totalBadukScore === "number") maxBadukScore = Math.max(maxBadukScore, lbData.totalBadukScore);
                  if (typeof lbData.totalScoreOverall === "number") maxOverallLeaderboardScore = Math.max(maxOverallLeaderboardScore, lbData.totalScoreOverall);
                }
              });`;
const aggregationReplace = `                  if (typeof lbData.totalBadukScore === "number") maxBadukScore = Math.max(maxBadukScore, lbData.totalBadukScore);
                  if (typeof lbData.totalScoreOverall === "number") maxOverallLeaderboardScore = Math.max(maxOverallLeaderboardScore, lbData.totalScoreOverall);
                  if (typeof lbData.totalOnlineMatches === "number") newStats.totalOnlineMatches = Math.max(newStats.totalOnlineMatches || 0, lbData.totalOnlineMatches);
                }
              });`;
code = code.replace(aggregationTarget, aggregationReplace);

// Also Leaderboard restore
const leaderRestoreTarget = `                  if (typeof lbData.totalBadukScore === "number") maxBadukScore = Math.max(maxBadukScore, lbData.totalBadukScore);
                      if (typeof lbData.totalScoreOverall === "number") maxOverallLeaderboardScore = Math.max(maxOverallLeaderboardScore, lbData.totalScoreOverall);
                    }
                  });`;
const leaderRestoreReplace = `                  if (typeof lbData.totalBadukScore === "number") maxBadukScore = Math.max(maxBadukScore, lbData.totalBadukScore);
                      if (typeof lbData.totalScoreOverall === "number") maxOverallLeaderboardScore = Math.max(maxOverallLeaderboardScore, lbData.totalScoreOverall);
                    }
                  });`;
code = code.replace(leaderRestoreTarget, leaderRestoreReplace);

code = code.replace(/"2\.19\.61"/g, '"2.19.62"');

fs.writeFileSync('App.tsx', code);
