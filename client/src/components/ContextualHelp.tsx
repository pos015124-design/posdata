import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Lightbulb, Info } from 'lucide-react';

type Position = 'top' | 'right' | 'bottom' | 'left';

interface ContextualHelpProps {
  title: string;
  content: string;
  position?: Position;
  trigger?: 'icon' | 'lightbulb' | 'tooltip';
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ 
  title, 
  content, 
  position = 'right', 
  trigger = 'icon',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const helpContent = (
    <div className="max-w-xs">
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{content}</p>
    </div>
  );

  if (trigger === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground ml-1 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side={position as Position} className="max-w-xs">
            {helpContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${className}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {trigger === 'lightbulb' ? (
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          ) : (
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side={position as Position} 
        className="w-80 p-0"
      >
        <div className="p-4">
          <h4 className="font-semibold text-sm mb-2">{title}</h4>
          <p className="text-sm text-muted-foreground">{content}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ContextualHelp;