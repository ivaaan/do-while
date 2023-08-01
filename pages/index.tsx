import {
  RoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
  useOthers,
} from "../liveblocks.config";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Cursor from "../components/Cursor";
import FlyingReaction from "../components/FlyingReaction";
import ReactionSelector from "../components/ReactionSelector";
import useInterval from "../hooks/useInterval";

/**
 * This file shows how to create Live Cursors with a small chat and interactions
 *
 * Because it's a bit more advanced that others examples, it's implemented using typescript to ensure that we introduce less bug while maintaining it.
 * It also uses Tailwind CSS for the styling
 */

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

enum CursorMode {
  Hidden,
  Chat,
  ReactionSelector,
  Reaction,
}

type CursorState =
  | {
      mode: CursorMode.Hidden;
    }
  | {
      mode: CursorMode.Chat;
      message: string;
      previousMessage: string | null;
    }
  | {
      mode: CursorMode.ReactionSelector;
    }
  | {
      mode: CursorMode.Reaction;
      reaction: string;
      isPressed: boolean;
    };

type Reaction = {
  value: string;
  timestamp: number;
  point: { x: number; y: number };
};

type ReactionEvent = {
  x: number;
  y: number;
  value: string;
};

function WhoIsHere() {
  const userCount = useOthers((others) => others.length);

  return userCount === 0 ? (
    <div className="font-light text-stone-400 leading-5">
      <p>There are no other users online.</p>
      <p>Open this site in another browser window to see what happens.</p>
    </div>
  ) : (
    <div className="font-light text-stone-400 leading-5">
      There are {userCount} other users online.
    </div>
  );
}

function Example() {
  const others = useOthers();
  const userCount = useOthers((others) => others.length);
  const [{ cursor }, updateMyPresence] = useMyPresence();
  const broadcast = useBroadcastEvent();
  const [state, setState] = useState<CursorState>({ mode: CursorMode.Hidden });
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const setReaction = useCallback((reaction: string) => {
    setState({ mode: CursorMode.Reaction, reaction, isPressed: false });
  }, []);

  // Remove reactions that are not visible anymore (every 1 sec)
  useInterval(() => {
    setReactions((reactions) =>
      reactions.filter((reaction) => reaction.timestamp > Date.now() - 4000)
    );
  }, 1000);

  useInterval(() => {
    if (state.mode === CursorMode.Reaction && state.isPressed && cursor) {
      setReactions((reactions) =>
        reactions.concat([
          {
            point: { x: cursor.x, y: cursor.y },
            value: state.reaction,
            timestamp: Date.now(),
          },
        ])
      );
      broadcast({
        x: cursor.x,
        y: cursor.y,
        value: state.reaction,
      });
    }
  }, 100);

  useEffect(() => {
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "/") {
        setState({ mode: CursorMode.Chat, previousMessage: null, message: "" });
      } else if (e.key === "Escape") {
        updateMyPresence({ message: "" });
        setState({ mode: CursorMode.Hidden });
      } else if (e.key === "e") {
        setState({ mode: CursorMode.ReactionSelector });
      }
    }

    window.addEventListener("keyup", onKeyUp);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/") {
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [updateMyPresence]);

  useEventListener((eventData) => {
    const event = eventData.event as ReactionEvent;
    setReactions((reactions) =>
      reactions.concat([
        {
          point: { x: event.x, y: event.y },
          value: event.value,
          timestamp: Date.now(),
        },
      ])
    );
  });

  return (
    <>
      <div
        className="relative h-screen w-full flex items-center justify-center overflow-hidden touch-none"
        style={{
          cursor:
            state.mode === CursorMode.Chat
              ? "none"
              : "url(cursor.svg) 0 0, auto",
        }}
        onPointerMove={(event) => {
          event.preventDefault();
          if (cursor == null || state.mode !== CursorMode.ReactionSelector) {
            updateMyPresence({
              cursor: {
                x: Math.round(event.clientX),
                y: Math.round(event.clientY),
              },
            });
          }
        }}
        onPointerLeave={() => {
          setState({
            mode: CursorMode.Hidden,
          });
          updateMyPresence({
            cursor: null,
          });
        }}
        onPointerDown={(event) => {
          updateMyPresence({
            cursor: {
              x: Math.round(event.clientX),
              y: Math.round(event.clientY),
            },
          });
          setState((state) =>
            state.mode === CursorMode.Reaction
              ? { ...state, isPressed: true }
              : state
          );
        }}
        onPointerUp={() => {
          setState((state) =>
            state.mode === CursorMode.Reaction
              ? { ...state, isPressed: false }
              : state
          );
        }}
      >
        {reactions.map((reaction) => {
          return (
            <FlyingReaction
              key={reaction.timestamp.toString()}
              x={reaction.point.x}
              y={reaction.point.y}
              timestamp={reaction.timestamp}
              value={reaction.value}
            />
          );
        })}
        {cursor && (
          <div
            className="absolute top-0 left-0"
            style={{
              transform: `translateX(${cursor.x}px) translateY(${cursor.y}px)`,
            }}
          >
            {state.mode === CursorMode.Chat && (
              <>
                <img src="cursor.svg" />

                <div
                  className="absolute top-5 left-2 px-4 py-2 bg-blue-500 text-white leading-relaxed text-sm"
                  onKeyUp={(e) => e.stopPropagation()}
                  style={{
                    borderRadius: 20,
                  }}
                >
                  {state.previousMessage && <div>{state.previousMessage}</div>}
                  <input
                    className="bg-transparent border-none	outline-none text-white placeholder-blue-300 w-60"
                    autoFocus={true}
                    onChange={(e) => {
                      updateMyPresence({ message: e.target.value });
                      setState({
                        mode: CursorMode.Chat,
                        previousMessage: null,
                        message: e.target.value,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setState({
                          mode: CursorMode.Chat,
                          previousMessage: state.message,
                          message: "",
                        });
                      } else if (e.key === "Escape") {
                        setState({
                          mode: CursorMode.Hidden,
                        });
                      }
                    }}
                    placeholder={state.previousMessage ? "" : "Say something…"}
                    value={state.message}
                    maxLength={50}
                  />
                </div>
              </>
            )}
            {state.mode === CursorMode.ReactionSelector && (
              <ReactionSelector
                setReaction={(reaction) => {
                  setReaction(reaction);
                }}
              />
            )}
            {state.mode === CursorMode.Reaction && (
              <div className="absolute top-3.5 left-1 pointer-events-none select-none">
                {state.reaction}
              </div>
            )}
          </div>
        )}

        {others.map(({ connectionId, presence }) => {
          if (presence == null || !presence.cursor) {
            return null;
          }

          return (
            <Cursor
              key={connectionId}
              color={COLORS[connectionId % COLORS.length]}
              x={presence.cursor.x}
              y={presence.cursor.y}
              message={presence.message}
            />
          );
        })}
      </div>
    </>
  );
}

