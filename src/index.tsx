import React, { useRef, useState, useEffect, useMemo, useCallback, isValidElement } from "react";
import ReactDOM from "react-dom";
import Swal from "sweetalert2";
import "core-js/stable";
import { Howl } from "howler";
import clsx from "classnames";
import { prng_alea } from "esm-seedrandom";
import classNames from "classnames";

const rngseed = Math.random();
console.log("Seed:", rngseed);
const myrng = prng_alea(rngseed);

const correctSound = new Howl({
    src: ["cashregister.mp3"],
    html5: true,
});

const incorrectSound = new Howl({
    src: ["incorrect.mp3"],
    html5: true,
});

const musicSound = new Howl({
    src: ["music.mp3"],
    loop: true,
    volume: 0.5,
    html5: true,
});

const yourTurnSound = new Howl({
    src: ["correct.mp3"],
    html5: true,
});

function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(myrng() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a, seed?: any) {
    const rng = prng_alea(seed ?? Math.random());
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(rng() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    let regexS = "[\\?&]" + name + "=([^&#]*)";
    let regex = new RegExp(regexS);
    let results = regex.exec(window.location.href);
    if (results == null) return "";
    else return decodeURIComponent(results[1].replace(/\+/g, " "));
}

const scriptPromise = new Promise<void>((resolve) => {
    const src = getParameterByName("quizscript");
    if (src == null) {
        Swal.fire({
            title: "Error",
            text: "A source script must be provided in the 'quizscript' parameter.",
            icon: "error",
        });
    } else {
        const script = document.createElement("script");
        script.onload = () => {
            /* Backwards compatibility */
            (window as any).questions = (window as any).questions.filter((question) => question.single_choice);
            
            if((window as any).questions.length < 9) {
                window.alert("This quiz set contains less than 9 pairs, and is not compatible with Tic Tac Dough. Please report this to All-In-One Homeschool.");
                throw new Error("Less than 9 pairs in quiz set");
            }
            const questionSet = shuffle((window as any).questions.slice());
            for (let i = 0; i < questionSet.length; i++) {
                questionSet[i].incorrectAnswers = [];
                for (let j = 0; j < 3; j++) {
                    let idx;
                    do {
                        idx = getRandomIntInclusive(0, questionSet.length - 1);
                    } while (idx == i || questionSet[i].incorrectAnswers.includes(idx));
                    questionSet[i].incorrectAnswers.push(idx);
                }
            }
            (window as any).ticQuestionSet = questionSet;
            resolve();
        };

        script.onerror = (e) => {
            console.error(e);
            window.alert("Error loading quiz script, check console for details");
        };

        script.src = src + (src.includes("?") ? "&" : "?") + "type=epic";
        script.async = true;

        document.body.appendChild(script);
    }
});

musicSound.on("loaderror", (e1, e2) => {
    console.error(e2);
    window.alert("Error loading background music, check console for details\n" + e2);
});

correctSound.on("loaderror", (e1, e2) => {
    console.error(e2);
    window.alert("Error loading 'correct!' sound, check console for details\n" + e2);
});

//const musicPromise = new Promise<void>(resolve => musicSound.on("load", resolve));
//const correctPromise = new Promise<void>(resolve => correctSound.on("load", resolve));

enum TicTacToePieceValue {
    X,
    NONE,
    O,
}

type TicTacToeBoardStorage = [
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue,
    TicTacToePieceValue
];

function useWindowSize() {
    // Initialize state with undefined width/height so server and client renders match
    // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });
    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            // Set window width/height to state
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        // Add event listener
        window.addEventListener("resize", handleResize);
        // Call handler right away so state gets updated with initial window size
        handleResize();
        // Remove event listener on cleanup
        return () => window.removeEventListener("resize", handleResize);
    }, []); // Empty array ensures that effect is only run on mount
    return windowSize;
}

type OnClickHandler = (x: number, y: number, question: Question) => void;

