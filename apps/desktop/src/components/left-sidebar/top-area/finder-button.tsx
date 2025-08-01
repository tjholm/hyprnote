import { Trans } from "@lingui/react/macro";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

// Custom SVG icon component to replace the folder icon
function CustomFinderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
    >
      <path d="M21.001 3C21.5533 3 22.001 3.44772 22.001 4V20C22.001 20.5523 21.5533 21 21.001 21H3.00098C2.44869 21 2.00098 20.5523 2.00098 20V4C2.00098 3.44772 2.44869 3 3.00098 3H21.001ZM10.4817 4.99884L4.00098 5V19L12.747 18.9997C12.6851 18.6562 12.6308 18.3163 12.5844 17.98C12.2874 17.9933 12.0929 18 12.001 18C9.79308 18 7.60332 17.2701 5.44628 15.8321L6.55568 14.1679C8.39863 15.3966 10.2089 16 12.001 16C12.1337 16 12.2664 15.9967 12.3993 15.9901C12.3747 15.4926 12.3747 14.5797 12.4064 14H9.50098V13C9.50098 9.72527 9.82146 7.06094 10.4817 4.99884ZM12.601 4.99851C11.9358 6.58176 11.5567 9.41121 11.5119 12H14.6338L14.4933 13.124C14.3927 13.9288 14.3567 14.7687 14.3857 15.6439C15.3987 15.3449 16.4174 14.8539 17.4463 14.1679L18.5557 15.8321C17.2358 16.7119 15.9038 17.3267 14.5628 17.6714C14.62 18.1052 14.6937 18.5482 14.7819 18.999L20.001 19V5L12.601 4.99851ZM7.00098 7C7.55326 7 8.00098 7.44772 8.00098 8V9C8.00098 9.55228 7.55326 10 7.00098 10C6.44869 10 6.00098 9.55228 6.00098 9V8C6.00098 7.44772 6.44869 7 7.00098 7ZM17.001 7C17.5533 7 18.001 7.44772 18.001 8V9C18.001 9.55228 17.5533 10 17.001 10C16.4487 10 16.001 9.55228 16.001 9V8C16.001 7.44772 16.4487 7 17.001 7Z">
      </path>
    </svg>
  );
}

export function FinderButton() {
  const handleClickFinder = () => {
    windowsCommands.windowShow({ type: "finder" });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClickFinder}
          className="hover:bg-neutral-200"
        >
          <CustomFinderIcon size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Trans>Open finder view</Trans>
      </TooltipContent>
    </Tooltip>
  );
}
