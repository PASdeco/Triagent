import { ConnectButton } from "@rainbow-me/rainbowkit";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        if (!mounted) {
          return <button className="btn-neon !px-4 !py-2 !text-xs min-w-[140px] opacity-0" />;
        }

        if (!account) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button onClick={openConnectModal} className="btn-neon !px-4 !py-2 !text-xs min-w-[140px]">
                      CONNECT WALLET
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Connect wallet to compete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        if (chain?.unsupported) {
          return (
            <button onClick={openChainModal} className="btn-neon !px-4 !py-2 !text-xs">
              SWITCH NETWORK
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <span className="font-display text-xs tracking-[0.18em] text-muted-foreground">
              {shortAddress(account.address)}
            </span>
            <button onClick={openAccountModal} className="btn-neon btn-neon-solid !px-4 !py-2 !text-xs">
              WALLET
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
