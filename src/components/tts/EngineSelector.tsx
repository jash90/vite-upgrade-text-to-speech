import { Cloud, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TTSEngine } from '@/types';

interface EngineSelectorProps {
  value: TTSEngine;
  onChange: (engine: TTSEngine) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: TTSEngine; label: string; hint: string; icon: typeof Cloud }> = [
  { value: 'openai', label: 'OpenAI API', hint: 'Cloud, requires API key, billed per use', icon: Cloud },
  { value: 'local', label: 'Local (offline)', hint: 'Piper VITS in browser, free, Polish & English', icon: HardDrive },
];

export function EngineSelector({ value, onChange, disabled = false }: EngineSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Engine</label>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-md border p-3 text-left transition',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
