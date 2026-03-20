"use client";

import { CornerRightUp, Mic, Square } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";

interface AIInputProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string) => void;
  onStop?: () => void;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AIInput({
  id = "ai-input",
  placeholder = "Type your message...",
  minHeight = 52,
  maxHeight = 200,
  onSubmit,
  onStop,
  className,
  disabled = false,
  isLoading = false,
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [inputValue, setInputValue] = useState("");

  const handleReset = () => {
    if (!inputValue.trim() || disabled) return;
    onSubmit?.(inputValue);
    setInputValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto">
        <Textarea
          id={id}
          placeholder={placeholder}
          className={cn(
            "max-w-xl bg-black/5 dark:bg-white/5 rounded-3xl pl-6 pr-16",
            "placeholder:text-black/50 dark:placeholder:text-white/50",
            "border-none ring-black/20 dark:ring-white/20",
            "text-black dark:text-white text-wrap",
            "overflow-y-auto resize-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "transition-[height] duration-100 ease-out",
            "leading-[1.2] py-[16px]",
            "[&::-webkit-resizer]:hidden"
          )}
          style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
          ref={textareaRef}
          value={inputValue}
          disabled={disabled || isLoading}
          onChange={(e) => {
            setInputValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleReset();
            }
          }}
        />

        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1 transition-all duration-200",
            inputValue && !isLoading ? "right-10 opacity-100 scale-100" : "right-3 opacity-0 scale-95 pointer-events-none"
          )}
        >
          <Mic className="w-4 h-4 text-black/70 dark:text-white/70" />
        </div>

        {isLoading ? (
          <button
            onClick={onStop}
            type="button"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 right-3",
              "rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1",
              "transition-all duration-200",
              "opacity-100 scale-100"
            )}
            title="Stop generating"
          >
            <Square className="w-4 h-4 text-black/70 dark:text-white/70 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleReset}
            type="button"
            disabled={disabled}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 right-3",
              "rounded-xl bg-black/5 dark:bg-white/5 py-1 px-1",
              "transition-all duration-200",
              inputValue
                ? "opacity-100 scale-100 animate-fade-scale"
                : "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <CornerRightUp className="w-4 h-4 text-black/70 dark:text-white/70" />
          </button>
        )}
      </div>
    </div>
  );
}
