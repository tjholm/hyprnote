import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  ChevronDownIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PlayIcon,
  StopCircleIcon,
  Volume2Icon,
  VolumeOffIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { useHypr } from "@/contexts";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { TemplateService } from "@/utils/template-service";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import ShinyButton from "./shiny-button";

const showConsentNotification = () => {
  toast({
    id: "recording-consent-reminder",
    title: "🔴 Recording Started",
    content: "Don't forget to notify others that you're recording this session for transparency and consent.",
    buttons: [
      {
        label: "I've notified everyone",
        onClick: () => {
          sonnerToast.dismiss("recording-consent-reminder");
        },
        primary: true,
      },
    ],
    dismissible: false,
  });
};

export default function ListenButton({ sessionId }: { sessionId: string }) {
  const { onboardingSessionId } = useHypr();
  const isOnboarding = sessionId === onboardingSessionId;

  const modelDownloaded = useQuery({
    queryKey: ["check-stt-model-downloaded"],
    refetchInterval: 1000,
    queryFn: async () => {
      const currentModel = await localSttCommands.getCurrentModel();
      const isDownloaded = await localSttCommands.isModelDownloaded(currentModel);
      return isDownloaded;
    },
  });

  const anySttModelExists = useQuery({
    queryKey: ["check-any-stt-model-downloaded"],
    refetchInterval: 3000,
    queryFn: async () => {
      const supportedModels = await localSttCommands.listSupportedModels();
      const sttDownloadStatuses = await Promise.all(
        supportedModels.map((model) => localSttCommands.isModelDownloaded(model)),
      );
      return sttDownloadStatuses.some(Boolean);
    },
    enabled: isOnboarding,
  });

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);
  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    resume: s.resume,
    pause: s.pause,
    stop: s.stop,
    loading: s.loading,
  }));

  useEffect(() => {
    if (ongoingSessionStatus === "running_active" && sessionId === ongoingSessionId && !isOnboarding) {
      showConsentNotification();
    }
  }, [ongoingSessionStatus, sessionId, ongoingSessionId, isOnboarding]);

  const isEnhancePending = useEnhancePendingState(sessionId);
  const nonEmptySession = useSession(
    sessionId,
    (s) => !!(s.session.words.length > 0 || s.session.enhanced_memo_html),
  );
  const meetingEnded = isEnhancePending || nonEmptySession;

  const handleStartSession = () => {
    if (ongoingSessionStatus === "inactive") {
      ongoingSessionStore.start(sessionId);

      // Set mic muted after starting if it's onboarding
      if (isOnboarding) {
        listenerCommands.setMicMuted(true);
      }
    }
  };

  const handleResumeSession = () => {
    ongoingSessionStore.resume();
  };

  if (ongoingSessionStore.loading) {
    return (
      <div className="w-9 h-9 flex items-center justify-center">
        <Spinner color="black" />
      </div>
    );
  }

  if (ongoingSessionStatus === "running_paused" && sessionId === ongoingSessionId) {
    return (
      <button
        disabled={!modelDownloaded.data}
        onClick={handleResumeSession}
        className={cn(
          "w-16 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-xs font-medium",
          "bg-red-100 border-2 border-red-400 text-red-600",
          "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        )}
      >
        <Trans>Resume</Trans>
      </button>
    );
  }

  if (ongoingSessionStatus === "inactive") {
    const buttonProps = {
      disabled: isOnboarding
        ? !anySttModelExists.data || (meetingEnded && isEnhancePending)
        : !modelDownloaded.data || (meetingEnded && isEnhancePending),
      onClick: handleStartSession,
    };

    if (!meetingEnded) {
      return isOnboarding
        ? <WhenInactiveAndMeetingNotEndedOnboarding {...buttonProps} />
        : <WhenInactiveAndMeetingNotEnded {...buttonProps} />;
    } else {
      return isOnboarding
        ? <WhenInactiveAndMeetingEndedOnboarding {...buttonProps} />
        : <WhenInactiveAndMeetingEnded {...buttonProps} />;
    }
  }

  if (ongoingSessionStatus === "running_active") {
    if (sessionId !== ongoingSessionId) {
      return null;
    }

    return <WhenActive sessionId={sessionId} />;
  }
}

function WhenInactiveAndMeetingNotEnded({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          disabled={disabled}
          onClick={onClick}
          className={cn([
            "w-9 h-9 rounded-full border-2 transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.8)]",
            disabled ? "bg-neutral-200 border-neutral-400" : "bg-red-500 border-neutral-400",
          ])}
        >
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        <p>
          <Trans>Start recording</Trans>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function WhenInactiveAndMeetingEnded({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-16 h-9 rounded-full transition-all outline-none p-0 flex items-center justify-center text-xs font-medium",
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600",
        "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        !disabled
          ? "hover:opacity-100 hover:bg-red-100 hover:text-red-600 hover:border-red-400 hover:scale-95 cursor-pointer"
          : "opacity-10 cursor-progress",
      )}
    >
      <Trans>{disabled ? "Wait..." : isHovered ? "Resume" : "Ended"}</Trans>
    </button>
  );
}

function WhenInactiveAndMeetingNotEndedOnboarding({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <ShinyButton
      disabled={disabled}
      onClick={onClick}
      className={cn([
        "w-24 h-9 rounded-full border-2 transition-all cursor-pointer outline-none p-0 flex items-center justify-center gap-1",
        "bg-neutral-800 border-neutral-700 text-white text-xs font-medium",
        !disabled
          ? "hover:scale-95"
          : "opacity-50 cursor-progress",
      ])}
      style={{
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
      }}
    >
      <PlayIcon size={14} />
      <Trans>{disabled ? "Wait..." : "Play video"}</Trans>
    </ShinyButton>
  );
}

function WhenInactiveAndMeetingEndedOnboarding({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-28 h-9 rounded-full outline-none p-0 flex items-center justify-center gap-1 text-xs font-medium",
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600",
        "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
        !disabled
          ? "hover:bg-neutral-300 hover:text-neutral-800 hover:border-neutral-500 transition-all hover:scale-95 cursor-pointer"
          : "opacity-10 cursor-progress",
      )}
    >
      <PlayIcon size={14} />
      <Trans>{disabled ? "Wait..." : "Play again"}</Trans>
    </button>
  );
}

