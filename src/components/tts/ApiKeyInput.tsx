import { Input } from '@/components/ui/input';
import { Key } from 'lucide-react';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ApiKeyInput({ value, onChange, disabled = false }: ApiKeyInputProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="password"
          placeholder="Enter your OpenAI API Key"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pl-10"
        />
      </div>
      <div className="text-center">
        <a
          href="https://www.youtube.com/watch?v=muaHr3oYf7U"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-500 hover:underline"
        >
          <Key className="mr-1 h-3.5 w-3.5" />
          How to Create an OpenAI Account & Generate an API Key
        </a>
      </div>
    </div>
  );
}
