import React, { useEffect } from 'react';
import Socket from '../components/Socket';

export type User = {
  id: string;
  username: string;
  position: number;
};

export type RoundTime = {
  timeToComplete: number;
  startTime: number;
};

export interface GameContextProps {
  users: User[];
  drawingPermission: boolean;
  isGameStarted: boolean;
  isWaitingForNextRd: boolean;
  roundTime: null | RoundTime;
  word: null | string;
  activeUserId: string | null;
  wordReal: string | null;
  score: number
  positionL: number
}

//create context with empty object for now
export const GameContext = React.createContext<Partial<GameContextProps>>({});

interface GameProviderProps {
  username: string;
  exitGame: () => void;
}

const GameProvider: React.FC<GameProviderProps> = (props) => {
  //Declare state and variables required
  const [users, setUsers] = React.useState<User[]>([]);
  const [drawingPermission, setDrawingPermission] = React.useState(false);
  const [isGameStarted, setIsGameStarted] = React.useState(false);
  const [isWaitingForNextRd, setIsWaitingForNextRd] = React.useState(false);
  const [roundTime, setRoundTime] = React.useState<null | RoundTime>(null);
  const [word, setWord] = React.useState<null | string>(null);
  const [activeUserId, setActiveUserId] = React.useState<null | string>(null);
  const [wordReal, setWordReal] = React.useState<null | string>(null);
  const [score, setScore] = React.useState<number>(0)

  const socket = Socket.getSocket();

  const endRound = (): void => {
    setDrawingPermission(false);
    setIsWaitingForNextRd(true);
    setRoundTime(null);
    setActiveUserId(null);
  };

  const endGame = (): void => {
    endRound();
    socket.disconnect();
    props.exitGame();
  };

  useEffect(() => {
    socket.on('gameStart', (): void => {
      setIsGameStarted(true);
    });
    socket.on('drawStart', (msg: any): void => {
      setActiveUserId(msg.socketId);
      if (msg.socketId === socket.id) {
        setDrawingPermission(true);
      } else {
        setDrawingPermission(false);
      }
      setIsWaitingForNextRd(false);
      setRoundTime({
        timeToComplete: msg.timeToComplete,
        startTime: msg.startTime,
      });
      setWord(msg.word);
    });
    socket.on('correctGuess', (): void => {
      setScore(score + 1)
    })
    socket.on('guessWord', (msg: any): void => {
      setActiveUserId(msg.socketId);
      if (msg.socketId === socket.id) {
        setDrawingPermission(true);
      } else {
        setDrawingPermission(false);
      }
      setIsWaitingForNextRd(false);
      setRoundTime({
        timeToComplete: msg.timeToComplete,
        startTime: msg.startTime,
      });
      setWord(msg.word);
    });
    socket.on('drawEnd', endRound);
    socket.on('wordReveal', (wrdReal: string) => {
      setWordReal(wrdReal);
    });
    socket.on('gameEnd', endGame);
    socket.on('usersState', (users: User[]) => {
      setUsers(users);
    });

  }, []);
  useEffect(() => {
    socket.on('userJoin', (user: User) => {
      setUsers([...users, user]);
    });
    socket.on('userLeave', (user: User) => {
      setUsers(users.filter((usr) => usr.id !== user.id));
    });
    socket.on('shuffle', (roundPositions: Record<string, number>) => {
      const newUsers: User[] = [];
      for (const user of users) {
        const newUser = { ...user, position: roundPositions[user.id] };
        newUsers.push(newUser);
      }
      setUsers(newUsers);
    });
    return () => {
      socket.removeEventListener('userJoin');
      socket.removeEventListener('userLeave');
    };
  }, [users]);

  return (
    <GameContext.Provider
      value={{
        users,
        drawingPermission,
        isGameStarted,
        isWaitingForNextRd,
        roundTime,
        word,
        activeUserId,
        wordReal,
        score,
      }}>
      {props.children}
    </GameContext.Provider>
  );
};

export default GameProvider;