function WhenActive({ sessionId }: { sessionId: string }) {
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);
  const ongoingSessionStore = useOngoingSession((s) => ({
    pause: s.pause,
    stop: s.stop,
    setAutoEnhanceTemplate: s.setAutoEnhanceTemplate,
  }));
  const sessionWords = useSession(ongoingSessionId!, (s) => s.session.words);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handlePauseSession = () => {
    ongoingSessionStore.pause();
    setIsPopoverOpen(false);
  };

  const handleStopSession = (templateId?: string | null) => {
    if (templateId !== undefined) {
      ongoingSessionStore.setAutoEnhanceTemplate(templateId);
    }

    ongoingSessionStore.stop();
    setIsPopoverOpen(false);

    if (sessionWords.length === 0) {
      sonnerToast.dismiss("recording-consent-reminder");
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn([
            isPopoverOpen && "hover:scale-95",
            "w-14 h-9 rounded-full bg-red-100 border-2 transition-all border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center",
            "shadow-[0_0_0_2px_rgba(255,255,255,0.8)_inset]",
          ])}
        >
          <SoundIndicator color="#ef4444" size="long" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <RecordingControls
          sessionId={sessionId}
          onPause={handlePauseSession}
          onStop={handleStopSession}
        />
      </PopoverContent>
    </Popover>
  );
}