export default function Page() {
  // const roomId = useOverrideRoomId("nextjs-live-cursors-chat");

  const [iLoveWord, setILoveWord] = React.useState("TypeScript");

  const iLoveArr = [
    "TypeScript",
    "React",
    "Next",
    "Node",
    "Supabase",
    "Postgres",
    "GraphQL",
    "SQL",
    "Liveblocks",
    "Tailwind",
    "Azure",
    "algorithms",
    "music 🎷",
    "dogs 🦮",
    "coffee ☕️",
  ];

  function randWord(items: Array<String>) {
    return items[~~(items.length * Math.random())];
  }

  useEffect(() => {
    setInterval(() => {
      const showNextWord: any = randWord(iLoveArr);
      setILoveWord(showNextWord);
      console.log("word changed to", showNextWord);
    }, 8000);
  }, []);

  return (
    <RoomProvider
      id="newroom"
      initialPresence={() => ({
        cursor: null,
        message: "",
      })}
    >
      <div className="fixed inset-0 flex-col justify-center items-center">
        <div className="text-center">
          <WhoIsHere />
          <ul className="flex items-center justify-center space-x-2 mt-4">
            <li className="flex items-center space-x-2 text-sm bg-gray-100 rounded-md py-2 px-3">
              <span>Reactions</span>
              <span className="block uppercase font-medium text-xs text-gray-500 rounded border border-gray-300 px-1">
                E
              </span>
            </li>

            <li className="flex items-center space-x-2 text-sm bg-gray-100 rounded-md py-2 px-3">
              <span>Chat</span>
              <span className="block uppercase font-medium text-xs text-gray-500 rounded border border-gray-300 px-1">
                /
              </span>
            </li>

            <li className="flex items-center space-x-2 text-sm bg-gray-100 rounded-md py-2 px-3">
              <span>Escape</span>
              <span className="block uppercase font-medium text-xs text-gray-500 rounded border border-gray-300 px-1">
                esc
              </span>
            </li>
          </ul>
        </div>
        <div className="text-center py-20">
          <div className="text-7xl font-bold tracking-tight">
            <h1>Hi, my name is Ivan .</h1>
            <p>
              I love <span className="text-red-600">{"{ "}</span>
              <span key={+new Date()} className="fade">
                {iLoveWord}
              </span>
              <span className="text-red-600">{" }"}</span>.
            </p>
            <p>Currently based in Belmont, CA.</p>
            <span>diykarelia</span>
            <span className="text-red-600">{" @ "}</span>
            <span>gmail.com</span>
          </div>
        </div>
      </div>

      <Example />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-chat#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-chat#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}
