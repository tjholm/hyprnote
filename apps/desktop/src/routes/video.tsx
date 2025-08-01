import type MuxPlayerElement from "@mux/mux-player";
import type { MuxPlayerElementEventMap } from "@mux/mux-player";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { events as listenerEvents } from "@hypr/plugin-listener";
import { commands as windowsCommands, events as windowsEvents } from "@hypr/plugin-windows";

const schema = z.object({
  id: z.string(),
});

export const Route = createFileRoute("/video")({
  component: Component,
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { id } }) => {
    return { id };
  },
});

function Component() {
  const { id } = Route.useLoaderData();

  const player = useRef<MuxPlayerElement>(null);
  const { userId } = useHypr();

  useEffect(() => {
    let unlisten: () => void;

    listenerEvents.sessionEvent.listen(({ payload }) => {
      if (payload.type === "running_paused") {
        player.current?.pause();
      }

      if (payload.type === "running_active") {
        player.current?.play();

        analyticsCommands.event({
          event: "onboarding_video_started",
          distinct_id: userId,
        });
      }

      if (payload.type === "inactive") {
        handleEnded();
      }
    }).then((u) => {
      unlisten = u;
    });

    return () => unlisten?.();
  }, []);

  const styles = {
    "--bottom-controls": "none",
    "aspectRatio": "16 / 9",
  } as React.CSSProperties;

  const handleEnded = () => {
    windowsCommands.windowDestroy({ type: "video", value: id });
  };

  const [didExpandRightPanel, setDidExpandRightPanel] = useState(false);

  const handleTimeUpdate = (e: MuxPlayerElementEventMap["timeupdate"]) => {
    if (e.timeStamp > 67500 && !didExpandRightPanel) {
      setDidExpandRightPanel(true);
      windowsEvents.mainWindowState.emit({
        left_sidebar_expanded: null,
        right_panel_expanded: true,
      });
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="w-full h-full relative"
    >
      <div className="absolute top-0 left-0 w-full h-11 bg-transparent z-50" data-tauri-drag-region></div>
      <MuxPlayer
        ref={player}
        playbackId={id}
        autoPlay={true}
        style={styles}
        loading="viewport"
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        disableTracking={import.meta.env.DEV}
      />
    </div>
  );
}
