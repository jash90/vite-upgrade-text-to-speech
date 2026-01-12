import { Button } from '@/components/ui/button';
import { Loader2, Mic } from 'lucide-react';

interface ConvertButtonProps {
  onClick: () => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export function ConvertButton({
  onClick,
  isProcessing,
  disabled = false,
}: ConvertButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isProcessing}
      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 font-semibold text-white shadow-md transition duration-300 ease-in-out hover:from-blue-600 hover:to-purple-600 hover:scale-105"
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Converting...
        </>
      ) : (
        <>
          <Mic className="mr-2 h-4 w-4" />
          Convert Text to Speech
        </>
      )}
    </Button>
  );
}