function RecordingControls({
  sessionId,
  onPause,
  onStop,
}: {
  sessionId: string;
  onPause: () => void;
  onStop: (templateId?: string | null) => void;
}) {
  const { onboardingSessionId } = useHypr();
  const ongoingSessionMuted = useOngoingSession((s) => ({
    micMuted: s.micMuted,
    speakerMuted: s.speakerMuted,
  }));
  const [selectedTemplate, setSelectedTemplate] = useState<string>("auto");

  const toggleMicMuted = useMutation({
    mutationFn: () => listenerCommands.setMicMuted(!ongoingSessionMuted.micMuted),
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: () => listenerCommands.setSpeakerMuted(!ongoingSessionMuted.speakerMuted),
  });

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: () => dbCommands.getConfig(),
    refetchOnWindowFocus: true,
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => TemplateService.getAllTemplates(),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (configQuery.data?.general?.selected_template_id) {
      setSelectedTemplate(configQuery.data.general.selected_template_id);
    } else {
      setSelectedTemplate("auto");
    }
  }, [configQuery.data]);

  const handleStopWithTemplate = () => {
    const actualTemplateId = selectedTemplate === "auto" ? null : selectedTemplate;
    onStop(actualTemplateId);
  };

  return (
    <>
      <div className="flex gap-2 w-full justify-between mb-3">
        <MicrophoneSelector
          isMuted={ongoingSessionMuted.micMuted}
          disabled={sessionId === onboardingSessionId}
          onToggleMuted={() => toggleMicMuted.mutate()}
        />
        <SpeakerButton
          isMuted={ongoingSessionMuted.speakerMuted}
          onClick={() => toggleSpeakerMuted.mutate()}
        />
      </div>

      <div className="mb-3">
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select template..." />
          </SelectTrigger>
          <SelectContent className="max-h-44 overflow-y-auto w-[var(--radix-select-trigger-width)]">
            <SelectItem value="auto">
              <Trans>No Template (Default)</Trans>
            </SelectItem>
            {templatesQuery.data?.map((template) => {
              const title = template.title || "Untitled";
              const truncatedTitle = title.length > 20 ? title.substring(0, 20) + "..." : title;

              return (
                <SelectItem key={template.id} value={template.id} className="whitespace-nowrap">
                  {truncatedTitle}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onPause}
          className="w-full"
        >
          <PauseIcon size={16} />
          <Trans>Pause</Trans>
        </Button>
        <Button
          variant="destructive"
          onClick={handleStopWithTemplate}
          className="w-full"
        >
          <StopCircleIcon size={16} />
          <Trans>Stop</Trans>
        </Button>
      </div>
    </>
  );
}

function MicrophoneSelector({
  isMuted,
  onToggleMuted,
  disabled,
}: {
  isMuted?: boolean;
  onToggleMuted: () => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const allDevicesQuery = useQuery({
    queryKey: ["microphone", "devices"],
    queryFn: () => listenerCommands.listMicrophoneDevices(),
  });

  const currentDeviceQuery = useQuery({
    queryKey: ["microphone", "current-device"],
    queryFn: () => listenerCommands.getCurrentMicrophoneDevice(),
  });

  const handleSelectDevice = (device: string) => {
    listenerCommands.setMicrophoneDevice(device).then(() => {
      currentDeviceQuery.refetch();
    });
  };

  const Icon = isMuted ? MicOffIcon : MicIcon;

  return (
    <div className="flex-1 min-w-0">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex -space-x-px">
          <Button
            variant="outline"
            className="rounded-r-none flex-1 min-w-0 h-10 flex items-center justify-center gap-2 transition-all hover:border-neutral-300"
            disabled={disabled}
            onClick={onToggleMuted}
          >
            <Icon
              className={cn(
                "flex-shrink-0 transition-colors",
                isMuted ? "text-neutral-400" : "text-neutral-700",
                disabled && "text-neutral-300 opacity-50",
              )}
              size={18}
            />
            {!disabled && (
              <div className="flex-1 flex items-center justify-center">
                <SoundIndicator input="mic" size="long" />
              </div>
            )}
          </Button>

          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="rounded-l-none px-1.5 flex-shrink-0 h-10 transition-all hover:border-neutral-300 hover:bg-neutral-50"
              disabled={disabled}
            >
              <ChevronDownIcon className="w-4 h-4 text-neutral-600" />
            </Button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-2">
            <div className="mb-2 px-2">
              <span className="text-sm font-medium">Microphone</span>
            </div>

            {allDevicesQuery.isLoading
              ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600 mx-auto"></div>
                  <p className="text-sm text-neutral-500 mt-2">Loading devices...</p>
                </div>
              )
              : allDevicesQuery.data?.length === 0
              ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-neutral-500">No microphones found</p>
                </div>
              )
              : (
                <div className="space-y-1">
                  {allDevicesQuery.data?.map((device) => {
                    const isSelected = device === currentDeviceQuery.data;
                    return (
                      <Button
                        key={device}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left h-8 px-2",
                          isSelected && "bg-neutral-100",
                        )}
                        onClick={() => {
                          handleSelectDevice(device);
                          setIsOpen(false);
                        }}
                      >
                        <Icon className="w-4 h-4 mr-2 flex-shrink-0 text-neutral-600" />
                        <span className="text-sm truncate flex-1">{device}</span>
                        {isSelected && <CheckIcon className="w-4 h-4 ml-auto flex-shrink-0 text-green-600" />}
                      </Button>
                    );
                  })}
                </div>
              )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SpeakerButton({
  isMuted,
  onClick,
  disabled,
}: {
  isMuted?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = isMuted ? VolumeOffIcon : Volume2Icon;

  return (
    <div className="flex-1 min-w-0">
      <Button
        variant="outline"
        onClick={onClick}
        className="w-full h-10 flex items-center justify-center gap-2 transition-all hover:border-neutral-300"
        disabled={disabled}
      >
        <Icon
          className={cn(
            "flex-shrink-0 transition-colors",
            isMuted ? "text-neutral-400" : "text-neutral-700",
            disabled && "text-neutral-300 opacity-50",
          )}
          size={18}
        />
        {!disabled && (
          <div className="flex-1 flex items-center justify-center">
            <SoundIndicator input="speaker" size="long" />
          </div>
        )}
      </Button>
    </div>
  );
}