const TicTacToePiece: React.FC<{
    index: number;
    val: TicTacToePieceValue;
    questionSet: Array<Question>;
    vminSize: number;
    disabled?: boolean;
    onClick?: OnClickHandler;
}> = ({ onClick, questionSet, index, val, vminSize, disabled }) => {
    const isFilled = val != TicTacToePieceValue.NONE;
    const question = questionSet[index];
    const clickHandler = useCallback(() => {
        if (disabled || isFilled) return;
        if (typeof onClick != "function") return;
        const y = Math.trunc(index / 3);
        const x = index % 3;
        onClick(x, y, question);
    }, [index, onClick, question, isFilled]);
    return (
        <div
            onClick={clickHandler}
            className={clsx(
                "tic-tac-toe-piece",
                `tic-tac-toe-piece-${TicTacToePieceValue[val]}`,
                isFilled && "tic-tac-toe-piece-filled",
                disabled && "tic-tac-toe-piece-disabled"
            )}
            style={{ fontSize: isFilled && vminSize * 0.3 + "px" }}
        >
            {isFilled && <span className="tic-tac-toe-value-container">{TicTacToePieceValue[val]}</span>}
            {!isFilled && <span className="tic-tac-toe-category">{question.question}</span>}
        </div>
    );
};

interface Question {
    question: string;
    answers: Array<string>;
}

