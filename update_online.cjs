const fs = require('fs');

// 1. Update OnlinePlayerSearchModalProps & UI in OnlinePlayerSearchModal.tsx
let modalCode = fs.readFileSync('components/OnlinePlayerSearchModal.tsx', 'utf8');

const propsTarget = `interface OnlinePlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string;
  currentUserName: string;
  currentUserLocation: string;
  selectedGameMode: GameMode;
  onSelectGameMode?: (mode: GameMode) => void;
  onStartOnlineMatch: (matchData: {
    roomId: string;
    gameMode: GameMode;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation?: string;
  }) => void;
  language: Language;
}`;

const propsReplace = `interface OnlinePlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string;
  currentUserName: string;
  currentUserLocation: string;
  selectedGameMode: GameMode;
  currentBoardTheme?: string;
  onSelectGameMode?: (mode: GameMode) => void;
  onSelectBoardTheme?: (theme: string) => void;
  onStartOnlineMatch: (matchData: {
    roomId: string;
    gameMode: GameMode;
    boardTheme?: string;
    myPlayerIndex: 1 | 2;
    opponentName: string;
    opponentLocation?: string;
  }) => void;
  language: Language;
}`;
modalCode = modalCode.replace(propsTarget, propsReplace);

const destructTarget = `  selectedGameMode,
  onSelectGameMode,
  onStartOnlineMatch,
  language,
}) => {
  const [mounted, setMounted] = useState(false);`;

const destructReplace = `  selectedGameMode,
  currentBoardTheme,
  onSelectGameMode,
  onSelectBoardTheme,
  onStartOnlineMatch,
  language,
}) => {
  const [mounted, setMounted] = useState(false);
  const [targetBoardTheme, setTargetBoardTheme] = useState(currentBoardTheme || "baduk-9");
  
  useEffect(() => {
    if (currentBoardTheme) setTargetBoardTheme(currentBoardTheme);
  }, [currentBoardTheme]);
`;
modalCode = modalCode.replace(destructTarget, destructReplace);

const selectTarget = `            <select
              value={targetGameMode}
              onChange={(e) => {
                const newMode = e.target.value as GameMode;
                setTargetGameMode(newMode);
                if (onSelectGameMode) onSelectGameMode(newMode);
              }}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50 appearance-none shadow-inner"
            >
              {AVAILABLE_GAME_MODES.map((item) => (
                <option key={item.mode} value={item.mode}>
                  {item.icon} {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>`;

const selectReplace = `            <select
              value={targetGameMode}
              onChange={(e) => {
                const newMode = e.target.value as GameMode;
                setTargetGameMode(newMode);
                if (onSelectGameMode) onSelectGameMode(newMode);
              }}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50 appearance-none shadow-inner"
            >
              {AVAILABLE_GAME_MODES.map((item) => (
                <option key={item.mode} value={item.mode}>
                  {item.icon} {item.label}
                </option>
              ))}
            </select>
          </div>
          {targetGameMode === "baduk" && (
            <div className="mt-3 relative">
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Dimensione Griglia (Go):</label>
              <select
                value={targetBoardTheme}
                onChange={(e) => {
                  setTargetBoardTheme(e.target.value);
                  if (onSelectBoardTheme) onSelectBoardTheme(e.target.value);
                }}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50 appearance-none shadow-inner"
              >
                <option value="baduk-9">9x9 (Veloce)</option>
                <option value="baduk-13">13x13 (Medio)</option>
                <option value="baduk-19">19x19 (Standard)</option>
              </select>
            </div>
          )}
        </div>`;
modalCode = modalCode.replace(selectTarget, selectReplace);

const inviteDataTarget = `      const inviteData = {
        fromDeviceId: currentDeviceId,
        fromName: currentUserName,
        fromLocation: currentUserLocation,
        gameMode: targetGameMode,
        roomId: roomId,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };`;
      
const inviteDataReplace = `      const inviteData = {
        fromDeviceId: currentDeviceId,
        fromName: currentUserName,
        fromLocation: currentUserLocation,
        gameMode: targetGameMode,
        boardTheme: targetGameMode === "baduk" ? targetBoardTheme : undefined,
        roomId: roomId,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };`;
modalCode = modalCode.replace(inviteDataTarget, inviteDataReplace);

const startMatchHostTarget = `          onStartOnlineMatch({
            roomId: myRoomId,
            gameMode: targetGameMode,
            myPlayerIndex: 1,
            opponentName: opponentName,
            opponentLocation: opponentLoc
          });`;
const startMatchHostReplace = `          onStartOnlineMatch({
            roomId: myRoomId,
            gameMode: targetGameMode,
            boardTheme: targetGameMode === "baduk" ? targetBoardTheme : undefined,
            myPlayerIndex: 1,
            opponentName: opponentName,
            opponentLocation: opponentLoc
          });`;
modalCode = modalCode.replace(startMatchHostTarget, startMatchHostReplace);

const startMatchGuestTarget = `            onStartOnlineMatch({
              roomId: roomId,
              gameMode: targetGameMode,
              myPlayerIndex: 2,
              opponentName: hostName,
              opponentLocation: hostLoc
            });`;
const startMatchGuestReplace = `            onStartOnlineMatch({
              roomId: roomId,
              gameMode: targetGameMode,
              boardTheme: targetGameMode === "baduk" ? targetBoardTheme : undefined,
              myPlayerIndex: 2,
              opponentName: hostName,
              opponentLocation: hostLoc
            });`;
modalCode = modalCode.replace(startMatchGuestTarget, startMatchGuestReplace);

// There is another start match call for Direct Code Host:
const directHostTarget = `                  onStartOnlineMatch({
                    roomId: customRoomCode,
                    gameMode: targetGameMode,
                    myPlayerIndex: 1,
                    opponentName: guestName,
                    opponentLocation: guestLoc
                  });`;
const directHostReplace = `                  onStartOnlineMatch({
                    roomId: customRoomCode,
                    gameMode: targetGameMode,
                    boardTheme: targetGameMode === "baduk" ? targetBoardTheme : undefined,
                    myPlayerIndex: 1,
                    opponentName: guestName,
                    opponentLocation: guestLoc
                  });`;
modalCode = modalCode.replace(directHostTarget, directHostReplace);

const directGuestTarget = `            onStartOnlineMatch({
              roomId: customRoomCode,
              gameMode: targetGameMode,
              myPlayerIndex: 2,
              opponentName: hostName,
              opponentLocation: hostLoc
            });`;
const directGuestReplace = `            onStartOnlineMatch({
              roomId: customRoomCode,
              gameMode: targetGameMode,
              boardTheme: targetGameMode === "baduk" ? targetBoardTheme : undefined,
              myPlayerIndex: 2,
              opponentName: hostName,
              opponentLocation: hostLoc
            });`;
modalCode = modalCode.replace(directGuestTarget, directGuestReplace);

fs.writeFileSync('components/OnlinePlayerSearchModal.tsx', modalCode);
console.log("Updated OnlinePlayerSearchModal.tsx");