function CashAnimation() {
    const { width, height } = useWindowSize();
    const size = Math.max(300, Math.min(500, Math.round(0.75 * Math.min(width, height))));
    if (isNaN(size)) return null;
    return (
        <div className="cash-animation-container">
            <img src="cash.svg" className="cash-animation" style={{ width: size, height: size }} />
        </div>
    );
}
const TicTacToeBoard: React.FC<{
    board: TicTacToeBoardStorage;
    questionSet: Array<Question>;
    disabled?: boolean;
    onClick?: OnClickHandler;
}> = (props) => {
    const { width, height } = useWindowSize();
    const vmin = Math.max(300, Math.min(500, Math.round(0.75 * Math.min(width, height))));
    const board = useMemo(() => {
        const boardItems: TicTacToePieceValue[][] = [];
        let accumulator: TicTacToePieceValue[] = [];
        for (var i = 0; i < props.board.length; i++) {
            accumulator.push(props.board[i]);
            if (i % 3 == 2) {
                boardItems.push(accumulator);
                accumulator = [];
            }
        }
        return boardItems;
    }, [props.board]);

    return (
        <div className="tic-tac-toe-board" style={{ width: vmin + "px", height: vmin + "px" }}>
            {board.map((val, i) => (
                <div className="tic-tac-toe-board-row" key={i}>
                    {val.map((v2, i2) => (
                        <TicTacToePiece
                            questionSet={props.questionSet}
                            disabled={props.disabled}
                            onClick={props.onClick}
                            vminSize={vmin}
                            key={i2}
                            index={i * 3 + i2}
                            val={v2}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

function useTicTacToeBoard() {
    const [board, setBoard] = useState<TicTacToeBoardStorage>([
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
        TicTacToePieceValue.NONE,
    ]);
    const setPieceAtPos = useCallback(
        (x: number, y: number, value: TicTacToePieceValue) => {
            const newBoard = board.slice();
            newBoard[y * 3 + x] = value;
            setBoard(newBoard as TicTacToeBoardStorage);
        },
        [board]
    );

    return { board, setPieceAtPos };
}

interface TicTacToeBoardMove {
    x: number;
    y: number;
    val: TicTacToePieceValue;
}

function getAllMoves(board: TicTacToeBoardStorage, val: TicTacToePieceValue): TicTacToeBoardMove[] {
    const moves: TicTacToeBoardMove[] = [];
    for (var i = 0; i < board.length; i++) {
        var y = Math.trunc(i / 3);
        var x = i % 3;
        if (board[i] == TicTacToePieceValue.NONE) {
            moves.push({ x, y, val });
        }
    }
    return moves;
}

function makeMove(board: TicTacToeBoardStorage, move: TicTacToeBoardMove): TicTacToeBoardStorage {
    const newBoard = board.slice() as TicTacToeBoardStorage;
    newBoard[move.y * 3 + move.x] = move.val;
    return newBoard;
}

function evalBoardScore(board: TicTacToeBoardStorage): number {
    for (var y = 0; y < 3; y++) {
        if (board[y * 3 + 0] == board[y * 3 + 1] && board[y * 3 + 1] == board[y * 3 + 2]) {
            if (board[y * 3 + 0] == TicTacToePieceValue.X) return 10;
            else if (board[y * 3 + 0] == TicTacToePieceValue.O) return -10;
        }
    }
    for (var x = 0; x < 3; x++) {
        if (board[0 * 3 + x] == board[1 * 3 + x] && board[1 * 3 + x] == board[2 * 3 + x]) {
            if (board[0 * 3 + x] == TicTacToePieceValue.X) return 10;
            else if (board[0 * 3 + x] == TicTacToePieceValue.O) return -10;
        }
    }
    if (board[0] == board[4] && board[4] == board[8]) {
        if (board[0] == TicTacToePieceValue.X) return 10;
        else if (board[0] == TicTacToePieceValue.O) return -10;
    }
    if (board[2] == board[4] && board[4] == board[6]) {
        if (board[2] == TicTacToePieceValue.X) return 10;
        else if (board[2] == TicTacToePieceValue.O) return -10;
    }
    return 0;
}

function boardToString(board: TicTacToeBoardStorage) {
    let str = "";
    for (var y = 0; y < 3; y++) {
        for (var x = 0; x < 3; x++) {
            const val = board[y * 3 + x];
            str += (val != TicTacToePieceValue.NONE ? TicTacToePieceValue[board[y * 3 + x]] : " ") + " ";
        }
        str += "\n";
    }
    return str;
}

function minimax(board: TicTacToeBoardStorage, depth: number, isMaximizingPlayer: boolean): number {
    const score = evalBoardScore(board);
    if (score != 0) {
        return score;
    }
    let bestVal;
    bestVal = isMaximizingPlayer ? Number.MIN_VALUE : Number.MAX_VALUE;
    const moves = getAllMoves(board, isMaximizingPlayer ? TicTacToePieceValue.X : TicTacToePieceValue.O);
    if (moves.length == 0) {
        return 0; /* tie */
        //throw new Error("Invariant violation: there should be at least one move if evalBoardScore returned 0\n" + boardToString(board));
    }
    const scores = [];
    moves.forEach((move, i) => {
        const newBoard = makeMove(board, move);
        const value = minimax(newBoard, depth + 1, !isMaximizingPlayer);
        scores[i] = value;
        if (!isMaximizingPlayer && depth == 0) {
            console.log(boardToString(newBoard), scores[i]);
        }
        bestVal = isMaximizingPlayer ? Math.max(bestVal, value) : Math.min(bestVal, value);
    });
    return bestVal;
}

let round = 1;

function makeComputerMove(boardState: ReturnType<typeof useTicTacToeBoard>): { bestX: number, bestY: number, idx: number } {
    let bestVal = Number.MAX_VALUE;
    let bestX, bestY;
    let theIdx;
    const fakeBoard = boardState.board.slice() as TicTacToeBoardStorage;
    for (var y = 0; y < 3; y++) {
        for (var x = 0; x < 3; x++) {
            const idx = y * 3 + x;
            if (fakeBoard[idx] == TicTacToePieceValue.NONE) {
                fakeBoard[idx] = TicTacToePieceValue.O;
                let moveVal = minimax(fakeBoard, 0, true);
                fakeBoard[idx] = TicTacToePieceValue.NONE;
                if (moveVal < bestVal) {
                    bestVal = moveVal;
                    bestX = x;
                    bestY = y;
                    theIdx = idx;
                }
            }
        }
    }
    if (typeof bestX != "number") throw new Error("Invariant violation: move not found.");
    return { bestX, bestY, idx: theIdx };
}

enum Turn {
    Player,
    Computer,
}

function App() {
    const [turn, setTurn] = useState(Turn.Player);
    const [started, setStarted] = useState(false);
    const [questionSet, setQuestionSet] = useState(null);
    const [userAnswer, setUserAnswer] = useState(null);
    const [lastPersonGuessedWrong, setLastPersonGuessedWrong] = useState(false);
    const [scriptProcessed, setScriptProcessed] = useState(false);
    const [yourMoney, setYourMoney] = useState(0);
    const [fakeComputerQuestion, setFakeComputerQuestion] = useState(null);
    const [fakeComputerAnswer, setFakeComputerAnswer] = useState(null);
    const incrementMoney = useCallback(() => {
        if (yourMoney == 0) setYourMoney(100);
        else setYourMoney(yourMoney * 2);
    }, [ yourMoney ]);
    useEffect(() => {
        Promise.all([scriptPromise]).then(() => {
            setQuestionSet((window as any).ticQuestionSet);
            setScriptProcessed(true);
        });
    }, []);
    let mainApp = null;
    const boardState = useTicTacToeBoard();
    const clickHandler = useCallback(
        (x, y, question) => {
            setUserAnswer({ x, y, question });
        },
        [boardState]
    );
    const boardScore = useMemo(() => evalBoardScore(boardState.board), [boardState.board]);
    const someoneCanMove = useMemo(() => getAllMoves(boardState.board, null).length > 0, [boardState.board]);
    const gameOver = boardScore != 0 || !someoneCanMove;
    useEffect(() => {
        if (turn == Turn.Computer && !gameOver && fakeComputerQuestion == null) {
            (async function () {
                console.log("started timeout");
                await new Promise((resolve) => setTimeout(resolve, 2000));

                const shouldBeCorrect = round != 4;
                const computerMoveData = makeComputerMove(boardState);
                const boardIndex = computerMoveData.idx;
                setFakeComputerQuestion(questionSet[boardIndex]);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                if (shouldBeCorrect) {
                    setFakeComputerAnswer(questionSet[boardIndex].answers[0]);
                    setLastPersonGuessedWrong(false);
                    boardState.setPieceAtPos(computerMoveData.bestX, computerMoveData.bestY, TicTacToePieceValue.O);
                    round++;
                    correctSound.play();
                    incrementMoney();
                } else {
                    setFakeComputerAnswer(
                        questionSet[boardIndex].incorrectAnswers[
                            getRandomIntInclusive(0, questionSet[boardIndex].incorrectAnswers.length)
                        ]
                    );
                    round = 1;
                    setLastPersonGuessedWrong(true);
                    incorrectSound.play();
                }
                setTurn(Turn.Player);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                yourTurnSound.play();
                setFakeComputerQuestion(null);
                setFakeComputerAnswer(null);
            })();
        }
    }, [boardState.board, fakeComputerQuestion, boardState, turn, gameOver, questionSet]);
    const onAnswerChosen = (answer) => {
        const { x, y } = userAnswer;
        if (answer == userAnswer.question.answers[0]) {
            setLastPersonGuessedWrong(false);
            boardState.setPieceAtPos(x, y, TicTacToePieceValue.X);
            correctSound.play();
            incrementMoney();
        } else {
            setLastPersonGuessedWrong(true);
            incorrectSound.play();
        }
        setUserAnswer(null);
        setTurn(Turn.Computer);
    };
    useEffect(() => {
        musicSound.load();
    }, []);
    const questionList = useMemo(() => {
        if (userAnswer == null) return [];
        else {
            const list = [];
            list.push(
                ...userAnswer.question.answers.map((answer) => (
                    <button key={answer} onClick={onAnswerChosen.bind(void 0, answer)} className="question-option">
                        {answer}
                    </button>
                ))
            );
            list.push(
                userAnswer.question.incorrectAnswers.map((answerIndex) => (
                    <button
                        key={questionSet[answerIndex].answers[0]}
                        onClick={onAnswerChosen.bind(void 0, questionSet[answerIndex].answers[0])}
                        className="question-option"
                    >
                        {questionSet[answerIndex].answers[0]}
                    </button>
                ))
            );
            shuffle(list);
            return list;
        }
    }, [userAnswer, onAnswerChosen]);
    const fakeComputerQuestionList = useMemo(() => {
        if (fakeComputerQuestion == null) return [];
        else {
            const list = [];
            list.push(
                ...fakeComputerQuestion.answers.map((answer) => (
                    <button
                        key={answer}
                        className={classNames(
                            "computer-question-option",
                            "computer-question-option-correct",
                            answer == fakeComputerAnswer && "computer-question-option-chosen",
                            answer != fakeComputerAnswer && fakeComputerAnswer != null && "computer-question-option-not-chosen",
                        )}
                    >
                        {answer}
                    </button>
                ))
            );
            list.push(
                fakeComputerQuestion.incorrectAnswers.map((answerIndex) => (
                    <button
                        key={questionSet[answerIndex].answers[0]}
                        className={classNames(
                            "computer-question-option",
                            "computer-question-option-incorrect",
                            questionSet[answerIndex].answers[0] == fakeComputerAnswer &&
                                "computer-question-option-chosen",
                            questionSet[answerIndex].answers[0] != fakeComputerAnswer && fakeComputerAnswer != null && "computer-question-option-not-chosen",
                        )}
                    >
                        {questionSet[answerIndex].answers[0]}
                    </button>
                ))
            );
            shuffle(list, fakeComputerQuestion);
            return list;
        }
    }, [fakeComputerQuestion, fakeComputerAnswer]);
    const startGame = () => {
        setStarted(true);
        musicSound.play();
        yourTurnSound.play();
    };

    mainApp = (
        <>
            {started && (
                <h1 className="game-message">
                    {gameOver && (
                        <>
                            {boardScore == 10 && `You won \$${yourMoney}!`}
                            {boardScore == -10 && `The computer won \$${yourMoney}!`}
                            {boardScore == 0 && "Tie!"}
                        </>
                    )}
                    {!gameOver && (
                        <>
                            {turn == Turn.Computer &&
                                `${
                                    lastPersonGuessedWrong ? "You answered incorrectly. " : "Good job! "
                                }The computer is playing...`}
                            {turn == Turn.Player &&
                                `${lastPersonGuessedWrong ? "It answered incorrectly. " : ""}Your turn!`}
                        </>
                    )}
                </h1>
            )}
            {started && (
                <TicTacToeBoard
                    questionSet={questionSet}
                    board={boardState.board}
                    disabled={gameOver || turn == Turn.Computer}
                    onClick={clickHandler}
                />
            )}
            {started && !lastPersonGuessedWrong && turn == Turn.Computer && <CashAnimation />}
            {started && !gameOver && (
                <div className="money-dashboard">
                    <img src="cash.svg" />
                    <span>{"$" + yourMoney}</span>
                </div>
            )}
            {!started && <h1 className="game-message">Tic Tac Dough</h1>}
            {!started && (
                <button disabled={!scriptProcessed} className="question-option start-button" onClick={startGame}>
                    {scriptProcessed ? "Start" : "Loading..."}
                </button>
            )}
            {userAnswer && (
                <div className="question-options-container">
                    <div className="question-options">
                        <h1>{userAnswer.question.question}</h1>
                        {questionList}
                    </div>
                </div>
            )}
            {fakeComputerQuestion && (
                <div className="question-options-container">
                    <div className="computer-question-options">
                        <h1>{fakeComputerQuestion.question}</h1>
                        {fakeComputerQuestionList}
                    </div>
                </div>
            )}
        </>
    );
    return <>{mainApp}</>;
}

ReactDOM.render(<App />, document.getElementById("game-container"));
